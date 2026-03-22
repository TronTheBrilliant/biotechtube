#!/usr/bin/env npx tsx
/**
 * Daily Market Data Update
 *
 * Fetches latest stock prices, calculates global/sector/country indices.
 * Designed to run daily via GitHub Actions.
 *
 * Usage:
 *   npx tsx scripts/daily-update.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();

const WORKERS = 5;
const DELAY_MS = 500;
const LOOKBACK_DAYS = 5; // fetch last 5 trading days to fill gaps

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing env vars");
    process.exit(1);
  }
  return createClient(url, key);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateStr(d);
}

interface CompanyWithTicker {
  id: string;
  ticker: string;
  country: string;
  shares_outstanding: number | null;
}

// ============================================================
// STEP 1: Fetch latest prices
// ============================================================
async function fetchLatestPrices(supabase: ReturnType<typeof getSupabase>) {
  console.log("\n📊 Step 1: Fetching latest prices...");

  // Get all companies with tickers
  const companies: CompanyWithTicker[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("companies")
      .select("id, ticker, country, shares_outstanding")
      .not("ticker", "is", null)
      .neq("ticker", "")
      .range(offset, offset + 999);
    if (error) { console.error("Error:", error.message); break; }
    if (!data || data.length === 0) break;
    companies.push(...(data as CompanyWithTicker[]));
    offset += 1000;
    if (data.length < 1000) break;
  }

  console.log(`  Found ${companies.length} companies with tickers`);

  // Fetch exchange rates
  const exchangeRates = new Map<string, number>();
  exchangeRates.set("USD", 1.0);
  const pairs = ["EUR", "GBP", "NOK", "SEK", "DKK", "CHF", "JPY", "AUD", "CAD", "INR", "CNY", "HKD", "ILS", "KRW", "TWD", "PLN", "SGD"];
  for (const curr of pairs) {
    try {
      const q = await yahooFinance.quote(`${curr}USD=X`);
      if (q?.regularMarketPrice) exchangeRates.set(curr, q.regularMarketPrice);
    } catch { /* skip */ }
  }

  const period1 = daysAgo(LOOKBACK_DAYS);
  const period2 = dateStr(new Date());
  let success = 0;
  let failed = 0;
  let rowsInserted = 0;

  // Process in worker batches
  const chunks: CompanyWithTicker[][] = Array.from({ length: WORKERS }, () => []);
  companies.forEach((c, i) => chunks[i % WORKERS].push(c));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processCompany = async (c: CompanyWithTicker) => {
    try {
      // Fetch historical (last few days)
      const hist = await yahooFinance.historical(c.ticker, { period1, period2 });

      // Fetch current quote for live market cap and shares outstanding
      let currency = "USD";
      let liveMarketCap: number | null = null;
      let sharesOut = c.shares_outstanding;
      try {
        const quote = await yahooFinance.quote(c.ticker);
        currency = quote?.currency || "USD";
        liveMarketCap = quote?.marketCap ?? null;
        if (quote?.sharesOutstanding) sharesOut = quote.sharesOutstanding;
      } catch { /* use defaults */ }

      // Update shares_outstanding and valuation on companies table
      const updateData: Record<string, unknown> = {};
      if (sharesOut && sharesOut !== c.shares_outstanding) updateData.shares_outstanding = sharesOut;
      if (liveMarketCap) updateData.valuation = Math.round(liveMarketCap);
      if (Object.keys(updateData).length > 0) {
        await supabase.from("companies").update(updateData).eq("id", c.id);
      }

      if (!hist || hist.length === 0) return;

      const usdRate = exchangeRates.get(currency) || 1.0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = hist.map((h: any, i: number) => {
        const adjClose = h.adjClose ?? h.close;
        const prevClose = i > 0 ? (hist[i - 1].adjClose ?? hist[i - 1].close) : null;
        const changePct = prevClose && prevClose !== 0
          ? ((adjClose - prevClose) / prevClose) * 100
          : null;

        // For daily update, use live market cap for the most recent day
        const dateVal = h.date instanceof Date ? dateStr(h.date) : h.date;
        const isToday = dateVal === period2 || i === hist.length - 1;
        const marketCapUsd = isToday && liveMarketCap
          ? Math.round(liveMarketCap * (currency === "USD" ? 1 : usdRate))
          : sharesOut && adjClose
            ? Math.round(adjClose * sharesOut * usdRate)
            : null;

        return {
          company_id: c.id,
          date: dateVal,
          ticker: c.ticker,
          open: h.open, high: h.high, low: h.low, close: h.close,
          adj_close: adjClose,
          volume: h.volume,
          currency,
          market_cap_usd: marketCapUsd,
          change_pct: changePct ? Math.round(changePct * 100) / 100 : null,
        };
      });

      const { error } = await supabase
        .from("company_price_history")
        .upsert(rows, { onConflict: "company_id,date" });

      if (error) {
        failed++;
      } else {
        success++;
        rowsInserted += rows.length;
      }
    } catch {
      failed++;
    }
  };

  const workerFn = async (chunk: CompanyWithTicker[]) => {
    for (const c of chunk) {
      await processCompany(c);
      await sleep(DELAY_MS);
    }
  };

  await Promise.all(chunks.map((chunk) => workerFn(chunk)));
  console.log(`  ✅ ${success} tickers updated, ${failed} failed, ${rowsInserted} rows upserted`);
}

// Helper: paginated fetch for price data on a specific date
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchPricesForDate(
  supabase: ReturnType<typeof getSupabase>,
  date: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("company_price_history")
      .select("company_id, market_cap_usd, volume, change_pct")
      .eq("date", date)
      .not("market_cap_usd", "is", null)
      .range(offset, offset + 999);
    if (error || !data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
}

// Helper: paginated fetch for company_sectors by sector
async function fetchSectorCompanyIds(
  supabase: ReturnType<typeof getSupabase>,
  sectorId: string
): Promise<string[]> {
  const all: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("company_sectors")
      .select("company_id")
      .eq("sector_id", sectorId)
      .range(offset, offset + 999);
    if (error || !data || data.length === 0) break;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    all.push(...data.map((r: any) => r.company_id));
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
}

// ============================================================
// STEP 2: Calculate market snapshot
// ============================================================
async function calculateMarketSnapshot(supabase: ReturnType<typeof getSupabase>) {
  console.log("\n📊 Step 2: Calculating market snapshot...");

  // Get latest date with price data
  const { data: latestRow } = await supabase
    .from("company_price_history")
    .select("date")
    .order("date", { ascending: false })
    .limit(1);

  if (!latestRow || latestRow.length === 0) {
    console.log("  ⚠️  No price data found, skipping snapshot");
    return;
  }

  const latestDate = latestRow[0].date;
  console.log(`  Latest date: ${latestDate}`);

  // Get all prices for latest date (paginated)
  const prices = await fetchPricesForDate(supabase, latestDate);

  if (!prices || prices.length === 0) {
    console.log("  ⚠️  No market cap data for latest date");
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalMarketCap = prices.reduce((sum: number, p: any) => sum + (p.market_cap_usd || 0), 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalVolume = prices.reduce((sum: number, p: any) => sum + (p.volume || 0), 0);

  // Find top gainer and loser
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const withChange = prices.filter((p: any) => p.change_pct !== null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withChange.sort((a: any, b: any) => b.change_pct - a.change_pct);
  const topGainer = withChange[0];
  const topLoser = withChange[withChange.length - 1];

  // Calculate % changes vs previous snapshots
  const getSnapshotMarketCap = async (beforeDate: string): Promise<number | null> => {
    const { data } = await supabase
      .from("market_snapshots")
      .select("total_market_cap")
      .lte("snapshot_date", beforeDate)
      .order("snapshot_date", { ascending: false })
      .limit(1);
    return data?.[0]?.total_market_cap ?? null;
  };

  const prevDayMc = await getSnapshotMarketCap(daysAgo(1));
  const prev7dMc = await getSnapshotMarketCap(daysAgo(7));
  const prev30dMc = await getSnapshotMarketCap(daysAgo(30));

  // YTD: first snapshot of current year
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const { data: ytdRow } = await supabase
    .from("market_snapshots")
    .select("total_market_cap")
    .gte("snapshot_date", yearStart)
    .order("snapshot_date", { ascending: true })
    .limit(1);
  const ytdMc = ytdRow?.[0]?.total_market_cap ?? null;

  const pctChange = (current: number, prev: number | null) =>
    prev && prev !== 0 ? ((current - prev) / prev) * 100 : null;

  const snapshot = {
    snapshot_date: latestDate,
    total_market_cap: Math.round(totalMarketCap),
    public_companies_count: prices.length,
    total_volume: Math.round(totalVolume),
    change_1d_pct: pctChange(totalMarketCap, prevDayMc),
    change_7d_pct: pctChange(totalMarketCap, prev7dMc),
    change_30d_pct: pctChange(totalMarketCap, prev30dMc),
    change_ytd_pct: pctChange(totalMarketCap, ytdMc),
    top_gainer_id: topGainer?.company_id ?? null,
    top_gainer_pct: topGainer?.change_pct ?? null,
    top_loser_id: topLoser?.company_id ?? null,
    top_loser_pct: topLoser?.change_pct ?? null,
  };

  const { error } = await supabase
    .from("market_snapshots")
    .upsert(snapshot, { onConflict: "snapshot_date" });

  if (error) console.log(`  ❌ Snapshot error: ${error.message}`);
  else console.log(`  ✅ Snapshot: $${(totalMarketCap / 1e9).toFixed(1)}B total, ${prices.length} companies`);
}

// ============================================================
// STEP 3: Calculate sector data
// ============================================================
async function calculateSectorData(supabase: ReturnType<typeof getSupabase>) {
  console.log("\n📊 Step 3: Calculating sector data...");

  const { data: latestRow } = await supabase
    .from("company_price_history")
    .select("date")
    .order("date", { ascending: false })
    .limit(1);

  if (!latestRow?.[0]) return;
  const latestDate = latestRow[0].date;

  // Get all sectors
  const { data: sectors } = await supabase.from("sectors").select("id, name");
  if (!sectors) return;

  // Pre-fetch all prices for latest date (paginated, done once)
  const allPricesForSectors = await fetchPricesForDate(supabase, latestDate);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priceByCompanyId = new Map(allPricesForSectors.map((p: any) => [p.company_id, p]));

  for (const sector of sectors) {
    // Get companies in this sector (paginated)
    const companyIds = await fetchSectorCompanyIds(supabase, sector.id);
    if (companyIds.length === 0) continue;

    // Filter price data to companies in this sector
    const prices = companyIds
      .map((id) => priceByCompanyId.get(id))
      .filter((p): p is NonNullable<typeof p> => p != null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const combinedMarketCap = prices.reduce((s: number, p: any) => s + (p.market_cap_usd || 0), 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalVolume = prices.reduce((s: number, p: any) => s + (p.volume || 0), 0);

    // Find top company by market cap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topCompany = [...prices].sort((a: any, b: any) => (b.market_cap_usd || 0) - (a.market_cap_usd || 0))[0];

    // Get previous sector snapshot for % change
    const getPrevSector = async (beforeDate: string) => {
      const { data } = await supabase
        .from("sector_market_data")
        .select("combined_market_cap")
        .eq("sector_id", sector.id)
        .lte("snapshot_date", beforeDate)
        .order("snapshot_date", { ascending: false })
        .limit(1);
      return data?.[0]?.combined_market_cap ?? null;
    };

    const prev1d = await getPrevSector(daysAgo(1));
    const prev7d = await getPrevSector(daysAgo(7));
    const prev30d = await getPrevSector(daysAgo(30));

    const pctChange = (curr: number, prev: number | null) =>
      prev && prev !== 0 ? Math.round(((curr - prev) / prev) * 10000) / 100 : null;

    const { error } = await supabase
      .from("sector_market_data")
      .upsert({
        sector_id: sector.id,
        snapshot_date: latestDate,
        combined_market_cap: Math.round(combinedMarketCap),
        company_count: companyIds.length,
        public_company_count: prices?.length || 0,
        total_volume: Math.round(totalVolume),
        change_1d_pct: pctChange(combinedMarketCap, prev1d),
        change_7d_pct: pctChange(combinedMarketCap, prev7d),
        change_30d_pct: pctChange(combinedMarketCap, prev30d),
        top_company_id: topCompany?.company_id ?? null,
      }, { onConflict: "sector_id,snapshot_date" });

    if (error) console.log(`  ❌ ${sector.name}: ${error.message}`);
    else console.log(`  ✅ ${sector.name}: $${(combinedMarketCap / 1e9).toFixed(1)}B, ${prices?.length || 0} public cos`);

    // Update denormalized counts on sectors table
    await supabase
      .from("sectors")
      .update({
        company_count: companyIds.length,
        public_company_count: prices?.length || 0,
        combined_market_cap: Math.round(combinedMarketCap),
      })
      .eq("id", sector.id);
  }
}

// ============================================================
// STEP 4: Calculate country data
// ============================================================
async function calculateCountryData(supabase: ReturnType<typeof getSupabase>) {
  console.log("\n📊 Step 4: Calculating country data...");

  const { data: latestRow } = await supabase
    .from("company_price_history")
    .select("date")
    .order("date", { ascending: false })
    .limit(1);

  if (!latestRow?.[0]) return;
  const latestDate = latestRow[0].date;

  // Get all companies with price data on latest date (paginated)
  const priceData = await fetchPricesForDate(supabase, latestDate);
  if (priceData.length === 0) return;

  // Get company → country mapping
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companyIds = priceData.map((p: any) => p.company_id);
  const companyCountry = new Map<string, string>();

  // Fetch in batches (Supabase .in() has limits)
  for (let i = 0; i < companyIds.length; i += 500) {
    const batch = companyIds.slice(i, i + 500);
    const { data: companies } = await supabase
      .from("companies")
      .select("id, country")
      .in("id", batch);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    companies?.forEach((c: any) => companyCountry.set(c.id, c.country));
  }

  // Group by country
  const countryData = new Map<string, { marketCap: number; volume: number; totalCount: number; publicCount: number }>();

  for (const p of priceData) {
    const country = companyCountry.get(p.company_id);
    if (!country) continue;
    const existing = countryData.get(country) || { marketCap: 0, volume: 0, totalCount: 0, publicCount: 0 };
    existing.marketCap += p.market_cap_usd || 0;
    existing.volume += p.volume || 0;
    existing.publicCount++;
    countryData.set(country, existing);
  }

  for (const [country, data] of countryData) {
    const getPrevCountry = async (beforeDate: string) => {
      const { data: prev } = await supabase
        .from("country_market_data")
        .select("combined_market_cap")
        .eq("country", country)
        .lte("snapshot_date", beforeDate)
        .order("snapshot_date", { ascending: false })
        .limit(1);
      return prev?.[0]?.combined_market_cap ?? null;
    };

    const prev1d = await getPrevCountry(daysAgo(1));
    const prev7d = await getPrevCountry(daysAgo(7));
    const prev30d = await getPrevCountry(daysAgo(30));

    const pctChange = (curr: number, prev: number | null) =>
      prev && prev !== 0 ? Math.round(((curr - prev) / prev) * 10000) / 100 : null;

    const { error } = await supabase
      .from("country_market_data")
      .upsert({
        country,
        snapshot_date: latestDate,
        combined_market_cap: Math.round(data.marketCap),
        company_count: data.publicCount,
        public_company_count: data.publicCount,
        total_volume: Math.round(data.volume),
        change_1d_pct: pctChange(data.marketCap, prev1d),
        change_7d_pct: pctChange(data.marketCap, prev7d),
        change_30d_pct: pctChange(data.marketCap, prev30d),
      }, { onConflict: "country,snapshot_date" });

    if (!error) {
      console.log(`  ✅ ${country}: $${(data.marketCap / 1e9).toFixed(1)}B, ${data.publicCount} public cos`);
    }
  }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  const supabase = getSupabase();
  const startTime = Date.now();

  console.log("\n🚀 Daily Market Data Update");
  console.log("===========================");
  console.log(`Date: ${dateStr(new Date())}\n`);

  await fetchLatestPrices(supabase);
  await calculateMarketSnapshot(supabase);
  await calculateSectorData(supabase);
  await calculateCountryData(supabase);

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n===========================`);
  console.log(`🏁 Daily update complete in ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
