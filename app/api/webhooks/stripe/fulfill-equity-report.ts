// biotechtube/app/api/webhooks/stripe/fulfill-equity-report.ts
// STUB — real implementation lands in Chunk 5. The dispatcher in route.ts imports
// this module unconditionally; exporting `null` lets the dispatcher log "not yet
// wired" and return 200 instead of crashing on a missing module.
import type { NextResponse } from "next/server";
import type Stripe from "stripe";

export const fulfillEquityReport: null | ((session: Stripe.Checkout.Session) => Promise<NextResponse>) = null;
