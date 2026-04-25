// biotechtube/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { fulfillCompanyClaim } from "./fulfill-company-claim";
import { handleSubscriptionCanceled } from "./handle-sub-canceled";
import { handlePaymentFailed } from "./handle-payment-failed";
import { handleChargeRefunded } from "./handle-charge-refunded";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Stripe webhook dispatcher.
 * - Verifies signature against STRIPE_WEBHOOK_SECRET
 * - Dispatches checkout.session.completed by metadata.type:
 *     'company_claim'   → fulfillCompanyClaim()    (existing flow)
 *     'equity_report'   → fulfillEquityReport()    (added in Chunk 5)
 * - Routes lifecycle events to dedicated handlers
 *
 * Idempotency is enforced inside each handler (by stripe_session_id or PI id).
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET missing");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`[Stripe Webhook] Received: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const type = session.metadata?.type;
        if (type === "company_claim") return await fulfillCompanyClaim(session);
        if (type === "equity_report") {
          // The real implementation lands in Chunk 5. Until then a stub re-exports null,
          // letting the dispatcher compile + log + return 200 instead of crashing.
          const { fulfillEquityReport } = await import("./fulfill-equity-report");
          if (!fulfillEquityReport) {
            console.warn("[Stripe Webhook] equity_report fulfillment not yet wired");
            return NextResponse.json({ received: true });
          }
          return await fulfillEquityReport(session);
        }
        console.warn(`[Stripe Webhook] Unknown metadata.type: ${type}`);
        return NextResponse.json({ received: true });
      }

      case "customer.subscription.deleted":
        return await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);

      case "invoice.payment_failed":
        return await handlePaymentFailed(event.data.object as Stripe.Invoice);

      case "charge.refunded":
        return await handleChargeRefunded(event.data.object as Stripe.Charge);

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        return NextResponse.json({ received: true });
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}
