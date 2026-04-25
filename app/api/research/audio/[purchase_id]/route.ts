// biotechtube/app/api/research/audio/[purchase_id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { verifyPurchaseAccess } from "@/lib/research/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { purchase_id: string } }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const access = await verifyPurchaseAccess(
    params.purchase_id,
    user?.id ?? null,
    user?.email ?? null,
    { requireReady: true, requireLiving: true },
  );
  if (!access.ok) {
    return NextResponse.json({ error: access.reason ?? "Unauthorized" }, { status: 403 });
  }
  const purchase = access.purchase!;
  const { data: report } = await supabase
    .from("equity_reports")
    .select("audio_url")
    .eq("id", purchase.equity_report_id)
    .single();
  if (!report?.audio_url) {
    return NextResponse.json({ error: "Audio not generated for this report" }, { status: 404 });
  }
  const { data: signed } = await supabase.storage.from("equity-reports").createSignedUrl(report.audio_url, 300);
  if (!signed?.signedUrl) return NextResponse.json({ error: "Sign failed" }, { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
