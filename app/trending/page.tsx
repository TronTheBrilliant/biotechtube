import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createClient } from "@supabase/supabase-js";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import TrendingClient, { TrendingCompanyRow } from "./TrendingClient";

export const revalidate = 3600; // 1 hour (was 5 min)

const ogImageUrl =
  "https://biotechtube.io/api/og?title=Trending%20Biotech%20Stocks&subtitle=Top%20Performers%20%26%20Losers&type=default";

export const metadata: Metadata = {
  title: "Trending Biotech Stocks — Top Gainers & Losers | BiotechTube",
  description:
    "Discover the hottest biotech stocks right now. Top gainers and losers ranked by 24-hour, 7-day, and 30-day market cap performance with real-time data.",
  openGraph: {
    title: "Trending Biotech Stocks | BiotechTube",
    description:
      "Discover the hottest biotech stocks — top gainers and losers ranked by performance.",
    type: "website",
    siteName: "BiotechTube",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "Trending Biotech Stocks on BiotechTube",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@biotechtube",
    title: "Trending Biotech Stocks | BiotechTube",
    description:
      "Discover the hottest biotech stocks — top gainers and losers ranked by performance.",
    images: [ogImageUrl],
  },
  alternates: {
    canonical: "https://biotechtube.io/trending",
  },
};

const MIN_MARKET_CAP = 100_000_000; // $100M
const CAP_1D = 15;
const CAP_7D = 30;
const CAP_30D = 80;

async function getTrendingData(): Promise<TrendingCompanyRow[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find the most recent date with enough data — try efficient RPC first
  let latestDate: string | null = null;
  const { data: dateCounts } = await supabase.rpc("get_recent_price_date_counts" as never);
  if (dateCounts && Array.isArray(dateCounts)) {
    for (const row of dateCounts as { date: string; cnt: number }[]) {
      if (row.cnt >= 100) { latestDate = row.date; break; }
    }
  }
  if (!latestDate) {
    // Fallback: paginate to find a date with 100+ entries
    let recentDates: { date: string }[] = [];
    for (let page = 0; page < 3; page++) {
      const { data } = await supabase
        .from("company_price_history")
        .select("date")
        .not("market_cap_usd", "is", null)
        .order("date", { ascending: false })
        .range(page * 1000, (page + 1) * 1000 - 1);
      if (!data || data.length === 0) break;
      recentDates.push(...data);
      if (data.length < 1000) break;
    }
    if (recentDates.length === 0) return [];
    const countByDate = new Map<string, number>();
    for (const r of recentDates) {
      countByDate.set(r.date, (countByDate.get(r.date) || 0) + 1);
    }
    const sortedDates = [...countByDate.entries()].sort((a, b) =>
      b[0].localeCompare(a[0])
    );
    for (const [d, cnt] of sortedDates) {
      if (cnt >= 100) { latestDate = d; break; }
    }
    if (!latestDate) return [];
  }

  // Date ranges
  const fiveDaysAgo = new Date(latestDate);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const fiveDaysAgoStr = fiveDaysAgo.toISOString().split("T")[0];

  // 7 days ago range
  const sevenDaysAgoStart = new Date(latestDate);
  sevenDaysAgoStart.setDate(sevenDaysAgoStart.getDate() - 10);
  const sevenDaysAgoEnd = new Date(latestDate);
  sevenDaysAgoEnd.setDate(sevenDaysAgoEnd.getDate() - 5);
  const sevenDaysAgoStartStr = sevenDaysAgoStart.toISOString().split("T")[0];
  const sevenDaysAgoEndStr = sevenDaysAgoEnd.toISOString().split("T")[0];

  // 30 days ago range
  const thirtyDaysAgoStart = new Date(latestDate);
  thirtyDaysAgoStart.setDate(thirtyDaysAgoStart.getDate() - 35);
  const thirtyDaysAgoEnd = new Date(latestDate);
  thirtyDaysAgoEnd.setDate(thirtyDaysAgoEnd.getDate() - 25);
  const thirtyDaysAgoStartStr = thirtyDaysAgoStart.toISOString().split("T")[0];
  const thirtyDaysAgoEndStr = thirtyDaysAgoEnd.toISOString().split("T")[0];

  // Fetch current prices (last 5 days) — include adj_close for price-based trending
  // Must paginate: ~1000 companies × 5 days = ~5000 rows, exceeds Supabase default 1000 limit
  let currentPrices: { company_id: string; market_cap_usd: number; adj_close: number | null; change_pct: number | null; date: string }[] = [];
  for (let page = 0; page < 5; page++) {
    const { data } = await supabase
      .from("company_price_history")
      .select("company_id, market_cap_usd, adj_close, change_pct, date")
      .gte("date", fiveDaysAgoStr)
      .not("market_cap_usd", "is", null)
      .order("date", { ascending: false })
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    currentPrices.push(...data);
    if (data.length < 1000) break;
  }

  // Fetch 7-day-ago prices
  let sevenDayPrices: { company_id: string; market_cap_usd: number; adj_close: number | null; date: string }[] = [];
  for (let page = 0; page < 5; page++) {
    const { data } = await supabase
      .from("company_price_history")
      .select("company_id, market_cap_usd, adj_close, date")
      .gte("date", sevenDaysAgoStartStr)
      .lte("date", sevenDaysAgoEndStr)
      .not("adj_close", "is", null)
      .order("date", { ascending: false })
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    sevenDayPrices.push(...data);
    if (data.length < 1000) break;
  }

  // Fetch 30-day-ago prices
  let thirtyDayPrices: { company_id: string; market_cap_usd: number; adj_close: number | null; date: string }[] = [];
  for (let page = 0; page < 5; page++) {
    const { data } = await supabase
      .from("company_price_history")
      .select("company_id, market_cap_usd, adj_close, date")
      .gte("date", thirtyDaysAgoStartStr)
      .lte("date", thirtyDaysAgoEndStr)
      .not("adj_close", "is", null)
      .order("date", { ascending: false })
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    thirtyDayPrices.push(...data);
    if (data.length < 1000) break;
  }

  if (currentPrices.length === 0) return [];

  // Build maps: company_id -> { marketCap, adjClose, changePct }
  const currentMap = new Map<
    string,
    { marketCap: number; adjClose: number | null; changePct: number | null }
  >();
  for (const r of currentPrices) {
    if (!currentMap.has(r.company_id)) {
      currentMap.set(r.company_id, {
        marketCap: Number(r.market_cap_usd),
        adjClose: r.adj_close != null ? Number(r.adj_close) : null,
        changePct: r.change_pct != null ? Number(r.change_pct) : null,
      });
    }
  }

  const sevenDayMap = new Map<string, { adjClose: number | null }>();
  if (sevenDayPrices.length > 0) {
    for (const r of sevenDayPrices) {
      if (!sevenDayMap.has(r.company_id)) {
        sevenDayMap.set(r.company_id, {
          adjClose: r.adj_close != null ? Number(r.adj_close) : null,
        });
      }
    }
  }

  const thirtyDayMap = new Map<string, { adjClose: number | null }>();
  if (thirtyDayPrices.length > 0) {
    for (const r of thirtyDayPrices) {
      if (!thirtyDayMap.has(r.company_id)) {
        thirtyDayMap.set(r.company_id, {
          adjClose: r.adj_close != null ? Number(r.adj_close) : null,
        });
      }
    }
  }

  // Compute changes for each company
  const companyChanges: {
    companyId: string;
    change1d: number | null;
    change7d: number | null;
    change30d: number | null;
    marketCap: number;
  }[] = [];

  currentMap.forEach((current, companyId) => {
    if (current.marketCap < MIN_MARKET_CAP) return;

    // 1D change from change_pct field (daily change)
    let change1d: number | null = null;
    if (current.changePct !== null && current.changePct !== undefined) {
      const pct = Number(current.changePct);
      if (!isNaN(pct) && Math.abs(pct) <= CAP_1D) {
        change1d = Math.round(pct * 100) / 100;
      }
    }

    // 7D change from adj_close price comparison (currency-neutral)
    let change7d: number | null = null;
    const old7d = sevenDayMap.get(companyId);
    if (old7d && old7d.adjClose && old7d.adjClose > 0 && current.adjClose && current.adjClose > 0) {
      const pct = ((current.adjClose - old7d.adjClose) / old7d.adjClose) * 100;
      if (Math.abs(pct) <= CAP_7D) {
        change7d = Math.round(pct * 100) / 100;
      }
    }

    // 30D change from adj_close price comparison (currency-neutral)
    let change30d: number | null = null;
    const old30d = thirtyDayMap.get(companyId);
    if (old30d && old30d.adjClose && old30d.adjClose > 0 && current.adjClose && current.adjClose > 0) {
      const pct =
        ((current.adjClose - old30d.adjClose) / old30d.adjClose) * 100;
      if (Math.abs(pct) <= CAP_30D) {
        change30d = Math.round(pct * 100) / 100;
      }
    }

    // Only include if at least one change is available
    if (change1d !== null || change7d !== null || change30d !== null) {
      companyChanges.push({
        companyId,
        change1d,
        change7d,
        change30d,
        marketCap: current.marketCap,
      });
    }
  });

  // Get top 200 by absolute value of any change to have enough for gainers+losers
  companyChanges.sort(
    (a, b) =>
      Math.max(
        Math.abs(b.change30d ?? 0),
        Math.abs(b.change7d ?? 0),
        Math.abs(b.change1d ?? 0)
      ) -
      Math.max(
        Math.abs(a.change30d ?? 0),
        Math.abs(a.change7d ?? 0),
        Math.abs(a.change1d ?? 0)
      )
  );
  const top200 = companyChanges.slice(0, 200);
  const allIds = top200.map((c) => c.companyId);

  if (allIds.length === 0) return [];

  // Fetch company details in batches
  const BATCH = 100;
  const companyMap = new Map<string, { id: string; slug: string; name: string; ticker: string | null; country: string | null; logo_url: string | null; website: string | null }>();
  for (let i = 0; i < allIds.length; i += BATCH) {
    const batch = allIds.slice(i, i + BATCH);
    const { data: companyRows } = await supabase
      .from("companies")
      .select("id, slug, name, ticker, country, logo_url, website")
      .in("id", batch);
    if (companyRows) {
      for (const c of companyRows) companyMap.set(c.id, c);
    }
  }

  return top200
    .map((ch) => {
      const c = companyMap.get(ch.companyId);
      if (!c || !c.slug) return null;
      return {
        slug: c.slug,
        name: c.name,
        ticker: c.ticker,
        country: c.country,
        logo_url: c.logo_url,
        website: c.website,
        change1d: ch.change1d,
        change7d: ch.change7d,
        change30d: ch.change30d,
        marketCap: ch.marketCap,
      };
    })
    .filter((c): c is TrendingCompanyRow => c !== null);
}

export default async function TrendingPage() {
  const companies = await getTrendingData();

  return (
    <div
      className="page-content"
      style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}
    >
      <Nav />

      {/* Hero */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="mb-3">
          <Breadcrumbs
            items={[{ label: "Home", href: "/" }, { label: "Trending" }]}
          />
        </div>
        <h1
          className="text-[32px] md:text-[48px] font-bold tracking-tight"
          style={{
            color: "var(--color-text-primary)",
            letterSpacing: "-1px",
            lineHeight: 1.1,
          }}
        >
          Trending Biotech Companies
        </h1>
        <p
          className="text-[15px] md:text-[17px] mt-2 max-w-[560px]"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}
        >
          Top gainers and losers in biotech, ranked by market cap performance.
          Filter by 24-hour, 7-day, or 30-day changes.
        </p>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 pb-8 max-w-[1200px] mx-auto">
        <TrendingClient companies={companies} />
      </div>

      <Footer />
    </div>
  );
}
