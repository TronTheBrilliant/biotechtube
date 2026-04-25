import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Atom 1.0 feed — alternate to RSS for clients that prefer it
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

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: articles } = await (supabase.from as any)("articles")
    .select("slug, headline, summary, type, published_at, updated_at")
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(50);

  const latestUpdate =
    (articles && articles[0]?.updated_at) ||
    (articles && articles[0]?.published_at) ||
    new Date().toISOString();

  const entries = (articles || [])
    .map((a: any) => {
      const link = `https://biotechtube.io/news/${escapeXml(a.slug)}`;
      const category = TYPE_LABELS[a.type] || a.type;
      return `  <entry>
    <title>${escapeXml(a.headline)}</title>
    <link href="${link}"/>
    <id>${link}</id>
    <published>${new Date(a.published_at).toISOString()}</published>
    <updated>${new Date(a.updated_at || a.published_at).toISOString()}</updated>
    <summary>${escapeXml(a.summary || "")}</summary>
    <category term="${escapeXml(category)}"/>
    <author><name>BiotechTube</name></author>
  </entry>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>BiotechTube Intelligence</title>
  <link href="https://biotechtube.io"/>
  <link rel="self" href="https://biotechtube.io/api/feed/atom" type="application/atom+xml"/>
  <id>https://biotechtube.io/</id>
  <updated>${new Date(latestUpdate).toISOString()}</updated>
  <subtitle>AI-powered biotech market intelligence</subtitle>
${entries}
</feed>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/atom+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
