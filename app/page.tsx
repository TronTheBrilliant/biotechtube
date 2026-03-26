
import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { TickerBar } from "@/components/TickerBar";
import { Footer } from "@/components/Footer";
// import { IndexCards } from "@/components/IndexCards";
import { HomeSection } from "@/components/HomeSection";

import { dbRowsToCompanies } from "@/lib/adapters";
import { createClient } from "@supabase/supabase-js";
import { formatMarketCap } from "@/lib/market-utils";
import { getAllPeople, getAllInvestors } from "@/lib/seo-utils";

// Section components
import { TrendingCompanies } from "@/components/home/TrendingCompanies";
import TopCompanies from "@/components/home/TopCompanies";
import TopSectors from "@/components/home/TopSectors";
import MarketByCountry from "@/components/home/MarketByCountry";
import { FundingRadar } from "@/components/home/FundingRadar";
import { UpcomingEventsSection } from "@/components/home/UpcomingEventsSection";
import TopInvestors from "@/components/home/TopInvestors";
import TopPeople from "@/components/home/TopPeople";
import FundingChart from "@/components/home/FundingChart";
import BiotechIndexChart from "@/components/home/BiotechIndexChart";
import HotPipelines from "@/components/home/HotPipelines";
// import HotProducts from "@/components/home/HotProducts";
import TrendingNews from "@/components/home/TrendingNews";
import SciencePapers from "@/components/home/SciencePapers";
import OpenPositions from "@/components/home/OpenPositions";


import { getFundingAnnualForHomepage } from "@/lib/funding-queries";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "BiotechTube — Track the Global Biotech Market in Real Time",
  description:
    "Track $7T+ in biotech market cap across 1,000+ public companies, 20 sectors, and 30+ countries. Live stock prices, drug pipelines, funding rounds, and FDA approvals updated daily.",
  keywords:
    "biotech, biotechnology, market cap, pharmaceutical, drug pipeline, biotech stocks, biotech funding, clinical trials, FDA approvals, biotech companies",
  alternates: {
    canonical: "https://biotechtube.io",
  },
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Data fetching functions ──

async function getTopCompanies() {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("companies")
    .select("*")
    .order("valuation", { ascending: false, nullsFirst: false })
    .limit(1000);
  if (!data) return [];

  const companies = dbRowsToCompanies(data);

  // Override valuation with USD market cap from price history
  const companyIds = data.map((row: { id: string }) => row.id);
  const marketCapMap = new Map<string, number>();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 5);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const BATCH_SIZE = 200;
  for (let i = 0; i < companyIds.length; i += BATCH_SIZE) {
    const batch = companyIds.slice(i, i + BATCH_SIZE);
    const { data: priceRows } = await supabase
      .from("company_price_history")
      .select("company_id, market_cap_usd, date")
      .in("company_id", batch)
      .gte("date", cutoffStr)
      .not("market_cap_usd", "is", null)
      .order("date", { ascending: false });
    if (priceRows) {
      for (const row of priceRows) {
        if (row.market_cap_usd != null && !marketCapMap.has(row.company_id)) {
          marketCapMap.set(row.company_id, row.market_cap_usd);
        }
      }
    }
  }

  const slugToId = new Map<string, string>();
  for (const row of data) slugToId.set(row.slug, row.id);

  for (const company of companies) {
    const id = slugToId.get(company.slug);
    if (id) {
      const usdMarketCap = marketCapMap.get(id);
      if (usdMarketCap != null) {
        company.valuation = usdMarketCap;
      } else if (company.valuation && company.valuation > 0) {
        company.valuation = undefined;
      }
    }
  }
  companies.sort((a, b) => (b.valuation || 0) - (a.valuation || 0));
  return companies;
}

async function getLatestSnapshot() {
  const supabase = getSupabase();
  const { data: snapshot } = await supabase
    .from("market_snapshots")
    .select("*")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .single();
  return snapshot;
}

async function getTrendingCompanies() {
  const supabase = getSupabase();

  // Find the most recent date that has at least 100 companies with market_cap_usd data
  const { data: dateCounts } = await supabase.rpc("get_recent_price_date_counts" as never);
  // Fallback: query recent dates manually
  let latestDate: string | null = null;
  if (dateCounts && Array.isArray(dateCounts)) {
    for (const row of dateCounts as { date: string; cnt: number }[]) {
      if (row.cnt >= 100) { latestDate = row.date; break; }
    }
  }
  if (!latestDate) {
    // Manual fallback: check last 10 dates
    const { data: recentDates } = await supabase
      .from("company_price_history")
      .select("date")
      .not("market_cap_usd", "is", null)
      .order("date", { ascending: false })
      .limit(5000);
    if (!recentDates) return [];
    const countByDate = new Map<string, number>();
    for (const r of recentDates) {
      countByDate.set(r.date, (countByDate.get(r.date) || 0) + 1);
    }
    const sortedDates = [...countByDate.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    for (const [d, cnt] of sortedDates) {
      if (cnt >= 100) { latestDate = d; break; }
    }
    if (!latestDate) return [];
  }
  const thirtyDaysAgo = new Date(latestDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 35);
  const oldCutoff = thirtyDaysAgo.toISOString().split("T")[0];
  const oldEnd = new Date(latestDate);
  oldEnd.setDate(oldEnd.getDate() - 25);
  const oldEndStr = oldEnd.toISOString().split("T")[0];

  // Get current prices (last 5 trading days to catch all markets) — use adj_close for price-based trending
  const fiveDaysAgo = new Date(latestDate);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const fiveDaysAgoStr = fiveDaysAgo.toISOString().split("T")[0];
  const { data: currentPrices } = await supabase
    .from("company_price_history")
    .select("company_id, market_cap_usd, adj_close, date")
    .gte("date", fiveDaysAgoStr)
    .not("market_cap_usd", "is", null)
    .order("date", { ascending: false });

  // Get old prices (~30 days ago range) — use adj_close for price-based comparison
  const { data: oldPrices } = await supabase
    .from("company_price_history")
    .select("company_id, market_cap_usd, adj_close, date")
    .gte("date", oldCutoff)
    .lte("date", oldEndStr)
    .not("adj_close", "is", null)
    .order("date", { ascending: false });

  if (!currentPrices || !oldPrices) return [];

  // Build maps — use adj_close for price-based trending (avoids shares_outstanding artifacts)
  const currentMap = new Map<string, { marketCap: number; adjClose: number }>();
  for (const r of currentPrices) {
    if (!currentMap.has(r.company_id) && r.adj_close != null) {
      currentMap.set(r.company_id, { marketCap: r.market_cap_usd, adjClose: Number(r.adj_close) });
    }
  }
  const oldMap = new Map<string, number>();
  for (const r of oldPrices) {
    if (!oldMap.has(r.company_id) && r.adj_close != null) {
      oldMap.set(r.company_id, Number(r.adj_close));
    }
  }

  // Compute 30d change from adj_close price — currency-neutral, no shares_outstanding artifacts
  const changes: { companyId: string; change30d: number; marketCap: number }[] = [];
  currentMap.forEach((current, companyId) => {
    const oldAdjClose = oldMap.get(companyId);
    if (oldAdjClose && oldAdjClose > 0 && current.adjClose > 0 && current.marketCap > 100_000_000) {
      const pct = ((current.adjClose - oldAdjClose) / oldAdjClose) * 100;
      if (Math.abs(pct) <= 80) {
        changes.push({ companyId, change30d: Math.round(pct * 100) / 100, marketCap: current.marketCap });
      }
    }
  });

  changes.sort((a, b) => b.change30d - a.change30d);
  const top5Ids = changes.slice(0, 5).map((c) => c.companyId);

  // Fetch company details
  const { data: companyRows } = await supabase
    .from("companies")
    .select("id, slug, name, ticker, country, logo_url, website")
    .in("id", top5Ids);

  if (!companyRows) return [];

  const companyMap = new Map<string, (typeof companyRows)[0]>();
  for (const c of companyRows) companyMap.set(c.id, c);

  return changes.slice(0, 5).map((ch) => {
    const c = companyMap.get(ch.companyId);
    return {
      slug: c?.slug || "",
      name: c?.name || "",
      ticker: c?.ticker || null,
      country: c?.country || null,
      logo_url: c?.logo_url || null,
      website: c?.website || null,
      change30d: ch.change30d,
      marketCap: ch.marketCap,
    };
  }).filter((c) => c.slug);
}

async function getTopSectors() {
  const supabase = getSupabase();
  const { data: latestDateRow } = await supabase
    .from("sector_market_data")
    .select("snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .single();
  if (!latestDateRow) return [];

  const [sectorMarketResult, sectorResult] = await Promise.all([
    supabase
      .from("sector_market_data")
      .select("sector_id, combined_market_cap, change_1d_pct, change_7d_pct")
      .eq("snapshot_date", latestDateRow.snapshot_date)
      .then((r) => r.data ?? []),
    supabase
      .from("sectors")
      .select("id, slug, name, short_name, company_count")
      .then((r) => r.data ?? []),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sectorMap = new Map<string, any>();
  for (const s of sectorResult) sectorMap.set(s.id, s);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (sectorMarketResult as any[])
    .map((m) => {
      const s = sectorMap.get(m.sector_id);
      if (!s) return null;
      return {
        slug: s.slug,
        name: s.name,
        shortName: s.short_name,
        combinedMarketCap: m.combined_market_cap,
        change1d: m.change_1d_pct,
        change7d: m.change_7d_pct,
        companyCount: s.company_count,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => (b.combinedMarketCap ?? 0) - (a.combinedMarketCap ?? 0))
    .slice(0, 8);
}

async function getTopCountries() {
  const supabase = getSupabase();
  const { data: latestDateRow } = await supabase
    .from("country_market_data")
    .select("snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .single();
  if (!latestDateRow) return [];

  const { data: countryRows } = await supabase
    .from("country_market_data")
    .select("country, combined_market_cap, change_1d_pct, public_company_count")
    .eq("snapshot_date", latestDateRow.snapshot_date);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((countryRows ?? []) as any[])
    .sort((a, b) => (b.combined_market_cap ?? 0) - (a.combined_market_cap ?? 0))
    .slice(0, 8)
    .map((c) => ({
      country: c.country,
      combinedMarketCap: c.combined_market_cap,
      change1d: c.change_1d_pct,
      publicCompanyCount: c.public_company_count,
    }));
}

async function getTopInvestorsData() {
  try {
    const supabase = getSupabase();
    const { data } = await supabase.rpc('get_top_investors', { p_limit: 5 });
    if (data && data.length > 0) {
      return data.map((inv: { investor_name: string; total_invested: number; deal_count: number }) => ({
        name: inv.investor_name,
        dealCount: Number(inv.deal_count),
        totalInvested: Number(inv.total_invested),
      }));
    }
    // Fallback to SEO utils if RPC returns nothing
    const investors = await getAllInvestors();
    return investors.slice(0, 5).map((inv) => ({
      name: inv.name,
      dealCount: inv.companies.length,
      totalInvested: null,
    }));
  } catch {
    return [];
  }
}

async function getRecentFunding() {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('funding_rounds')
    .select('company_name, round_type, amount_usd, announced_date, lead_investor, country')
    .not('amount_usd', 'is', null)
    .gt('amount_usd', 0)
    .order('announced_date', { ascending: false })
    .limit(5);
  return (data || []).map((r: { company_name: string; round_type: string; amount_usd: number; announced_date: string; lead_investor: string | null; country: string | null }) => ({
    companyName: r.company_name,
    roundType: r.round_type,
    amountUsd: Number(r.amount_usd),
    announcedDate: r.announced_date,
    leadInvestor: r.lead_investor,
    country: r.country,
  }));
}

async function getTopPeopleData() {
  try {
    const people = await getAllPeople();
    return people.slice(0, 5).map((p) => ({
      name: p.name,
      role: p.role || "Executive",
      company: p.companyName || "",
      companySlug: p.companySlug || "",
    }));
  } catch {
    return [];
  }
}

async function getIndexHistory() {
  const supabase = getSupabase();
  const PAGE_SIZE = 1000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let all: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data } = await supabase
      .from("market_snapshots")
      .select("snapshot_date, total_market_cap")
      .not("total_market_cap", "is", null)
      .order("snapshot_date", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    const page = data ?? [];
    all = all.concat(page);
    hasMore = page.length >= PAGE_SIZE;
    from += PAGE_SIZE;
  }

  return all.map((row: { snapshot_date: string; total_market_cap: string | number }) => ({
    snapshot_date: row.snapshot_date,
    total_market_cap: Number(row.total_market_cap),
  }));
}

async function getHotPipelines() {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("pipelines")
    .select("product_name, indication, stage, company_name, trial_status, company_id")
    .eq("stage", "Phase 3")
    .eq("trial_status", "Recruiting")
    .order("start_date", { ascending: false })
    .limit(20);
  if (!data) return [];
  // Deduplicate by product_name, keep first occurrence
  const seen = new Set<string>();
  const deduped: typeof data = [];
  for (const row of data) {
    if (!seen.has(row.product_name)) {
      seen.add(row.product_name);
      deduped.push(row);
    }
    if (deduped.length >= 5) break;
  }
  return deduped.map((row) => ({
    product_name: row.product_name,
    indication: row.indication,
    stage: row.stage,
    company_name: row.company_name,
    company_id: row.company_id,
  }));
}

async function getHotProducts() {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("unified_products")
    .select("name, product_type, company_name, company_slug, slug, stage, indication, hype_score, trending_direction")
    .order("hype_score", { ascending: false })
    .limit(8);
  if (!data || data.length === 0) return [];

  return data.map((d: { name: string; product_type: string; company_name: string | null; company_slug: string | null; slug: string | null; stage: string | null; indication: string | null; hype_score: number; trending_direction: string }) => ({
    name: d.name,
    product_type: d.product_type,
    company_name: d.company_name,
    company_slug: d.company_slug,
    slug: d.slug,
    stage: d.stage,
    indication: d.indication,
    hype_score: d.hype_score,
    trending_direction: d.trending_direction,
  }));
}

async function getUpcomingEvents() {
  const supabase = getSupabase();
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("biotech_events")
    .select("name, start_date, end_date, city, country")
    .gte("start_date", today)
    .order("start_date", { ascending: true })
    .limit(5);
  if (!data) return [];
  return data.map((e: { name: string; start_date: string; end_date: string | null; city: string | null; country: string | null }) => ({
    name: e.name,
    date: e.start_date,
    endDate: e.end_date || undefined,
    location: [e.city, e.country].filter(Boolean).join(", "),
  }));
}

// ── Page ──

async function safeFetch<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch (err: any) { console.error("Homepage fetch error:", err?.message || err); return fallback; }
}

export default async function HomePage() {

  const [companies, snapshot, trending, sectors, countries, investorsData, peopleData, fundingAnnualData, indexHistory, hotPipelines, recentFunding, events] =
    await Promise.all([
      safeFetch(getTopCompanies, []),
      safeFetch(getLatestSnapshot, null),
      safeFetch(getTrendingCompanies, []),
      safeFetch(getTopSectors, []),
      safeFetch(getTopCountries, []),
      safeFetch(getTopInvestorsData, []),
      safeFetch(getTopPeopleData, []),
      safeFetch(getFundingAnnualForHomepage, []),
      safeFetch(getIndexHistory, []),
      safeFetch(getHotPipelines, []),
      safeFetch(getRecentFunding, []),
      safeFetch(getUpcomingEvents, []),
    ]);

  // Prepare top 5 companies for display
  const top5Companies = companies.slice(0, 5).map((c) => ({
    slug: c.slug,
    name: c.name,
    ticker: c.ticker || null,
    country: c.country || null,
    valuation: c.valuation || null,
    logo_url: c.logoUrl || null,
    website: c.website || null,
  }));

  // JSON-LD structured data for homepage
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "BiotechTube",
    url: "https://biotechtube.io",
    description: "Track 14,000+ biotech companies worldwide. Clinical pipeline data, biotech market intelligence, funding rounds, company rankings, and investment analysis.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://biotechtube.io/companies?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "BiotechTube",
    url: "https://biotechtube.io",
    description: "Global biotech intelligence platform tracking companies, markets, funding, and clinical pipelines.",
    sameAs: [],
  };

  return (
    <div
      className="page-content"
      style={{ minHeight: "100vh" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      {/* Background gradient: white at top fading to warm grey */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(to bottom, var(--color-bg-primary) 0%, var(--color-bg-primary) 200px, var(--color-bg-tertiary) 600px)",
        zIndex: -1,
        pointerEvents: "none",
      }} />
      <Nav />
      <TickerBar />

      {/* Hero — centred */}
      <section aria-label="Hero" className="max-w-[1200px] mx-auto px-4 md:px-6 pt-8 md:pt-14 pb-6 md:pb-8 text-center">
        <h1
          className="text-[36px] md:text-[56px] font-bold tracking-tight mx-auto"
          style={{
            color: "var(--color-text-primary)",
            letterSpacing: "-1.5px",
            lineHeight: 1.05,
          }}
        >
          The Pulse of the Global Biotech Market.
        </h1>
        <p
          className="text-[15px] md:text-[17px] mt-3 max-w-[560px] mx-auto"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}
        >
          Track{" "}
          <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
            {snapshot ? formatMarketCap(snapshot.total_market_cap) : "$7.0T"}+
          </span>{" "}
          in biotech market cap across {" "}
          <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>1,039</span> public companies,{" "}
          <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>20</span> sectors, and{" "}
          <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>30+</span> countries.
        </p>

        {/* Company logos as social proof */}
        <div className="flex items-center justify-center gap-5 mt-6 opacity-30">
          {["lilly.com", "pfizer.com", "novartis.com", "roche.com", "amgen.com", "gilead.com"].map((domain) => (
            <img
              key={domain}
              src={`https://img.logo.dev/${domain}?token=pk_FNHUWoZORpiR_7j_vzFnmQ`}
              alt={domain.split(".")[0]}
              className="h-5 md:h-6 object-contain grayscale"
              style={{ maxWidth: 80 }}
            />
          ))}
        </div>
      </section>

      {/* Index Cards — hidden for testing */}
      {/* {snapshot && <IndexCards snapshot={snapshot} />} */}

      {/* Sections Grid */}
      <main className="px-4 md:px-6 py-4 space-y-4 max-w-[1200px] mx-auto">
        {/* Row 1: Trending + Top Companies */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {trending.length > 0 ? (
            <HomeSection icon="🔥" title="Trending Companies" viewAllHref="/trending" viewAllLabel="View all">
              <TrendingCompanies companies={trending} />
            </HomeSection>
          ) : (
            <HomeSection icon="🔥" title="Trending Companies" viewAllHref="/trending" viewAllLabel="View all">
              <div className="px-4 py-8 text-center">
                <p className="text-13" style={{ color: "var(--color-text-tertiary)" }}>Loading trending data...</p>
              </div>
            </HomeSection>
          )}
          {top5Companies.length > 0 ? (
            <HomeSection icon="📊" title="Top Companies" viewAllHref="/top-companies" viewAllLabel="View all 750+">
              <TopCompanies companies={top5Companies} />
            </HomeSection>
          ) : (
            <HomeSection icon="📊" title="Top Companies" viewAllHref="/top-companies" viewAllLabel="View all 750+">
              <div className="px-4 py-8 text-center">
                <p className="text-13" style={{ color: "var(--color-text-tertiary)" }}>Loading company data...</p>
              </div>
            </HomeSection>
          )}
        </div>

        {/* Biotech Market Index — full width */}
        {indexHistory.length > 0 && (
          <HomeSection icon="📈" title="Biotech Market Index" viewAllHref="/markets" viewAllLabel="Full markets">
            <BiotechIndexChart data={indexHistory} />
          </HomeSection>
        )}

        {/* Row 2: Sectors + Countries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sectors.length > 0 && (
            <HomeSection icon="🧬" title="Top Sectors" viewAllHref="/top-sectors" viewAllLabel="View all 20">
              <TopSectors sectors={sectors} />
            </HomeSection>
          )}
          {countries.length > 0 && (
            <HomeSection icon="🌍" title="Market by Country" viewAllHref="/countries" viewAllLabel="View all 30+">
              <MarketByCountry countries={countries} />
            </HomeSection>
          )}
        </div>

        {/* Funding Season Chart — full width */}
        <HomeSection icon="💰" title="Funding Season" viewAllHref="/funding" viewAllLabel="View all">
          <FundingChart data={fundingAnnualData} />
        </HomeSection>

        {/* Row 3: Funding Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <HomeSection icon="📡" title="Funding Radar" viewAllHref="/funding" viewAllLabel="View all">
            <FundingRadar rounds={recentFunding} />
          </HomeSection>
        </div>

        {/* Row 4: Events + Investors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <HomeSection icon="📅" title="Upcoming Events" viewAllHref="/events" viewAllLabel="View all">
            <UpcomingEventsSection events={events.slice(0, 5)} />
          </HomeSection>
          {investorsData.length > 0 && (
            <HomeSection icon="🏦" title="Top Investors" viewAllHref="/funding" viewAllLabel="View all">
              <TopInvestors investors={investorsData} />
            </HomeSection>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
