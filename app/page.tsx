
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
import PipelinesToWatch from "@/components/home/PipelinesToWatch";
import SmallCapWatch from "@/components/home/SmallCapWatch";
import NextFDADecision from "@/components/home/NextFDADecision";
// import HotProducts from "@/components/home/HotProducts";
import TrendingNews from "@/components/home/TrendingNews";
import SciencePapers from "@/components/home/SciencePapers";
import OpenPositions from "@/components/home/OpenPositions";
import { NewsletterSignup } from "@/components/home/NewsletterSignup";

import { getFundingAnnualForHomepage } from "@/lib/funding-queries";

export const revalidate = 3600; // 1 hour (was 10 min)

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
    .select("id, slug, name, ticker, country, valuation, logo_url, website, domain, categories, stage, description")
    .order("valuation", { ascending: false, nullsFirst: false })
    .limit(200); // Was 1000 with select('*') = 2.9MB, caused cache failures
  if (!data) return [];

  const companies = dbRowsToCompanies(data);

  // Override valuation with USD market cap from price history
  const companyIds = data.map((row: { id: string }) => row.id);
  const marketCapMap = new Map<string, number>();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 5);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  // Paginate price history: ~200 companies × 5 days = ~1000 rows, can exceed Supabase 1000-row default
  const BATCH_SIZE = 50; // Smaller batches to stay well within 1000-row limit per query
  for (let i = 0; i < companyIds.length; i += BATCH_SIZE) {
    const batch = companyIds.slice(i, i + BATCH_SIZE);
    for (let page = 0; page < 3; page++) {
      const { data: priceRows } = await supabase
        .from("company_price_history")
        .select("company_id, market_cap_usd, date")
        .in("company_id", batch)
        .gte("date", cutoffStr)
        .not("market_cap_usd", "is", null)
        .order("date", { ascending: false })
        .range(page * 1000, (page + 1) * 1000 - 1);
      if (!priceRows || priceRows.length === 0) break;
      for (const row of priceRows) {
        if (row.market_cap_usd != null && !marketCapMap.has(row.company_id)) {
          marketCapMap.set(row.company_id, Number(row.market_cap_usd));
        }
      }
      if (priceRows.length < 1000) break;
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
    // Manual fallback: paginate to find a date with 100+ entries
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
    const sortedDates = [...countByDate.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    for (const [d, cnt] of sortedDates) {
      if (cnt >= 100) { latestDate = d; break; }
    }
    if (!latestDate) return [];
  }
  const sevenDaysAgo = new Date(latestDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 10);
  const oldCutoff = sevenDaysAgo.toISOString().split("T")[0];
  const oldEnd = new Date(latestDate);
  oldEnd.setDate(oldEnd.getDate() - 5);
  const oldEndStr = oldEnd.toISOString().split("T")[0];

  // Get current prices (last 5 trading days to catch all markets) — use adj_close for price-based trending
  // Must paginate: ~1000 companies × 5 days = ~5000 rows, exceeds Supabase default 1000 limit
  const fiveDaysAgo = new Date(latestDate);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const fiveDaysAgoStr = fiveDaysAgo.toISOString().split("T")[0];
  let currentPrices: { company_id: string; market_cap_usd: number; adj_close: number | null; date: string }[] = [];
  for (let page = 0; page < 5; page++) {
    const { data } = await supabase
      .from("company_price_history")
      .select("company_id, market_cap_usd, adj_close, date")
      .gte("date", fiveDaysAgoStr)
      .not("market_cap_usd", "is", null)
      .order("date", { ascending: false })
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    currentPrices.push(...data);
    if (data.length < 1000) break;
  }

  // Get old prices (~7 days ago range) — use adj_close for price-based comparison
  let oldPrices: { company_id: string; market_cap_usd: number; adj_close: number | null; date: string }[] = [];
  for (let page = 0; page < 5; page++) {
    const { data } = await supabase
      .from("company_price_history")
      .select("company_id, market_cap_usd, adj_close, date")
      .gte("date", oldCutoff)
      .lte("date", oldEndStr)
      .not("adj_close", "is", null)
      .order("date", { ascending: false })
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    oldPrices.push(...data);
    if (data.length < 1000) break;
  }

  if (currentPrices.length === 0 || oldPrices.length === 0) return [];

  // Build maps — use adj_close for price-based trending (avoids shares_outstanding artifacts)
  const currentMap = new Map<string, { marketCap: number; adjClose: number }>();
  for (const r of currentPrices) {
    if (!currentMap.has(r.company_id) && r.adj_close != null) {
      currentMap.set(r.company_id, { marketCap: Number(r.market_cap_usd), adjClose: Number(r.adj_close) });
    }
  }
  const oldMap = new Map<string, number>();
  for (const r of oldPrices) {
    if (!oldMap.has(r.company_id) && r.adj_close != null) {
      oldMap.set(r.company_id, Number(r.adj_close));
    }
  }

  // Compute 7d change from adj_close price — currency-neutral, no shares_outstanding artifacts
  const changes: { companyId: string; change7d: number; marketCap: number }[] = [];
  currentMap.forEach((current, companyId) => {
    const oldAdjClose = oldMap.get(companyId);
    if (oldAdjClose && oldAdjClose > 0 && current.adjClose > 0 && current.marketCap > 100_000_000) {
      const pct = ((current.adjClose - oldAdjClose) / oldAdjClose) * 100;
      if (Math.abs(pct) <= 80) {
        changes.push({ companyId, change7d: Math.round(pct * 100) / 100, marketCap: current.marketCap });
      }
    }
  });

  changes.sort((a, b) => b.change7d - a.change7d);
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
      change7d: ch.change7d,
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
  // Paginate all ~9K snapshots (Supabase caps each query at 1000 rows).
  // ISR revalidate=3600 ensures this only runs once per hour.
  const allRows: { snapshot_date: string; total_market_cap: string | number }[] = [];
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("market_snapshots")
      .select("snapshot_date, total_market_cap")
      .not("total_market_cap", "is", null)
      .order("snapshot_date", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  if (allRows.length === 0) return [];

  // Simple uniform thinning: target ~600 points for the chart.
  // Client-side BiotechIndexChart can further downsample if needed.
  const target = 600;
  const step = allRows.length > target ? Math.floor(allRows.length / target) : 1;
  const result: { snapshot_date: string; total_market_cap: number }[] = [];
  for (let i = 0; i < allRows.length; i += step) {
    result.push({
      snapshot_date: allRows[i].snapshot_date,
      total_market_cap: Number(allRows[i].total_market_cap),
    });
  }
  // Always include the very last point
  const last = allRows[allRows.length - 1];
  if (result[result.length - 1].snapshot_date !== last.snapshot_date) {
    result.push({ snapshot_date: last.snapshot_date, total_market_cap: Number(last.total_market_cap) });
  }
  return result;
}

async function getHotPipelines() {
  const supabase = getSupabase();

  // Try to get from featured_pipelines first
  const { data: latestMonth } = await supabase
    .from("featured_pipelines")
    .select("featured_month")
    .order("featured_month", { ascending: false })
    .limit(1);

  if (latestMonth && latestMonth.length > 0) {
    const month = latestMonth[0].featured_month;
    const { data: featured } = await supabase
      .from("featured_pipelines")
      .select("pipeline_id, rank, reason")
      .eq("featured_month", month)
      .order("rank", { ascending: true })
      .limit(10);

    if (featured && featured.length > 0) {
      const pipelineIds = featured.map(f => f.pipeline_id);
      const { data: pipelines } = await supabase
        .from("pipelines")
        .select("id, product_name, indication, stage, company_name, company_id, slug")
        .in("id", pipelineIds);

      if (pipelines && pipelines.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pMap = new Map<string, any>();
        for (const p of pipelines) pMap.set(p.id, p);

        const companyIds = [...new Set(pipelines.map(p => p.company_id).filter(Boolean))];
        const { data: companies } = await supabase
          .from("companies")
          .select("id, slug")
          .in("id", companyIds.slice(0, 50));
        const companySlugMap = new Map<string, string>();
        if (companies) {
          for (const c of companies) companySlugMap.set(c.id, c.slug);
        }

        return featured
          .map(f => {
            const p = pMap.get(f.pipeline_id);
            if (!p) return null;
            return {
              product_name: p.product_name,
              indication: p.indication,
              stage: p.stage,
              company_name: p.company_name || "Unknown",
              company_slug: companySlugMap.get(p.company_id) || "",
              slug: p.slug,
              hype_score: 80,
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);
      }
    }
  }

  // Fallback: original Phase 3 recruiting query
  const { data } = await supabase
    .from("pipelines")
    .select("product_name, indication, stage, company_name, trial_status, company_id, slug")
    .eq("stage", "Phase 3")
    .eq("trial_status", "Recruiting")
    .not("slug", "is", null)
    .order("start_date", { ascending: false })
    .limit(100);
  if (!data) return [];

  const companyIds = [...new Set(data.map(r => r.company_id).filter(Boolean))];
  const { data: companies } = await supabase
    .from("companies")
    .select("id, slug")
    .in("id", companyIds.slice(0, 50));
  const companySlugMap = new Map<string, string>();
  if (companies) {
    for (const c of companies) companySlugMap.set(c.id, c.slug);
  }

  const seenCompanies = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any[] = [];
  for (const row of data) {
    const cn = row.company_name || "Unknown";
    if (seenCompanies.has(cn)) continue;
    if ((row.product_name || "").length > 40) continue;
    seenCompanies.add(cn);
    result.push({
      product_name: row.product_name,
      indication: row.indication,
      stage: row.stage,
      company_name: cn,
      company_slug: companySlugMap.get(row.company_id) || "",
      slug: row.slug,
      hype_score: 70,
    });
    if (result.length >= 10) break;
  }
  return result;
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

async function getSmallCapWatchItems() {
  const supabase = getSupabase();

  // Find the small-cap watchlist
  const { data: watchlist } = await supabase
    .from("curated_watchlists")
    .select("id")
    .eq("slug", "small-cap-pipeline")
    .single();

  if (!watchlist) return [];

  // Get items with rank ordering
  const { data: items } = await supabase
    .from("curated_watchlist_items")
    .select("pipeline_id, rank")
    .eq("watchlist_id", watchlist.id)
    .order("rank", { ascending: true })
    .limit(5);

  if (!items || items.length === 0) return [];

  const pipelineIds = items.map((i) => i.pipeline_id);
  const { data: pipelines } = await supabase
    .from("pipelines")
    .select("id, product_name, company_name, company_id, indication, stage, slug")
    .in("id", pipelineIds);

  if (!pipelines) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pMap = new Map<string, any>();
  for (const p of pipelines) pMap.set(p.id, p);

  const companyIds = [...new Set(pipelines.map((p) => p.company_id).filter(Boolean))];
  const companyMap = new Map<string, { slug: string; logo_url: string | null; website: string | null }>();

  if (companyIds.length > 0) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, slug, logo_url, website")
      .in("id", companyIds);
    if (companies) {
      for (const c of companies) companyMap.set(c.id, { slug: c.slug, logo_url: c.logo_url, website: c.website });
    }
  }

  return items
    .map((item) => {
      const p = pMap.get(item.pipeline_id);
      if (!p) return null;
      const company = companyMap.get(p.company_id);
      return {
        rank: item.rank || 0,
        product_name: p.product_name,
        company_name: p.company_name || "Unknown",
        indication: p.indication,
        stage: p.stage,
        slug: p.slug,
        company_slug: company?.slug || null,
        company_logo_url: company?.logo_url || null,
        company_website: company?.website || null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

async function getNextFDADecisions() {
  const supabase = getSupabase();
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("fda_calendar")
    .select("drug_name, company_name, company_id, pipeline_id, decision_date, decision_type, indication")
    .gte("decision_date", today)
    .order("decision_date", { ascending: true })
    .limit(3);

  if (!data || data.length === 0) return [];

  const pipelineIds = data.map((d) => d.pipeline_id).filter(Boolean);
  const companyIds = [...new Set(data.map((d) => d.company_id).filter(Boolean))];

  const slugMap = new Map<string, string>();
  const companyMap = new Map<string, { slug: string; logo_url: string | null }>();

  if (pipelineIds.length > 0) {
    const { data: pipelines } = await supabase.from("pipelines").select("id, slug").in("id", pipelineIds);
    if (pipelines) for (const p of pipelines) if (p.slug) slugMap.set(p.id, p.slug);
  }

  if (companyIds.length > 0) {
    const { data: companies } = await supabase.from("companies").select("id, slug, logo_url").in("id", companyIds as string[]);
    if (companies) for (const c of companies) companyMap.set(c.id, { slug: c.slug, logo_url: c.logo_url });
  }

  return data.map((d) => {
    const company = d.company_id ? companyMap.get(d.company_id) : null;
    return {
      drug_name: d.drug_name,
      company_name: d.company_name,
      decision_date: d.decision_date,
      decision_type: d.decision_type,
      indication: d.indication,
      slug: d.pipeline_id ? slugMap.get(d.pipeline_id) || null : null,
      company_slug: company?.slug || null,
      company_logo_url: company?.logo_url || null,
    };
  });
}

// ── Page ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safeFetch<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch (err: any) { console.error("Homepage fetch error:", err?.message || err); return fallback; }
}

export default async function HomePage() {

  const [companies, snapshot, trending, sectors, countries, investorsData, peopleData, fundingAnnualData, indexHistory, hotPipelines, recentFunding, events, smallCapItems, nextFDADecisions] =
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
      safeFetch(getSmallCapWatchItems, []),
      safeFetch(getNextFDADecisions, []),
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
          <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{snapshot?.public_companies_count?.toLocaleString() || "1,000"}</span> public companies,{" "}
          <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>20</span> sectors, and{" "}
          <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>30+</span> countries.
        </p>

        {/* Company logos as social proof */}
        <div className="flex items-center justify-center gap-3 md:gap-5 mt-6 opacity-30 overflow-hidden px-2">
          {["lilly.com", "pfizer.com", "novartis.com", "roche.com", "amgen.com", "gilead.com"].map((domain) => (
            <img
              key={domain}
              src={`https://img.logo.dev/${domain}?token=pk_FNHUWoZORpiR_7j_vzFnmQ`}
              alt={domain.split(".")[0]}
              className="h-4 md:h-6 object-contain grayscale flex-shrink-0"
              style={{ maxWidth: 60 }}
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

        {/* Sectors + Countries */}
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

        {/* Biotech Market Index — full width */}
        {indexHistory.length > 0 && (
          <HomeSection icon="📈" title="Biotech Market Index" viewAllHref="/markets" viewAllLabel="Full markets">
            <BiotechIndexChart data={indexHistory} />
          </HomeSection>
        )}

        {/* Funding Season Chart — right under Index */}
        <HomeSection icon="💰" title="Funding Season" viewAllHref="/funding" viewAllLabel="View all">
          <FundingChart data={fundingAnnualData} />
        </HomeSection>

        {/* Pipeline Intelligence — Small-Cap Watch + FDA Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {smallCapItems.length > 0 ? (
            <HomeSection icon="🔬" title="Small-Cap Pipeline Watch" viewAllHref="/pipelines" viewAllLabel="View all curated lists">
              <SmallCapWatch items={smallCapItems} />
            </HomeSection>
          ) : hotPipelines.length > 0 ? (
            <HomeSection icon="🧪" title="Pipelines to Watch" viewAllHref="/pipelines" viewAllLabel="Browse all">
              <PipelinesToWatch pipelines={hotPipelines} />
            </HomeSection>
          ) : null}
          {nextFDADecisions.length > 0 ? (
            <HomeSection icon="📅" title="Next FDA Decisions" viewAllHref="/pipelines" viewAllLabel="View FDA calendar">
              <NextFDADecision decisions={nextFDADecisions} />
            </HomeSection>
          ) : hotPipelines.length > 0 && smallCapItems.length > 0 ? (
            <HomeSection icon="🧪" title="Pipelines to Watch" viewAllHref="/pipelines" viewAllLabel="Browse all">
              <PipelinesToWatch pipelines={hotPipelines} />
            </HomeSection>
          ) : null}
        </div>

        {/* Funding Radar */}
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

      {/* Newsletter signup */}
      <NewsletterSignup source="homepage" />

      <Footer />
    </div>
  );
}
