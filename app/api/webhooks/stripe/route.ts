import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// TODO: When Stripe is configured, uncomment and use real webhook verification
// import Stripe from "stripe";
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
// const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    // -----------------------------------------------------------
    // Stripe webhook verification
    // -----------------------------------------------------------
    // TODO: Replace with real Stripe webhook signature verification
    // const signature = req.headers.get("stripe-signature");
    // if (!signature) {
    //   return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    // }
    // let event: Stripe.Event;
    // try {
    //   event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    // } catch (err) {
    //   console.error("Webhook signature verification failed:", err);
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    // }

    // For now, parse the body as JSON (mock/testing mode)
    let event: { type: string; data: { object: Record<string, unknown> } };
    try {
      event = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    const supabase = createServerClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Record<string, unknown>;
        const metadata = session.metadata as Record<string, string> | undefined;

        if (!metadata?.companyId || !metadata?.userId || !metadata?.plan) {
          console.warn("[Stripe Webhook] Missing metadata in checkout session:", metadata);
          break;
        }

        console.log(
          `[Stripe Webhook] Checkout completed for company ${metadata.companyId}, ` +
          `plan: ${metadata.plan}, user: ${metadata.userId}`
        );

        // Upsert company claim as verified with the chosen plan
        const { error: upsertError } = await supabase
          .from("company_claims")
          .upsert(
            {
              company_id: metadata.companyId,
              user_id: metadata.userId,
              status: "verified",
              verification_method: "stripe_payment",
              verified_at: new Date().toISOString(),
              plan: metadata.plan,
              stripe_customer_id: (session.customer as string) || null,
              stripe_subscription_id: (session.subscription as string) || null,
            },
            { onConflict: "company_id" }
          );

        if (upsertError) {
          console.error("[Stripe Webhook] Error upserting claim:", upsertError);
          return NextResponse.json({ error: "Database error" }, { status: 500 });
        }

        console.log(`[Stripe Webhook] Claim verified for company ${metadata.companyId}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Record<string, unknown>;
        console.log("[Stripe Webhook] Subscription updated:", subscription.id);
        // TODO: Handle plan changes, cancellations, etc.
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Record<string, unknown>;
        console.log("[Stripe Webhook] Subscription cancelled:", subscription.id);
        // TODO: Downgrade or deactivate the company claim
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Record<string, unknown>;
        console.log("[Stripe Webhook] Payment failed:", invoice.id);
        // TODO: Notify the company admin about failed payment
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook] Error:", err);
    return NextResponse.json(
      { error: "Webhook handler error" },
      { status: 500 }
    );
  }
}
