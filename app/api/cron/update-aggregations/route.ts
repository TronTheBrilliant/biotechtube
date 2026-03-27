import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// --- helpers -----------------------------------------------------------

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateStr(d);
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

// --- paginated data fetchers -------------------------------------------

async function fetchPricesForDate(
  supabase: SupabaseClient,
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

async function fetchSectorCompanyIds(
  supabase: SupabaseClient,
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

async function fetchCarryForwardMarketCaps(
  supabase: SupabaseClient,
  latestDate: string
): Promise<Map<string, number>> {
  const cutoff = new Date(latestDate);
  cutoff.setDate(cutoff.getDate() - 5);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const lastKnownMcap = new Map<string, number>();
  let priceOffset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("company_price_history")
      .select("company_id, market_cap_usd, date")
      .gte("date", cutoffStr)
      .not("market_cap_usd", "is", null)
      .order("date", { ascending: false })
      .range(priceOffset, priceOffset + 999);
    if (error || !data || data.length === 0) break;
    for (const row of data) {
      if (!lastKnownMcap.has(row.company_id)) {
        lastKnownMcap.set(row.company_id, row.market_cap_usd);
      }
    }
    if (data.length < 1000) break;
    priceOffset += 1000;
  }
  return lastKnownMcap;
}

// --- Step 1: Market snapshot -------------------------------------------

async function calculateMarketSnapshot(supabase: SupabaseClient): Promise<string> {
  console.log("Calculating market snapshot...");

  const { data: latestRow } = await supabase
    .from("company_price_history")
    .select("date")
    .order("date", { ascending: false })
    .limit(1);

  if (!latestRow || latestRow.length === 0) {
    return "No price data found, skipping snapshot";
  }

  const latestDate = latestRow[0].date;
  console.log(`Latest date: ${latestDate}`);

  const lastKnownMcap = await fetchCarryForwardMarketCaps(supabase, latestDate);
  if (lastKnownMcap.size === 0) return "No market cap data found";

  let totalMarketCap = 0;
  lastKnownMcap.forEach((mcap) => {
    totalMarketCap += mcap;
  });

  const todayPrices = await fetchPricesForDate(supabase, latestDate);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalVolume = todayPrices.reduce((sum: number, p: any) => sum + (p.volume || 0), 0);

  // Filter to companies with meaningful market cap ($100M+) to avoid penny-stock noise
  const MIN_MCAP_FOR_MOVERS = 100_000_000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const withChange = todayPrices.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => p.change_pct !== null && (p.market_cap_usd ?? 0) >= MIN_MCAP_FOR_MOVERS
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withChange.sort((a: any, b: any) => b.change_pct - a.change_pct);
  const topGainer = withChange[0];
  const topLoser = withChange[withChange.length - 1];

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
    public_companies_count: lastKnownMcap.size,
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

  if (error) return `Snapshot error: ${error.message}`;
  return `Snapshot: $${(totalMarketCap / 1e9).toFixed(1)}B total, ${lastKnownMcap.size} companies`;
}

// --- Step 2: Sector data -----------------------------------------------

async function calculateSectorData(supabase: SupabaseClient): Promise<string> {
  console.log("Calculating sector data...");

  const { data: latestRow } = await supabase
    .from("company_price_history")
    .select("date")
    .order("date", { ascending: false })
    .limit(1);

  if (!latestRow?.[0]) return "No price data for sector calc";
  const latestDate = latestRow[0].date;

  const { data: sectors } = await supabase.from("sectors").select("id, name");
  if (!sectors) return "No sectors found";

  const allPricesForSectors = await fetchPricesForDate(supabase, latestDate);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priceByCompanyId = new Map(allPricesForSectors.map((p: any) => [p.company_id, p]));

  const lastKnownMcap = await fetchCarryForwardMarketCaps(supabase, latestDate);

  let sectorsUpdated = 0;
  let sectorErrors = 0;

  for (const sector of sectors) {
    const companyIds = await fetchSectorCompanyIds(supabase, sector.id);
    if (companyIds.length === 0) continue;

    let combinedMarketCap = 0;
    let publicCompanyCount = 0;
    for (const id of companyIds) {
      const mcap = lastKnownMcap.get(id);
      if (mcap) {
        combinedMarketCap += mcap;
        publicCompanyCount++;
      }
    }

    const todayPrices = companyIds
      .map((id) => priceByCompanyId.get(id))
      .filter((p): p is NonNullable<typeof p> => p != null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalVolume = todayPrices.reduce((s: number, p: any) => s + (p.volume || 0), 0);

    let topCompanyId: string | null = null;
    let topMcap = 0;
    for (const id of companyIds) {
      const mcap = lastKnownMcap.get(id);
      if (mcap && mcap > topMcap) {
        topMcap = mcap;
        topCompanyId = id;
      }
    }

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
      .upsert(
        {
          sector_id: sector.id,
          snapshot_date: latestDate,
          combined_market_cap: Math.round(combinedMarketCap),
          company_count: companyIds.length,
          public_company_count: publicCompanyCount,
          total_volume: Math.round(totalVolume),
          change_1d_pct: pctChange(combinedMarketCap, prev1d),
          change_7d_pct: pctChange(combinedMarketCap, prev7d),
          change_30d_pct: pctChange(combinedMarketCap, prev30d),
          top_company_id: topCompanyId,
        },
        { onConflict: "sector_id,snapshot_date" }
      );

    if (error) {
      sectorErrors++;
      console.error(`Sector ${sector.name}: ${error.message}`);
    } else {
      sectorsUpdated++;
    }

    // Update denormalized counts on sectors table
    await supabase
      .from("sectors")
      .update({
        company_count: companyIds.length,
        public_company_count: publicCompanyCount,
        combined_market_cap: Math.round(combinedMarketCap),
      })
      .eq("id", sector.id);
  }

  return `Sectors: ${sectorsUpdated} updated, ${sectorErrors} errors`;
}

// --- Step 3: Country data ----------------------------------------------

async function calculateCountryData(supabase: SupabaseClient): Promise<string> {
  console.log("Calculating country data...");

  const { data: latestRow } = await supabase
    .from("company_price_history")
    .select("date")
    .order("date", { ascending: false })
    .limit(1);

  if (!latestRow?.[0]) return "No price data for country calc";
  const latestDate = latestRow[0].date;

  const lastKnownMcap = await fetchCarryForwardMarketCaps(supabase, latestDate);
  if (lastKnownMcap.size === 0) return "No market cap data for country calc";

  const todayPrices = await fetchPricesForDate(supabase, latestDate);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const todayVolumeByCompany = new Map(todayPrices.map((p: any) => [p.company_id, p.volume || 0]));

  // Fetch company -> country mapping in batches
  const allCompanyIds = Array.from(lastKnownMcap.keys());
  const companyCountry = new Map<string, string>();

  for (let i = 0; i < allCompanyIds.length; i += 500) {
    const batch = allCompanyIds.slice(i, i + 500);
    const { data: companies } = await supabase
      .from("companies")
      .select("id, country")
      .in("id", batch);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    companies?.forEach((c: any) => companyCountry.set(c.id, c.country));
  }

  // Group by country
  const countryData = new Map<
    string,
    { marketCap: number; volume: number; publicCount: number }
  >();

  for (const [companyId, mcap] of lastKnownMcap) {
    const country = companyCountry.get(companyId);
    if (!country) continue;
    const existing = countryData.get(country) || {
      marketCap: 0,
      volume: 0,
      publicCount: 0,
    };
    existing.marketCap += mcap;
    existing.volume += todayVolumeByCompany.get(companyId) || 0;
    existing.publicCount++;
    countryData.set(country, existing);
  }

  let countriesUpdated = 0;
  let countryErrors = 0;

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
      prev && prev !== 0
        ? Math.round(((curr - prev) / prev) * 10000) / 100
        : null;

    const { error } = await supabase
      .from("country_market_data")
      .upsert(
        {
          country,
          snapshot_date: latestDate,
          combined_market_cap: Math.round(data.marketCap),
          company_count: data.publicCount,
          public_company_count: data.publicCount,
          total_volume: Math.round(data.volume),
          change_1d_pct: pctChange(data.marketCap, prev1d),
          change_7d_pct: pctChange(data.marketCap, prev7d),
          change_30d_pct: pctChange(data.marketCap, prev30d),
        },
        { onConflict: "country,snapshot_date" }
      );

    if (error) {
      countryErrors++;
      console.error(`Country ${country}: ${error.message}`);
    } else {
      countriesUpdated++;
    }
  }

  return `Countries: ${countriesUpdated} updated, ${countryErrors} errors`;
}

// --- main handler ------------------------------------------------------

export async function GET(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const supabase = getSupabase();

  try {
    const snapshotResult = await calculateMarketSnapshot(supabase);
    console.log(snapshotResult);

    const sectorResult = await calculateSectorData(supabase);
    console.log(sectorResult);

    const countryResult = await calculateCountryData(supabase);
    console.log(countryResult);

    const durationSec = Math.round((Date.now() - startTime) / 1000);
    console.log(`Aggregation update complete in ${durationSec}s`);

    return NextResponse.json({
      success: true,
      snapshot: snapshotResult,
      sectors: sectorResult,
      countries: countryResult,
      duration_seconds: durationSec,
    });
  } catch (err) {
    console.error("Fatal error in update-aggregations:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration_seconds: Math.round((Date.now() - startTime) / 1000),
      },
      { status: 500 }
    );
  }
}
