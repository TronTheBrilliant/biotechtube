// biotechtube/app/api/research/purchase/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("equity_report_purchases")
    .select("status, equity_report_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!data) return NextResponse.json({ status: "not_found" }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
