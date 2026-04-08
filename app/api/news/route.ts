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
      "slug, headline, subtitle, summary, type, status, hero_image_url, hero_placeholder_style, published_at, reading_time_min"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (type && type !== "all") {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ articles: [], error: error.message }, { status: 500 });
  }

  return NextResponse.json({ articles: data || [] });
}
