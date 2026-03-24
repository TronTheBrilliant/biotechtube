#!/usr/bin/env npx tsx
/**
 * Fetch NIH grant data for biotech companies from the NIH Reporter API
 *
 * Searches for SBIR/STTR grants awarded to US biotech companies in our database.
 * Inserts results into funding_rounds with round_type "Grant".
 *
 * NIH Reporter API: https://api.reporter.nih.gov/v2/projects/search
 * No API key required.
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NIH_API_URL = "https://api.reporter.nih.gov/v2/projects/search";
const FISCAL_YEARS = Array.from({ length: 25 }, (_, i) => 2000 + i); // 2000-2024
const RATE_LIMIT_MS = 500;
const BATCH_SIZE = 50;

interface NIHProject {
  project_title: string;
  organization: { org_name: string; org_city: string; org_state: string } | null;
  award_amount: number | null;
  award_notice_date: string | null;
  project_start_date: string | null;
  project_end_date: string | null;
  fiscal_year: number;
  agency_ic_fundings: Array<{ abbreviation: string; name: string; total_cost: number }> | null;
  project_num: string | null;
  activity_code: string | null;
  spending_categories_desc: string | null;
  abstract_text: string | null;
  phr_text: string | null;
  appl_id: number | null;
}

interface NIHResponse {
  meta: { total: number; offset: number; limit: number };
  results: NIHProject[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Generate search name variations for a company name.
 * The NIH Reporter API uses partial matching on org_names.
 */
function getSearchNames(name: string): string[] {
  const names = new Set<string>();
  names.add(name);

  // Remove common suffixes
  const suffixes = [
    /,?\s*(Inc\.?|Corp\.?|Corporation|LLC|Ltd\.?|L\.?P\.?|PLC|S\.A\.?|N\.V\.?|SE|AG|GmbH|Co\.?)$/i,
    /,?\s*(Therapeutics|Pharmaceuticals|Biosciences|Biotech|Biopharma|Biotherapeutics|Medicines|Sciences|Oncology|Genomics|Health|Medical|Diagnostics|Biosystems|BioSciences)$/i,
  ];

  let stripped = name;
  for (const suffix of suffixes) {
    stripped = stripped.replace(suffix, "").trim();
  }
  if (stripped !== name && stripped.length > 2) {
    names.add(stripped);
  }

  // Try removing more suffixes from the already stripped name
  let doubleStripped = stripped;
  for (const suffix of suffixes) {
    doubleStripped = doubleStripped.replace(suffix, "").trim();
  }
  if (doubleStripped !== stripped && doubleStripped.length > 2) {
    names.add(doubleStripped);
  }

  return Array.from(names);
}

/**
 * Search NIH Reporter API for grants matching an organization name.
 * Focuses on SBIR/STTR activity codes.
 */
async function searchNIHGrants(orgName: string): Promise<NIHProject[]> {
  const allResults: NIHProject[] = [];
  let offset = 0;
  const limit = 500;

  try {
    const body = {
      criteria: {
        org_names: [orgName],
        fiscal_years: FISCAL_YEARS,
        // SBIR/STTR activity codes
        activity_codes: ["R43", "R44", "U43", "U44", "SB1"],
      },
      offset,
      limit,
      sort_field: "fiscal_year",
      sort_order: "desc",
    };

    const response = await fetch(NIH_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.log(`  Rate limited for "${orgName}", waiting 5s...`);
        await sleep(5000);
        return searchNIHGrants(orgName); // retry once
      }
      console.error(`  NIH API error ${response.status} for "${orgName}"`);
      return [];
    }

    const data: NIHResponse = await response.json();
    if (data.results) {
      allResults.push(...data.results);
    }

    // If there are more results, paginate
    if (data.meta.total > limit) {
      const remaining = Math.min(data.meta.total - limit, 500); // cap at 1000 total
      if (remaining > 0) {
        await sleep(RATE_LIMIT_MS);
        const body2 = { ...body, offset: limit, limit: remaining };
        const resp2 = await fetch(NIH_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body2),
        });
        if (resp2.ok) {
          const data2: NIHResponse = await resp2.json();
          if (data2.results) allResults.push(...data2.results);
        }
      }
    }
  } catch (err) {
    console.error(`  Error fetching NIH data for "${orgName}":`, err);
  }

  return allResults;
}

/**
 * Also search without SBIR filter for larger companies that may have
 * direct R01/R21/etc grants
 */
async function searchNIHGrantsAll(orgName: string): Promise<NIHProject[]> {
  try {
    const body = {
      criteria: {
        org_names: [orgName],
        fiscal_years: FISCAL_YEARS,
      },
      offset: 0,
      limit: 500,
      sort_field: "fiscal_year",
      sort_order: "desc",
    };

    const response = await fetch(NIH_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) return [];
    const data: NIHResponse = await response.json();
    return data.results || [];
  } catch {
    return [];
  }
}

function extractInstitute(project: NIHProject): string {
  if (project.agency_ic_fundings && project.agency_ic_fundings.length > 0) {
    const primary = project.agency_ic_fundings[0];
    return primary.abbreviation || "NIH";
  }
  return "NIH";
}

function getAnnouncedDate(project: NIHProject): string {
  // Use award_notice_date if available, otherwise project_start_date, otherwise fiscal year
  if (project.award_notice_date) {
    return project.award_notice_date.split("T")[0];
  }
  if (project.project_start_date) {
    return project.project_start_date.split("T")[0];
  }
  // Default to Oct 1 of fiscal year (start of federal fiscal year)
  return `${project.fiscal_year - 1}-10-01`;
}

function getAwardAmount(project: NIHProject): number | null {
  if (project.award_amount && project.award_amount > 0) {
    return project.award_amount;
  }
  // Try summing agency fundings
  if (project.agency_ic_fundings) {
    const total = project.agency_ic_fundings.reduce((sum, f) => sum + (f.total_cost || 0), 0);
    if (total > 0) return total;
  }
  return null;
}

async function main() {
  console.log("\n=== NIH Reporter Grant Fetcher ===\n");
  console.log(`Searching fiscal years: ${FISCAL_YEARS[0]}-${FISCAL_YEARS[FISCAL_YEARS.length - 1]}`);

  // 1. Get US companies from Supabase (top 500 by total_raised or profile_views)
  console.log("\nFetching US biotech companies from database...");

  const { data: companies, error: compErr } = await supabase
    .from("companies")
    .select("id, name, country, total_raised")
    .or("country.eq.United States,country.eq.USA,country.eq.US")
    .order("total_raised", { ascending: false, nullsFirst: false })
    .limit(500);

  if (compErr) {
    console.error("Error fetching companies:", compErr.message);
    return;
  }

  console.log(`Found ${companies?.length || 0} US companies`);

  if (!companies || companies.length === 0) {
    console.log("No US companies found. Exiting.");
    return;
  }

  // 2. Get existing NIH grant entries for deduplication
  console.log("Loading existing NIH grants for deduplication...");
  const { data: existingGrants } = await supabase
    .from("funding_rounds")
    .select("company_id, company_name, amount_usd, announced_date, source_name, lead_investor")
    .eq("source_name", "nih_reporter");

  const existingSet = new Set<string>();
  for (const g of existingGrants || []) {
    // Key: company_name_lower + amount + date
    const key = `${(g.company_name || "").toLowerCase().replace(/[^a-z0-9]/g, "")}|${g.amount_usd || 0}|${g.announced_date || ""}`;
    existingSet.add(key);
  }
  console.log(`Found ${existingGrants?.length || 0} existing NIH grants in database`);

  // Also build a name->id map for all companies
  const { data: allCompanies } = await supabase
    .from("companies")
    .select("id, name")
    .limit(20000);

  const nameToId = new Map<string, string>();
  for (const c of allCompanies || []) {
    nameToId.set(c.name.toLowerCase(), c.id);
    nameToId.set(c.name.toLowerCase().replace(/[^a-z0-9]/g, ""), c.id);
  }

  // 3. Search NIH for each company
  let totalGrantsFound = 0;
  let totalNewGrants = 0;
  let totalDuplicates = 0;
  let companiesWithGrants = 0;
  const newRows: Array<Record<string, unknown>> = [];

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    const searchNames = getSearchNames(company.name);

    if (i % 50 === 0 && i > 0) {
      console.log(`\n--- Progress: ${i}/${companies.length} companies processed, ${totalGrantsFound} grants found ---\n`);
    }

    let grants: NIHProject[] = [];
    const seenApplIds = new Set<number>();

    for (const searchName of searchNames) {
      // First try SBIR/STTR specific search
      const sbirGrants = await searchNIHGrants(searchName);
      await sleep(RATE_LIMIT_MS);

      // Also try all grants (for larger companies with R01, etc.)
      const allGrants = await searchNIHGrantsAll(searchName);
      await sleep(RATE_LIMIT_MS);

      // Merge, deduplicate by appl_id
      for (const g of [...sbirGrants, ...allGrants]) {
        if (g.appl_id && !seenApplIds.has(g.appl_id)) {
          seenApplIds.add(g.appl_id);
          grants.push(g);
        } else if (!g.appl_id) {
          grants.push(g);
        }
      }

      if (grants.length > 0) break; // Found results, no need to try other name variations
    }

    if (grants.length === 0) continue;

    companiesWithGrants++;
    console.log(`[${i + 1}/${companies.length}] ${company.name}: ${grants.length} NIH grants found`);
    totalGrantsFound += grants.length;

    for (const grant of grants) {
      const amount = getAwardAmount(grant);
      if (!amount || amount <= 0) continue;

      const date = getAnnouncedDate(grant);
      const institute = extractInstitute(grant);

      // Dedup check
      const orgName = grant.organization?.org_name || company.name;
      const dedupKey = `${orgName.toLowerCase().replace(/[^a-z0-9]/g, "")}|${amount}|${date}`;
      if (existingSet.has(dedupKey)) {
        totalDuplicates++;
        continue;
      }
      existingSet.add(dedupKey); // prevent within-run duplicates too

      // Also dedup by project number + fiscal year (same grant renewed)
      const projKey = `${(grant.project_num || "").replace(/[^a-z0-9]/gi, "")}|${grant.fiscal_year}`;
      if (existingSet.has(projKey)) {
        totalDuplicates++;
        continue;
      }
      existingSet.add(projKey);

      const companyId = nameToId.get(company.name.toLowerCase())
        || nameToId.get(company.name.toLowerCase().replace(/[^a-z0-9]/g, ""))
        || company.id;

      const activityCode = grant.activity_code || "";
      const grantType = ["R43", "R44", "U43", "U44", "SB1"].includes(activityCode)
        ? "SBIR/STTR Grant"
        : "Grant";

      newRows.push({
        company_id: companyId,
        company_name: company.name,
        round_type: "Grant",
        amount: amount,
        currency: "USD",
        amount_usd: amount,
        lead_investor: institute,
        investors: ["NIH", institute].filter((v, idx, arr) => arr.indexOf(v) === idx),
        announced_date: date,
        country: "United States",
        source_url: grant.appl_id
          ? `https://reporter.nih.gov/project-details/${grant.appl_id}`
          : null,
        source_name: "nih_reporter",
        confidence: "official",
        sector: grantType, // Use sector field to note SBIR vs regular
      });
      totalNewGrants++;
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Companies searched: ${companies.length}`);
  console.log(`Companies with grants: ${companiesWithGrants}`);
  console.log(`Total grants found: ${totalGrantsFound}`);
  console.log(`Duplicates skipped: ${totalDuplicates}`);
  console.log(`New grants to insert: ${newRows.length}`);

  // 4. Insert in batches
  if (newRows.length > 0) {
    let inserted = 0;
    let errors = 0;
    for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
      const batch = newRows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("funding_rounds").insert(batch);
      if (error) {
        console.error(`Insert batch error (${i}-${i + batch.length}): ${error.message}`);
        errors++;
        // Try inserting one by one for this batch
        for (const row of batch) {
          const { error: singleErr } = await supabase.from("funding_rounds").insert(row);
          if (!singleErr) inserted++;
        }
      } else {
        inserted += batch.length;
      }
    }
    console.log(`\nInserted: ${inserted} new grant records`);
    if (errors > 0) console.log(`Batch errors: ${errors} (attempted individual inserts)`);
  }

  // 5. Show sample results
  if (newRows.length > 0) {
    console.log("\n=== Sample Grants ===");
    const samples = newRows.slice(0, 10);
    for (const s of samples) {
      const amt = Number(s.amount_usd);
      const amtStr = amt >= 1_000_000
        ? `$${(amt / 1_000_000).toFixed(1)}M`
        : `$${(amt / 1_000).toFixed(0)}K`;
      console.log(`  ${s.company_name} | ${amtStr} | ${s.lead_investor} | ${s.announced_date}`);
    }
  }

  console.log("\nDone.");
}

main().catch(console.error);
