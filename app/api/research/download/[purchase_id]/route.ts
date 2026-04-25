// biotechtube/app/api/research/download/[purchase_id]/route.ts
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
    { requireReady: true },
  );
  if (!access.ok) {
    if (access.reason === "not_ready") {
      return NextResponse.json({ error: "Report still generating" }, { status: 425, headers: { "Retry-After": "30" } });
    }
    return NextResponse.json({ error: access.reason ?? "Unauthorized" }, { status: access.reason === "not_found" ? 404 : 403 });
  }

  const purchase = access.purchase!;
  const { data: report } = await supabase
    .from("equity_reports")
    .select("pdf_url")
    .eq("id", purchase.equity_report_id)
    .single();
  if (!report?.pdf_url) {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 });
  }

  const { data: signed, error: signErr } = await supabase
    .storage.from("equity-reports").createSignedUrl(report.pdf_url, 300);
  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: "Sign failed" }, { status: 500 });
  }

  // Atomic increment via RPC (avoids read-modify-write race when multiple
  // tabs download simultaneously). RPC defined in supabase/migrations/.
  const rpcResult = await supabase.rpc("increment_equity_report_download" as any, { p_id: purchase.id });
  if (rpcResult.error) {
    // Fallback if RPC isn't deployed yet: best-effort non-atomic update
    await supabase
      .from("equity_report_purchases")
      .update({ last_downloaded_at: new Date().toISOString() })
      .eq("id", purchase.id);
  }

  return NextResponse.redirect(signed.signedUrl);
}
