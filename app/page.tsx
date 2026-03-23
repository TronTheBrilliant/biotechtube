import Link from "next/link";
import { Nav } from "@/components/Nav";
import { TickerBar } from "@/components/TickerBar";
import { Footer } from "@/components/Footer";
import { IndexCards } from "@/components/IndexCards";
import { HomeSection } from "@/components/HomeSection";
import { FundingRound, BiotechEvent } from "@/lib/types";
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
import TrendingNews from "@/components/home/TrendingNews";
import SciencePapers from "@/components/home/SciencePapers";
import OpenPositions from "@/components/home/OpenPositions";

import fundingData from "@/data/funding.json";
import eventsData from "@/data/events.json";

export const revalidate = 300;

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

  // Get latest date
  const { data: latestRow } = await supabase
    .from("company_price_history")
    .select("date")
    .not("market_cap_usd", "is", null)
    .order("date", { ascending: false })
    .limit(1)
    .single();
  if (!latestRow) return [];

  const latestDate = latestRow.date;
  const thirtyDaysAgo = new Date(latestDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 35);
  const oldCutoff = thirtyDaysAgo.toISOString().split("T")[0];
  const oldEnd = new Date(latestDate);
  oldEnd.setDate(oldEnd.getDate() - 25);
  const oldEndStr = oldEnd.toISOString().split("T")[0];

  // Get current prices (latest date)
  const { data: currentPrices } = await supabase
    .from("company_price_history")
    .select("company_id, market_cap_usd")
    .eq("date", latestDate)
    .not("market_cap_usd", "is", null);

  // Get old prices (~30 days ago range)
  const { data: oldPrices } = await supabase
    .from("company_price_history")
    .select("company_id, market_cap_usd, date")
    .gte("date", oldCutoff)
    .lte("date", oldEndStr)
    .not("market_cap_usd", "is", null)
    .order("date", { ascending: false });

  if (!currentPrices || !oldPrices) return [];

  // Build maps
  const currentMap = new Map<string, number>();
  for (const r of currentPrices) {
    if (!currentMap.has(r.company_id)) currentMap.set(r.company_id, r.market_cap_usd);
  }
  const oldMap = new Map<string, number>();
  for (const r of oldPrices) {
    if (!oldMap.has(r.company_id)) oldMap.set(r.company_id, r.market_cap_usd);
  }

  // Compute 30d change
  const changes: { companyId: string; change30d: number; marketCap: number }[] = [];
  currentMap.forEach((currentMcap, companyId) => {
    const oldMcap = oldMap.get(companyId);
    if (oldMcap && oldMcap > 0 && currentMcap > 1_000_000_000) {
      // Only include companies with >$1B market cap
      const pct = ((currentMcap - oldMcap) / oldMcap) * 100;
      changes.push({ companyId, change30d: Math.round(pct * 100) / 100, marketCap: currentMcap });
    }
  });

  changes.sort((a, b) => b.change30d - a.change30d);
  const top5Ids = changes.slice(0, 5).map((c) => c.companyId);

  // Fetch company details
  const { data: companyRows } = await supabase
    .from("companies")
    .select("id, slug, name, ticker, country, logo_url")
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
    .slice(0, 5);
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
    .slice(0, 5)
    .map((c) => ({
      country: c.country,
      combinedMarketCap: c.combined_market_cap,
      change1d: c.change_1d_pct,
      publicCompanyCount: c.public_company_count,
    }));
}

async function getTopInvestorsData() {
  try {
    const investors = await getAllInvestors();
    return investors.slice(0, 5).map((inv) => ({
      name: inv.name,
      dealCount: inv.companies.length,
      totalInvested: inv.companies.length > 3 ? "Active" : `${inv.companies.length} deals`,
    }));
  } catch {
    return [];
  }
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

// ── Stats Ticker ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StatsTicker({ snapshot }: { snapshot: any }) {
  const stats = [
    { icon: "📊", text: `${snapshot ? formatMarketCap(snapshot.total_market_cap) : "$7.0T"} Market Cap` },
    { icon: "📈", text: `${snapshot ? snapshot.public_companies_count?.toLocaleString() : "771"} Public Companies` },
    { icon: "🏷️", text: "20 Sectors" },
    { icon: "🌍", text: "30+ Countries" },
    { icon: "💊", text: "Updated Daily" },
    { icon: "🧬", text: "1990–Present Data" },
  ];
  return (
    <>
      <div className="hidden md:flex items-center gap-5 mt-4">
        {stats.map((s) => (
          <div key={s.text} className="flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
            <span className="text-[14px]">{s.icon}</span>
            <span className="text-13 font-medium" style={{ color: "var(--color-text-primary)" }}>{s.text}</span>
          </div>
        ))}
      </div>
      <div className="md:hidden mt-3 overflow-hidden" style={{ maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)" }}>
        <div className="flex items-center gap-6 animate-marquee">
          {stats.map((s) => (
            <div key={s.text} className="flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
              <span className="text-[14px]">{s.icon}</span>
              <span className="text-13 font-medium" style={{ color: "var(--color-text-primary)" }}>{s.text}</span>
            </div>
          ))}
          {stats.map((s) => (
            <div key={`dup-${s.text}`} className="flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
              <span className="text-[14px]">{s.icon}</span>
              <span className="text-13 font-medium" style={{ color: "var(--color-text-primary)" }}>{s.text}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Page ──

export default async function HomePage() {
  const [companies, snapshot, trending, sectors, countries, investorsData, peopleData] =
    await Promise.all([
      getTopCompanies(),
      getLatestSnapshot(),
      getTrendingCompanies(),
      getTopSectors(),
      getTopCountries(),
      getTopInvestorsData(),
      getTopPeopleData(),
    ]);

  const funding = fundingData as FundingRound[];
  const events = eventsData as BiotechEvent[];

  // Prepare funding radar data
  const fundingRadar = funding.slice(0, 5).map((f) => {
    const comp = companies.find((c) => c.slug === f.companySlug);
    return {
      companyName: comp?.name || f.companySlug,
      companySlug: f.companySlug,
      type: f.type as string,
      amount: f.amount,
      currency: f.currency as string,
      leadInvestor: f.leadInvestor || "",
      daysAgo: f.daysAgo || 0,
    };
  });

  // Prepare top 5 companies for display
  const top5Companies = companies.slice(0, 5).map((c) => ({
    slug: c.slug,
    name: c.name,
    ticker: c.ticker || null,
    country: c.country || null,
    valuation: c.valuation || null,
    logo_url: c.logoUrl || null,
  }));

  return (
    <div
      className="page-content"
      style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}
    >
      <Nav />
      <TickerBar />

      {/* Hero */}
      <div
        className="max-w-[1200px] mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-4 md:pb-6"
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: "var(--color-accent)" }}
              />
              <span className="text-12 font-semibold uppercase tracking-wider" style={{ color: "var(--color-accent)" }}>
                Live Data
              </span>
            </div>
            <h1
              className="text-[36px] md:text-[56px] font-bold tracking-tight"
              style={{
                color: "var(--color-text-primary)",
                letterSpacing: "-1.5px",
                lineHeight: 1.05,
              }}
            >
              Global Biotech
              <br />
              Intelligence.
            </h1>
            <p
              className="text-[15px] md:text-[17px] mt-3 max-w-[480px]"
              style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}
            >
              Market data, company rankings, and sector analysis across{" "}
              <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
                {snapshot ? formatMarketCap(snapshot.total_market_cap) : "$7.0T"}
              </span>{" "}
              in biotech market cap.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/markets"
              className="text-13 font-semibold px-5 py-2.5 rounded-lg transition-all duration-150 hover:opacity-90"
              style={{ background: "var(--color-accent)", color: "white" }}
            >
              Explore Markets
            </Link>
            <Link
              href="/top-companies"
              className="text-13 font-semibold px-5 py-2.5 rounded-lg transition-all duration-150 hover:opacity-90"
              style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-medium)" }}
            >
              Browse Companies
            </Link>
          </div>
        </div>
      </div>

      {/* Index Cards */}
      {snapshot && <IndexCards snapshot={snapshot} />}

      {/* Sections Grid */}
      <div className="px-4 md:px-6 py-4 space-y-4 max-w-[1200px] mx-auto">
        {/* Row 1: Trending + Top Companies */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {trending.length > 0 && (
            <HomeSection icon="🔥" title="Trending Companies" viewAllHref="/trending" viewAllLabel="View all">
              <TrendingCompanies companies={trending} />
            </HomeSection>
          )}
          <HomeSection icon="📊" title="Top Companies" viewAllHref="/top-companies" viewAllLabel="View all 750+">
            <TopCompanies companies={top5Companies} />
          </HomeSection>
        </div>

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
          <FundingChart data={[]} />
        </HomeSection>

        {/* Row 3: Funding Radar + Events */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <HomeSection icon="📡" title="Funding Radar" viewAllHref="/funding-radar" viewAllLabel="View all">
            <FundingRadar rounds={fundingRadar} />
          </HomeSection>
          <HomeSection icon="📅" title="Upcoming Events" viewAllHref="/events" viewAllLabel="View all">
            <UpcomingEventsSection events={events.slice(0, 5)} />
          </HomeSection>
        </div>

        {/* Row 4: Investors + People */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {investorsData.length > 0 && (
            <HomeSection icon="🏦" title="Top Investors" viewAllHref="/top-investors" viewAllLabel="View all">
              <TopInvestors investors={investorsData} />
            </HomeSection>
          )}
          {peopleData.length > 0 && (
            <HomeSection icon="👤" title="People in Biotech" viewAllHref="/top-people" viewAllLabel="View all">
              <TopPeople people={peopleData} />
            </HomeSection>
          )}
        </div>

        {/* Row 5: News + Papers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <HomeSection icon="📰" title="Trending News" viewAllHref="/news" viewAllLabel="View all">
            <TrendingNews />
          </HomeSection>
          <HomeSection icon="📄" title="Top Science Papers" viewAllHref="/papers" viewAllLabel="View all">
            <SciencePapers />
          </HomeSection>
        </div>

        {/* Open Positions */}
        <HomeSection icon="💼" title="Open Positions" viewAllHref="/jobs" viewAllLabel="View all">
          <OpenPositions />
        </HomeSection>
      </div>

      <Footer />
    </div>
  );
}
