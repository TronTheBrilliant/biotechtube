// biotechtube/app/api/webhooks/stripe/fulfill-equity-report.ts
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createServerClient } from "@/lib/supabase";
import { getReportAmountCents } from "@/lib/stripe/prices";
import type { Tier, Angle } from "@/lib/reports/types";

export async function fulfillEquityReport(session: Stripe.Checkout.Session): Promise<NextResponse> {
  const supabase = createServerClient();

  // Idempotency relies on the unique(stripe_session_id) constraint on
  // equity_report_purchases (Chunk 2 schema). Two concurrent webhook
  // deliveries would both pass a select-then-insert TOCTOU, so we just
  // attempt insert and catch 23505 (unique_violation).

  const md = session.metadata ?? {};
  const tier = md.tier as Tier;
  const angle = (md.angle as Angle) || "general";
  const company_id = md.company_id;
  const buyer_email = (session.customer_details?.email ?? session.customer_email ?? "").toLowerCase();

  if (!company_id || !tier || !buyer_email) {
    console.warn("[fulfill-equity-report] missing required metadata:", md);
    return NextResponse.json({ received: true });
  }

  // 1. Look for cached, non-expired report for this company
  const nowIso = new Date().toISOString();
  const { data: cached } = await supabase
    .from("equity_reports")
    .select("id, content_jsonb")
    .eq("company_id", company_id)
    .gte("expires_at", nowIso)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let status: "ready" | "angle_pending" | "generating" = "generating";
  let equity_report_id: string | null = null;
  if (cached) {
    equity_report_id = cached.id;
    const c = cached.content_jsonb as any;
    const angleExists = !!c?.angles?.[angle];
    status = angleExists ? "ready" : "angle_pending";
  }

  // 2. Look up auth.users by email via admin API (PostgREST doesn't expose auth schema)
  let authUserId: string | null = null;
  try {
    const list = await supabase.auth.admin.listUsers();
    authUserId = list.data.users.find(u => (u.email ?? "").toLowerCase() === buyer_email)?.id ?? null;
  } catch (e) {
    console.warn("[fulfill-equity-report] admin.listUsers failed (non-fatal):", e);
  }

  // 3. Insert purchase row
  const liveExpiresAt = tier === "living"
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data: purchase, error: insertErr } = await supabase
    .from("equity_report_purchases")
    .insert({
      user_id: authUserId,
      buyer_email,
      equity_report_id,
      company_id,
      tier,
      angle,
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
      amount_cents: session.amount_total ?? getReportAmountCents(tier),
      status,
      generation_started_at: status === "ready" ? null : nowIso,
      live_access_expires_at: liveExpiresAt,
    })
    .select("id")
    .single();
  if (insertErr || !purchase) {
    if ((insertErr as any)?.code === "23505") {
      console.log("[fulfill-equity-report] duplicate webhook for session", session.id, "— ignoring");
      return NextResponse.json({ received: true });
    }
    console.error("[fulfill-equity-report] insert failed:", insertErr);
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  // 4. Background generation (skip if already 'ready')
  if (status !== "ready") {
    // unstable_after lets us run code after the response returns 200.
    // If unavailable, fall back to fire-and-forget.
    let after: ((p: Promise<unknown>) => void) | null = null;
    try {
      const mod = await import("next/server");
      after = (mod as any).unstable_after ?? (mod as any).after ?? null;
    } catch {}
    const work = async () => {
      try {
        if (status === "angle_pending" && equity_report_id) {
          const { ensureAngle } = await import("@/lib/reports/angle-rewrite");
          await ensureAngle(equity_report_id, angle);
          await supabase.from("equity_report_purchases").update({ status: "ready" }).eq("id", purchase.id);
        } else {
          const { generateEquityReport } = await import("@/lib/reports/generate");
          await generateEquityReport({ companyId: company_id, angle, purchaseId: purchase.id });
        }
      } catch (e) {
        console.error("[fulfill-equity-report] background work failed:", e);
        await supabase
          .from("equity_report_purchases")
          .update({ status: "failed" })
          .eq("id", purchase.id);
      }
    };
    if (after) after(work());
    else { work(); /* fire-and-forget */ }
  }

  return NextResponse.json({ received: true });
}
