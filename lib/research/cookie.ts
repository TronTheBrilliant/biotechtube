// biotechtube/lib/research/cookie.ts
import { cookies } from "next/headers";

const NAME = "equity_purchase_session";
const MAX_AGE_DAYS = 30;

export function setPurchaseCookie(stripeSessionId: string): void {
  cookies().set({
    name: NAME,
    value: stripeSessionId,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_DAYS * 24 * 60 * 60,
  });
}

export function readPurchaseCookie(): string | null {
  return cookies().get(NAME)?.value ?? null;
}
