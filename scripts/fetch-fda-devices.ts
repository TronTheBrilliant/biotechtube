#!/usr/bin/env npx tsx
/**
 * Phase 2.2: Fetch FDA 510(k) cleared and PMA approved medical devices
 * from the openFDA API and import into the medical_devices table.
 *
 * Sources:
 *   - 510(k): https://api.fda.gov/device/510k.json
 *   - PMA:    https://api.fda.gov/device/pma.json
 *
 * Rate limit: 240 requests/min without API key. We use 300ms delay between requests.
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";
import {
  CompanyMatcher,
  loadCompanies,
} from "./lib/company-matcher";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Types ──────────────────────────────────────────────────────────────────

interface Device510kResult {
  k_number?: string;
  device_name?: string;
  applicant?: string;
  decision_date?: string; // YYYY-MM-DD or YYYYMMDD
  product_code?: string;
  clearance_type?: string;
  advisory_committee_description?: string;
  advisory_committee?: string;
  review_panel?: string;
  device_class?: string;
  medical_specialty_description?: string;
}

interface DevicePMAResult {
  pma_number?: string;
  trade_name?: string;
  applicant?: string;
  decision_date?: string;
  product_code?: string;
  advisory_committee_description?: string;
  advisory_committee?: string;
  generic_name?: string;
  decision_code?: string;
}

interface DeviceRow {
  company_id: string | null;
  device_name: string;
  company_name: string | null;
  slug: string;
  product_type: string;
  submission_type: string;
  decision: string;
  decision_date: string | null;
  product_code: string | null;
  device_class: string | null;
  medical_specialty: string | null;
  review_panel: string | null;
  submission_number: string;
  source_url: string;
}

// ── Biotech-relevant medical specialties / review panels ──────────────────

const BIOTECH_PANELS = new Set([
  "AN",  // Anesthesiology
  "CH",  // Clinical Chemistry
  "CV",  // Cardiovascular
  "DE",  // Dental
  "EN",  // Ear, Nose, Throat
  "GU",  // Gastroenterology/Urology
  "HE",  // Hematology
  "HO",  // General Hospital
  "IM",  // Immunology
  "MI",  // Microbiology
  "MO",  // Molecular Genetics
  "NE",  // Neurology
  "OB",  // Obstetrics/Gynecology
  "OP",  // Ophthalmic
  "OR",  // Orthopedic
  "PA",  // Pathology
  "PM",  // Physical Medicine
  "RA",  // Radiology
  "SU",  // General/Plastic Surgery
  "TX",  // Clinical Toxicology
]);

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  // Handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // Handle YYYYMMDD
  if (/^\d{8}$/.test(dateStr)) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  return null;
}

function makeSlug(deviceName: string, submissionNumber: string): string {
  const namePart = deviceName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return `${namePart}-${submissionNumber.toLowerCase()}`;
}

// ── Fetch 510(k) data ─────────────────────────────────────────────────────

async function fetch510kDevices(): Promise<DeviceRow[]> {
  console.log("\n--- Fetching 510(k) Clearances ---\n");
  const devices: DeviceRow[] = [];
  let skip = 0;
  const limit = 100;
  let totalAvailable = 0;
  let requestCount = 0;

  while (true) {
    await sleep(300);
    requestCount++;

    const url = `https://api.fda.gov/device/510k.json?search=decision_date:[20150101+TO+20261231]&limit=${limit}&skip=${skip}&sort=decision_date:desc`;

    try {
      const resp = await fetch(url);

      if (resp.status === 404) {
        console.log("  No more 510(k) results.");
        break;
      }

      if (resp.status === 429) {
        console.log("  Rate limited, waiting 10s...");
        await sleep(10000);
        continue;
      }

      if (!resp.ok) {
        console.error(`  API error ${resp.status} at skip=${skip}`);
        // Try to continue
        skip += limit;
        if (skip >= 26000) break;
        continue;
      }

      const data = await resp.json();
      if (requestCount === 1 && data.meta?.results?.total) {
        totalAvailable = data.meta.results.total;
        console.log(`  Total 510(k) results available: ${totalAvailable}`);
      }

      const results: Device510kResult[] = data.results || [];
      if (results.length === 0) break;

      for (const r of results) {
        if (!r.k_number || !r.device_name) continue;

        // Filter for biotech-relevant panels
        const panel = r.advisory_committee || r.review_panel || "";
        if (BIOTECH_PANELS.size > 0 && panel && !BIOTECH_PANELS.has(panel)) continue;

        devices.push({
          company_id: null,
          device_name: r.device_name,
          company_name: r.applicant || null,
          slug: makeSlug(r.device_name, r.k_number),
          product_type: "device",
          submission_type: "510k",
          decision: "cleared",
          decision_date: parseDate(r.decision_date),
          product_code: r.product_code || null,
          device_class: r.device_class || null,
          medical_specialty: r.advisory_committee_description || r.medical_specialty_description || null,
          review_panel: panel || null,
          submission_number: r.k_number,
          source_url: `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=${r.k_number}`,
        });
      }

      if (results.length < limit) break;
      skip += limit;
      if (skip >= 26000) {
        console.log("  Reached openFDA skip limit (26000) for 510(k).");
        break;
      }

      if (requestCount % 20 === 0) {
        console.log(`  510(k): ${requestCount} requests, ${devices.length} devices collected, skip=${skip}`);
      }
    } catch (err) {
      console.error(`  Fetch error at skip=${skip}: ${err}`);
      skip += limit;
      if (skip >= 26000) break;
    }
  }

  console.log(`  510(k) total collected: ${devices.length} devices from ${requestCount} requests`);
  return devices;
}

// ── Fetch PMA data ────────────────────────────────────────────────────────

async function fetchPMADevices(): Promise<DeviceRow[]> {
  console.log("\n--- Fetching PMA Approvals ---\n");
  const devices: DeviceRow[] = [];
  let skip = 0;
  const limit = 100;
  let totalAvailable = 0;
  let requestCount = 0;

  while (true) {
    await sleep(300);
    requestCount++;

    const url = `https://api.fda.gov/device/pma.json?search=decision_date:[20150101+TO+20261231]&limit=${limit}&skip=${skip}&sort=decision_date:desc`;

    try {
      const resp = await fetch(url);

      if (resp.status === 404) {
        console.log("  No more PMA results.");
        break;
      }

      if (resp.status === 429) {
        console.log("  Rate limited, waiting 10s...");
        await sleep(10000);
        continue;
      }

      if (!resp.ok) {
        console.error(`  API error ${resp.status} at skip=${skip}`);
        skip += limit;
        if (skip >= 26000) break;
        continue;
      }

      const data = await resp.json();
      if (requestCount === 1 && data.meta?.results?.total) {
        totalAvailable = data.meta.results.total;
        console.log(`  Total PMA results available: ${totalAvailable}`);
      }

      const results: DevicePMAResult[] = data.results || [];
      if (results.length === 0) break;

      for (const r of results) {
        if (!r.pma_number) continue;
        const deviceName = r.trade_name || r.generic_name || "Unknown Device";

        // PMA devices are typically Class III and biotech-relevant
        devices.push({
          company_id: null,
          device_name: deviceName,
          company_name: r.applicant || null,
          slug: makeSlug(deviceName, r.pma_number),
          product_type: "device",
          submission_type: "pma",
          decision: "approved",
          decision_date: parseDate(r.decision_date),
          product_code: r.product_code || null,
          device_class: "III",
          medical_specialty: r.advisory_committee_description || null,
          review_panel: r.advisory_committee || null,
          submission_number: r.pma_number,
          source_url: `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=${r.pma_number}`,
        });
      }

      if (results.length < limit) break;
      skip += limit;
      if (skip >= 26000) {
        console.log("  Reached openFDA skip limit (26000) for PMA.");
        break;
      }

      if (requestCount % 20 === 0) {
        console.log(`  PMA: ${requestCount} requests, ${devices.length} devices collected, skip=${skip}`);
      }
    } catch (err) {
      console.error(`  Fetch error at skip=${skip}: ${err}`);
      skip += limit;
      if (skip >= 26000) break;
    }
  }

  console.log(`  PMA total collected: ${devices.length} devices from ${requestCount} requests`);
  return devices;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== Phase 2.2: Importing FDA Medical Devices ===\n");

  // 1. Load companies and build matcher
  console.log("Loading companies for matching...");
  const companyRecords = await loadCompanies(supabase);
  const matcher = new CompanyMatcher(companyRecords);
  console.log(`Loaded ${companyRecords.length} companies\n`);

  // 2. Check existing devices for deduplication
  const { data: existingDevices } = await supabase
    .from("medical_devices")
    .select("submission_number");

  const existingNumbers = new Set(
    (existingDevices || []).map((d: { submission_number: string }) => d.submission_number)
  );
  console.log(`Existing devices in DB: ${existingNumbers.size}\n`);

  // 3. Fetch from openFDA
  const devices510k = await fetch510kDevices();
  const devicesPMA = await fetchPMADevices();
  const allDevices = [...devices510k, ...devicesPMA];

  console.log(`\nTotal devices fetched: ${allDevices.length}`);
  console.log(`  510(k): ${devices510k.length}`);
  console.log(`  PMA:    ${devicesPMA.length}`);

  // 4. Deduplicate against existing data
  const newDevices = allDevices.filter(
    (d) => !existingNumbers.has(d.submission_number)
  );
  console.log(`New devices to insert: ${newDevices.length}`);

  if (newDevices.length === 0) {
    console.log("\nNo new devices to insert. Done.");
    return;
  }

  // 5. Match companies
  let matched = 0;
  for (const device of newDevices) {
    if (device.company_name) {
      const companyId = matcher.match(device.company_name);
      if (companyId) {
        device.company_id = companyId;
        matched++;
      }
    }
  }
  console.log(`Matched to existing companies: ${matched} / ${newDevices.length} (${((matched / newDevices.length) * 100).toFixed(1)}%)\n`);

  // 6. Insert in batches
  let totalInserted = 0;
  let errors = 0;
  const batchSize = 200;

  for (let i = 0; i < newDevices.length; i += batchSize) {
    const batch = newDevices.slice(i, i + batchSize);
    const { error } = await supabase
      .from("medical_devices")
      .upsert(batch, {
        onConflict: "submission_number",
        ignoreDuplicates: true,
      });

    if (error) {
      console.error(`  Batch insert error at offset ${i}: ${error.message}`);
      errors++;
      // Try inserting one by one for this batch
      for (const device of batch) {
        const { error: singleErr } = await supabase
          .from("medical_devices")
          .upsert(device, {
            onConflict: "submission_number",
            ignoreDuplicates: true,
          });
        if (!singleErr) {
          totalInserted++;
        }
      }
    } else {
      totalInserted += batch.length;
    }

    if ((i / batchSize) % 10 === 0 && i > 0) {
      console.log(`  Inserted ${totalInserted} / ${newDevices.length}...`);
    }
  }

  console.log(`\nInserted ${totalInserted} devices (${errors} batch errors)\n`);

  // 7. Stats
  await printStats();
}

async function printStats() {
  console.log("\n=== Import Statistics ===\n");

  // Total count
  const { count: totalCount } = await supabase
    .from("medical_devices")
    .select("*", { count: "exact", head: true });
  console.log(`Total devices in DB: ${totalCount}`);

  // By submission type
  const { data: byType } = await supabase
    .from("medical_devices")
    .select("submission_type");
  const typeCounts: Record<string, number> = {};
  for (const r of byType || []) {
    const t = r.submission_type || "unknown";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  console.log("\nBy submission type:");
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }

  // Matched vs unmatched
  const { count: matchedCount } = await supabase
    .from("medical_devices")
    .select("*", { count: "exact", head: true })
    .not("company_id", "is", null);
  const { count: unmatchedCount } = await supabase
    .from("medical_devices")
    .select("*", { count: "exact", head: true })
    .is("company_id", null);
  console.log(`\nCompany matching:`);
  console.log(`  Matched:   ${matchedCount}`);
  console.log(`  Unmatched: ${unmatchedCount}`);

  // By year
  const { data: allDates } = await supabase
    .from("medical_devices")
    .select("decision_date");
  const yearCounts: Record<string, number> = {};
  for (const r of allDates || []) {
    const year = r.decision_date ? r.decision_date.slice(0, 4) : "unknown";
    yearCounts[year] = (yearCounts[year] || 0) + 1;
  }
  console.log("\nBy year:");
  for (const [year, count] of Object.entries(yearCounts).sort()) {
    console.log(`  ${year}: ${count}`);
  }

  // Top 15 companies with most devices
  const { data: companyDevices } = await supabase
    .from("medical_devices")
    .select("company_id, company_name")
    .not("company_id", "is", null);

  const companyDeviceCounts: Map<string, { name: string; count: number }> = new Map();
  for (const r of companyDevices || []) {
    const existing = companyDeviceCounts.get(r.company_id);
    if (existing) {
      existing.count++;
    } else {
      companyDeviceCounts.set(r.company_id, { name: r.company_name || "Unknown", count: 1 });
    }
  }
  const topCompanies = Array.from(companyDeviceCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15);
  if (topCompanies.length > 0) {
    console.log("\nTop 15 companies by device count:");
    for (const [, { name, count }] of topCompanies) {
      console.log(`  ${name}: ${count}`);
    }
  }
}

main().catch(console.error);
