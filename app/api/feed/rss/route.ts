import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  funding_deal: "Funding Deal",
  clinical_trial: "Clinical Trial",
  market_analysis: "Market Analysis",
  company_deep_dive: "Company Deep Dive",
  weekly_roundup: "Weekly Roundup",
  breaking_news: "Breaking News",
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRFC2822(dateStr: string): string {
  return new Date(dateStr).toUTCString();
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: articles } = await (supabase.from as any)("articles")
    .select("slug, headline, summary, type, published_at")
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(50);

  const items = (articles || [])
    .map((a: any) => {
      const link = `https://biotechtube.io/news/${escapeXml(a.slug)}`;
      const category = TYPE_LABELS[a.type] || a.type;
      return `    <item>
      <title>${escapeXml(a.headline)}</title>
      <link>${link}</link>
      <description>${escapeXml(a.summary || "")}</description>
      <pubDate>${toRFC2822(a.published_at)}</pubDate>
      <guid>${link}</guid>
      <category>${escapeXml(category)}</category>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>BiotechTube Intelligence</title>
    <link>https://biotechtube.io</link>
    <description>AI-powered biotech market intelligence</description>
    <language>en</language>
    <atom:link href="https://biotechtube.io/api/feed/rss" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
