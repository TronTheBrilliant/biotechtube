// biotechtube/app/api/research/post-checkout/[session_id]/route.ts
// Stripe success_url lands here. Sets httpOnly cookie scoped to this purchase
// then redirects to the thanks page.
import { NextRequest, NextResponse } from "next/server";
import { setPurchaseCookie } from "@/lib/research/cookie";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { session_id: string } }) {
  setPurchaseCookie(params.session_id);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://biotechtube.io";
  return NextResponse.redirect(`${baseUrl}/research/thanks/${params.session_id}`);
}
