// biotechtube/lib/stripe/client.ts
import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Returns a singleton Stripe client. Throws if STRIPE_SECRET_KEY is missing.
 * Use this everywhere instead of `new Stripe(...)` to keep config in one place.
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Configure it in Vercel env (production + preview) and locally in .env.local."
    );
  }
  _stripe = new Stripe(key, {
    apiVersion: "2026-03-25.dahlia", // pin so we don't get surprise breakage
    typescript: true,
  });
  return _stripe;
}

/**
 * Returns true if Stripe is configured. Use to gate UI/admin pages without throwing.
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
