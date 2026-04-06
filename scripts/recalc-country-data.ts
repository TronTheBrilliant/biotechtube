#!/usr/bin/env npx tsx
/**
 * Recalculate country_market_data using 60-day carry-forward.
 * Bulk-fetches all price history for each country's companies,
 * processes in memory, then batch-updates.
 *
 * Usage: npx tsx scripts/recalc-country-data.ts [country-name]
 * Example: npx tsx scripts/recalc-country-data.ts "United States"
 * No args = recalculate ALL countries
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const CARRY_FORWARD_DAYS = 60;

async function fetchAllPages<T>(
  query: () => ReturnType<ReturnType<typeof supabase.from>["select"]>,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  while (true) {
    // We need to rebuild the query each time with a new range
    // So we accept a factory function instead
    const { data, error } = await query().range(offset, offset + pageSize - 1) as { data: T[] | null; error: unknown };
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

async function getCountryCompanyIds(country: string): Promise<string[]> {
  const PAGE = 1000;
  const ids: string[] = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("companies")
      .select("id")
      .eq("country", country)
      .range(offset, offset + PAGE - 1);
    if (!data || data.length === 0) break;
    ids.push(...data.map((d) => d.id));
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return ids;
}

async function getSnapshotDates(country: string): Promise<string[]> {
  const PAGE = 1000;
  const dates: string[] = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("country_market_data")
      .select("snapshot_date")
      .eq("country", country)
      .order("snapshot_date", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (!data || data.length === 0) break;
    dates.push(...data.map((d) => d.snapshot_date));
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return dates;
}

// Fetch ALL price history for a set of company IDs
// Returns: Map<companyId, Array<{date, market_cap_usd}>> sorted by date desc
async function fetchPriceHistory(
  companyIds: string[]
): Promise<Map<string, { date: string; mcap: number }[]>> {
  const result = new Map<string, { date: string; mcap: number }[]>();

  // Fetch in batches of company IDs to avoid too-large IN clauses
  const ID_BATCH = 20;
  for (let i = 0; i < companyIds.length; i += ID_BATCH) {
    const batch = companyIds.slice(i, i + ID_BATCH);

    const PAGE = 1000;
    let offset = 0;
    while (true) {
      const { data } = await supabase
        .from("company_price_history")
        .select("company_id, date, market_cap_usd")
        .in("company_id", batch)
        .gt("market_cap_usd", 0)
        .order("date", { ascending: true })
        .range(offset, offset + PAGE - 1);

      if (!data || data.length === 0) break;

      for (const row of data) {
        if (!result.has(row.company_id)) {
          result.set(row.company_id, []);
        }
        result.get(row.company_id)!.push({
          date: row.date,
          mcap: Number(row.market_cap_usd),
        });
      }

      if (data.length < PAGE) break;
      offset += PAGE;
    }

    // Small delay between batches to avoid rate limiting
    if (i + ID_BATCH < companyIds.length) {
      await sleep(50);
    }
  }

  return result;
}

// For a given snapshot_date, find the latest market_cap_usd within 60 days for each company
function computeCarryForward(
  priceMap: Map<string, { date: string; mcap: number }[]>,
  snapshotDate: string
): { total: number; count: number } {
  const cutoff = new Date(snapshotDate);
  cutoff.setDate(cutoff.getDate() - CARRY_FORWARD_DAYS);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  let total = 0;
  let count = 0;

  for (const [, history] of priceMap) {
    // Binary search for latest entry <= snapshotDate
    let best: { date: string; mcap: number } | null = null;

    // history is sorted ascending by date
    // Find the last entry where date <= snapshotDate and date >= cutoffStr
    for (let i = history.length - 1; i >= 0; i--) {
      const entry = history[i];
      if (entry.date <= snapshotDate) {
        if (entry.date >= cutoffStr) {
          best = entry;
        }
        break; // Since sorted ascending, once we find <= snapshotDate, that's the latest
      }
    }

    if (best) {
      total += best.mcap;
      count++;
    }
  }

  return { total, count };
}

async function recalcCountry(country: string) {
  console.log(`\n=== ${country} ===`);

  const companyIds = await getCountryCompanyIds(country);
  console.log(`  Companies: ${companyIds.length}`);

  if (companyIds.length === 0) {
    console.log("  No companies found, skipping.");
    return;
  }

  const dates = await getSnapshotDates(country);
  console.log(`  Snapshot dates: ${dates.length}`);

  if (dates.length === 0) {
    console.log("  No snapshot dates, skipping.");
    return;
  }

  // Bulk fetch all price history for this country's companies
  console.log("  Fetching price history...");
  const priceMap = await fetchPriceHistory(companyIds);
  let totalRows = 0;
  for (const [, v] of priceMap) totalRows += v.length;
  console.log(`  Price history: ${totalRows} rows across ${priceMap.size} companies`);

  // Process each snapshot date in memory
  let updated = 0;
  let errors = 0;
  const batchSize = 50; // Update in batches
  const updates: { date: string; total: number; count: number }[] = [];

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const { total, count } = computeCarryForward(priceMap, date);

    if (count > 0) {
      updates.push({ date, total, count });
    }

    // Flush batch
    if (updates.length >= batchSize || i === dates.length - 1) {
      for (const u of updates) {
        const { error } = await supabase
          .from("country_market_data")
          .update({
            combined_market_cap: u.total,
            public_company_count: u.count,
          })
          .eq("country", country)
          .eq("snapshot_date", u.date);

        if (error) {
          console.error(`  Error updating ${u.date}:`, error.message);
          errors++;
        } else {
          updated++;
        }
      }
      updates.length = 0;
      await sleep(50);
    }

    // Progress
    if ((i + 1) % 500 === 0) {
      console.log(`  Progress: ${i + 1}/${dates.length} (updated: ${updated}, errors: ${errors})`);
    }
  }

  console.log(`  Done: ${updated} updated, ${errors} errors out of ${dates.length} dates.`);
}

async function getAllCountries(): Promise<string[]> {
  const { data } = await supabase
    .from("country_market_data")
    .select("country")
    .limit(10000);

  if (!data) return [];
  const unique = [...new Set(data.map((d) => d.country as string))];
  return unique.sort();
}

async function main() {
  const targetCountry = process.argv[2];

  if (targetCountry) {
    await recalcCountry(targetCountry);
  } else {
    const countries = await getAllCountries();
    console.log(`Recalculating ${countries.length} countries...`);
    for (const country of countries) {
      await recalcCountry(country);
    }
  }

  console.log("\nAll done!");
}

main().catch(console.error);
