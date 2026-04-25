// biotechtube/app/api/research/preview/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getOrGeneratePreview } from "@/lib/reports/preview";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const supabase = createServerClient();
  const { data: company, error } = await supabase
    .from("companies")
    .select("id, name, slug, ticker")
    .eq("slug", params.slug)
    .single();
  if (error || !company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }
  try {
    const preview = await getOrGeneratePreview(company.id, company.name);
    return NextResponse.json({ company, preview }, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (e) {
    console.error("[preview] generation failed:", e);
    return NextResponse.json({ company, preview: null }, { status: 200 });
  }
}
