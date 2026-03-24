#!/usr/bin/env npx tsx
/**
 * Import FDA AI/ML-Enabled Medical Devices
 * Phase 2.3 of the product roadmap
 *
 * Reads scraped data from data/fda-ai-ml-devices.json and imports
 * into the ai_ml_devices table, matching companies via CompanyMatcher.
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import {
  CompanyMatcher,
  loadCompanies,
} from "./lib/company-matcher";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Types ──────────────────────────────────────────────────────────────────

interface RawDevice {
  decision_date: string;   // "MM/DD/YYYY"
  submission_number: string;
  device_name: string;
  company_name: string;
  panel: string;
  product_code: string;
}

interface AIMLDeviceRow {
  company_id: string | null;
  device_name: string;
  company_name: string;
  slug: string;
  product_type: string;
  submission_type: string | null;
  decision_date: string | null;
  medical_specialty: string;
  panel: string;
  submission_number: string;
  ai_ml_category: string;
  source_url: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  // Format: "MM/DD/YYYY"
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [month, day, year] = parts;
  if (!year || !month || !day) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function inferSubmissionType(submissionNumber: string): string | null {
  if (!submissionNumber) return null;
  const upper = submissionNumber.toUpperCase();
  if (upper.startsWith("K")) return "510k";
  if (upper.startsWith("P")) return "pma";
  if (upper.startsWith("DEN")) return "denovo";
  return null;
}

function generateSlug(deviceName: string, submissionNumber: string): string {
  const namePart = deviceName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);
  const subPart = submissionNumber.toLowerCase();
  return `${namePart}-${subPart}`;
}

/**
 * Map the FDA panel name to an AI/ML category.
 * The panel field from FDA is the medical specialty area.
 */
function panelToCategory(panel: string): string {
  // The panel IS the category for AI/ML devices
  return panel || "Unknown";
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== Importing FDA AI/ML-Enabled Medical Devices ===\n");

  // 1. Load raw device data
  const dataPath = resolve(__dirname, "../data/fda-ai-ml-devices.json");
  const rawDevices: RawDevice[] = JSON.parse(readFileSync(dataPath, "utf-8"));
  console.log(`Loaded ${rawDevices.length} devices from FDA data file`);

  // 2. Load companies and build matcher
  console.log("Loading companies for matching...");
  const companyRecords = await loadCompanies(supabase);
  const matcher = new CompanyMatcher(companyRecords);
  console.log(`Loaded ${companyRecords.length} companies\n`);

  // 3. Check existing entries for dedup
  const { data: existingData } = await supabase
    .from("ai_ml_devices")
    .select("submission_number");

  const existingNumbers = new Set(
    (existingData || []).map((r: { submission_number: string }) => r.submission_number)
  );
  console.log(`Existing AI/ML device entries: ${existingNumbers.size}`);

  // 4. Transform and match
  let matchedCount = 0;
  let unmatchedCount = 0;
  let skippedDuplicates = 0;
  const categoryCounts: Record<string, number> = {};
  const submissionTypeCounts: Record<string, number> = {};
  const rows: AIMLDeviceRow[] = [];

  for (const device of rawDevices) {
    // Skip if already exists
    if (existingNumbers.has(device.submission_number)) {
      skippedDuplicates++;
      continue;
    }

    // Match company
    const companyId = matcher.match(device.company_name);
    if (companyId) {
      matchedCount++;
    } else {
      unmatchedCount++;
    }

    const submissionType = inferSubmissionType(device.submission_number);
    const category = panelToCategory(device.panel);
    const decisionDate = parseDate(device.decision_date);
    const slug = generateSlug(device.device_name, device.submission_number);

    // Track stats
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    const stKey = submissionType || "unknown";
    submissionTypeCounts[stKey] = (submissionTypeCounts[stKey] || 0) + 1;

    rows.push({
      company_id: companyId,
      device_name: device.device_name,
      company_name: device.company_name,
      slug,
      product_type: "ai_ml",
      submission_type: submissionType,
      decision_date: decisionDate,
      medical_specialty: device.panel,
      panel: device.panel,
      submission_number: device.submission_number,
      ai_ml_category: category,
      source_url: "https://www.fda.gov/medical-devices/software-medical-device-samd/artificial-intelligence-enabled-medical-devices",
    });
  }

  console.log(`\nNew devices to insert: ${rows.length}`);
  console.log(`Skipped (already exists): ${skippedDuplicates}`);
  console.log(`Matched to companies: ${matchedCount}`);
  console.log(`Unmatched: ${unmatchedCount}`);

  // 5. Insert in batches
  let totalInserted = 0;
  let insertErrors = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("ai_ml_devices")
      .upsert(batch, {
        onConflict: "submission_number",
        ignoreDuplicates: true,
      });

    if (error) {
      console.error(`  Insert error (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${error.message}`);
      insertErrors++;
    } else {
      totalInserted += batch.length;
    }

    // Progress
    if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= rows.length) {
      const pct = Math.min(100, Math.round(((i + BATCH_SIZE) / rows.length) * 100));
      console.log(`  [${pct}%] Inserted ${totalInserted}/${rows.length}...`);
    }
  }

  // 6. Final stats
  const { count: totalCount } = await supabase
    .from("ai_ml_devices")
    .select("*", { count: "exact", head: true });

  const { count: matchedTotal } = await supabase
    .from("ai_ml_devices")
    .select("*", { count: "exact", head: true })
    .not("company_id", "is", null);

  console.log("\n=== Import Summary ===");
  console.log(`Total AI/ML devices in database: ${totalCount}`);
  console.log(`Matched to companies:            ${matchedTotal}`);
  console.log(`New entries inserted:            ${totalInserted}`);
  console.log(`Insert errors:                   ${insertErrors}`);

  // Category breakdown
  console.log("\nBy AI/ML Category (medical specialty):");
  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sortedCategories) {
    console.log(`  ${cat}: ${count}`);
  }

  // Submission type breakdown
  console.log("\nBy Submission Type:");
  const sortedTypes = Object.entries(submissionTypeCounts).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sortedTypes) {
    console.log(`  ${type}: ${count}`);
  }

  // Date range
  const dates = rows
    .map((r) => r.decision_date)
    .filter(Boolean)
    .sort() as string[];
  if (dates.length > 0) {
    console.log(`\nDate range: ${dates[0]} to ${dates[dates.length - 1]}`);
  }

  // Top companies
  const { data: topCompanies } = await supabase
    .from("ai_ml_devices")
    .select("company_name")
    .not("company_id", "is", null);

  if (topCompanies) {
    const companyCounts: Record<string, number> = {};
    for (const r of topCompanies) {
      companyCounts[r.company_name] = (companyCounts[r.company_name] || 0) + 1;
    }
    const top20 = Object.entries(companyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    console.log("\nTop 20 companies (matched) by device count:");
    for (const [name, count] of top20) {
      console.log(`  ${name}: ${count}`);
    }
  }
}

main().catch(console.error);
