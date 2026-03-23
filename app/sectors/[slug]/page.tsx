import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import SectorDetailClient from "./SectorDetailClient";

export const dynamic = "force-dynamic";

interface SectorRow {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  description: string | null;
  company_count: number | null;
  public_company_count: number | null;
}

interface SectorMarketDataRow {
  snapshot_date: string;
  combined_market_cap: number | null;
  total_volume: number | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
  company_count: number | null;
  public_company_count: number | null;
}

interface CompanySectorRow {
  company_id: string;
  is_primary: boolean;
  confidence: number | null;
}

interface CompanyRow {
  id: string;
  slug: string;
  name: string;
  ticker: string | null;
  country: string | null;
  valuation: number | null;
  logo_url: string | null;
  website: string | null;
}

interface PriceHistoryRow {
  company_id: string;
  market_cap_usd: number | null;
}

export interface SectorInfo {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  description: string | null;
  company_count: number | null;
  public_company_count: number | null;
}

export interface SectorHistoryPoint {
  snapshot_date: string;
  combined_market_cap: number | null;
  total_volume: number | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
}

export interface TopCompany {
  id: string;
  slug: string;
  name: string;
  ticker: string | null;
  country: string | null;
  valuation: number | null;
  logo_url: string | null;
  website: string | null;
}

export default async function SectorDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch sector by slug
  const { data: sectorRow } = await supabase
    .from("sectors")
    .select(
      "id, slug, name, short_name, description, company_count, public_company_count"
    )
    .eq("slug", slug)
    .single();

  if (!sectorRow) {
    notFound();
  }

  const sector = sectorRow as SectorRow;

  // Fetch all historical market data for this sector (paginated — Supabase caps at 1000 rows)
  const PAGE_SIZE = 1000;
  let allHistory: SectorMarketDataRow[] = [];
  let from = 0;
  let hasMore = true;
  while (hasMore) {
    const { data: page } = await supabase
      .from("sector_market_data")
      .select(
        "snapshot_date, combined_market_cap, total_volume, change_1d_pct, change_7d_pct, change_30d_pct, company_count, public_company_count"
      )
      .eq("sector_id", sector.id)
      .order("snapshot_date", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    const rows = (page ?? []) as SectorMarketDataRow[];
    allHistory = allHistory.concat(rows);
    hasMore = rows.length >= PAGE_SIZE;
    from += PAGE_SIZE;
  }

  const history = allHistory;

  // Get latest snapshot for key stats
  const latestSnapshot = history.length > 0 ? history[history.length - 1] : null;

  // Fetch top 20 companies in this sector by USD market cap
  // We use market_cap_usd from company_price_history (latest date) instead of
  // companies.valuation which stores local currency values (INR, JPY, KRW, etc.)
  const { data: companySectorRows } = await supabase
    .from("company_sectors")
    .select("company_id, is_primary, confidence")
    .eq("sector_id", sector.id);

  const companyIds = ((companySectorRows ?? []) as CompanySectorRow[]).map(
    (cs) => cs.company_id
  );

  let topCompanies: TopCompany[] = [];

  if (companyIds.length > 0) {
    // Build a map of company_id -> market_cap_usd from the last 5 days of price data.
    // Different markets close on different dates, so we can't rely on a single date.
    const marketCapMap = new Map<string, number>();
    const priceCutoff = new Date();
    priceCutoff.setDate(priceCutoff.getDate() - 5);
    const priceCutoffStr = priceCutoff.toISOString().split("T")[0];

    const BATCH_SIZE = 200;
    const batchLimit = Math.min(companyIds.length, BATCH_SIZE * 10);
    for (let i = 0; i < batchLimit; i += BATCH_SIZE) {
      const batch = companyIds.slice(i, i + BATCH_SIZE);
      const { data: priceRows } = await supabase
        .from("company_price_history")
        .select("company_id, market_cap_usd, date")
        .in("company_id", batch)
        .gte("date", priceCutoffStr)
        .not("market_cap_usd", "is", null)
        .order("date", { ascending: false });
      if (priceRows) {
        for (const row of priceRows as (PriceHistoryRow & { date: string })[]) {
          // Only keep the first (most recent) entry per company
          if (row.market_cap_usd != null && !marketCapMap.has(row.company_id)) {
            marketCapMap.set(row.company_id, row.market_cap_usd);
          }
        }
      }
    }

    // Step 2: Get the top 20 company IDs by USD market cap
    const marketCapEntries: Array<[string, number]> = [];
    marketCapMap.forEach((val, key) => marketCapEntries.push([key, val]));
    const sortedByMarketCap = marketCapEntries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    const top20Ids = sortedByMarketCap.map((entry) => entry[0]);

    // Step 3: Fetch company details for top 20
    if (top20Ids.length > 0) {
      const { data: companyRows } = await supabase
        .from("companies")
        .select("id, slug, name, ticker, country, valuation, logo_url, website")
        .in("id", top20Ids);

      if (companyRows) {
        const companyMap = new Map<string, CompanyRow>();
        for (const c of companyRows as CompanyRow[]) {
          companyMap.set(c.id, c);
        }

        // Build topCompanies in market cap order, using USD market cap for display
        topCompanies = sortedByMarketCap
          .map((entry) => {
            const id = entry[0];
            const usdMarketCap = entry[1];
            const c = companyMap.get(id);
            if (!c) return null;
            return {
              id: c.id,
              slug: c.slug,
              name: c.name,
              ticker: c.ticker,
              country: c.country,
              valuation: usdMarketCap, // Use USD market cap instead of local currency valuation
              logo_url: c.logo_url,
              website: c.website,
            };
          })
          .filter(Boolean) as TopCompany[];
      }
    }
  }

  const sectorInfo: SectorInfo = {
    id: sector.id,
    slug: sector.slug,
    name: sector.name,
    short_name: sector.short_name,
    description: sector.description,
    company_count: sector.company_count,
    public_company_count: sector.public_company_count,
  };

  const historyPoints: SectorHistoryPoint[] = history.map((h) => ({
    snapshot_date: h.snapshot_date,
    combined_market_cap: h.combined_market_cap,
    total_volume: h.total_volume,
    change_1d_pct: h.change_1d_pct,
    change_7d_pct: h.change_7d_pct,
    change_30d_pct: h.change_30d_pct,
  }));

  return (
    <SectorDetailClient
      sector={sectorInfo}
      history={historyPoints}
      latestSnapshot={latestSnapshot}
      topCompanies={topCompanies}
    />
  );
}
