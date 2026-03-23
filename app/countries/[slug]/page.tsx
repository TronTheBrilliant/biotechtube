import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import CountryDetailClient from "./CountryDetailClient";
import countriesJson from "@/data/countries.json";

export const dynamic = "force-dynamic";

interface CountryMeta {
  slug: string;
  name: string;
  flag: string;
  region: string;
  bioHubs: string[];
  description: string;
}

interface CountryMarketDataRow {
  country: string;
  snapshot_date: string;
  combined_market_cap: number | null;
  total_volume: number | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
  public_company_count: number | null;
}

interface CompanyRow {
  id: string;
  slug: string;
  name: string;
  ticker: string | null;
  logo_url: string | null;
}

interface PriceHistoryRow {
  company_id: string;
  market_cap_usd: number | null;
  date: string;
}

export default async function CountryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find country metadata from countries.json
  const countries = countriesJson as CountryMeta[];
  const countryMeta = countries.find((c) => c.slug === slug);

  // Reverse slug to country name for DB queries
  // e.g. "united-states" -> "United States"
  let countryName: string;
  if (countryMeta) {
    countryName = countryMeta.name;
  } else {
    // Try reversing slug: capitalize each word
    countryName = slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // Fetch all data in parallel
  // 1. Paginated market history
  // 2. Companies in this country (for top companies)
  // 3. Total company count

  const PAGE_SIZE = 1000;

  // Start fetching history (paginated) + companies + count in parallel
  const [firstHistoryPage, companiesResult, countResult] = await Promise.all([
    supabase
      .from("country_market_data")
      .select(
        "country, snapshot_date, combined_market_cap, total_volume, change_1d_pct, change_7d_pct, change_30d_pct, public_company_count"
      )
      .eq("country", countryName)
      .order("snapshot_date", { ascending: true })
      .range(0, PAGE_SIZE - 1),
    supabase
      .from("companies")
      .select("id, slug, name, ticker, logo_url")
      .eq("country", countryName),
    supabase
      .from("companies")
      .select("id", { count: "exact", head: true })
      .eq("country", countryName),
  ]);

  // If no history data and no country meta, 404
  const firstPageRows = (firstHistoryPage.data ?? []) as CountryMarketDataRow[];
  if (firstPageRows.length === 0 && !countryMeta) {
    notFound();
  }

  // Continue paginating history if needed
  let allHistory: CountryMarketDataRow[] = [...firstPageRows];
  if (firstPageRows.length >= PAGE_SIZE) {
    let from = PAGE_SIZE;
    let hasMore = true;
    while (hasMore) {
      const { data: page } = await supabase
        .from("country_market_data")
        .select(
          "country, snapshot_date, combined_market_cap, total_volume, change_1d_pct, change_7d_pct, change_30d_pct, public_company_count"
        )
        .eq("country", countryName)
        .order("snapshot_date", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      const rows = (page ?? []) as CountryMarketDataRow[];
      allHistory = allHistory.concat(rows);
      hasMore = rows.length >= PAGE_SIZE;
      from += PAGE_SIZE;
    }
  }

  const history = allHistory;
  const latestSnapshot = history.length > 0 ? history[history.length - 1] : null;

  // Total company count (public + private)
  const totalCompanyCount = countResult.count ?? 0;

  // Build top 20 companies by USD market cap
  const allCompanies = (companiesResult.data ?? []) as CompanyRow[];
  const companyIds = allCompanies.map((c) => c.id);

  interface TopCompanyResult {
    slug: string;
    name: string;
    ticker: string | null;
    valuation: number | null;
    logo_url: string | null;
  }

  let topCompanies: TopCompanyResult[] = [];

  if (companyIds.length > 0) {
    // Get market cap from last 5 days of price history
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
        for (const row of priceRows as PriceHistoryRow[]) {
          if (row.market_cap_usd != null && !marketCapMap.has(row.company_id)) {
            marketCapMap.set(row.company_id, row.market_cap_usd);
          }
        }
      }
    }

    // Sort by market cap, take top 20
    const marketCapEntries: Array<[string, number]> = [];
    marketCapMap.forEach((val, key) => marketCapEntries.push([key, val]));
    const sortedByMarketCap = marketCapEntries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    // Build company lookup
    const companyMap = new Map<string, CompanyRow>();
    for (const c of allCompanies) {
      companyMap.set(c.id, c);
    }

    topCompanies = sortedByMarketCap
      .map((entry) => {
        const id = entry[0];
        const usdMarketCap = entry[1];
        const c = companyMap.get(id);
        if (!c) return null;
        return {
          slug: c.slug,
          name: c.name,
          ticker: c.ticker,
          valuation: usdMarketCap,
          logo_url: c.logo_url,
        };
      })
      .filter(Boolean) as TopCompanyResult[];
  }

  // Build props
  const flag = countryMeta?.flag ?? "";
  const region = countryMeta?.region ?? "";
  const description = countryMeta?.description ?? "";
  const bioHubs = countryMeta?.bioHubs ?? [];

  const historyPoints = history.map((h) => ({
    snapshot_date: h.snapshot_date,
    combined_market_cap: h.combined_market_cap,
    total_volume: h.total_volume,
  }));

  const latestSnapshotProps = latestSnapshot
    ? {
        combined_market_cap: latestSnapshot.combined_market_cap ?? 0,
        change_1d_pct: latestSnapshot.change_1d_pct,
        change_7d_pct: latestSnapshot.change_7d_pct,
        change_30d_pct: latestSnapshot.change_30d_pct,
        public_company_count: latestSnapshot.public_company_count,
      }
    : {
        combined_market_cap: 0,
        change_1d_pct: null,
        change_7d_pct: null,
        change_30d_pct: null,
        public_company_count: null,
      };

  return (
    <CountryDetailClient
      countryName={countryName}
      flag={flag}
      region={region}
      description={description}
      bioHubs={bioHubs}
      history={historyPoints}
      latestSnapshot={latestSnapshotProps}
      topCompanies={topCompanies}
      totalCompanyCount={totalCompanyCount}
    />
  );
}
