#!/usr/bin/env npx tsx
/**
 * Batch Report Pre-Generation Script (Parallel)
 *
 * Generates reports for companies that don't have one yet (or have expired reports).
 * Runs multiple workers in parallel for ~8x speedup.
 *
 * Usage:
 *   npx tsx scripts/batch-generate-reports.ts
 *   npx tsx scripts/batch-generate-reports.ts --limit 500
 *   npx tsx scripts/batch-generate-reports.ts --limit 11000 --workers 10
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load env vars from .env.local
config({ path: resolve(__dirname, "../.env.local") });

import { createClient } from "@supabase/supabase-js";

const REPORT_TTL_DAYS = 7;
const DEFAULT_LIMIT = 11000;
const DEFAULT_WORKERS = 8;
const DELAY_BETWEEN_CALLS_MS = 500; // shorter delay since we're rate-limited by Claude API anyway

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  return createClient(url, key);
}

function parseArgs(): { limit: number; workers: number } {
  const args = process.argv.slice(2);
  let limit = DEFAULT_LIMIT;
  let workers = DEFAULT_WORKERS;

  const limitIndex = args.indexOf("--limit");
  if (limitIndex !== -1 && args[limitIndex + 1]) {
    const parsed = parseInt(args[limitIndex + 1], 10);
    if (!isNaN(parsed) && parsed > 0) limit = parsed;
  }

  const workersIndex = args.indexOf("--workers");
  if (workersIndex !== -1 && args[workersIndex + 1]) {
    const parsed = parseInt(args[workersIndex + 1], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 20) workers = parsed;
  }

  return { limit, workers };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface CompanyRow {
  id: string;
  slug: string;
  name: string;
  valuation: number | null;
}

interface ReportRow {
  report_slug: string;
  analyzed_at: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCompaniesNeedingReports(
  supabase: any,
  limit: number
): Promise<CompanyRow[]> {
  // Supabase has a max of 1000 rows per query, so paginate
  const allCompanies: CompanyRow[] = [];
  const pageSize = 1000;
  let offset = 0;
  const fetchLimit = Math.min(limit * 2, 12000); // fetch extra to filter

  while (offset < fetchLimit) {
    const { data: page, error } = await supabase
      .from("companies")
      .select("id, slug, name, valuation")
      .order("valuation", { ascending: false, nullsFirst: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("Error fetching companies:", error.message);
      process.exit(1);
    }

    if (!page || page.length === 0) break;
    allCompanies.push(...(page as CompanyRow[]));
    offset += pageSize;
    if (page.length < pageSize) break; // last page
  }

  if (allCompanies.length === 0) {
    console.log("No companies found in database.");
    process.exit(0);
  }

  console.log(`  Fetched ${allCompanies.length} companies from database.`);

  // Fetch all existing reports (also paginate)
  const allReports: ReportRow[] = [];
  offset = 0;
  while (true) {
    const { data: page, error } = await supabase
      .from("company_reports")
      .select("report_slug, analyzed_at")
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("Error fetching reports:", error.message);
      process.exit(1);
    }

    if (!page || page.length === 0) break;
    allReports.push(...(page as ReportRow[]));
    offset += pageSize;
    if (page.length < pageSize) break;
  }

  console.log(`  Found ${allReports.length} existing reports.`);

  const reportMap = new Map<string, ReportRow>();
  for (const r of allReports) {
    reportMap.set(r.report_slug, r);
  }

  const now = Date.now();
  const ttlMs = REPORT_TTL_DAYS * 24 * 60 * 60 * 1000;

  // Filter to companies that need reports
  const needsReport = allCompanies.filter((c) => {
    const existing = reportMap.get(c.slug);
    if (!existing) return true;
    if (!existing.analyzed_at) return true;
    const age = now - new Date(existing.analyzed_at).getTime();
    return age > ttlMs;
  });

  return needsReport.slice(0, limit);
}

async function generateReportForSlug(slug: string): Promise<{ success: boolean; cached?: boolean; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/reports/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
      signal: AbortSignal.timeout(180000), // 3 minute timeout per report
    });

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
    }

    const data = await res.json();
    return { success: true, cached: data.cached || false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

// Shared counters (safe because Node is single-threaded)
let successCount = 0;
let failCount = 0;
let cachedCount = 0;
let completedCount = 0;
const failures: { name: string; slug: string; error: string }[] = [];

async function worker(
  workerId: number,
  companies: CompanyRow[],
  totalCompanies: number
): Promise<void> {
  for (const company of companies) {
    completedCount++;
    const progress = `[W${workerId}] ${completedCount}/${totalCompanies}`;
    console.log(`${progress} Generating: ${company.name} (${company.slug})`);

    const result = await generateReportForSlug(company.slug);

    if (result.success) {
      if (result.cached) {
        console.log(`${progress}   ✓ Cached`);
        cachedCount++;
      } else {
        console.log(`${progress}   ✓ Generated`);
        successCount++;
      }
    } else {
      console.log(`${progress}   ✗ FAILED: ${result.error}`);
      failCount++;
      failures.push({ name: company.name, slug: company.slug, error: result.error || "Unknown" });
    }

    // Small delay to be nice to rate limits
    await sleep(DELAY_BETWEEN_CALLS_MS);
  }
}

async function main() {
  const { limit, workers: numWorkers } = parseArgs();
  const supabase = getSupabase();

  const startTime = Date.now();

  console.log(`\n🚀 Batch Report Generator (Parallel)`);
  console.log(`====================================`);
  console.log(`Limit: ${limit} companies`);
  console.log(`Workers: ${numWorkers} parallel`);
  console.log(`Report TTL: ${REPORT_TTL_DAYS} days`);
  console.log(`Delay between calls: ${DELAY_BETWEEN_CALLS_MS}ms per worker\n`);

  console.log("Fetching companies that need reports...");
  const companies = await getCompaniesNeedingReports(supabase, limit);

  if (companies.length === 0) {
    console.log("✅ All companies already have up-to-date reports. Nothing to do.");
    process.exit(0);
  }

  console.log(`\n📋 Found ${companies.length} companies needing reports.`);
  console.log(`   Splitting across ${numWorkers} workers (~${Math.ceil(companies.length / numWorkers)} each)\n`);

  // Split companies across workers
  const chunks: CompanyRow[][] = Array.from({ length: numWorkers }, () => []);
  for (let i = 0; i < companies.length; i++) {
    chunks[i % numWorkers].push(companies[i]);
  }

  // Launch all workers in parallel
  const workerPromises = chunks.map((chunk, i) => {
    if (chunk.length === 0) return Promise.resolve();
    return worker(i + 1, chunk, companies.length);
  });

  await Promise.all(workerPromises);

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const elapsedMin = Math.round(elapsed / 60);

  // Summary
  console.log(`\n====================================`);
  console.log(`🏁 Batch Generation Complete`);
  console.log(`====================================`);
  console.log(`Total:     ${companies.length}`);
  console.log(`Generated: ${successCount}`);
  console.log(`Cached:    ${cachedCount}`);
  console.log(`Failed:    ${failCount}`);
  console.log(`Time:      ${elapsedMin}m ${elapsed % 60}s`);
  console.log(`Speed:     ${(companies.length / (elapsed / 60)).toFixed(1)} reports/min`);

  if (failures.length > 0) {
    console.log(`\n❌ Failed companies (${failures.length}):`);
    for (const f of failures) {
      console.log(`  - ${f.name} (${f.slug}): ${f.error}`);
    }
  }

  console.log("");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
