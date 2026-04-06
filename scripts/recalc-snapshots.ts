#!/usr/bin/env npx tsx
/**
 * Recalculate market_snapshots using the same carry-forward logic as the cron.
 * For each snapshot date, sums the latest market_cap_usd per company
 * from the last 5 days of price data.
 *
 * Only recalculates snapshots from the last ~13 months where we have
 * price history data.
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

async function getCarryForwardMcap(date: string): Promise<{ total: number; count: number }> {
  // Look back 5 days from this date
  const cutoff = new Date(date);
  cutoff.setDate(cutoff.getDate() - 5);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  // Get the latest market_cap_usd per company within the 5-day window
  // We need to paginate and deduplicate by company_id (keeping latest)
  const companyMcap = new Map<string, number>();
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("company_price_history")
      .select("company_id, market_cap_usd, date")
      .gte("date", cutoffStr)
      .lte("date", date)
      .not("market_cap_usd", "is", null)
      .order("date", { ascending: false })
      .range(offset, offset + 999);

    if (error) { console.error("Query error:", error.message); break; }
    if (!data || data.length === 0) break;

    for (const row of data) {
      // Keep only the latest per company (ordered by date DESC)
      if (!companyMcap.has(row.company_id)) {
        companyMcap.set(row.company_id, Number(row.market_cap_usd));
      }
    }

    if (data.length < 1000) break;
    offset += 1000;
  }

  let total = 0;
  companyMcap.forEach((mcap) => { total += mcap; });

  return { total, count: companyMcap.size };
}

async function main() {
  console.log("Recalculate Market Snapshots");
  console.log("=".repeat(60));

  // Get snapshot dates to recalculate
  // Only do dates from 2025-03-01 onwards
  const { data: snapDates } = await supabase
    .from("market_snapshots")
    .select("snapshot_date")
    .gte("snapshot_date", "2025-03-01")
    .order("snapshot_date", { ascending: true });

  if (!snapDates || snapDates.length === 0) {
    console.log("No snapshots to recalculate");
    return;
  }

  console.log(`Recalculating ${snapDates.length} snapshots...`);

  let updated = 0;
  let skipped = 0;

  for (const snap of snapDates) {
    const date = snap.snapshot_date;
    const { total, count } = await getCarryForwardMcap(date);

    if (count < 100) {
      // Not enough data for this date — skip it (keep original value)
      skipped++;
      continue;
    }

    // Update the snapshot
    const { error } = await supabase
      .from("market_snapshots")
      .update({
        total_market_cap: Math.round(total),
        public_companies_count: count,
      })
      .eq("snapshot_date", date);

    if (error) {
      console.error(`Error updating ${date}: ${error.message}`);
      continue;
    }

    updated++;
    if (updated % 20 === 0 || updated <= 3 || date === snapDates[snapDates.length - 1].snapshot_date) {
      console.log(`  ${date}: $${(total / 1e12).toFixed(2)}T (${count} co)`);
    }

    // Small delay to avoid rate limiting
    await sleep(100);
  }

  console.log(`\nDone! Updated ${updated}, skipped ${skipped} (insufficient data)`);
}

main().catch(console.error);
