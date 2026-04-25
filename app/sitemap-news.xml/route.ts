import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Google News sitemap — only recent news articles (< 48 hours per Google spec).
// We extend to 7 days to maximize coverage of our lower-frequency publishing.
// Google News crawls this for fast news indexation.

export const revalidate = 1800; // 30 min — news freshness matters

const BASE_URL = "https://biotechtube.io";
const LOOKBACK_DAYS = 7;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface NewsRow {
  slug: string;
  headline: string;
  published_at: string | null;
  type: string | null;
  sector: string | null;
}

export async function GET() {
  const supabase = getSupabase();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);

  const { data } = await supabase
    .from("articles" as never)
    .select("slug, headline, published_at, type, sector")
    .eq("status", "published")
    .gte("published_at", cutoff.toISOString())
    .order("published_at", { ascending: false })
    .limit(1000);

  const rows = (data ?? []) as NewsRow[];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
    `        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n` +
    rows
      .map((row) => {
        const loc = `${BASE_URL}/news/${row.slug}`;
        const pub = row.published_at ?? new Date().toISOString();
        const title = escapeXml(row.headline);
        const keywords = [row.type, row.sector].filter((k): k is string => !!k).map(escapeXml).join(", ");
        return [
          "  <url>",
          `    <loc>${loc}</loc>`,
          "    <news:news>",
          "      <news:publication>",
          "        <news:name>BiotechTube</news:name>",
          "        <news:language>en</news:language>",
          "      </news:publication>",
          `      <news:publication_date>${pub}</news:publication_date>`,
          `      <news:title>${title}</news:title>`,
          keywords ? `      <news:keywords>${keywords}</news:keywords>` : "",
          "    </news:news>",
          "  </url>",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n") +
    "\n</urlset>\n";

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
    },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
