#!/usr/bin/env npx tsx
/**
 * Fetch FDA drug approval data from the openFDA API
 * for all companies in the database.
 *
 * Inserts results into the `fda_approvals` table, deduplicating by
 * application_number + drug_name.
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";
import {
  CompanyMatcher,
  loadCompanies,
  type CompanyRecord,
} from "./lib/company-matcher";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Types ──────────────────────────────────────────────────────────────────

interface FDAProduct {
  brand_name?: string;
  active_ingredients?: Array<{ name?: string; strength?: string }>;
  dosage_form?: string;
  route?: string;
}

interface FDASubmission {
  submission_type?: string; // "ORIG", "SUPPL", etc.
  submission_status?: string;
  submission_status_date?: string; // "YYYYMMDD"
  submission_number?: string;
}

interface FDADrugResult {
  application_number?: string; // e.g. "NDA021436" or "BLA125057"
  sponsor_name?: string;
  products?: FDAProduct[];
  submissions?: FDASubmission[];
}

interface FDAApprovalRow {
  company_id: string | null;
  company_name: string;
  drug_name: string;
  active_ingredient: string | null;
  application_number: string | null;
  application_type: string | null;
  approval_date: string | null;
  indication: string | null;
  dosage_form: string | null;
  route: string | null;
  source_name: string;
}

// ── Rate limiter ───────────────────────────────────────────────────────────

class RateLimiter {
  private timestamps: number[] = [];
  constructor(private maxPerSec: number) {}

  async wait() {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < 1000);
    if (this.timestamps.length >= this.maxPerSec) {
      const oldest = this.timestamps[0];
      const delay = 1000 - (now - oldest) + 10;
      await new Promise((r) => setTimeout(r, delay));
    }
    this.timestamps.push(Date.now());
  }
}

const rateLimiter = new RateLimiter(3);

// ── openFDA fetcher ────────────────────────────────────────────────────────

const FDA_BASE = "https://api.fda.gov/drug/drugsfda.json";

async function fetchFDAApprovals(
  sponsorName: string
): Promise<FDADrugResult[]> {
  const allResults: FDADrugResult[] = [];
  let skip = 0;
  const limit = 100;

  // Use openfda.manufacturer_name for better matching (tokenized, case-insensitive)
  // Extract first meaningful word(s) from company name for searching
  const searchTerms = sponsorName
    .replace(/[,."'()]/g, "")
    .replace(
      /\b(Inc|Corp|Corporation|Ltd|Limited|LLC|PLC|plc|SA|SE|NV|AG|Co|Group|Holdings?|Pharmaceutical[s]?|Therapeutics?|Biosciences?|Biopharma|Biotech(nology)?|Laboratories|Labs?)\b/gi,
      ""
    )
    .trim();

  if (!searchTerms || searchTerms.length < 2) return allResults;

  // Use + to combine multi-word names into AND query
  const queryTerms = searchTerms
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .map((t) => encodeURIComponent(t))
    .join("+AND+");

  if (!queryTerms) return allResults;

  do {
    await rateLimiter.wait();
    const url = `${FDA_BASE}?search=openfda.manufacturer_name:(${queryTerms})&limit=${limit}&skip=${skip}`;

    try {
      const resp = await fetch(url);

      if (resp.status === 404) {
        // No results found for this sponsor
        break;
      }

      if (resp.status === 429) {
        // Rate limited, wait and retry
        console.log(`  Rate limited, waiting 10s...`);
        await new Promise((r) => setTimeout(r, 10000));
        continue;
      }

      if (!resp.ok) {
        console.error(
          `  API error ${resp.status} for "${sponsorName}"`
        );
        break;
      }

      const data = await resp.json();
      const results: FDADrugResult[] = data.results || [];
      allResults.push(...results);

      // If we got fewer than limit, we've exhausted results
      if (results.length < limit) break;
      skip += limit;

      // openFDA caps at skip=25000
      if (skip >= 25000) break;
    } catch (err: unknown) {
      console.error(`  Fetch error for "${sponsorName}": ${err}`);
      break;
    }
  } while (true);

  return allResults;
}

// ── Parse approval date ────────────────────────────────────────────────────

function parseApprovalDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  // openFDA dates are "YYYYMMDD" format
  if (/^\d{8}$/.test(dateStr)) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  return null;
}

// ── Parse application type from application_number ─────────────────────────

function parseAppType(appNumber: string | undefined): string | null {
  if (!appNumber) return null;
  if (appNumber.startsWith("NDA")) return "NDA";
  if (appNumber.startsWith("BLA")) return "BLA";
  if (appNumber.startsWith("ANDA")) return "ANDA";
  return null;
}

// ── Extract approval rows from FDA results ─────────────────────────────────

function extractApprovalRows(
  results: FDADrugResult[],
  companyId: string | null,
  companyName: string
): FDAApprovalRow[] {
  const rows: FDAApprovalRow[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    const appNumber = result.application_number || null;
    const appType = parseAppType(result.application_number);
    const sponsorName = result.sponsor_name || companyName;

    // Find original approval submission
    const origSubmission = (result.submissions || []).find(
      (s) => s.submission_type === "ORIG" && s.submission_status === "AP"
    );

    // Fall back to any approved submission
    const approvedSubmission =
      origSubmission ||
      (result.submissions || []).find((s) => s.submission_status === "AP");

    const approvalDate = parseApprovalDate(
      approvedSubmission?.submission_status_date
    );

    // Process each product
    const products = result.products || [];
    if (products.length === 0) {
      // No products, still record the application
      const key = `${appNumber}::unknown`;
      if (seen.has(key)) continue;
      seen.add(key);

      rows.push({
        company_id: companyId,
        company_name: sponsorName,
        drug_name: "Unknown",
        active_ingredient: null,
        application_number: appNumber,
        application_type: appType,
        approval_date: approvalDate,
        indication: null,
        dosage_form: null,
        route: null,
        source_name: "openfda",
      });
      continue;
    }

    for (const product of products) {
      const drugName = product.brand_name || "Unknown";
      const key = `${appNumber}::${drugName.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const activeIngredients = (product.active_ingredients || [])
        .map((ai) => ai.name)
        .filter(Boolean)
        .join(", ");

      rows.push({
        company_id: companyId,
        company_name: sponsorName,
        drug_name: drugName,
        active_ingredient: activeIngredients || null,
        application_number: appNumber,
        application_type: appType,
        approval_date: approvalDate,
        indication: null,
        dosage_form: product.dosage_form || null,
        route: product.route || null,
        source_name: "openfda",
      });
    }
  }

  return rows;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== Fetching FDA Drug Approval Data ===\n");

  // 1. Load companies and build matcher
  console.log("Loading companies...");
  const companyRecords: CompanyRecord[] = await loadCompanies(supabase);
  const matcher = new CompanyMatcher(companyRecords);
  console.log(`Loaded ${companyRecords.length} companies for matching\n`);

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

  interface CompanyRow {
    id: string;
    name: string;
    ticker: string | null;
    valuation: number | null;
  }
  const companies: CompanyRow[] = (companiesRaw || []) as CompanyRow[];
  console.log(
    `Processing top ${companies.length} companies by valuation\n`
  );

  // 3. Get existing entries for dedup
  const { data: existingRows } = await supabase
    .from("fda_approvals")
    .select("application_number, drug_name");

  const existingKeys = new Set(
    (existingRows || [])
      .map(
        (r: { application_number: string; drug_name: string }) =>
          `${r.application_number}::${r.drug_name.toLowerCase()}`
      )
      .filter(Boolean)
  );
  console.log(`Existing FDA approval entries: ${existingKeys.size}\n`);

  // 4. Process each company
  let totalInserted = 0;
  let totalApprovals = 0;
  let companiesProcessed = 0;
  let companiesWithApprovals = 0;
  let apiErrors = 0;
  const approvalCounts: Map<string, number> = new Map();

  for (const company of companies) {
    companiesProcessed++;
    const pct = ((companiesProcessed / companies.length) * 100).toFixed(0);

    // Query openFDA by sponsor name
    let results = await fetchFDAApprovals(company.name);

    // If no results, try stripping common suffixes
    if (results.length === 0) {
      const altName = company.name
        .replace(
          /,?\s*(Inc\.?|Corp\.?|Corporation|Ltd\.?|Limited|LLC|PLC|plc|S\.A\.?|SE|NV|AG|Co\.?|Group|Holdings?|Pharmaceuticals?|Therapeutics?|Biosciences?|Biopharma|Biotech(nology)?)\s*/gi,
          " "
        )
        .trim();
      if (altName !== company.name && altName.length > 2) {
        results = await fetchFDAApprovals(altName);
      }
    }

    if (results.length === 0) {
      if (companiesProcessed % 50 === 0) {
        console.log(
          `[${pct}%] ${companiesProcessed}/${companies.length} processed, ${totalInserted} inserted so far`
        );
      }
      continue;
    }

    companiesWithApprovals++;
    totalApprovals += results.length;

    // Match sponsor to company ID using CompanyMatcher
    const rows = extractApprovalRows(results, null, company.name);

    // Set company_id on all rows using matcher
    for (const row of rows) {
      const matchedId = matcher.match(row.company_name) || company.id;
      row.company_id = matchedId;
    }

    // Filter out existing entries
    const newRows = rows.filter((r) => {
      const key = `${r.application_number}::${r.drug_name.toLowerCase()}`;
      return !existingKeys.has(key);
    });

    if (newRows.length === 0) {
      console.log(
        `[${pct}%] ${company.name}: ${results.length} applications, ${rows.length} products, 0 new`
      );
      // Still track the count
      const countForCompany = rows.filter(
        (r) => r.company_id === company.id
      ).length;
      if (countForCompany > 0) {
        approvalCounts.set(
          company.id,
          (approvalCounts.get(company.id) || 0) + countForCompany
        );
      }
      continue;
    }

    // Insert in batches of 100
    let batchInserted = 0;
    for (let i = 0; i < newRows.length; i += 100) {
      const batch = newRows.slice(i, i + 100);
      const { error } = await supabase
        .from("fda_approvals")
        .upsert(batch, {
          onConflict: "application_number,drug_name",
          ignoreDuplicates: true,
        });
      if (error) {
        console.error(`  Insert error for ${company.name}: ${error.message}`);
        apiErrors++;
      } else {
        batchInserted += batch.length;
        for (const r of batch) {
          existingKeys.add(
            `${r.application_number}::${r.drug_name.toLowerCase()}`
          );
        }
      }
    }

    totalInserted += batchInserted;

    // Track approval counts per company
    const countForCompany = rows.filter(
      (r) => r.company_id === company.id
    ).length;
    if (countForCompany > 0) {
      approvalCounts.set(
        company.id,
        (approvalCounts.get(company.id) || 0) + countForCompany
      );
    }

    console.log(
      `[${pct}%] ${company.name}: ${results.length} applications -> ${rows.length} products, ${batchInserted} new inserted`
    );
  }

  // 5. Update fda_approval_count on companies
  console.log("\nUpdating fda_approval_count on companies...");

  // Compute counts from all fda_approvals in DB
  const { data: countData } = await supabase
    .from("fda_approvals")
    .select("company_id");

  const dbCounts: Map<string, number> = new Map();
  for (const row of countData || []) {
    if (row.company_id) {
      dbCounts.set(row.company_id, (dbCounts.get(row.company_id) || 0) + 1);
    }
  }

  let countUpdated = 0;
  for (const [companyId, count] of dbCounts) {
    const { error } = await supabase
      .from("companies")
      .update({ fda_approval_count: count })
      .eq("id", companyId);
    if (error) {
      console.error(`  Count update error for ${companyId}: ${error.message}`);
    } else {
      countUpdated++;
    }
  }
  console.log(`Updated fda_approval_count for ${countUpdated} companies`);

  // 6. Summary
  console.log("\n=== Summary ===");
  console.log(`Companies processed:       ${companiesProcessed}`);
  console.log(`Companies with approvals:  ${companiesWithApprovals}`);
  console.log(`Total FDA applications:    ${totalApprovals}`);
  console.log(`New entries inserted:      ${totalInserted}`);
  console.log(`Total in fda_approvals:    ${existingKeys.size}`);
  console.log(`API errors:                ${apiErrors}`);

  // Application type breakdown
  const { data: typeData } = await supabase
    .from("fda_approvals")
    .select("application_type");
  if (typeData) {
    const typeCounts: Record<string, number> = {};
    for (const r of typeData) {
      const t = r.application_type || "Unknown";
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    }
    console.log("\nApplication type breakdown:");
    for (const [type, count] of Object.entries(typeCounts).sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`  ${type}: ${count}`);
    }
  }

  // Top companies by approval count
  const sortedCounts = Array.from(dbCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  if (sortedCounts.length > 0) {
    console.log("\nTop 20 companies by FDA approvals:");
    const companyNames = new Map(
      companyRecords.map((c) => [c.id, c.name])
    );
    for (const [id, count] of sortedCounts) {
      const name = companyNames.get(id) || id;
      console.log(`  ${name}: ${count}`);
    }
  }
}

main().catch(console.error);
