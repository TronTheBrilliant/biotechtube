#!/usr/bin/env npx tsx
/**
 * Fetch biotech/pharma IPO and public offering data from SEC EDGAR EFTS API
 *
 * Queries S-1 (IPO registration) and 424B4 (prospectus) filings
 * for companies with biotech/pharma SIC codes (2833-2836, 3826, 3841).
 * Extracts company name, filing date, and attempts to get offering amounts.
 * Stores results in the funding_rounds table in Supabase.
 *
 * SEC EDGAR requires: max 10 requests/second, User-Agent with name+email.
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const USER_AGENT = "BiotechTube research@biotechtube.io";
const EDGAR_SEARCH_URL = "https://efts.sec.gov/LATEST/search-index";

// Biotech/pharma SIC codes
const BIOTECH_SICS = new Set([
  "2833", // Pharmaceutical preparations
  "2834", // Pharmaceutical preparations
  "2835", // In Vitro & In Vivo Diagnostic Substances
  "2836", // Biological Products (main biotech SIC)
  "3826", // Laboratory Analytical Instruments
  "3841", // Surgical & Medical Instruments
]);

// Rate limiting: SEC requires max 10 req/s — we target ~4/s to be safe
let lastRequestTime = 0;
async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 250) {
    await new Promise((r) => setTimeout(r, 250 - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
}

/** Fetch with retry on 500 errors */
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const resp = await rateLimitedFetch(url);
    if (resp.ok) return resp;
    if (resp.status >= 500 && attempt < retries - 1) {
      console.log(`    Retry ${attempt + 1}/${retries} after ${resp.status}...`);
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    return resp;
  }
  return rateLimitedFetch(url); // final attempt
}

interface EdgarHit {
  ciks: string[];
  display_names: string[];
  sics: string[];
  file_date: string;
  form: string;
  adsh: string;
  file_type: string;
  root_forms: string[];
}

interface EdgarSearchResult {
  hits: {
    total: { value: number; relation: string };
    hits: Array<{ _source: EdgarHit }>;
  };
}

interface ParsedFiling {
  company_name: string;
  ticker: string | null;
  cik: string;
  filing_date: string;
  form_type: string;
  accession_number: string;
  sic: string;
  amount_usd: number | null;
  round_type: string;
}

/**
 * Extract company name and optional ticker from EDGAR display_name
 * Format: "Company Name  (TICK)  (CIK 0001234567)" or "Company Name  (CIK 0001234567)"
 */
function parseDisplayName(displayName: string): {
  name: string;
  ticker: string | null;
} {
  // Remove CIK portion
  let cleaned = displayName.replace(/\s*\(CIK\s+\d+\)\s*/g, "").trim();
  // Extract ticker if present — handles "TICK", "TICK, TICKW", "TICK, TICKW, TICK-UN"
  const tickerMatch = cleaned.match(
    /\s+\(([A-Z][A-Z0-9]{0,4}(?:[-][A-Z]+)?(?:,\s*[A-Z][A-Z0-9]{0,4}(?:[-][A-Z]+)?)*)\)\s*$/
  );
  let ticker: string | null = null;
  if (tickerMatch) {
    ticker = tickerMatch[1].split(",")[0].trim();
    cleaned = cleaned.replace(tickerMatch[0], "").trim();
  }
  return { name: cleaned, ticker };
}

/**
 * Determine round type from form type
 */
function formToRoundType(form: string): string {
  const f = form.toUpperCase();
  if (f.startsWith("S-1")) return "IPO";
  if (f.startsWith("424B")) return "Public Offering";
  if (f.startsWith("S-3")) return "Public Offering";
  return "Public Offering";
}

/**
 * Try to extract offering amount from the EDGAR filing detail page.
 * The filing fee exhibit sometimes contains the proposed offering amount.
 */
async function tryExtractOfferingAmount(
  adsh: string,
  cik: string
): Promise<number | null> {
  try {
    const adshFormatted = adsh.replace(/-/g, "");
    const cikNum = cik.replace(/^0+/, "");

    // Try the filing detail page
    const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${adshFormatted}/${adsh}-index.htm`;
    const resp = await fetchWithRetry(indexUrl);
    if (!resp.ok) return null;

    const html = await resp.text();

    // Look for the filing fee table amount patterns (in the index page HTML)
    const amountPatterns = [
      /Proposed\s+Max(?:imum)?\s+Aggregate\s+Offering\s+Price[^$\n]*?\$([\d,]+(?:\.\d+)?)/i,
      /Aggregate\s+Offering\s+Price[^$\n]*?\$([\d,]+(?:\.\d+)?)/i,
      /maximum\s+(?:aggregate\s+)?offering\s+price[^$\n]*?\$([\d,]+(?:\.\d+)?)/i,
      /Total\s+Offering\s+Amount[^$\n]*?\$([\d,]+(?:\.\d+)?)/i,
      /amount\s+to\s+be\s+registered[^$\n]*?\$([\d,]+(?:\.\d+)?)/i,
    ];

    for (const pattern of amountPatterns) {
      const match = html.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, ""));
        if (amount > 1_000_000 && amount < 50_000_000_000) {
          return Math.round(amount);
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Search EDGAR EFTS for filings matching given parameters.
 * Returns deduplicated filings by accession number.
 */
async function searchEdgarFilings(
  formType: string,
  startDate: string,
  endDate: string,
  maxResults: number = 10000
): Promise<ParsedFiling[]> {
  const filingsByAdsh = new Map<string, ParsedFiling>();
  const pageSize = 100;
  let from = 0;
  let totalHits = 0;

  console.log(
    `  Searching EDGAR for ${formType} filings from ${startDate} to ${endDate}...`
  );

  while (from < maxResults) {
    const params = new URLSearchParams({
      forms: formType,
      dateRange: "custom",
      startdt: startDate,
      enddt: endDate,
      from: from.toString(),
      size: pageSize.toString(),
    });

    const url = `${EDGAR_SEARCH_URL}?${params}`;
    const resp = await fetchWithRetry(url);

    if (!resp.ok) {
      console.error(`  EDGAR API error: ${resp.status} ${resp.statusText} (giving up after retries)`);
      break;
    }

    let data: EdgarSearchResult;
    try {
      data = await resp.json();
    } catch {
      console.error(`  Failed to parse JSON response at from=${from}`);
      break;
    }
    totalHits = data.hits.total.value;

    if (data.hits.hits.length === 0) break;

    for (const hit of data.hits.hits) {
      const src = hit._source;

      // Filter: only biotech/pharma SIC codes
      const hasBiotechSic = src.sics.some((sic) => BIOTECH_SICS.has(sic));
      if (!hasBiotechSic) continue;

      // Deduplicate by accession number — keep the main filing document
      const existing = filingsByAdsh.get(src.adsh);
      if (existing) {
        // Prefer the actual S-1/424B filing document type over exhibits
        const isMainDoc =
          src.file_type.startsWith("S-1") ||
          src.file_type.startsWith("424B") ||
          src.file_type === formType;
        if (!isMainDoc) continue;
      }

      const displayName = src.display_names[0] || "Unknown";
      const { name, ticker } = parseDisplayName(displayName);

      filingsByAdsh.set(src.adsh, {
        company_name: name,
        ticker,
        cik: src.ciks[0] || "",
        filing_date: src.file_date,
        form_type: src.form,
        accession_number: src.adsh,
        sic: src.sics.find((s) => BIOTECH_SICS.has(s)) || src.sics[0] || "",
        amount_usd: null,
        round_type: formToRoundType(src.form),
      });
    }

    from += pageSize;

    // Show progress
    if (from % 500 === 0 || from >= totalHits) {
      console.log(
        `    Fetched ${Math.min(from, totalHits)}/${totalHits} results, ${filingsByAdsh.size} biotech filings found`
      );
    }

    if (from >= totalHits) break;
  }

  console.log(
    `  Done: ${totalHits} EDGAR hits, ${filingsByAdsh.size} unique biotech filings`
  );
  return Array.from(filingsByAdsh.values());
}

/**
 * Deduplicate a filing against existing funding_rounds in Supabase.
 * Checks by company_name + round_type + date proximity (+-60 days).
 */
function isDuplicate(
  filing: ParsedFiling,
  existingMap: Map<string, Array<{ date: string; type: string; amount: number }>>
): boolean {
  const key = filing.company_name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const existing = existingMap.get(key);
  if (!existing) return false;

  const filingDate = new Date(filing.filing_date).getTime();
  const sixtyDays = 60 * 24 * 60 * 60 * 1000;

  for (const er of existing) {
    const erDate = new Date(er.date).getTime();
    const dateDiff = Math.abs(filingDate - erDate);
    // Same round type and within 60 days
    if (dateDiff < sixtyDays && er.type === filing.round_type) return true;
  }
  return false;
}

async function main() {
  console.log("\n--- SEC EDGAR Biotech IPO/Offering Fetcher ---\n");

  // Define date ranges to search (EDGAR EFTS has a 10000 result limit per query)
  // We break it into smaller windows to avoid hitting the limit
  const dateRanges = [
    { start: "1993-01-01", end: "2000-12-31" },
    { start: "2001-01-01", end: "2005-12-31" },
    { start: "2006-01-01", end: "2008-12-31" },
    { start: "2009-01-01", end: "2010-12-31" },
    { start: "2011-01-01", end: "2012-12-31" },
    { start: "2013-01-01", end: "2014-12-31" },
    { start: "2015-01-01", end: "2016-12-31" },
    { start: "2017-01-01", end: "2018-12-31" },
    { start: "2019-01-01", end: "2020-06-30" },
    { start: "2020-07-01", end: "2021-06-30" },
    { start: "2021-07-01", end: "2022-12-31" },
    { start: "2023-01-01", end: "2024-12-31" },
  ];

  // Form types to search: S-1 for IPO registrations, 424B4 for final prospectuses
  const formTypes = ["S-1", "424B4"];

  // Collect all filings across form types and date ranges
  const allFilings: ParsedFiling[] = [];
  const seenAdsh = new Set<string>();

  for (const formType of formTypes) {
    console.log(`\n=== Searching for ${formType} filings ===`);
    for (const range of dateRanges) {
      const filings = await searchEdgarFilings(
        formType,
        range.start,
        range.end
      );
      for (const f of filings) {
        if (!seenAdsh.has(f.accession_number)) {
          seenAdsh.add(f.accession_number);
          allFilings.push(f);
        }
      }
    }
  }

  console.log(`\nTotal unique biotech filings collected: ${allFilings.length}`);

  // Deduplicate: for each CIK, keep only the earliest S-1 filing per IPO event,
  // and 424B4 filings only if no S-1 is within 365 days.
  const byCik = new Map<string, ParsedFiling[]>();
  for (const f of allFilings) {
    const arr = byCik.get(f.cik) || [];
    arr.push(f);
    byCik.set(f.cik, arr);
  }

  const mergedFilings: ParsedFiling[] = [];
  for (const [, filings] of byCik) {
    // Sort by date
    filings.sort((a, b) => a.filing_date.localeCompare(b.filing_date));

    const s1s = filings.filter((f) => f.round_type === "IPO");
    const prospectuses = filings.filter((f) => f.round_type !== "IPO");

    // Group S-1 filings into IPO events — S-1/A amendments within 365 days are the same IPO
    const ipoEvents: ParsedFiling[] = [];
    for (const s1 of s1s) {
      const s1Date = new Date(s1.filing_date).getTime();
      const isAmendment = ipoEvents.some((ev) => {
        const evDate = new Date(ev.filing_date).getTime();
        return Math.abs(s1Date - evDate) < 365 * 24 * 60 * 60 * 1000;
      });
      if (!isAmendment) {
        ipoEvents.push(s1);
      }
    }
    mergedFilings.push(...ipoEvents);

    // Add prospectuses only if there's no S-1 within 365 days
    for (const p of prospectuses) {
      const pDate = new Date(p.filing_date).getTime();
      const hasNearbyS1 = s1s.some((s1) => {
        const s1Date = new Date(s1.filing_date).getTime();
        return Math.abs(pDate - s1Date) < 365 * 24 * 60 * 60 * 1000;
      });
      if (!hasNearbyS1) {
        mergedFilings.push(p);
      }
    }
  }

  console.log(`After dedup/merge: ${mergedFilings.length} unique IPO/offering events`);

  // Try to extract offering amounts for a sample of recent filings
  console.log(
    `\nAttempting to extract offering amounts for up to 50 recent filings...`
  );
  const sorted = [...mergedFilings].sort((a, b) =>
    b.filing_date.localeCompare(a.filing_date)
  );
  let amountsFound = 0;
  const amountLimit = 50;
  for (let i = 0; i < Math.min(sorted.length, amountLimit); i++) {
    const f = sorted[i];
    const amount = await tryExtractOfferingAmount(f.accession_number, f.cik);
    if (amount) {
      f.amount_usd = amount;
      amountsFound++;
    }
    if ((i + 1) % 10 === 0) {
      console.log(
        `  Processed ${i + 1}/${Math.min(sorted.length, amountLimit)}, found ${amountsFound} amounts`
      );
    }
  }
  console.log(`Extracted ${amountsFound} offering amounts`);

  // Load existing data for deduplication
  const { data: existing } = await supabase
    .from("funding_rounds")
    .select("company_name, round_type, amount_usd, announced_date")
    .eq("source_name", "sec_edgar");

  const existingMap = new Map<
    string,
    Array<{ date: string; type: string; amount: number }>
  >();
  for (const r of existing || []) {
    const key = (r.company_name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const arr = existingMap.get(key) || [];
    arr.push({
      date: r.announced_date,
      type: r.round_type || "",
      amount: Number(r.amount_usd),
    });
    existingMap.set(key, arr);
  }

  // Also check against all funding_rounds for broader dedup
  const { data: allExisting } = await supabase
    .from("funding_rounds")
    .select("company_name, round_type, amount_usd, announced_date")
    .in("round_type", ["IPO", "Public Offering"]);

  for (const r of allExisting || []) {
    const key = (r.company_name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const arr = existingMap.get(key) || [];
    arr.push({
      date: r.announced_date,
      type: r.round_type || "",
      amount: Number(r.amount_usd),
    });
    existingMap.set(key, arr);
  }

  console.log(
    `Loaded ${(existing || []).length} existing sec_edgar records, ${(allExisting || []).length} existing IPO/Offering records for dedup`
  );

  // Get company name -> id mapping
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .limit(20000);

  const nameToId = new Map<string, string>();
  for (const c of companies || []) {
    nameToId.set(c.name.toLowerCase(), c.id);
    nameToId.set(c.name.toLowerCase().replace(/[^a-z0-9]/g, ""), c.id);
  }

  // Build insert batch
  const newRounds: Array<Record<string, unknown>> = [];
  let dupeCount = 0;

  for (const filing of mergedFilings) {
    if (isDuplicate(filing, existingMap)) {
      dupeCount++;
      continue;
    }

    const companyId =
      nameToId.get(filing.company_name.toLowerCase()) ||
      nameToId.get(
        filing.company_name.toLowerCase().replace(/[^a-z0-9]/g, "")
      );

    newRounds.push({
      company_id: companyId || null,
      company_name: filing.company_name,
      round_type: filing.round_type,
      amount: filing.amount_usd,
      currency: "USD",
      amount_usd: filing.amount_usd,
      lead_investor: null,
      announced_date: filing.filing_date,
      country: "United States",
      source_name: "sec_edgar",
      confidence: filing.amount_usd ? "verified" : "filing_only",
    });
  }

  console.log(`\nDuplicates skipped: ${dupeCount}`);
  console.log(`New rounds to insert: ${newRounds.length}`);

  // Show some samples
  console.log("\nSample filings:");
  const samples = newRounds
    .filter((r) => r.amount_usd)
    .slice(0, 5)
    .concat(newRounds.filter((r) => !r.amount_usd).slice(0, 5));
  for (const r of samples) {
    const amt = r.amount_usd
      ? `$${(Number(r.amount_usd) / 1e6).toFixed(1)}M`
      : "N/A";
    console.log(
      `  ${r.announced_date} | ${(r.company_name as string).substring(0, 45).padEnd(45)} | ${(r.round_type as string).padEnd(16)} | ${amt}`
    );
  }

  if (newRounds.length > 0) {
    // Insert in batches of 50
    let inserted = 0;
    for (let i = 0; i < newRounds.length; i += 50) {
      const batch = newRounds.slice(i, i + 50);
      const { error } = await supabase.from("funding_rounds").insert(batch);
      if (error) {
        console.error(`Insert error at batch ${i}: ${error.message}`);
      } else {
        inserted += batch.length;
      }
    }
    console.log(`\nInserted: ${inserted} new rounds`);
  }

  // Summary: count by year
  const { data: allEdgar } = await supabase
    .from("funding_rounds")
    .select("announced_date, round_type, amount_usd")
    .eq("source_name", "sec_edgar");

  const byYear = new Map<string, { count: number; withAmount: number }>();
  for (const r of allEdgar || []) {
    const year = r.announced_date?.substring(0, 4) || "unknown";
    const entry = byYear.get(year) || { count: 0, withAmount: 0 };
    entry.count++;
    if (r.amount_usd) entry.withAmount++;
    byYear.set(year, entry);
  }

  console.log(`\nSEC EDGAR filings in database by year:`);
  let totalRecords = 0;
  for (const [year, data] of [...byYear.entries()].sort()) {
    console.log(
      `  ${year}: ${data.count} filings (${data.withAmount} with amounts)`
    );
    totalRecords += data.count;
  }
  console.log(`  TOTAL: ${totalRecords} filings`);
}

main().catch(console.error);
