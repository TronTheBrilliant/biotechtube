import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createClient } from "@supabase/supabase-js";
import { PipelinesPageClient } from "./PipelinesPageClient";
import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Drug Pipeline Tracker | BiotechTube",
  description:
    "Browse 54,000+ drugs and therapies in development across hundreds of biotech companies. Filter by stage, trial status, and more.",
  openGraph: {
    title: "Drug Pipeline Tracker | BiotechTube",
    description:
      "Browse 54,000+ drugs and therapies in development across hundreds of biotech companies.",
  },
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

const STAGE_ORDER: Record<string, number> = {
  "Phase 3": 0,
  "Phase 2/3": 1,
  Approved: 2,
  "Phase 2": 3,
  "Phase 1/2": 4,
  "Phase 1": 5,
  "Pre-clinical": 6,
};

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

  // Fetch top 5000 rows ordered by stage (we sort client-side by priority)
  const allData: Record<string, unknown>[] = [];
  const PAGE_SIZE = 1000;

  for (let page = 0; page < 5; page++) {
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

  // Get company slugs, logo_url, and website for linking
  const companyIds = Array.from(
    new Set(
      allData
        .map((r) => r.company_id as string)
        .filter(Boolean)
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

  // Sort by stage priority: Phase 3 first
  rows.sort((a, b) => {
    const aOrder = STAGE_ORDER[a.stage || ""] ?? 99;
    const bOrder = STAGE_ORDER[b.stage || ""] ?? 99;
    return aOrder - bOrder;
  });

  return rows;
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

export default async function PipelinesPage() {
  const [stats, rows, sponsored] = await Promise.all([
    getPipelineStats(),
    getPipelineRows(),
    getSponsoredPipelines(),
  ]);

  return (
    <div
      className="page-content"
      style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}
    >
      <Nav />
      <PipelinesPageClient stats={stats} rows={rows} sponsored={sponsored} />
      <Footer />
    </div>
  );
}
