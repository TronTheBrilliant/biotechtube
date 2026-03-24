import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createClient } from "@supabase/supabase-js";
import { ProductsPageClient } from "./ProductsPageClient";
import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Biotech Product Rankings — Hype Score | BiotechTube",
  description:
    "Discover the most promising drugs, devices, AI/ML tools and therapies ranked by Hype Score. Track biotech product momentum across clinical stages.",
  openGraph: {
    title: "Biotech Product Rankings — Hype Score | BiotechTube",
    description:
      "Discover the most promising drugs, devices, AI/ML tools and therapies ranked by Hype Score.",
  },
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface UnifiedProductRow {
  id: string;
  slug: string | null;
  name: string;
  product_type: string;
  company_id: string | null;
  company_name: string | null;
  company_slug: string | null;
  stage: string | null;
  status: string | null;
  indication: string | null;
  conditions: string | null;
  hype_score: number;
  clinical_score: number;
  activity_score: number;
  company_score: number;
  novelty_score: number;
  community_score: number;
  trending_direction: string;
  view_count_7d: number;
  watchlist_count: number;
  external_id: string | null;
}

interface ProductTypeCounts {
  total: number;
  drug: number;
  approved_drug: number;
  device: number;
  ai_ml: number;
}

async function getUnifiedProducts(): Promise<{
  rows: UnifiedProductRow[];
  counts: ProductTypeCounts;
}> {
  const supabase = getSupabase();

  // Fetch top products from unified view, ordered by hype_score
  // Paginate in batches of 1000 to avoid timeouts
  const allData: UnifiedProductRow[] = [];
  const PAGE_SIZE = 1000;

  for (let page = 0; page < 6; page++) {
    const { data, error } = await supabase
      .from("unified_products")
      .select(
        `id, slug, name, product_type, company_id, company_name, company_slug,
         stage, status, indication, conditions,
         hype_score, clinical_score, activity_score, company_score,
         novelty_score, community_score, trending_direction,
         view_count_7d, watchlist_count, external_id`
      )
      .order("hype_score", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching unified products:", error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allData.push(...(data as UnifiedProductRow[]));
    if (data.length < PAGE_SIZE) break;
  }

  // Get type counts from the individual source tables (fast exact counts)
  const [drugRes, approvedRes, deviceRes, aiRes] = await Promise.all([
    supabase.from("product_scores").select("id", { count: "exact", head: true }),
    supabase.from("fda_approvals").select("id", { count: "exact", head: true }),
    supabase.from("medical_devices").select("id", { count: "exact", head: true }),
    supabase.from("ai_ml_devices").select("id", { count: "exact", head: true }),
  ]);

  const counts: ProductTypeCounts = {
    drug: drugRes.count ?? 0,
    approved_drug: approvedRes.count ?? 0,
    device: deviceRes.count ?? 0,
    ai_ml: aiRes.count ?? 0,
    total: (drugRes.count ?? 0) + (approvedRes.count ?? 0) + (deviceRes.count ?? 0) + (aiRes.count ?? 0),
  };

  return { rows: allData, counts };
}

export default async function ProductsPage() {
  const { rows, counts } = await getUnifiedProducts();

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
      <ProductsPageClient rows={rows} counts={counts} />
      <Footer />
    </div>
  );
}
