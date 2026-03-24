#!/usr/bin/env npx tsx
/**
 * Fetch publication data from PubMed/NCBI for biotech companies.
 *
 * Uses the E-utilities API (esearch + esummary) to:
 * 1. Search by company name as affiliation
 * 2. Get total publication count
 * 3. Fetch top 20 most recent articles per company
 * 4. Update companies.publication_count
 * 5. Insert articles into the publications table
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";
import { loadCompanies, CompanyRecord } from "./lib/company-matcher";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Rate limiter (2 req/sec to be nice to NCBI) ────────────────────────────

class RateLimiter {
  private timestamps: number[] = [];
  constructor(private maxPerSec: number) {}

  async wait() {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < 1000);
    if (this.timestamps.length >= this.maxPerSec) {
      const oldest = this.timestamps[0];
      const delay = 1000 - (now - oldest) + 50;
      await new Promise((r) => setTimeout(r, delay));
    }
    this.timestamps.push(Date.now());
  }
}

const rateLimiter = new RateLimiter(2);

// ── PubMed API helpers ──────────────────────────────────────────────────────

const ESEARCH_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const ESUMMARY_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi";

interface ESearchResult {
  esearchresult: {
    count: string;
    idlist: string[];
    retmax: string;
  };
}

interface ESummaryArticle {
  uid: string;
  title?: string;
  fulljournalname?: string;
  sortpubdate?: string;
  pubdate?: string;
  authors?: Array<{ name: string }>;
  pmcrefcount?: number;
}

interface ESummaryResult {
  result: {
    uids: string[];
    [pmid: string]: ESummaryArticle | string[];
  };
}

/**
 * Search PubMed for articles affiliated with a company.
 * Returns { count, pmids (up to retmax) }.
 */
async function pubmedSearch(
  companyName: string,
  retmax: number = 20
): Promise<{ count: number; pmids: string[] }> {
  await rateLimiter.wait();

  const params = new URLSearchParams({
    db: "pubmed",
    term: `${companyName}[Affiliation]`,
    retmax: String(retmax),
    retmode: "json",
    sort: "date",
  });

  const url = `${ESEARCH_BASE}?${params.toString()}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      if (resp.status === 429) {
        await new Promise((r) => setTimeout(r, 3000));
        return pubmedSearch(companyName, retmax); // retry once
      }
      console.error(`  esearch error ${resp.status} for "${companyName}"`);
      return { count: 0, pmids: [] };
    }
    const data: ESearchResult = await resp.json();
    return {
      count: parseInt(data.esearchresult.count, 10) || 0,
      pmids: data.esearchresult.idlist || [],
    };
  } catch (err) {
    console.error(`  esearch fetch error for "${companyName}": ${err}`);
    return { count: 0, pmids: [] };
  }
}

/**
 * Get article summaries from PubMed by PMID list.
 */
async function pubmedSummary(pmids: string[]): Promise<ESummaryArticle[]> {
  if (pmids.length === 0) return [];

  await rateLimiter.wait();

  const params = new URLSearchParams({
    db: "pubmed",
    id: pmids.join(","),
    retmode: "json",
  });

  const url = `${ESUMMARY_BASE}?${params.toString()}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      if (resp.status === 429) {
        await new Promise((r) => setTimeout(r, 3000));
        return pubmedSummary(pmids); // retry once
      }
      console.error(`  esummary error ${resp.status}`);
      return [];
    }
    const data: ESummaryResult = await resp.json();
    const articles: ESummaryArticle[] = [];
    const uids = data.result?.uids || [];
    for (const uid of uids) {
      const article = data.result[uid];
      if (article && typeof article === "object" && !Array.isArray(article)) {
        articles.push(article as ESummaryArticle);
      }
    }
    return articles;
  } catch (err) {
    console.error(`  esummary fetch error: ${err}`);
    return [];
  }
}

/**
 * Parse PubMed date strings like "2023/05/15" or "2023 May 15" or "2023 May" into ISO date.
 */
function parsePubDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;

  // "2023/05/15 00:00" format
  const slashMatch = dateStr.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
  if (slashMatch) {
    return `${slashMatch[1]}-${slashMatch[2]}-${slashMatch[3]}`;
  }

  // "2023/05" format
  const slashMonth = dateStr.match(/^(\d{4})\/(\d{2})$/);
  if (slashMonth) {
    return `${slashMonth[1]}-${slashMonth[2]}-01`;
  }

  // "2023 May 15" or "2023 May"
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04",
    may: "05", jun: "06", jul: "07", aug: "08",
    sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const textMatch = dateStr.match(/^(\d{4})\s+(\w{3})\s*(\d{1,2})?/);
  if (textMatch) {
    const mon = months[textMatch[2].toLowerCase().slice(0, 3)];
    if (mon) {
      const day = textMatch[3] ? textMatch[3].padStart(2, "0") : "01";
      return `${textMatch[1]}-${mon}-${day}`;
    }
  }

  // Year only
  if (/^\d{4}$/.test(dateStr.trim())) {
    return `${dateStr.trim()}-01-01`;
  }

  return null;
}

// ── Build a clean search term for affiliation matching ──────────────────────

function buildSearchName(name: string): string {
  // Strip common corporate suffixes for better PubMed affiliation matching
  let clean = name
    .replace(/,?\s*(Inc\.?|Corp\.?|Corporation|Ltd\.?|Limited|LLC|LP|PLC|AG|SA|SE|AB|NV|GmbH|Co\.?|Company|Group|Holdings?)(\s|$)/gi, " ")
    .trim();
  return clean;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== Fetching PubMed Publication Data ===\n");

  // 1. Load all companies
  const allCompanies = await loadCompanies(supabase);
  console.log(`Loaded ${allCompanies.length} companies total`);

  // 2. Get top 500 by ordering (fetch from DB with valuation ordering)
  const { data: topCompaniesRaw, error: topErr } = await supabase
    .from("companies")
    .select("id, name, ticker, website")
    .order("valuation", { ascending: false, nullsFirst: false })
    .limit(500);

  if (topErr) {
    console.error("Failed to fetch top companies:", topErr.message);
    return;
  }

  const companies: CompanyRecord[] = (topCompaniesRaw || []) as CompanyRecord[];
  console.log(`Processing top ${companies.length} companies by valuation\n`);

  // 3. Get existing PMIDs for dedup
  const existingPmids = new Set<string>();
  let offset = 0;
  while (true) {
    const { data: existingRows } = await supabase
      .from("publications")
      .select("pmid")
      .range(offset, offset + 999);
    if (!existingRows || existingRows.length === 0) break;
    for (const r of existingRows) {
      if (r.pmid) existingPmids.add(r.pmid);
    }
    offset += 1000;
    if (existingRows.length < 1000) break;
  }
  console.log(`Existing publications in DB: ${existingPmids.size}\n`);

  // 4. Process each company
  let totalInserted = 0;
  let totalCount = 0;
  let companiesProcessed = 0;
  let companiesWithPubs = 0;
  const countUpdates: Array<{ id: string; count: number }> = [];

  for (const company of companies) {
    companiesProcessed++;
    const pct = ((companiesProcessed / companies.length) * 100).toFixed(0);

    // Search PubMed by company name as affiliation
    const searchName = buildSearchName(company.name);
    if (searchName.length < 3) {
      continue; // skip very short names
    }

    const { count, pmids } = await pubmedSearch(searchName, 20);

    if (count === 0) {
      // Try with full original name if clean name didn't work
      if (searchName !== company.name) {
        const retry = await pubmedSearch(company.name, 20);
        if (retry.count > 0) {
          // Use retry results
          totalCount += retry.count;
          companiesWithPubs++;
          countUpdates.push({ id: company.id, count: retry.count });

          if (retry.pmids.length > 0) {
            const articles = await pubmedSummary(retry.pmids);
            const newArticles = articles.filter(
              (a) => !existingPmids.has(a.uid)
            );
            if (newArticles.length > 0) {
              const rows = newArticles.map((a) => ({
                company_id: company.id,
                company_name: company.name,
                pmid: a.uid,
                title: a.title || null,
                journal: a.fulljournalname || null,
                publication_date: parsePubDate(a.sortpubdate || a.pubdate),
                authors: a.authors
                  ? a.authors.map((au) => au.name).slice(0, 20)
                  : null,
                citation_count: a.pmcrefcount || 0,
                source_name: "pubmed",
              }));

              const { error } = await supabase
                .from("publications")
                .upsert(rows, { onConflict: "pmid,company_id", ignoreDuplicates: true });

              if (error) {
                console.error(`  Insert error for ${company.name}: ${error.message}`);
              } else {
                totalInserted += rows.length;
                for (const r of rows) existingPmids.add(r.pmid);
              }
            }
          }

          console.log(
            `[${pct}%] ${company.name}: ${retry.count} total, ${retry.pmids.length} fetched`
          );
          continue;
        }
      }

      if (companiesProcessed % 50 === 0) {
        console.log(
          `[${pct}%] ${companiesProcessed}/${companies.length} processed, ${totalInserted} inserted`
        );
      }
      continue;
    }

    companiesWithPubs++;
    totalCount += count;
    countUpdates.push({ id: company.id, count });

    // Fetch article details for the PMIDs we got
    if (pmids.length > 0) {
      const articles = await pubmedSummary(pmids);
      const newArticles = articles.filter((a) => !existingPmids.has(a.uid));

      if (newArticles.length > 0) {
        const rows = newArticles.map((a) => ({
          company_id: company.id,
          company_name: company.name,
          pmid: a.uid,
          title: a.title || null,
          journal: a.fulljournalname || null,
          publication_date: parsePubDate(a.sortpubdate || a.pubdate),
          authors: a.authors
            ? a.authors.map((au) => au.name).slice(0, 20)
            : null,
          citation_count: a.pmcrefcount || 0,
          source_name: "pubmed",
        }));

        const { error } = await supabase
          .from("publications")
          .upsert(rows, { onConflict: "pmid,company_id", ignoreDuplicates: true });

        if (error) {
          console.error(`  Insert error for ${company.name}: ${error.message}`);
        } else {
          totalInserted += rows.length;
          for (const r of rows) existingPmids.add(r.pmid);
        }
      }
    }

    console.log(
      `[${pct}%] ${company.name}: ${count} total pubs, ${pmids.length} fetched`
    );
  }

  // 5. Update publication_count on companies table
  console.log(`\nUpdating publication_count for ${countUpdates.length} companies...`);
  let updateSuccess = 0;
  for (const upd of countUpdates) {
    const { error } = await supabase
      .from("companies")
      .update({ publication_count: upd.count })
      .eq("id", upd.id);
    if (error) {
      console.error(`  Update error for ${upd.id}: ${error.message}`);
    } else {
      updateSuccess++;
    }
  }
  console.log(`Updated ${updateSuccess}/${countUpdates.length} companies`);

  // 6. Summary
  console.log("\n=== Summary ===");
  console.log(`Companies processed:       ${companiesProcessed}`);
  console.log(`Companies with publications: ${companiesWithPubs}`);
  console.log(`Total publication count:    ${totalCount}`);
  console.log(`Articles inserted to DB:   ${totalInserted}`);
  console.log(`Total in publications:      ${existingPmids.size}`);

  // Top 10 by publication count
  if (countUpdates.length > 0) {
    const top10 = countUpdates
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    console.log("\nTop 20 companies by PubMed publication count:");
    for (const item of top10) {
      const comp = companies.find((c) => c.id === item.id);
      console.log(`  ${comp?.name || item.id}: ${item.count.toLocaleString()}`);
    }
  }
}

main().catch(console.error);
