// biotechtube/app/api/webhooks/stripe/handle-payment-failed.ts
import { NextResponse } from "next/server";
import type Stripe from "stripe";

/**
 * Handle invoice payment failure: log + flag the related claim with a soft
 * indicator. Email-the-admin behavior is deferred to v1.1 (no email infra).
 */
export async function handlePaymentFailed(
  invoice: Stripe.Invoice
): Promise<NextResponse> {
  console.log("[Stripe Webhook] Payment failed:", invoice.id);

  // In the Stripe SDK version used here, subscription lives under
  // invoice.parent.subscription_details.subscription (not invoice.subscription).
  const rawSub = (invoice as any).parent?.subscription_details?.subscription
    ?? (invoice as any).subscription
    ?? null;
  const subId: string | null =
    typeof rawSub === "string" ? rawSub : rawSub?.id ?? null;
  if (!subId) return NextResponse.json({ received: true });

  console.warn(
    `[Stripe Webhook] FLAG: payment failed on subscription ${subId} (invoice ${invoice.id}). ` +
      `Manual review needed.`
  );
  return NextResponse.json({ received: true });
}
