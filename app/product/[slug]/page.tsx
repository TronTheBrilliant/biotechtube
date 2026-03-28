import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ProductPageClient } from "./ProductPageClient";

export const revalidate = 300;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getProductBySlug(slug: string): Promise<any | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("pipelines")
    .select("*")
    .eq("slug", slug)
    .single();
  return data || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCompany(companyId: string): Promise<any | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("companies")
    .select("id, name, slug, logo_url, website, country, type, ticker, description")
    .eq("id", companyId)
    .single();
  return data || null;
}

async function getLatestMarketCap(companyId: string): Promise<number | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("company_price_history")
    .select("market_cap_usd")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(1)
    .single();
  return data?.market_cap_usd || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getProductScore(pipelineId: string): Promise<any | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("product_scores")
    .select("*")
    .eq("pipeline_id", pipelineId)
    .single();
  return data || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getRelatedTrials(productName: string, companyId: string): Promise<any[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("pipelines")
    .select("id, slug, product_name, indication, stage, nct_id, trial_status, start_date, completion_date")
    .eq("company_id", companyId)
    .ilike("product_name", productName)
    .order("start_date", { ascending: false })
    .limit(20);
  return data || [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCompetingProducts(indication: string | null, pipelineId: string): Promise<any[]> {
  if (!indication) return [];
  const supabase = getSupabase();
  // Use first meaningful word of indication for matching
  const words = indication.split(/[\s,;]+/).filter((w) => w.length > 3);
  const searchTerm = words[0] || indication;

  const { data } = await supabase
    .from("pipelines")
    .select("id, slug, product_name, company_name, company_id, indication, stage")
    .ilike("indication", `%${searchTerm}%`)
    .neq("id", pipelineId)
    .limit(20);

  if (!data || data.length === 0) return [];

  // Get hype scores for competitors
  const ids = data.map((d) => d.id);
  const { data: scores } = await supabase
    .from("product_scores")
    .select("pipeline_id, hype_score")
    .in("pipeline_id", ids);

  const scoreMap = new Map<string, number>();
  if (scores) {
    for (const s of scores) {
      scoreMap.set(s.pipeline_id, s.hype_score);
    }
  }

  return data.map((d) => ({
    ...d,
    hype_score: scoreMap.get(d.id) ?? 0,
  }));
}

async function getViewCount7d(pipelineId: string): Promise<number> {
  const supabase = getSupabase();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("product_views")
    .select("id", { count: "exact", head: true })
    .eq("pipeline_id", pipelineId)
    .gte("viewed_at", sevenDaysAgo);
  return count || 0;
}

async function getWatchlistCount(pipelineId: string): Promise<number> {
  const supabase = getSupabase();
  const { count } = await supabase
    .from("user_pipeline_watchlist")
    .select("id", { count: "exact", head: true })
    .eq("pipeline_id", pipelineId);
  return count || 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getFeaturedData(pipelineId: string): Promise<any | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("featured_pipelines")
    .select("reason, ai_summary, key_facts, competitive_landscape, investment_thesis, risk_factors, featured_month, rank")
    .eq("pipeline_id", pipelineId)
    .order("featured_month", { ascending: false })
    .limit(1)
    .single();
  return data || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCuratedWatchlistInfo(pipelineId: string): Promise<any | null> {
  const supabase = getSupabase();
  const { data: items } = await supabase
    .from("curated_watchlist_items")
    .select("watchlist_id")
    .eq("pipeline_id", pipelineId)
    .limit(1);

  if (!items || items.length === 0) return null;

  const { data: watchlist } = await supabase
    .from("curated_watchlists")
    .select("name, slug, icon")
    .eq("id", items[0].watchlist_id)
    .single();

  return watchlist || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getHistoricalContext(indication: string | null, pipelineId: string): Promise<any> {
  if (!indication) return { similar: [], approvedCount: 0, totalCount: 0 };
  const supabase = getSupabase();

  // Find drugs with the same indication that are Phase 3 or later
  const words = indication.split(/[\s,;]+/).filter((w) => w.length > 3);
  const searchTerm = words[0] || indication;

  const { data } = await supabase
    .from("pipelines")
    .select("id, slug, product_name, company_name, indication, stage, trial_status")
    .ilike("indication", `%${searchTerm}%`)
    .neq("id", pipelineId)
    .in("stage", ["Phase 3", "Approved"])
    .limit(20);

  if (!data || data.length === 0) return { similar: [], approvedCount: 0, totalCount: 0 };

  const approved = data.filter((d) => d.stage === "Approved");
  const terminated = data.filter((d) => d.trial_status === "Terminated" || d.trial_status === "Withdrawn");
  const active = data.filter((d) => d.stage !== "Approved" && d.trial_status !== "Terminated" && d.trial_status !== "Withdrawn");

  // Take top 7 for display
  const similar = data.slice(0, 7).map((d) => ({
    product_name: d.product_name,
    company_name: d.company_name,
    stage: d.stage,
    trial_status: d.trial_status,
    slug: d.slug,
    outcome: d.stage === "Approved" ? "approved" : (d.trial_status === "Terminated" || d.trial_status === "Withdrawn") ? "terminated" : "active",
  }));

  return {
    similar,
    approvedCount: approved.length,
    terminatedCount: terminated.length,
    activeCount: active.length,
    totalCount: data.length,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCompanyTopProducts(companyId: string, excludeId: string): Promise<any[]> {
  const supabase = getSupabase();
  const { data: scores } = await supabase
    .from("product_scores")
    .select("pipeline_id, product_name, hype_score")
    .eq("company_id", companyId)
    .neq("pipeline_id", excludeId)
    .order("hype_score", { ascending: false })
    .limit(5);

  if (!scores || scores.length === 0) return [];

  // Get slugs
  const pIds = scores.map((s) => s.pipeline_id);
  const { data: pipelines } = await supabase
    .from("pipelines")
    .select("id, slug, stage")
    .in("id", pIds);

  const pMap = new Map<string, { slug: string; stage: string | null }>();
  if (pipelines) {
    for (const p of pipelines) {
      pMap.set(p.id, { slug: p.slug, stage: p.stage });
    }
  }

  return scores.map((s) => ({
    ...s,
    slug: pMap.get(s.pipeline_id)?.slug || null,
    stage: pMap.get(s.pipeline_id)?.stage || null,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: "Product Not Found | BiotechTube" };

  const title = `${product.product_name} | ${product.company_name} | BiotechTube`;
  const description = `${product.product_name} is a ${product.stage || "clinical"} stage product by ${product.company_name} for ${product.indication || "various indications"}. Track clinical trials, hype score, and competing products.`;

  return {
    robots: "noindex, nofollow",
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "BiotechTube",
      url: `https://biotechtube.io/product/${params.slug}`,
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const [
    company,
    productScore,
    relatedTrials,
    competingProducts,
    viewCount7d,
    watchlistCount,
    marketCap,
    companyTopProducts,
    featuredData,
    curatedWatchlistInfo,
    historicalContext,
  ] = await Promise.all([
    product.company_id ? getCompany(product.company_id) : Promise.resolve(null),
    getProductScore(product.id),
    getRelatedTrials(product.product_name, product.company_id),
    getCompetingProducts(product.indication, product.id),
    getViewCount7d(product.id),
    getWatchlistCount(product.id),
    product.company_id ? getLatestMarketCap(product.company_id) : Promise.resolve(null),
    product.company_id ? getCompanyTopProducts(product.company_id, product.id) : Promise.resolve([]),
    getFeaturedData(product.id),
    getCuratedWatchlistInfo(product.id),
    getHistoricalContext(product.indication, product.id),
  ]);

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalEntity",
    name: product.product_name,
    description: `${product.product_name} — a ${product.stage || ""} product by ${product.company_name} for ${product.indication || "various indications"}.`,
    manufacturer: company
      ? {
          "@type": "Organization",
          name: company.name,
          url: company.website || undefined,
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div
        className="page-content"
        style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}
      >
        <Nav />
        <ProductPageClient
          product={product}
          company={company}
          productScore={productScore}
          relatedTrials={relatedTrials}
          competingProducts={competingProducts}
          viewCount7d={viewCount7d}
          watchlistCount={watchlistCount}
          marketCap={marketCap}
          companyTopProducts={companyTopProducts}
          featuredData={featuredData}
          curatedWatchlistInfo={curatedWatchlistInfo}
          historicalContext={historicalContext}
        />
        <Footer />
      </div>
    </>
  );
}
