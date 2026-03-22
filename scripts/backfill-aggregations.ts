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

  // Get all distinct dates from price history using RPC
  console.log("Fetching all trading dates...");
  const { data: dateRows, error: dateErr } = await supabase.rpc("get_distinct_price_dates");
  if (dateErr) {
    console.error("Error fetching dates:", dateErr.message);
    console.error("Make sure the get_distinct_price_dates() function exists in your database.");
    process.exit(1);
  }

  const dates = (dateRows as { d: string }[]).map((r) => r.d);
  console.log(`  Found ${dates.length} unique trading dates (${dates[0]} to ${dates[dates.length - 1]})\n`);

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

  for (let batchStart = 0; batchStart < dates.length; batchStart += BATCH_SIZE) {
    const batchDates = dates.slice(batchStart, batchStart + BATCH_SIZE);

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

      if (prices.length === 0) continue;

      // MARKET SNAPSHOT
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalMC = prices.reduce((s: number, p: any) => s + (p.market_cap_usd || 0), 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalVol = prices.reduce((s: number, p: any) => s + (p.volume || 0), 0);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const withChange = prices.filter((p: any) => p.change_pct !== null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      withChange.sort((a: any, b: any) => b.change_pct - a.change_pct);

      const snapshotData = {
        date,
        total_market_cap: Math.round(totalMC),
        public_company_count: prices.length,
        total_volume: Math.round(totalVol),
        change_1d_pct: pctChange(totalMC, prevGlobalMC),
        change_7d_pct: pctChange(totalMC, findPrevSnapshot(recentGlobalSnapshots, date, 7)),
        change_30d_pct: pctChange(totalMC, findPrevSnapshot(recentGlobalSnapshots, date, 30)),
        change_ytd_pct: pctChange(totalMC, findYtdSnapshot(recentGlobalSnapshots, date)),
        top_gainer_id: withChange[0]?.company_id ?? null,
        top_gainer_pct: withChange[0]?.change_pct ?? null,
        top_loser_id: withChange[withChange.length - 1]?.company_id ?? null,
        top_loser_pct: withChange[withChange.length - 1]?.change_pct ?? null,
      };

      await supabase.from("market_snapshots").upsert(snapshotData, { onConflict: "date" });
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
          const p = priceByCompany.get(companyId);
          if (!p) continue;
          sectorMC += p.market_cap_usd || 0;
          sectorVol += p.volume || 0;
          publicCount++;
          if ((p.market_cap_usd || 0) > topCompanyMC) {
            topCompanyMC = p.market_cap_usd;
            topCompanyId = companyId;
          }
        }

        if (publicCount === 0) continue;

        const sectorHistory = recentSectorSnapshots.get(sectorId) || [];
        const prevSector1d = prevSectorMC.get(sectorId) ?? null;

        await supabase.from("sector_market_data").upsert({
          sector_id: sectorId,
          date,
          combined_market_cap: Math.round(sectorMC),
          company_count: members.size,
          public_company_count: publicCount,
          total_volume: Math.round(sectorVol),
          change_1d_pct: pctChange(sectorMC, prevSector1d),
          change_7d_pct: pctChange(sectorMC, findPrevSnapshot(sectorHistory, date, 7)),
          change_30d_pct: pctChange(sectorMC, findPrevSnapshot(sectorHistory, date, 30)),
          top_company_id: topCompanyId,
        }, { onConflict: "sector_id,date" });

        sectorRows++;
        prevSectorMC.set(sectorId, sectorMC);
        sectorHistory.push({ date, mc: sectorMC });
        recentSectorSnapshots.set(sectorId, sectorHistory);
      }

      // COUNTRY DATA
      const countryAgg = new Map<string, { mc: number; vol: number; publicCount: number }>();
      for (const p of prices) {
        const country = companyCountry.get(p.company_id);
        if (!country) continue;
        const existing = countryAgg.get(country) || { mc: 0, vol: 0, publicCount: 0 };
        existing.mc += p.market_cap_usd || 0;
        existing.vol += p.volume || 0;
        existing.publicCount++;
        countryAgg.set(country, existing);
      }

      for (const [country, data] of countryAgg) {
        const countryHistory = recentCountrySnapshots.get(country) || [];
        const prevCountry1d = prevCountryMC.get(country) ?? null;

        await supabase.from("country_market_data").upsert({
          country,
          date,
          combined_market_cap: Math.round(data.mc),
          company_count: 0, // will be updated by daily-update with total count
          public_company_count: data.publicCount,
          total_volume: Math.round(data.vol),
          change_1d_pct: pctChange(data.mc, prevCountry1d),
          change_7d_pct: pctChange(data.mc, findPrevSnapshot(countryHistory, date, 7)),
          change_30d_pct: pctChange(data.mc, findPrevSnapshot(countryHistory, date, 30)),
        }, { onConflict: "country,date" });

        countryRows++;
        prevCountryMC.set(country, data.mc);
        countryHistory.push({ date, mc: data.mc });
        recentCountrySnapshots.set(country, countryHistory);
      }

      processedDates++;
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
