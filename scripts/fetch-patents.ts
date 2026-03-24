#!/usr/bin/env npx tsx
/**
 * Fetch patent data from USPTO PatentsView for biotech companies.
 *
 * Strategy: Downloads PatentsView bulk TSV data from S3 (no API key needed),
 * filters for patents assigned to companies in our database, and inserts
 * matching patents into the `patents` table.
 *
 * If PATENTSVIEW_API_KEY is set in .env.local, uses the PatentsView Search API
 * instead (faster for targeted queries, but requires a free API key from
 * https://patentsview-support.atlassian.net/servicedesk/customer/portals).
 *
 * Bulk data source: https://patentsview.org/download/data-download-tables
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";
import { CompanyMatcher, loadCompanies } from "./lib/company-matcher";
import { createReadStream, existsSync, mkdirSync, createWriteStream } from "fs";
import { createInterface } from "readline";
import { createUnzip } from "zlib";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const API_KEY = process.env.PATENTSVIEW_API_KEY || "";
const BASE_URL = "https://search.patentsview.org/api/v1/patent/";
const RATE_LIMIT_MS = 1400;
const BATCH_INSERT_SIZE = 100;

// Bulk data URLs (PatentsView S3)
const BULK_ASSIGNEE_URL =
  "https://s3.amazonaws.com/data.patentsview.org/download/g_assignee_disambiguated.tsv.zip";
const BULK_PATENT_URL =
  "https://s3.amazonaws.com/data.patentsview.org/download/g_patent.tsv.zip";
const BULK_INVENTOR_URL =
  "https://s3.amazonaws.com/data.patentsview.org/download/g_inventor_disambiguated.tsv.zip";
const BULK_APPLICATION_URL =
  "https://s3.amazonaws.com/data.patentsview.org/download/g_application.tsv.zip";

const CACHE_DIR = resolve(__dirname, "../.cache/patents");

// ── Types ──────────────────────────────────────────────────────────────────

interface PatentRow {
  company_id: string | null;
  company_name: string;
  patent_number: string;
  title: string | null;
  filing_date: string | null;
  grant_date: string | null;
  abstract: string | null;
  inventors: string[] | null;
  source_name: string;
}

interface Company {
  id: string;
  name: string;
  ticker: string | null;
  valuation: number | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Download a file from URL to local path if not already cached.
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  if (existsSync(destPath)) {
    console.log(`  Using cached: ${destPath}`);
    return;
  }
  mkdirSync(resolve(destPath, ".."), { recursive: true });
  console.log(`  Downloading: ${url}`);
  console.log(`  Destination: ${destPath}`);

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status} ${url}`);
  if (!resp.body) throw new Error(`No body in response: ${url}`);

  const fileStream = createWriteStream(destPath);
  const reader = resp.body.getReader();
  const nodeStream = new Readable({
    async read() {
      const { done, value } = await reader.read();
      if (done) {
        this.push(null);
      } else {
        this.push(Buffer.from(value));
      }
    },
  });

  let downloaded = 0;
  const contentLength = Number(resp.headers.get("content-length") || 0);
  nodeStream.on("data", (chunk: Buffer) => {
    downloaded += chunk.length;
    if (contentLength > 0 && downloaded % (50 * 1024 * 1024) < chunk.length) {
      const pct = ((downloaded / contentLength) * 100).toFixed(0);
      console.log(
        `  Progress: ${(downloaded / 1024 / 1024).toFixed(0)}MB / ${(contentLength / 1024 / 1024).toFixed(0)}MB (${pct}%)`
      );
    }
  });

  await pipeline(nodeStream, fileStream);
  console.log(`  Download complete: ${(downloaded / 1024 / 1024).toFixed(1)}MB`);
}

/**
 * Extract a .zip file containing a single .tsv to a destination.
 * Uses the `unzip` command line tool.
 */
async function extractZip(zipPath: string, destDir: string): Promise<string> {
  const { execSync } = await import("child_process");
  mkdirSync(destDir, { recursive: true });

  // List files in zip to find TSV name
  const listOutput = execSync(`unzip -l "${zipPath}"`, { encoding: "utf-8" });
  const tsvMatch = listOutput.match(/(\S+\.tsv)/);
  if (!tsvMatch) throw new Error(`No TSV found in ${zipPath}`);
  const tsvName = tsvMatch[1];
  const tsvPath = resolve(destDir, tsvName);

  if (existsSync(tsvPath)) {
    console.log(`  Using cached TSV: ${tsvPath}`);
    return tsvPath;
  }

  console.log(`  Extracting: ${tsvName}`);
  execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { encoding: "utf-8" });
  return tsvPath;
}

/**
 * Read a TSV file line by line, calling a callback for each row.
 * Returns headers as first element.
 */
function stripQuotes(s: string): string {
  if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') {
    return s.slice(1, -1);
  }
  return s;
}

async function readTsv(
  filePath: string,
  onRow: (fields: string[], headers: string[]) => void
): Promise<string[]> {
  const stream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  let headers: string[] = [];
  let lineNum = 0;

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) {
      headers = line.split("\t").map(stripQuotes);
      continue;
    }
    const fields = line.split("\t").map(stripQuotes);
    onRow(fields, headers);
  }

  return headers;
}

// ═══════════════════════════════════════════════════════════════════════════
// BULK DATA APPROACH (no API key needed)
// ═══════════════════════════════════════════════════════════════════════════

async function runBulkDataApproach(
  companies: Company[],
  matcher: CompanyMatcher,
  existingPatentNumbers: Set<string>
) {
  console.log("=== Using PatentsView Bulk Data (no API key needed) ===\n");

  // Build a restricted matcher using ONLY the top 500 companies
  // This prevents matching against all 10k+ companies and reduces patent volume
  const targetIds = new Set(companies.map((c) => c.id));
  const idToCompany = new Map<string, Company>();
  for (const c of companies) idToCompany.set(c.id, c);

  // Cap at 200 patents per company to avoid memory issues with large pharma
  const MAX_PATENTS_PER_COMPANY = 200;
  const companyPatentCount = new Map<string, number>();

  // Step 1: Download and extract assignee data
  console.log("Step 1: Downloading assignee data...");
  const assigneeZip = resolve(CACHE_DIR, "g_assignee_disambiguated.tsv.zip");
  await downloadFile(BULK_ASSIGNEE_URL, assigneeZip);
  const assigneeTsv = await extractZip(assigneeZip, CACHE_DIR);

  // Step 2: Scan assignee TSV for matching patent IDs
  console.log("\nStep 2: Scanning assignees for matching companies...");
  // patent_id -> { company_id, company_name }
  const matchedPatents = new Map<
    string,
    { companyId: string; companyName: string }
  >();

  let assigneeRowCount = 0;
  let matchCount = 0;
  let skippedOverLimit = 0;

  await readTsv(assigneeTsv, (fields, headers) => {
    assigneeRowCount++;
    if (assigneeRowCount % 2_000_000 === 0) {
      console.log(
        `  Scanned ${(assigneeRowCount / 1_000_000).toFixed(1)}M assignee rows, ${matchCount} patent matches (${matchedPatents.size} unique)`
      );
    }

    const patentIdIdx = headers.indexOf("patent_id");
    const orgIdx = headers.indexOf("disambig_assignee_organization");
    const orgIdx2 = orgIdx >= 0 ? orgIdx : headers.indexOf("assignee_organization");

    if (patentIdIdx < 0 || (orgIdx < 0 && orgIdx2 < 0)) return;

    const patentId = fields[patentIdIdx];
    const org = fields[orgIdx >= 0 ? orgIdx : orgIdx2!];
    if (!patentId || !org) return;

    // Already matched this patent? skip
    if (matchedPatents.has(patentId)) return;

    // Try matching this assignee organization to our target companies only
    const matchedId = matcher.match(org);
    if (matchedId && targetIds.has(matchedId)) {
      // Check per-company limit
      const cnt = companyPatentCount.get(matchedId) || 0;
      if (cnt >= MAX_PATENTS_PER_COMPANY) {
        skippedOverLimit++;
        return;
      }
      companyPatentCount.set(matchedId, cnt + 1);

      const company = idToCompany.get(matchedId);
      matchedPatents.set(patentId, {
        companyId: matchedId,
        companyName: company?.name || org,
      });
      matchCount++;
    }
  });

  console.log(
    `  Scanned ${(assigneeRowCount / 1_000_000).toFixed(1)}M assignee rows total`
  );
  console.log(`  Found ${matchedPatents.size} unique patents matching our ${companies.length} target companies`);
  console.log(`  Skipped ${skippedOverLimit} patents exceeding per-company limit of ${MAX_PATENTS_PER_COMPANY}\n`);

  if (matchedPatents.size === 0) {
    console.log("No matching patents found. Exiting.");
    return;
  }

  // Filter out existing patents
  const newPatentIds = new Set<string>();
  for (const patentId of matchedPatents.keys()) {
    if (!existingPatentNumbers.has(patentId)) {
      newPatentIds.add(patentId);
    }
  }
  console.log(
    `  New patents to fetch details for: ${newPatentIds.size} (${matchedPatents.size - newPatentIds.size} already in DB)\n`
  );

  if (newPatentIds.size === 0) {
    console.log("All matched patents already in database. Done.");
    return;
  }

  // Step 3: Download and extract patent data (for titles, dates, abstracts)
  console.log("Step 3: Downloading patent metadata...");
  const patentZip = resolve(CACHE_DIR, "g_patent.tsv.zip");
  await downloadFile(BULK_PATENT_URL, patentZip);
  const patentTsv = await extractZip(patentZip, CACHE_DIR);

  // Step 4: Scan patent TSV for matching patent details
  console.log("\nStep 4: Reading patent details for matched patents...");
  const patentDetails = new Map<
    string,
    { title: string; date: string; abstract: string; type: string }
  >();

  let patentRowCount = 0;
  await readTsv(patentTsv, (fields, headers) => {
    patentRowCount++;
    if (patentRowCount % 2_000_000 === 0) {
      console.log(
        `  Scanned ${(patentRowCount / 1_000_000).toFixed(1)}M patent rows, ${patentDetails.size} details collected`
      );
    }

    const idIdx = headers.indexOf("patent_id");
    const titleIdx = headers.indexOf("patent_title");
    const dateIdx = headers.indexOf("patent_date");
    const abstractIdx = headers.indexOf("patent_abstract");
    const typeIdx = headers.indexOf("patent_type");

    if (idIdx < 0) return;

    const patentId = fields[idIdx];
    if (!patentId || !newPatentIds.has(patentId)) return;

    patentDetails.set(patentId, {
      title: fields[titleIdx] || "",
      date: fields[dateIdx] || "",
      abstract: fields[abstractIdx] || "",
      type: fields[typeIdx] || "utility",
    });
  });

  console.log(
    `  Collected details for ${patentDetails.size} patents\n`
  );

  // Step 5: Download and extract application data (for filing dates)
  console.log("Step 5: Downloading application data (filing dates)...");
  const appZip = resolve(CACHE_DIR, "g_application.tsv.zip");
  await downloadFile(BULK_APPLICATION_URL, appZip);
  const appTsv = await extractZip(appZip, CACHE_DIR);

  console.log("\nReading filing dates...");
  const filingDates = new Map<string, string>();
  let appRowCount = 0;

  await readTsv(appTsv, (fields, headers) => {
    appRowCount++;
    if (appRowCount % 2_000_000 === 0) {
      console.log(`  Scanned ${(appRowCount / 1_000_000).toFixed(1)}M application rows`);
    }

    const idIdx = headers.indexOf("patent_id");
    const dateIdx = headers.indexOf("filing_date");
    if (idIdx < 0 || dateIdx < 0) return;

    const patentId = fields[idIdx];
    if (!patentId || !newPatentIds.has(patentId)) return;

    const fd = fields[dateIdx];
    if (fd) filingDates.set(patentId, fd);
  });
  console.log(`  Collected ${filingDates.size} filing dates\n`);

  // Step 6: Download and extract inventor data
  console.log("Step 6: Downloading inventor data...");
  const inventorZip = resolve(CACHE_DIR, "g_inventor_disambiguated.tsv.zip");
  await downloadFile(BULK_INVENTOR_URL, inventorZip);
  const inventorTsv = await extractZip(inventorZip, CACHE_DIR);

  console.log("\nReading inventors...");
  const inventorMap = new Map<string, string[]>();
  let invRowCount = 0;

  await readTsv(inventorTsv, (fields, headers) => {
    invRowCount++;
    if (invRowCount % 2_000_000 === 0) {
      console.log(`  Scanned ${(invRowCount / 1_000_000).toFixed(1)}M inventor rows`);
    }

    const idIdx = headers.indexOf("patent_id");
    const firstIdx = headers.indexOf("disambig_inventor_name_first");
    const lastIdx = headers.indexOf("disambig_inventor_name_last");
    // Fallback column names
    const firstIdx2 =
      firstIdx >= 0 ? firstIdx : headers.indexOf("inventor_name_first");
    const lastIdx2 =
      lastIdx >= 0 ? lastIdx : headers.indexOf("inventor_name_last");

    if (idIdx < 0) return;

    const patentId = fields[idIdx];
    if (!patentId || !newPatentIds.has(patentId)) return;

    const firstName = fields[firstIdx >= 0 ? firstIdx : firstIdx2] || "";
    const lastName = fields[lastIdx >= 0 ? lastIdx : lastIdx2] || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ");

    if (fullName) {
      if (!inventorMap.has(patentId)) inventorMap.set(patentId, []);
      inventorMap.get(patentId)!.push(fullName);
    }
  });
  console.log(`  Collected inventors for ${inventorMap.size} patents\n`);

  // Step 7: Build and insert patent rows
  console.log("Step 7: Building patent rows and inserting...");
  const rows: PatentRow[] = [];

  for (const patentId of newPatentIds) {
    const match = matchedPatents.get(patentId)!;
    const details = patentDetails.get(patentId);

    // Skip design patents
    if (details?.type && details.type !== "utility") continue;

    rows.push({
      company_id: match.companyId,
      company_name: match.companyName,
      patent_number: patentId,
      title: details?.title || null,
      filing_date: filingDates.get(patentId) || null,
      grant_date: details?.date || null,
      abstract: details?.abstract ? details.abstract.slice(0, 5000) : null,
      inventors: inventorMap.get(patentId) || null,
      source_name: "uspto",
    });
  }

  console.log(`  Built ${rows.length} patent rows (after filtering design patents)\n`);

  // Insert in batches
  let totalInserted = 0;
  let totalErrors = 0;

  for (let i = 0; i < rows.length; i += BATCH_INSERT_SIZE) {
    const batch = rows.slice(i, i + BATCH_INSERT_SIZE);
    const { error } = await supabase
      .from("patents")
      .upsert(batch, { onConflict: "patent_number", ignoreDuplicates: true });

    if (error) {
      console.error(`  Batch insert error (${i}-${i + batch.length}): ${error.message}`);
      totalErrors++;
      // Try one-by-one
      for (const row of batch) {
        const { error: singleErr } = await supabase
          .from("patents")
          .upsert(row, { onConflict: "patent_number", ignoreDuplicates: true });
        if (!singleErr) totalInserted++;
      }
    } else {
      totalInserted += batch.length;
    }

    if ((i + BATCH_INSERT_SIZE) % 1000 === 0 || i + BATCH_INSERT_SIZE >= rows.length) {
      console.log(
        `  Inserted ${totalInserted}/${rows.length} patents...`
      );
    }
  }

  return { totalInserted, totalPatents: matchedPatents.size, totalRows: rows.length };
}

// ═══════════════════════════════════════════════════════════════════════════
// API APPROACH (requires PATENTSVIEW_API_KEY)
// ═══════════════════════════════════════════════════════════════════════════

interface PatentsViewPatent {
  patent_id?: string;
  patent_title?: string;
  patent_date?: string;
  patent_abstract?: string;
  patent_type?: string;
  assignees?: Array<{ assignee_organization?: string }>;
  inventors?: Array<{
    inventor_name_first?: string;
    inventor_name_last?: string;
  }>;
  application?: Array<{ filing_date?: string }>;
}

interface PatentsViewResponse {
  patents?: PatentsViewPatent[];
  count?: number;
  total_hits?: number;
}

function getSearchNames(name: string): string[] {
  const names: string[] = [name];
  const suffixes = [
    /,?\s*(Inc\.?|Corp\.?|Corporation|LLC|Ltd\.?|L\.?P\.?|PLC|S\.A\.?|N\.V\.?|SE|AG|GmbH|Co\.?)$/i,
    /,?\s*(Therapeutics?|Pharmaceuticals?|Biosciences?|Biotech(nology)?|Biopharma|Sciences?|Medical|Health|Genomics|Diagnostics|Oncology)$/i,
  ];
  let stripped = name;
  for (const re of suffixes) stripped = stripped.replace(re, "").trim();
  if (stripped !== name && stripped.length > 2) names.push(stripped);
  let dbl = stripped;
  for (const re of suffixes) dbl = dbl.replace(re, "").trim();
  if (dbl !== stripped && dbl.length > 2) names.push(dbl);
  return names;
}

async function fetchPatentsApi(
  assigneeName: string,
  offset = 0
): Promise<PatentsViewResponse> {
  const body = {
    q: { _text_any: { assignees: { assignee_organization: assigneeName } } },
    f: [
      "patent_id", "patent_title", "patent_date", "patent_abstract", "patent_type",
      "assignees.assignee_organization",
      "inventors.inventor_name_first", "inventors.inventor_name_last",
      "application.filing_date",
    ],
    o: { size: 100, offset },
    s: [{ patent_date: "desc" }],
  };

  try {
    const resp = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Api-Key": API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (resp.status === 429) {
      await sleep(10000);
      return fetchPatentsApi(assigneeName, offset);
    }
    if (!resp.ok) return { patents: [] };
    return (await resp.json()) as PatentsViewResponse;
  } catch {
    return { patents: [] };
  }
}

async function runApiApproach(
  companies: Company[],
  matcher: CompanyMatcher,
  existingPatentNumbers: Set<string>
) {
  console.log("=== Using PatentsView Search API ===\n");

  let totalInserted = 0;
  let totalPatentsFound = 0;
  let companiesProcessed = 0;
  let companiesWithPatents = 0;

  for (const company of companies) {
    companiesProcessed++;
    const pct = ((companiesProcessed / companies.length) * 100).toFixed(0);

    const searchNames = getSearchNames(company.name);
    let allPatents: PatentsViewPatent[] = [];

    for (const name of searchNames) {
      let offset = 0;
      while (offset < 1000) {
        await sleep(RATE_LIMIT_MS);
        const resp = await fetchPatentsApi(name, offset);
        const patents = resp.patents || [];
        if (patents.length === 0) break;
        allPatents.push(...patents);
        offset += patents.length;
        if (offset >= (resp.total_hits || 0) || patents.length < 100) break;
      }
      if (allPatents.length > 0) break;
    }

    if (allPatents.length === 0) {
      if (companiesProcessed % 50 === 0)
        console.log(`[${pct}%] ${companiesProcessed}/${companies.length} processed, ${totalInserted} inserted`);
      continue;
    }

    companiesWithPatents++;
    totalPatentsFound += allPatents.length;

    const rows: PatentRow[] = [];
    for (const p of allPatents) {
      if (!p.patent_id) continue;
      if (p.patent_type && p.patent_type !== "utility") continue;
      if (existingPatentNumbers.has(p.patent_id)) continue;

      const inventors = (p.inventors || [])
        .map((inv) => [inv.inventor_name_first, inv.inventor_name_last].filter(Boolean).join(" "))
        .filter((n) => n.length > 0);

      rows.push({
        company_id: company.id,
        company_name: company.name,
        patent_number: p.patent_id,
        title: p.patent_title || null,
        filing_date: p.application?.[0]?.filing_date || null,
        grant_date: p.patent_date || null,
        abstract: p.patent_abstract?.slice(0, 5000) || null,
        inventors: inventors.length > 0 ? inventors : null,
        source_name: "uspto",
      });
    }

    if (rows.length === 0) {
      console.log(`[${pct}%] ${company.name}: ${allPatents.length} patents, 0 new`);
      continue;
    }

    let batchInserted = 0;
    for (let i = 0; i < rows.length; i += BATCH_INSERT_SIZE) {
      const batch = rows.slice(i, i + BATCH_INSERT_SIZE);
      const { error } = await supabase
        .from("patents")
        .upsert(batch, { onConflict: "patent_number", ignoreDuplicates: true });
      if (error) {
        for (const row of batch) {
          const { error: e } = await supabase
            .from("patents")
            .upsert(row, { onConflict: "patent_number", ignoreDuplicates: true });
          if (!e) { batchInserted++; existingPatentNumbers.add(row.patent_number); }
        }
      } else {
        batchInserted += batch.length;
        for (const r of batch) existingPatentNumbers.add(r.patent_number);
      }
    }

    totalInserted += batchInserted;
    console.log(`[${pct}%] ${company.name}: ${allPatents.length} patents -> ${batchInserted} new`);
  }

  return { totalInserted, totalPatents: totalPatentsFound };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("\n=== Fetching USPTO Patent Data for Biotech Companies ===\n");

  // 1. Load all companies for matching
  console.log("Loading companies for matching...");
  const allCompanies = await loadCompanies(supabase);
  const matcher = new CompanyMatcher(allCompanies);
  console.log(`Loaded ${allCompanies.length} companies into matcher\n`);

  // 2. Get top 500 companies by valuation
  const { data: companiesRaw, error: compErr } = await supabase
    .from("companies")
    .select("id, name, ticker, valuation")
    .order("valuation", { ascending: false, nullsFirst: false })
    .limit(500);

  if (compErr) {
    console.error("Failed to fetch companies:", compErr.message);
    return;
  }

  const companies: Company[] = (companiesRaw || []) as Company[];
  console.log(`Loaded ${companies.length} companies (ordered by valuation desc)\n`);

  // 3. Get existing patent numbers for dedup
  const existingPatentNumbers = new Set<string>();
  let existingOffset = 0;
  while (true) {
    const { data: rows } = await supabase
      .from("patents")
      .select("patent_number")
      .range(existingOffset, existingOffset + 999);
    if (!rows || rows.length === 0) break;
    for (const r of rows) existingPatentNumbers.add(r.patent_number);
    existingOffset += 1000;
    if (rows.length < 1000) break;
  }
  console.log(`Existing patents in DB: ${existingPatentNumbers.size}\n`);

  // 4. Choose approach
  let result: { totalInserted: number; totalPatents: number } | undefined;

  if (API_KEY) {
    result = await runApiApproach(companies, matcher, existingPatentNumbers);
  } else {
    console.log("No PATENTSVIEW_API_KEY found. Using bulk data download approach.\n");
    console.log(
      "NOTE: This will download ~1.5GB of data on first run (cached for subsequent runs).\n" +
        "For faster targeted queries, set PATENTSVIEW_API_KEY in .env.local\n" +
        "(free key from https://patentsview-support.atlassian.net/servicedesk/customer/portals)\n"
    );
    const bulkResult = await runBulkDataApproach(
      companies,
      matcher,
      existingPatentNumbers
    );
    if (bulkResult) {
      result = {
        totalInserted: bulkResult.totalInserted,
        totalPatents: bulkResult.totalPatents,
      };
    }
  }

  // 5. Final summary
  console.log("\n=== Final Summary ===");
  console.log(`Companies queried:      ${companies.length}`);
  if (result) {
    console.log(`Total patents matched:  ${result.totalPatents}`);
    console.log(`New patents inserted:   ${result.totalInserted}`);
  }

  // Total in DB
  const { count } = await supabase
    .from("patents")
    .select("*", { count: "exact", head: true });
  console.log(`Total in patents table: ${count || 0}`);

  // Sample
  const { data: samplePatents } = await supabase
    .from("patents")
    .select("company_name, patent_number, title, grant_date")
    .order("created_at", { ascending: false })
    .limit(10);

  if (samplePatents && samplePatents.length > 0) {
    console.log("\n=== Recent Patents ===");
    for (const p of samplePatents) {
      const t = p.title
        ? p.title.length > 60
          ? p.title.slice(0, 60) + "..."
          : p.title
        : "N/A";
      console.log(`  ${p.company_name} | ${p.patent_number} | ${p.grant_date || "N/A"} | ${t}`);
    }
  }

  // Top companies by patent count
  const { data: countData } = await supabase.from("patents").select("company_name");
  if (countData && countData.length > 0) {
    const counts: Record<string, number> = {};
    for (const r of countData) counts[r.company_name] = (counts[r.company_name] || 0) + 1;
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    console.log("\n=== Top 20 Companies by Patent Count ===");
    for (const [name, cnt] of sorted) console.log(`  ${name}: ${cnt}`);
  }

  console.log("\nDone.");
}

main().catch(console.error);
