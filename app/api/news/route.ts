import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 10;

  const supabase = createServerClient();

  let query = (supabase.from as any)("articles")
    .select(
      "slug, headline, subtitle, summary, type, company_id, status, hero_image_url, hero_placeholder_style, published_at, reading_time_min"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (type && type !== "all") {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ articles: [], companies: {}, error: error.message }, { status: 500 });
  }

  // Build company map for returned articles
  const companyIds = (data || []).map((a: any) => a.company_id).filter(Boolean);
  let companies: Record<string, any> = {};
  if (companyIds.length > 0) {
    const { data: cos } = await supabase
      .from('companies')
      .select('id, name, logo_url, slug')
      .in('id', companyIds);
    if (cos) {
      for (const c of cos as any[]) {
        companies[c.id] = { name: c.name, logo_url: c.logo_url, slug: c.slug };
      }
    }
  }

  return NextResponse.json({ articles: data || [], companies });
}
