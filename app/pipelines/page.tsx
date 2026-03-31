import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { createClient } from "@supabase/supabase-js";
import { PipelinesPageClient } from "./PipelinesPageClient";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Drug Pipeline Intelligence | BiotechTube",
  description:
    "Curated biotech watchlists, FDA decision calendar, and 54,000+ drugs in development. Track small-cap gems, mid-cap catalysts, and big pharma pipelines.",
  alternates: { canonical: "https://biotechtube.io/pipelines" },
  openGraph: {
    title: "Drug Pipeline Intelligence | BiotechTube",
    description:
      "Curated biotech watchlists, FDA decision calendar, and 54,000+ drugs in development.",
    url: "https://biotechtube.io/pipelines",
    images: ["/api/og?title=Drug%20Pipeline%20Intelligence&subtitle=54%2C699%20drugs%20across%20686%20companies&type=pipeline"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Drug Pipeline Intelligence | BiotechTube",
    description: "Curated biotech watchlists, FDA decision calendar, and 54,000+ drugs in development.",
  },
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Types ──

export interface PipelineRow {
  id: string;
  slug: string | null;
  company_id: string;
  company_name: string;
  product_name: string;
  indication: string | null;
  stage: string | null;
  nct_id: string | null;
  trial_status: string | null;
  conditions: string[] | null;
  start_date: string | null;
  completion_date: string | null;
  company_slug: string | null;
  company_logo_url: string | null;
  company_website: string | null;
}

export interface PipelineStats {
  total: number;
  phase3: number;
  recruiting: number;
  approved: number;
  companies: number;
}

export interface CuratedWatchlist {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  category: string;
  totalItems: number;
  items: CuratedWatchlistItem[];
}

export interface CuratedWatchlistItem {
  id: string;
  watchlist_id: string;
  pipeline_id: string;
  rank: number | null;
  reason: string | null;
  product_name: string;
  company_name: string;
  company_id: string;
  indication: string | null;
  stage: string | null;
  slug: string | null;
  company_slug: string | null;
  company_logo_url: string | null;
  company_website: string | null;
}

export interface FDACalendarEntry {
  id: string;
  drug_name: string;
  company_name: string | null;
  company_id: string | null;
  pipeline_id: string | null;
  decision_date: string;
  decision_type: string | null;
  indication: string | null;
  status: string | null;
  slug: string | null;
  company_slug: string | null;
  company_logo_url: string | null;
}

export interface FeaturedPipeline {
  id: string;
  pipeline_id: string;
  rank: number;
  featured_month: string;
  reason: string | null;
  ai_summary: string | null;
  key_facts: { label: string; value: string }[] | null;
  competitive_landscape: string | null;
  investment_thesis: string | null;
  risk_factors: string | null;
  product_name: string;
  company_name: string;
  company_id: string;
  indication: string | null;
  stage: string | null;
  trial_status: string | null;
  slug: string | null;
  company_slug: string | null;
  company_logo_url: string | null;
  company_website: string | null;
}

const STAGE_ORDER: Record<string, number> = {
  "Phase 3": 0,
  "Phase 2/3": 1,
  Approved: 2,
  "Phase 2": 3,
  "Phase 1/2": 4,
  "Phase 1": 5,
  "Pre-clinical": 6,
};

// ── Data fetching ──

async function getPipelineStats(): Promise<PipelineStats> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_pipeline_stats");
  if (error || !data || !data[0]) {
    return { total: 0, phase3: 0, recruiting: 0, approved: 0, companies: 0 };
  }
  return data[0] as PipelineStats;
}

async function getPipelineRows(): Promise<PipelineRow[]> {
  const supabase = getSupabase();
  const allData: Record<string, unknown>[] = [];
  const PAGE_SIZE = 1000;

  for (let page = 0; page < 2; page++) { // Was 5 (5000 rows) — reduced to 2 (2000 rows) to cut serverless execution time
    const { data, error } = await supabase
      .from("pipelines")
      .select(
        "id, slug, company_id, company_name, product_name, indication, stage, nct_id, trial_status, conditions, start_date, completion_date"
      )
      .order("stage", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error || !data || data.length === 0) break;
    allData.push(...data);
  }

  if (allData.length === 0) return [];

  const companyIds = Array.from(
    new Set(
      allData.map((r) => r.company_id as string).filter(Boolean)
    )
  );

  const companyMap = new Map<
    string,
    { slug: string; logo_url: string | null; website: string | null }
  >();

  const BATCH = 200;
  for (let i = 0; i < companyIds.length; i += BATCH) {
    const batch = companyIds.slice(i, i + BATCH);
    const { data: companies } = await supabase
      .from("companies")
      .select("id, slug, logo_url, website")
      .in("id", batch);
    if (companies) {
      for (const c of companies) {
        companyMap.set(c.id, {
          slug: c.slug,
          logo_url: c.logo_url,
          website: c.website,
        });
      }
    }
  }

  const rows: PipelineRow[] = allData.map((r) => {
    const company = companyMap.get(r.company_id as string);
    return {
      id: r.id as string,
      slug: r.slug as string | null,
      company_id: r.company_id as string,
      company_name: r.company_name as string,
      product_name: r.product_name as string,
      indication: r.indication as string | null,
      stage: r.stage as string | null,
      nct_id: r.nct_id as string | null,
      trial_status: r.trial_status as string | null,
      conditions: r.conditions as string[] | null,
      start_date: r.start_date as string | null,
      completion_date: r.completion_date as string | null,
      company_slug: company?.slug || null,
      company_logo_url: company?.logo_url || null,
      company_website: company?.website || null,
    };
  });

  rows.sort((a, b) => {
    const aOrder = STAGE_ORDER[a.stage || ""] ?? 99;
    const bOrder = STAGE_ORDER[b.stage || ""] ?? 99;
    return aOrder - bOrder;
  });

  return rows;
}

async function getCuratedWatchlists(): Promise<CuratedWatchlist[]> {
  const supabase = getSupabase();

  // Fetch watchlists
  const { data: watchlists } = await supabase
    .from("curated_watchlists")
    .select("id, name, slug, description, icon, category")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (!watchlists || watchlists.length === 0) return [];

  // Fetch all items
  const watchlistIds = watchlists.map((w) => w.id);
  const { data: items } = await supabase
    .from("curated_watchlist_items")
    .select("id, watchlist_id, pipeline_id, rank, reason")
    .in("watchlist_id", watchlistIds)
    .order("rank", { ascending: true });

  if (!items || items.length === 0) {
    return watchlists.map((w) => ({ ...w, items: [] }));
  }

  // Get pipeline details
  const pipelineIds = [...new Set(items.map((i) => i.pipeline_id))];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pipelineMap = new Map<string, any>();

  for (let i = 0; i < pipelineIds.length; i += 200) {
    const batch = pipelineIds.slice(i, i + 200);
    const { data: pipelines } = await supabase
      .from("pipelines")
      .select("id, product_name, company_name, company_id, indication, stage, slug")
      .in("id", batch);
    if (pipelines) {
      for (const p of pipelines) pipelineMap.set(p.id, p);
    }
  }

  // Get company details
  const companyIds = [
    ...new Set(
      [...pipelineMap.values()].map((p) => p.company_id).filter(Boolean)
    ),
  ];
  const companyMap = new Map<
    string,
    { slug: string; logo_url: string | null; website: string | null }
  >();

  for (let i = 0; i < companyIds.length; i += 200) {
    const batch = companyIds.slice(i, i + 200);
    const { data: companies } = await supabase
      .from("companies")
      .select("id, slug, logo_url, website")
      .in("id", batch);
    if (companies) {
      for (const c of companies) {
        companyMap.set(c.id, {
          slug: c.slug,
          logo_url: c.logo_url,
          website: c.website,
        });
      }
    }
  }

  // Build result — only include top 3 items per watchlist for the preview cards
  return watchlists.map((w) => {
    const allItems = items.filter((item) => item.watchlist_id === w.id);
    const top3 = allItems.slice(0, 3);
    const watchlistItems = top3.map((item) => {
        const pipeline = pipelineMap.get(item.pipeline_id);
        const company = pipeline ? companyMap.get(pipeline.company_id) : null;
        return {
          id: item.id,
          watchlist_id: item.watchlist_id,
          pipeline_id: item.pipeline_id,
          rank: item.rank,
          reason: item.reason,
          product_name: pipeline?.product_name || "Unknown",
          company_name: pipeline?.company_name || "Unknown",
          company_id: pipeline?.company_id || "",
          indication: pipeline?.indication || null,
          stage: pipeline?.stage || null,
          slug: pipeline?.slug || null,
          company_slug: company?.slug || null,
          company_logo_url: company?.logo_url || null,
          company_website: company?.website || null,
        } as CuratedWatchlistItem;
      });

    return {
      ...w,
      totalItems: allItems.length,
      items: watchlistItems,
    } as CuratedWatchlist;
  });
}

async function getFDACalendar(): Promise<{ upcoming: FDACalendarEntry[]; recent: FDACalendarEntry[] }> {
  const supabase = getSupabase();
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Upcoming decisions
  const { data: upcoming } = await supabase
    .from("fda_calendar")
    .select("id, drug_name, company_name, company_id, pipeline_id, decision_date, decision_type, indication, status")
    .gte("decision_date", today)
    .order("decision_date", { ascending: true });

  // Recent decisions (last 30 days)
  const { data: recent } = await supabase
    .from("fda_calendar")
    .select("id, drug_name, company_name, company_id, pipeline_id, decision_date, decision_type, indication, status")
    .lt("decision_date", today)
    .gte("decision_date", thirtyDaysAgo)
    .order("decision_date", { ascending: false });

  const allEntries = [...(upcoming || []), ...(recent || [])];

  // Get pipeline slugs + company slugs
  const pipelineIds = allEntries.map((e) => e.pipeline_id).filter(Boolean);
  const companyIds = [...new Set(allEntries.map((e) => e.company_id).filter(Boolean))];

  const slugMap = new Map<string, string>();
  const companyMap = new Map<string, { slug: string; logo_url: string | null }>();

  if (pipelineIds.length > 0) {
    const { data: pipelines } = await supabase
      .from("pipelines")
      .select("id, slug")
      .in("id", pipelineIds);
    if (pipelines) {
      for (const p of pipelines) {
        if (p.slug) slugMap.set(p.id, p.slug);
      }
    }
  }

  if (companyIds.length > 0) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, slug, logo_url")
      .in("id", companyIds as string[]);
    if (companies) {
      for (const c of companies) {
        companyMap.set(c.id, { slug: c.slug, logo_url: c.logo_url });
      }
    }
  }

  const mapEntry = (e: Record<string, unknown>): FDACalendarEntry => {
    const company = e.company_id ? companyMap.get(e.company_id as string) : null;
    return {
      id: e.id as string,
      drug_name: e.drug_name as string,
      company_name: e.company_name as string | null,
      company_id: e.company_id as string | null,
      pipeline_id: e.pipeline_id as string | null,
      decision_date: e.decision_date as string,
      decision_type: e.decision_type as string | null,
      indication: e.indication as string | null,
      status: e.status as string | null,
      slug: e.pipeline_id ? slugMap.get(e.pipeline_id as string) || null : null,
      company_slug: company?.slug || null,
      company_logo_url: company?.logo_url || null,
    };
  };

  return {
    upcoming: (upcoming || []).map(mapEntry),
    recent: (recent || []).map(mapEntry),
  };
}

async function getFeaturedPipelines(): Promise<FeaturedPipeline[]> {
  const supabase = getSupabase();

  const { data: latestMonth } = await supabase
    .from("featured_pipelines")
    .select("featured_month")
    .order("featured_month", { ascending: false })
    .limit(1);

  if (!latestMonth || latestMonth.length === 0) return [];

  const month = latestMonth[0].featured_month;

  const { data, error } = await supabase
    .from("featured_pipelines")
    .select("id, pipeline_id, rank, featured_month, reason, ai_summary, key_facts, competitive_landscape, investment_thesis, risk_factors")
    .eq("featured_month", month)
    .order("rank", { ascending: true });

  if (error || !data || data.length === 0) return [];

  const pipelineIds = data.map((d) => d.pipeline_id);
  const { data: pipelines } = await supabase
    .from("pipelines")
    .select("id, product_name, company_name, company_id, indication, stage, trial_status, slug")
    .in("id", pipelineIds);

  if (!pipelines) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pipelineMap = new Map<string, any>();
  for (const p of pipelines) pipelineMap.set(p.id, p);

  const companyIds = [...new Set(pipelines.map((p) => p.company_id).filter(Boolean))];
  const companyMap = new Map<string, { slug: string; logo_url: string | null; website: string | null }>();

  if (companyIds.length > 0) {
    for (let i = 0; i < companyIds.length; i += 200) {
      const batch = companyIds.slice(i, i + 200);
      const { data: companies } = await supabase
        .from("companies")
        .select("id, slug, logo_url, website")
        .in("id", batch);
      if (companies) {
        for (const c of companies) {
          companyMap.set(c.id, { slug: c.slug, logo_url: c.logo_url, website: c.website });
        }
      }
    }
  }

  return data
    .map((fp) => {
      const pipeline = pipelineMap.get(fp.pipeline_id);
      if (!pipeline) return null;
      const company = companyMap.get(pipeline.company_id);
      return {
        ...fp,
        product_name: pipeline.product_name,
        company_name: pipeline.company_name,
        company_id: pipeline.company_id,
        indication: pipeline.indication,
        stage: pipeline.stage,
        trial_status: pipeline.trial_status,
        slug: pipeline.slug,
        company_slug: company?.slug || null,
        company_logo_url: company?.logo_url || null,
        company_website: company?.website || null,
      } as FeaturedPipeline;
    })
    .filter((fp): fp is FeaturedPipeline => fp !== null);
}

interface SponsoredPipeline {
  id: string;
  product_name: string;
  company_name: string | null;
  company_slug: string | null;
  plan: string;
}

async function getSponsoredPipelines(): Promise<SponsoredPipeline[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("product_sponsorships")
    .select("id, product_name, company_id, plan")
    .eq("status", "active")
    .not("pipeline_id", "is", null)
    .order("plan", { ascending: false });

  if (error || !data || data.length === 0) return [];

  const companyIds = [...new Set(data.map((d: Record<string, unknown>) => d.company_id).filter(Boolean))] as string[];
  const companyMap = new Map<string, { name: string; slug: string }>();
  if (companyIds.length > 0) {
    const { data: companies } = await supabase.from("companies").select("id, name, slug").in("id", companyIds);
    if (companies) companies.forEach((c: { id: string; name: string; slug: string }) => companyMap.set(c.id, { name: c.name, slug: c.slug }));
  }

  return data.map((d: Record<string, unknown>) => {
    const company = companyMap.get(d.company_id as string);
    return {
      id: d.id as string,
      product_name: d.product_name as string,
      company_name: company?.name || null,
      company_slug: company?.slug || null,
      plan: d.plan as string,
    };
  });
}

// ── Page ──

export default async function PipelinesPage() {
  const [stats, rows, sponsored, featured, watchlists, fdaCalendar] = await Promise.all([
    getPipelineStats(),
    getPipelineRows(),
    getSponsoredPipelines(),
    getFeaturedPipelines(),
    getCuratedWatchlists(),
    getFDACalendar(),
  ]);

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Pipeline Intelligence" },
  ];

  return (
    <div
      className="page-content"
      style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}
    >
      <Nav />
      <div className="max-w-6xl mx-auto px-4 pt-3 pb-0">
        <Breadcrumbs items={breadcrumbItems} />
      </div>
      <PipelinesPageClient
        stats={stats}
        rows={rows}
        sponsored={sponsored}
        featured={featured}
        watchlists={watchlists}
        fdaCalendar={fdaCalendar}
      />
      <Footer />
    </div>
  );
}
