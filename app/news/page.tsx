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
      "slug, headline, subtitle, summary, type, hero_image_url, hero_placeholder_style, published_at, reading_time_min"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(11);

  if (filterType && filterType !== "all") {
    query = query.eq("type", filterType);
  }

  const { data: articles } = await query;

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
        />
      </main>
      <Footer />
    </div>
  );
}
