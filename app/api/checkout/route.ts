import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const PLAN_PRICES: Record<string, { name: string; priceMonthly: number; stripePriceId?: string }> = {
  starter: { name: "Starter", priceMonthly: 299 },
  professional: { name: "Professional", priceMonthly: 499 },
  enterprise: { name: "Enterprise", priceMonthly: 799 },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, plan, userId } = body as {
      companyId: string;
      plan: "starter" | "professional" | "enterprise";
      userId: string;
    };

    if (!companyId || !plan || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: companyId, plan, userId" },
        { status: 400 }
      );
    }

    const planConfig = PLAN_PRICES[plan];
    if (!planConfig) {
      return NextResponse.json(
        { error: "Invalid plan. Must be starter, professional, or enterprise." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if company exists
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name, slug")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Check if already claimed
    const { data: existingClaim } = await supabase
      .from("company_claims")
      .select("id, status")
      .eq("company_id", companyId)
      .single();

    if (existingClaim) {
      return NextResponse.json(
        { error: "This company has already been claimed." },
        { status: 409 }
      );
    }

    // -----------------------------------------------------------
    // Stripe integration point
    // -----------------------------------------------------------
    if (process.env.STRIPE_SECRET_KEY) {
      // TODO: Replace with real Stripe checkout when STRIPE_SECRET_KEY is configured
      // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      // const session = await stripe.checkout.sessions.create({
      //   mode: "subscription",
      //   payment_method_types: ["card"],
      //   line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
      //   metadata: { companyId, plan, userId },
      //   success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/company/${company.slug}/admin?session_id={CHECKOUT_SESSION_ID}`,
      //   cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/claim/${company.slug}`,
      // });
      // return NextResponse.json({ url: session.url });

      // For now, fall through to mock flow until Stripe price IDs are configured
    }

    // -----------------------------------------------------------
    // Mock flow: auto-verify the claim (no Stripe key yet)
    // -----------------------------------------------------------
    const { error: claimError } = await supabase.from("company_claims").insert({
      company_id: companyId,
      user_id: userId,
      status: "verified",
      verification_method: "email_domain",
      verified_at: new Date().toISOString(),
      plan,
    });

    if (claimError) {
      if (claimError.code === "23505") {
        return NextResponse.json(
          { error: "This company has already been claimed." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: claimError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      mock: true,
      message: `Claim created for ${company.name} on ${planConfig.name} plan (mock - no Stripe key configured)`,
      redirectUrl: `/company/${company.slug}/admin`,
    });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
