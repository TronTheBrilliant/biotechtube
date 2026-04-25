// biotechtube/app/api/webhooks/stripe/handle-sub-canceled.ts
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createServerClient } from "@/lib/supabase";

/**
 * Handle subscription cancellation: revert any company_claim associated with
 * this subscription back to 'pending' (they no longer have an active sub).
 */
export async function handleSubscriptionCanceled(
  subscription: Stripe.Subscription
): Promise<NextResponse> {
  const supabase = createServerClient();
  console.log("[Stripe Webhook] Subscription cancelled:", subscription.id);

  const { error } = await supabase
    .from("company_claims")
    .update({ status: "pending", verification_method: null })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("[Stripe Webhook] Failed to downgrade claim:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
