// biotechtube/app/api/webhooks/stripe/fulfill-company-claim.ts
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createServerClient } from "@/lib/supabase";

/**
 * Fulfill a company-claim purchase.
 * Behavior must be IDENTICAL to the original inline handler in route.ts —
 * this is a pure extract for the dispatcher refactor.
 */
export async function fulfillCompanyClaim(
  session: Stripe.Checkout.Session
): Promise<NextResponse> {
  const metadata = session.metadata as Record<string, string> | undefined;

  if (!metadata?.companyId || !metadata?.userId || !metadata?.plan) {
    console.warn("[Stripe Webhook] Missing metadata in checkout session:", metadata);
    return NextResponse.json({ received: true });
  }

  console.log(
    `[Stripe Webhook] Checkout completed for company ${metadata.companyId}, ` +
    `plan: ${metadata.plan}, user: ${metadata.userId}`
  );

  const supabase = createServerClient();

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
  return NextResponse.json({ received: true });
}
