import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createClient } from "@supabase/supabase-js";
import { ProductsPageClient } from "./ProductsPageClient";
import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Biotech Product Rankings — Hype Score | BiotechTube",
  description:
    "Discover the most promising drugs, therapies, and health technologies ranked by Hype Score. Track biotech product momentum across clinical stages.",
  openGraph: {
    title: "Biotech Product Rankings — Hype Score | BiotechTube",
    description:
      "Discover the most promising drugs, therapies, and health technologies ranked by Hype Score.",
  },
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface ProductScoreRow {
  id: string;
  pipeline_id: string;
  product_name: string;
  company_id: string | null;
  hype_score: number;
  clinical_score: number;
  activity_score: number;
  company_score: number;
  novelty_score: number;
  community_score: number;
  trending_direction: string;
  last_calculated: string;
  // Joined from pipelines
  indication: string | null;
  stage: string | null;
  trial_status: string | null;
  company_name: string | null;
  // Joined from companies
  company_slug: string | null;
  company_logo_url: string | null;
  company_website: string | null;
}

async function getProductScores(): Promise<ProductScoreRow[]> {
  const supabase = getSupabase();

  // Fetch top 5000 product scores ordered by hype_score desc
  const allData: Record<string, unknown>[] = [];
  const PAGE_SIZE = 1000;

  for (let page = 0; page < 5; page++) {
    const { data, error } = await supabase
      .from("product_scores")
      .select(
        `
        id,
        pipeline_id,
        product_name,
        company_id,
        hype_score,
        clinical_score,
        activity_score,
        company_score,
        novelty_score,
        community_score,
        trending_direction,
        last_calculated
      `
      )
      .order("hype_score", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching product scores:", error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allData.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  if (allData.length === 0) return [];

  // Get pipeline details for these scores
  const pipelineIds = allData.map((d) => d.pipeline_id as string);
  const pipelineMap = new Map<
    string,
    { indication: string | null; stage: string | null; trial_status: string | null; company_name: string; company_id: string | null }
  >();

  for (let i = 0; i < pipelineIds.length; i += 500) {
    const batch = pipelineIds.slice(i, i + 500);
    const { data: pipelines } = await supabase
      .from("pipelines")
      .select("id, indication, stage, trial_status, company_name, company_id")
      .in("id", batch);
    if (pipelines) {
      for (const p of pipelines) {
        pipelineMap.set(p.id, p);
      }
    }
  }

  // Get company details
  const companyIds = [
    ...new Set(allData.map((d) => d.company_id as string).filter(Boolean)),
  ];
  const companyMap = new Map<
    string,
    { slug: string; logo_url: string | null; website: string | null }
  >();

  for (let i = 0; i < companyIds.length; i += 500) {
    const batch = companyIds.slice(i, i + 500);
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

  return allData.map((d) => {
    const pipeline = pipelineMap.get(d.pipeline_id as string);
    const company = d.company_id ? companyMap.get(d.company_id as string) : null;
    return {
      id: d.id as string,
      pipeline_id: d.pipeline_id as string,
      product_name: d.product_name as string,
      company_id: d.company_id as string | null,
      hype_score: d.hype_score as number,
      clinical_score: d.clinical_score as number,
      activity_score: d.activity_score as number,
      company_score: d.company_score as number,
      novelty_score: d.novelty_score as number,
      community_score: d.community_score as number,
      trending_direction: d.trending_direction as string,
      last_calculated: d.last_calculated as string,
      indication: pipeline?.indication ?? null,
      stage: pipeline?.stage ?? null,
      trial_status: pipeline?.trial_status ?? null,
      company_name: pipeline?.company_name ?? null,
      company_slug: company?.slug ?? null,
      company_logo_url: company?.logo_url ?? null,
      company_website: company?.website ?? null,
    };
  });
}

export default async function ProductsPage() {
  const scores = await getProductScores();

  return (
    <div className="page-content" style={{ minHeight: "100vh" }}>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "linear-gradient(to bottom, var(--color-bg-primary) 0%, var(--color-bg-primary) 200px, var(--color-bg-tertiary) 600px)",
          zIndex: -1,
          pointerEvents: "none",
        }}
      />
      <Nav />
      <ProductsPageClient rows={scores} />
      <Footer />
    </div>
  );
}
