#!/usr/bin/env npx tsx
/**
 * Historical Aggregation Backfill
 *
 * After price history and sector classification are populated,
 * this script retroactively calculates market_snapshots, sector_market_data,
 * and country_market_data for all historical dates.
 *
 * Usage:
 *   npx tsx scripts/backfill-aggregations.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing env vars");
    process.exit(1);
  }
  return createClient(url, key);
}

async function main() {
  const supabase = getSupabase();
  const startTime = Date.now();

  console.log("\n📊 Historical Aggregation Backfill");
  console.log("==================================\n");

  // Get the date range from price history, then generate all weekdays
  console.log("Determining date range...");
  const { data: minRow } = await supabase
    .from("company_price_history")
    .select("date")
    .not("market_cap_usd", "is", null)
    .order("date", { ascending: true })
    .limit(1)
    .single();
  const { data: maxRow } = await supabase
    .from("company_price_history")
    .select("date")
    .not("market_cap_usd", "is", null)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (!minRow || !maxRow) {
    console.error("No price data found");
    process.exit(1);
  }

  // Generate all weekdays between min and max date
  // (the script handles dates with no data gracefully via carry-forward)
  const dates: string[] = [];
  const startDate = new Date(minRow.date + "T00:00:00Z");
  const endDate = new Date(maxRow.date + "T00:00:00Z");
  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) { // Skip weekends
      dates.push(d.toISOString().split("T")[0]);
    }
  }
  console.log(`  Date range: ${minRow.date} to ${maxRow.date}`);
  console.log(`  Processing ${dates.length} weekdays\n`);

  // Pre-fetch sector memberships
  console.log("Fetching sector memberships...");
  const sectorMembers = new Map<string, Set<string>>(); // sector_id -> set of company_ids
  let secOffset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("company_sectors")
      .select("sector_id, company_id")
      .range(secOffset, secOffset + 999);
    if (error) break;
    if (!data || data.length === 0) break;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.forEach((r: any) => {
      if (!sectorMembers.has(r.sector_id)) sectorMembers.set(r.sector_id, new Set());
      sectorMembers.get(r.sector_id)!.add(r.company_id);
    });
    secOffset += 1000;
    if (data.length < 1000) break;
  }
  console.log(`  ${sectorMembers.size} sectors loaded\n`);

  // Pre-fetch company countries
  console.log("Fetching company countries...");
  const companyCountry = new Map<string, string>();
  let coOffset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("companies")
      .select("id, country")
      .range(coOffset, coOffset + 999);
    if (error) break;
    if (!data || data.length === 0) break;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.forEach((r: any) => companyCountry.set(r.id, r.country));
    coOffset += 1000;
    if (data.length < 1000) break;
  }
  console.log(`  ${companyCountry.size} companies loaded\n`);

  // Get all sectors
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sectors } = await supabase.from("sectors").select("id, name");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sectorIds = sectors?.map((s: any) => s.id) || [];

  // Process dates in batches
  const BATCH_SIZE = 50;
  let processedDates = 0;
  let snapshotRows = 0;
  let sectorRows = 0;
  let countryRows = 0;

  // Track previous snapshots for % change calculations
  let prevGlobalMC: number | null = null;
  const prevSectorMC = new Map<string, number>();
  const prevCountryMC = new Map<string, number>();

  // For 7d/30d/YTD lookback, store recent snapshots
  const recentGlobalSnapshots: { date: string; mc: number }[] = [];
  const recentSectorSnapshots = new Map<string, { date: string; mc: number }[]>();
  const recentCountrySnapshots = new Map<string, { date: string; mc: number }[]>();

  const findPrevSnapshot = (snapshots: { date: string; mc: number }[], targetDate: string, daysBack: number): number | null => {
    const cutoff = new Date(targetDate);
    cutoff.setDate(cutoff.getDate() - daysBack);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    // Find nearest snapshot on or before cutoff
    for (let i = snapshots.length - 1; i >= 0; i--) {
      if (snapshots[i].date <= cutoffStr) return snapshots[i].mc;
    }
    return null;
  };

  const findYtdSnapshot = (snapshots: { date: string; mc: number }[], currentDate: string): number | null => {
    const year = currentDate.slice(0, 4);
    const yearStart = `${year}-01-01`;
    for (const s of snapshots) {
      if (s.date >= yearStart) return s.mc;
    }
    return null;
  };

  const pctChange = (curr: number, prev: number | null) =>
    prev && prev !== 0 ? Math.round(((curr - prev) / prev) * 10000) / 100 : null;

  // Carry-forward map: tracks last-known market_cap_usd for each company
  const lastKnownMcap = new Map<string, number>();

  for (let batchStart = 0; batchStart < dates.length; batchStart += BATCH_SIZE) {
    const batchDates = dates.slice(batchStart, batchStart + BATCH_SIZE);

    // Collect all rows for batch upsert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snapshotBatch: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sectorBatch: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countryBatch: any[] = [];

    for (const date of batchDates) {
      // Fetch all prices for this date (paginated)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prices: any[] = [];
      let priceOffset = 0;
      while (true) {
        const { data, error } = await supabase
          .from("company_price_history")
          .select("company_id, market_cap_usd, volume, change_pct")
          .eq("date", date)
          .not("market_cap_usd", "is", null)
          .range(priceOffset, priceOffset + 999);
        if (error || !data || data.length === 0) break;
        prices.push(...data);
        if (data.length < 1000) break;
        priceOffset += 1000;
      }

      // Update carry-forward map with today's prices
      for (const p of prices) {
        if (p.market_cap_usd) {
          lastKnownMcap.set(p.company_id, p.market_cap_usd);
        }
      }

      // Skip dates before we have any data
      if (lastKnownMcap.size === 0) continue;

      // MARKET SNAPSHOT - use carry-forward values for ALL known companies
      let totalMC = 0;
      lastKnownMcap.forEach((mcap) => { totalMC += mcap; });
      // Volume is day-specific (no carry-forward)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalVol = prices.reduce((s: number, p: any) => s + (p.volume || 0), 0);

      // Filter to $100M+ market cap to avoid penny-stock noise
      const MIN_MCAP_FOR_MOVERS = 100_000_000;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const withChange = prices.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) => p.change_pct !== null && (p.market_cap_usd ?? 0) >= MIN_MCAP_FOR_MOVERS
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      withChange.sort((a: any, b: any) => b.change_pct - a.change_pct);

      snapshotBatch.push({
        snapshot_date: date,
        total_market_cap: Math.round(totalMC),
        public_companies_count: lastKnownMcap.size,
        total_volume: Math.round(totalVol),
        change_1d_pct: pctChange(totalMC, prevGlobalMC),
        change_7d_pct: pctChange(totalMC, findPrevSnapshot(recentGlobalSnapshots, date, 7)),
        change_30d_pct: pctChange(totalMC, findPrevSnapshot(recentGlobalSnapshots, date, 30)),
        change_ytd_pct: pctChange(totalMC, findYtdSnapshot(recentGlobalSnapshots, date)),
        top_gainer_id: withChange[0]?.company_id ?? null,
        top_gainer_pct: withChange[0]?.change_pct ?? null,
        top_loser_id: withChange[withChange.length - 1]?.company_id ?? null,
        top_loser_pct: withChange[withChange.length - 1]?.change_pct ?? null,
      });

      snapshotRows++;
      prevGlobalMC = totalMC;
      recentGlobalSnapshots.push({ date, mc: totalMC });

      // SECTOR DATA
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const priceByCompany = new Map(prices.map((p: any) => [p.company_id, p]));

      for (const sectorId of sectorIds) {
        const members = sectorMembers.get(sectorId);
        if (!members) continue;

        let sectorMC = 0;
        let sectorVol = 0;
        let publicCount = 0;
        let topCompanyId: string | null = null;
        let topCompanyMC = 0;

        for (const companyId of members) {
          // Use carry-forward market cap
          const mcap = lastKnownMcap.get(companyId);
          if (mcap) {
            sectorMC += mcap;
            publicCount++;
            if (mcap > topCompanyMC) {
              topCompanyMC = mcap;
              topCompanyId = companyId;
            }
          }
          // Volume is day-specific
          const p = priceByCompany.get(companyId);
          if (p) {
            sectorVol += p.volume || 0;
          }
        }

        if (publicCount === 0) continue;

        const sectorHistory = recentSectorSnapshots.get(sectorId) || [];
        const prevSector1d = prevSectorMC.get(sectorId) ?? null;

        sectorBatch.push({
          sector_id: sectorId,
          snapshot_date: date,
          combined_market_cap: Math.round(sectorMC),
          company_count: members.size,
          public_company_count: publicCount,
          total_volume: Math.round(sectorVol),
          change_1d_pct: pctChange(sectorMC, prevSector1d),
          change_7d_pct: pctChange(sectorMC, findPrevSnapshot(sectorHistory, date, 7)),
          change_30d_pct: pctChange(sectorMC, findPrevSnapshot(sectorHistory, date, 30)),
          top_company_id: topCompanyId,
        });

        sectorRows++;
        prevSectorMC.set(sectorId, sectorMC);
        sectorHistory.push({ date, mc: sectorMC });
        recentSectorSnapshots.set(sectorId, sectorHistory);
      }

      // COUNTRY DATA - use carry-forward for market cap
      const countryAgg = new Map<string, { mc: number; vol: number; publicCount: number }>();

      // First, aggregate carry-forward market caps by country
      lastKnownMcap.forEach((mcap, companyId) => {
        const country = companyCountry.get(companyId);
        if (!country) return;
        const existing = countryAgg.get(country) || { mc: 0, vol: 0, publicCount: 0 };
        existing.mc += mcap;
        existing.publicCount++;
        countryAgg.set(country, existing);
      });

      // Then add day-specific volume
      for (const p of prices) {
        const country = companyCountry.get(p.company_id);
        if (!country) continue;
        const existing = countryAgg.get(country);
        if (existing) {
          existing.vol += p.volume || 0;
        }
      }

      for (const [country, data] of countryAgg) {
        const countryHistory = recentCountrySnapshots.get(country) || [];
        const prevCountry1d = prevCountryMC.get(country) ?? null;

        countryBatch.push({
          country,
          snapshot_date: date,
          combined_market_cap: Math.round(data.mc),
          company_count: 0,
          public_company_count: data.publicCount,
          total_volume: Math.round(data.vol),
          change_1d_pct: pctChange(data.mc, prevCountry1d),
          change_7d_pct: pctChange(data.mc, findPrevSnapshot(countryHistory, date, 7)),
          change_30d_pct: pctChange(data.mc, findPrevSnapshot(countryHistory, date, 30)),
        });

        countryRows++;
        prevCountryMC.set(country, data.mc);
        countryHistory.push({ date, mc: data.mc });
        recentCountrySnapshots.set(country, countryHistory);
      }

      processedDates++;
    }

    // Batch upsert all rows (max 500 per call)
    const UPSERT_SIZE = 500;
    for (let i = 0; i < snapshotBatch.length; i += UPSERT_SIZE) {
      const { error } = await supabase.from("market_snapshots").upsert(snapshotBatch.slice(i, i + UPSERT_SIZE), { onConflict: "snapshot_date" });
      if (error) console.error(`  Snapshot upsert error: ${error.message}`);
    }
    for (let i = 0; i < sectorBatch.length; i += UPSERT_SIZE) {
      const { error } = await supabase.from("sector_market_data").upsert(sectorBatch.slice(i, i + UPSERT_SIZE), { onConflict: "sector_id,snapshot_date" });
      if (error) console.error(`  Sector upsert error: ${error.message}`);
    }
    for (let i = 0; i < countryBatch.length; i += UPSERT_SIZE) {
      const { error } = await supabase.from("country_market_data").upsert(countryBatch.slice(i, i + UPSERT_SIZE), { onConflict: "country,snapshot_date" });
      if (error) console.error(`  Country upsert error: ${error.message}`);
    }

    const pct = Math.round((processedDates / dates.length) * 100);
    console.log(`  [${pct}%] Processed ${processedDates}/${dates.length} dates | ${snapshotRows} snapshots, ${sectorRows} sector rows, ${countryRows} country rows`);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n==================================`);
  console.log(`🏁 Aggregation Backfill Complete`);
  console.log(`==================================`);
  console.log(`Dates processed: ${processedDates}`);
  console.log(`Market snapshots: ${snapshotRows}`);
  console.log(`Sector data rows: ${sectorRows}`);
  console.log(`Country data rows: ${countryRows}`);
  console.log(`Time: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
