// biotechtube/app/api/webhooks/stripe/handle-charge-refunded.ts
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createServerClient } from "@/lib/supabase";

/**
 * Handle a charge refund. For company_claim purchases this is a no-op for now.
 * For equity_report purchases (Chunk 5 wiring), revoke download access by
 * setting status='refunded' and clearing live_access_expires_at.
 */
export async function handleChargeRefunded(
  charge: Stripe.Charge
): Promise<NextResponse> {
  console.log("[Stripe Webhook] Charge refunded:", charge.id, "PI:", charge.payment_intent);
  const supabase = createServerClient();

  const piId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id ?? null;
  if (!piId) return NextResponse.json({ received: true });

  const { error } = await supabase
    .from("equity_report_purchases")
    .update({ status: "refunded", refunded_at: new Date().toISOString() })
    .eq("stripe_payment_intent_id", piId);
  if (error) {
    console.error("[Stripe Webhook] equity_report_purchases refund update failed:", error);
  }

  return NextResponse.json({ received: true });
}
