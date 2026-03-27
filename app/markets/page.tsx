import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import MarketsPageClient from "./MarketsPageClient";

export const revalidate = 300;

const ogImageUrl = "https://biotechtube.io/api/og?title=Biotech%20Market%20Overview&subtitle=Index%2C%20Sectors%20%26%20Country%20Rankings&type=default";

export const metadata: Metadata = {
  title: "Biotech Market Overview — Index, Sectors & Countries | BiotechTube",
  description:
    "Live biotech market data: total market cap, sector performance, country rankings, top gainers and losers. The definitive biotech market dashboard updated daily.",
  openGraph: {
    title: "Biotech Market Overview | BiotechTube",
    description:
      "Live biotech market data: total market cap, sector performance, and country rankings. Updated daily.",
    type: "website",
    siteName: "BiotechTube",
    images: [{ url: ogImageUrl, width: 1200, height: 630, alt: "Biotech Market Overview on BiotechTube" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@biotechtube",
    title: "Biotech Market Overview | BiotechTube",
    description:
      "Live biotech market data: total market cap, sector performance, and country rankings.",
    images: [ogImageUrl],
  },
  alternates: {
    canonical: "https://biotechtube.io/markets",
  },
};

interface MarketSnapshot {
  snapshot_date: string;
  total_market_cap: number | null;
  public_companies_count: number | null;
  total_volume: number | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
  change_ytd_pct: number | null;
  top_gainer_id: string | null;
  top_gainer_pct: number | null;
  top_loser_id: string | null;
  top_loser_pct: number | null;
}

interface SectorRow {
  id: string;
  name: string;
  slug: string;
  short_name: string | null;
  company_count: number | null;
  public_company_count: number | null;
}

interface SectorMarketRow {
  sector_id: string;
  combined_market_cap: number | null;
  total_volume: number | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
  top_company_id: string | null;
}

export interface SectorData {
  id: string;
  name: string;
  slug: string;
  short_name: string | null;
  combined_market_cap: number | null;
  total_volume: number | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
  company_count: number | null;
  public_company_count: number | null;
}

export interface CountryData {
  country: string;
  combined_market_cap: number | null;
  total_volume: number | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
  public_company_count: number | null;
}

async function fetchAllPages(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  table: string,
  select: string,
  filter: { column: string; op: "gte" | "eq"; value: string } | null,
  orderBy: string,
  ascending: boolean
) {
  const PAGE_SIZE = 1000;
  let all: Record<string, unknown>[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from(table)
      .select(select)
      .order(orderBy, { ascending })
      .range(from, from + PAGE_SIZE - 1);

    if (filter) {
      if (filter.op === "gte") {
        query = query.gte(filter.column, filter.value);
      } else {
        query = query.eq(filter.column, filter.value);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    const page = (data ?? []) as Record<string, unknown>[];
    all = all.concat(page);
    hasMore = page.length >= PAGE_SIZE;
    from += PAGE_SIZE;
  }

  return all;
}

export default async function MarketPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch all available market snapshots (no date cutoff) so every
  // timescale tab (1Y, 3Y, 5Y, 10Y, Max) can be served from SSR data
  // without a client-side API call.
  const snapshotsRaw = await fetchAllPages(
    supabase,
    "market_snapshots",
    "snapshot_date, total_market_cap, public_companies_count, total_volume, change_1d_pct, change_7d_pct, change_30d_pct, change_ytd_pct, top_gainer_id, top_gainer_pct, top_loser_id, top_loser_pct",
    null,
    "snapshot_date",
    false
  ) as unknown as MarketSnapshot[];

  const latestSnapshot = snapshotsRaw.length > 0 ? snapshotsRaw[0] : null;
  // Reverse to chronological order for chart, then thin to max 1000 points
  const fullHistory = [...snapshotsRaw].reverse();
  let history: MarketSnapshot[];
  if (fullHistory.length > 1000) {
    const step = Math.ceil(fullHistory.length / 1000);
    history = [];
    for (let i = 0; i < fullHistory.length; i += step) {
      history.push(fullHistory[i]);
    }
    if (history[history.length - 1] !== fullHistory[fullHistory.length - 1]) {
      history.push(fullHistory[fullHistory.length - 1]);
    }
  } else {
    history = fullHistory;
  }

  // Fetch sector data
  const { data: latestSectorDate } = await supabase
    .from("sector_market_data")
    .select("snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .single();

  let sectors: SectorData[] = [];
  if (latestSectorDate) {
    const [sectorMarketRows, sectorRows] = await Promise.all([
      supabase
        .from("sector_market_data")
        .select("sector_id, combined_market_cap, total_volume, change_1d_pct, change_7d_pct, change_30d_pct, top_company_id")
        .eq("snapshot_date", latestSectorDate.snapshot_date)
        .then((r) => (r.data ?? []) as SectorMarketRow[]),
      supabase
        .from("sectors")
        .select("id, name, slug, short_name, company_count, public_company_count")
        .then((r) => (r.data ?? []) as SectorRow[]),
    ]);

    const sectorMap = new Map<string, SectorRow>();
    for (const s of sectorRows) sectorMap.set(s.id, s);

    sectors = sectorMarketRows
      .map((m) => {
        const s = sectorMap.get(m.sector_id);
        if (!s) return null;
        return {
          id: s.id,
          name: s.name,
          slug: s.slug,
          short_name: s.short_name,
          combined_market_cap: m.combined_market_cap,
          total_volume: m.total_volume,
          change_1d_pct: m.change_1d_pct,
          change_7d_pct: m.change_7d_pct,
          change_30d_pct: m.change_30d_pct,
          company_count: s.company_count,
          public_company_count: s.public_company_count,
        };
      })
      .filter(Boolean) as SectorData[];

    sectors.sort((a, b) => (b.combined_market_cap ?? 0) - (a.combined_market_cap ?? 0));
  }

  // Fetch country data
  const { data: latestCountryDate } = await supabase
    .from("country_market_data")
    .select("snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .single();

  let countries: CountryData[] = [];
  if (latestCountryDate) {
    const { data: countryRows } = await supabase
      .from("country_market_data")
      .select("country, combined_market_cap, total_volume, change_1d_pct, change_7d_pct, change_30d_pct, public_company_count")
      .eq("snapshot_date", latestCountryDate.snapshot_date);

    countries = ((countryRows ?? []) as CountryData[]).sort(
      (a, b) => (b.combined_market_cap ?? 0) - (a.combined_market_cap ?? 0)
    );
  }

  return (
    <MarketsPageClient
      latestSnapshot={latestSnapshot}
      history={history}
      sectors={sectors}
      countries={countries}
    />
  );
}
