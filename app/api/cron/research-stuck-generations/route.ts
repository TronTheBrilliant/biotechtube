// biotechtube/app/api/cron/research-stuck-generations/route.ts
// Janitor: retry purchases stuck in 'generating' or 'angle_pending' > 5 min, cap 3 attempts.
// On terminal failure (3 attempts), auto-refund via Stripe (idempotent) and mark 'failed'.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const STUCK_AFTER_MIN = 5;
const MAX_ATTEMPTS = 3;
const BATCH_CAP = 20;

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerClient();
  const cutoff = new Date(Date.now() - STUCK_AFTER_MIN * 60 * 1000).toISOString();

  const { data: stuck } = await supabase
    .from("equity_report_purchases")
    .select("id, company_id, angle, equity_report_id, status, generation_attempts, tier, stripe_payment_intent_id")
    .in("status", ["generating", "angle_pending"])
    .lt("generation_started_at", cutoff)
    .lt("generation_attempts", MAX_ATTEMPTS)
    .limit(BATCH_CAP);

  if (!stuck || stuck.length === 0) {
    return NextResponse.json({ retried: 0, terminal: 0 });
  }

  let retried = 0, terminal = 0;
  for (const p of stuck) {
    try {
      await supabase
        .from("equity_report_purchases")
        .update({ generation_attempts: (p.generation_attempts ?? 0) + 1, generation_started_at: new Date().toISOString() })
        .eq("id", p.id);

      if (p.status === "angle_pending" && p.equity_report_id) {
        const { ensureAngle } = await import("@/lib/reports/angle-rewrite");
        await ensureAngle(p.equity_report_id, p.angle as any);
        await supabase.from("equity_report_purchases").update({ status: "ready" }).eq("id", p.id);
      } else {
        const { generateEquityReport } = await import("@/lib/reports/generate");
        await generateEquityReport({ companyId: p.company_id, angle: p.angle as any, purchaseId: p.id });
      }
      retried++;
    } catch (e) {
      console.error("[stuck-generations] retry failed for", p.id, e);
      const newAttempts = (p.generation_attempts ?? 0) + 1;
      if (newAttempts >= MAX_ATTEMPTS) {
        terminal++;
        await supabase.from("equity_report_purchases").update({ status: "failed" }).eq("id", p.id);
        if (p.stripe_payment_intent_id) {
          try {
            const { getStripe } = await import("@/lib/stripe/client");
            await getStripe().refunds.create(
              { payment_intent: p.stripe_payment_intent_id },
              { idempotencyKey: `refund_purchase_${p.id}` },
            );
          } catch (refErr) {
            console.error("[stuck-generations] auto-refund failed for", p.id, refErr);
          }
        }
      }
    }
  }
  return NextResponse.json({ retried, terminal });
}
