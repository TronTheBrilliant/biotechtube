#!/usr/bin/env npx tsx
/**
 * Recalculate market_snapshots for the last year to include newly-added companies.
 * Uses carry-forward logic: if a company has no price on a given date,
 * uses its most recent market_cap_usd from within the last 5 days.
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log("Backfill Market Snapshots");
  console.log("=".repeat(60));

  // 1. Get all snapshot dates in the last ~13 months
  const cutoff = "2025-03-01";
  const { data: snapDates } = await supabase
    .from("market_snapshots")
    .select("snapshot_date")
    .gte("snapshot_date", cutoff)
    .order("snapshot_date", { ascending: true });

  if (!snapDates) {
    console.error("No snapshot dates found");
    return;
  }

  console.log(`Found ${snapDates.length} snapshots to recalculate (from ${cutoff})`);

  // 2. Load ALL market_cap_usd data for this period into memory
  console.log("Loading price history...");
  const allPrices: Array<{ company_id: string; date: string; market_cap_usd: number }> = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("company_price_history")
      .select("company_id, date, market_cap_usd")
      .gte("date", "2025-02-24") // 5 days before cutoff for carry-forward
      .not("market_cap_usd", "is", null)
      .order("date", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) { console.error("Load error:", error.message); break; }
    if (!data || data.length === 0) break;
    allPrices.push(...(data as any));
    offset += PAGE;
    if (offset % 10000 === 0) process.stdout.write(`  ${offset} rows...\r`);
    if (data.length < PAGE) break;
  }
  console.log(`  Loaded ${allPrices.length} price rows`);

  // 3. Build index: company_id -> sorted array of { date, mcap }
  const companyPrices = new Map<string, Array<{ date: string; mcap: number }>>();
  for (const p of allPrices) {
    if (!companyPrices.has(p.company_id)) companyPrices.set(p.company_id, []);
    companyPrices.get(p.company_id)!.push({ date: p.date, mcap: Number(p.market_cap_usd) });
  }
  console.log(`  ${companyPrices.size} companies with price data`);

  // 4. For each snapshot date, calculate total market cap using carry-forward
  let updated = 0;
  for (const snap of snapDates) {
    const date = snap.snapshot_date;

    // For each company, find the most recent market_cap_usd on or before this date (max 5 days back)
    const fiveDaysBack = new Date(date);
    fiveDaysBack.setDate(fiveDaysBack.getDate() - 5);
    const fiveDaysBackStr = fiveDaysBack.toISOString().split("T")[0];

    let totalMcap = 0;
    let companyCount = 0;

    for (const [, prices] of companyPrices) {
      // Find the latest price on or before this date
      let bestMcap: number | null = null;
      for (let i = prices.length - 1; i >= 0; i--) {
        if (prices[i].date <= date && prices[i].date >= fiveDaysBackStr) {
          bestMcap = prices[i].mcap;
          break;
        }
        if (prices[i].date < fiveDaysBackStr) break;
      }
      if (bestMcap !== null && bestMcap > 0) {
        totalMcap += bestMcap;
        companyCount++;
      }
    }

    // Update the snapshot
    const { error } = await supabase
      .from("market_snapshots")
      .update({
        total_market_cap: Math.round(totalMcap),
        public_companies_count: companyCount,
      })
      .eq("snapshot_date", date);

    if (error) {
      console.error(`  Error updating ${date}: ${error.message}`);
    }

    updated++;
    if (updated % 50 === 0 || updated === snapDates.length) {
      console.log(`  [${updated}/${snapDates.length}] ${date}: $${(totalMcap / 1e12).toFixed(2)}T (${companyCount} companies)`);
    }
  }

  console.log("\nDone! Snapshots backfilled.");
}

main().catch(console.error);
