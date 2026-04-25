// biotechtube/app/api/research/[slug]/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { getReportPriceId } from "@/lib/stripe/prices";
import { createServerClient } from "@/lib/supabase";
import type { Tier, Angle } from "@/lib/reports/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const VALID_TIERS: Tier[] = ["snapshot", "living"];
const VALID_ANGLES: Angle[] = ["general", "long", "short", "vc", "bd", "scientist"];

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }
  const body = await req.json().catch(() => null) as { tier?: Tier; angle?: Angle } | null;
  if (!body?.tier || !VALID_TIERS.includes(body.tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }
  const angle = (body.angle && VALID_ANGLES.includes(body.angle)) ? body.angle : "general";

  const priceId = getReportPriceId(body.tier);
  if (!priceId) {
    return NextResponse.json({ error: `Stripe price not configured for tier ${body.tier}` }, { status: 503 });
  }

  const supabase = createServerClient();
  const { data: company, error } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", params.slug)
    .single();
  if (error || !company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const stripe = getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://biotechtube.io";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    // success_url goes through a Route Handler (Task 5.6) that sets the
    // httpOnly cookie before redirecting to the thanks page. Server Components
    // in Next 14 can't call cookies().set().
    success_url: `${baseUrl}/api/research/post-checkout/{CHECKOUT_SESSION_ID}`,
    cancel_url:  `${baseUrl}/research/${company.slug}`,
    metadata: {
      type: "equity_report",
      company_id: company.id,
      company_slug: company.slug,
      tier: body.tier,
      angle,
    },
  });

  return NextResponse.json({ url: session.url });
}
