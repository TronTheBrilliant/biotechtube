import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createServerClient } from "@/lib/supabase";
import { NewsClient } from "./NewsClient";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Biotech News & Intelligence | BiotechTube",
  description:
    "AI-powered analysis of the biotech market. Funding deals, clinical trials, market analysis, company spotlights, and breaking news.",
  openGraph: {
    title: "Biotech News & Intelligence | BiotechTube",
    description:
      "AI-powered analysis of the biotech market. Funding deals, clinical trials, market analysis, and more.",
    type: "website",
    siteName: "BiotechTube",
  },
  alternates: {
    canonical: "https://biotechtube.io/news",
    types: {
      "application/rss+xml": "/api/feed/rss",
    },
  },
};

interface ArticleRow {
  slug: string;
  headline: string;
  subtitle: string | null;
  summary: string | null;
  type: string;
  company_id: string | null;
  hero_image_url: string | null;
  hero_placeholder_style: any;
  published_at: string | null;
  reading_time_min: number | null;
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const filterType = searchParams.type;
  const supabase = createServerClient();

  // Fetch initial articles
  let query = (supabase.from as any)("articles")
    .select(
      "slug, headline, subtitle, summary, type, company_id, hero_image_url, hero_placeholder_style, published_at, reading_time_min"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(11);

  if (filterType && filterType !== "all") {
    query = query.eq("type", filterType);
  }

  const { data: articles } = await query;

  // Fetch company data for articles that have a company_id
  const companyIds = (articles || [])
    .map((a: any) => a.company_id)
    .filter(Boolean);

  let companyMap: Record<string, { name: string; logo_url: string | null; slug: string }> = {};
  if (companyIds.length > 0) {
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name, logo_url, slug')
      .in('id', companyIds);

    if (companies) {
      for (const c of companies as any[]) {
        companyMap[c.id] = { name: c.name, logo_url: c.logo_url, slug: c.slug };
      }
    }
  }

  // Get counts per type for filter badges
  const { data: allArticles } = await (supabase.from as any)("articles")
    .select("type")
    .eq("status", "published");

  const typeCounts: Record<string, number> = {};
  let totalCount = 0;
  if (allArticles) {
    for (const a of allArticles) {
      typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
      totalCount++;
    }
  }

  return (
    <div
      className="page-content"
      style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}
    >
      <Nav />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <NewsClient
          initialArticles={(articles as ArticleRow[]) ?? []}
          typeCounts={typeCounts}
          totalCount={totalCount}
          initialType={filterType || "all"}
          initialCompanyMap={companyMap}
        />
      </main>
      <Footer />
    </div>
  );
}
