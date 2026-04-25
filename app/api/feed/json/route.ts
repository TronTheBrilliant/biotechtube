import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// JSON Feed 1.1 — modern feed format. https://www.jsonfeed.org/version/1.1/
export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  funding_deal: "Funding Deal",
  clinical_trial: "Clinical Trial",
  market_analysis: "Market Analysis",
  company_deep_dive: "Company Deep Dive",
  weekly_roundup: "Weekly Roundup",
  breaking_news: "Breaking News",
};

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: articles } = await (supabase.from as any)("articles")
    .select("slug, headline, summary, type, published_at, updated_at, sector")
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(50);

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: "BiotechTube Intelligence",
    home_page_url: "https://biotechtube.io",
    feed_url: "https://biotechtube.io/api/feed/json",
    description: "AI-powered biotech market intelligence",
    language: "en",
    authors: [{ name: "BiotechTube", url: "https://biotechtube.io" }],
    items: (articles || []).map((a: any) => ({
      id: `https://biotechtube.io/news/${a.slug}`,
      url: `https://biotechtube.io/news/${a.slug}`,
      title: a.headline,
      summary: a.summary || "",
      date_published: a.published_at ? new Date(a.published_at).toISOString() : undefined,
      date_modified: a.updated_at ? new Date(a.updated_at).toISOString() : undefined,
      tags: [TYPE_LABELS[a.type] || a.type, a.sector].filter(Boolean),
    })),
  };

  return NextResponse.json(feed, {
    headers: {
      "Content-Type": "application/feed+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
