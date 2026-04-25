// biotechtube/lib/research/auth.ts
// Shared auth check for download + dashboard.
// Order: cookie session_id → auth.user_id match → exact-lowercased email match
// (with user_id backfill on email match).

import { createServerClient } from "@/lib/supabase";
import { readPurchaseCookie } from "./cookie";

export interface PurchaseAccessResult {
  ok: boolean;
  reason?: "not_found" | "unauthorized" | "refunded" | "not_ready" | "expired" | "wrong_tier";
  purchase?: any;
}

export interface AccessOptions {
  requireLiving?: boolean;
  requireReady?: boolean;
  requireLiveNotExpired?: boolean;
}

export async function verifyPurchaseAccess(
  purchaseId: string,
  authedUserId: string | null,
  authedEmail: string | null,
  opts: AccessOptions = {},
): Promise<PurchaseAccessResult> {
  const supabase = createServerClient();
  const { data: purchase } = await supabase
    .from("equity_report_purchases")
    .select("*")
    .eq("id", purchaseId)
    .maybeSingle();
  if (!purchase) return { ok: false, reason: "not_found" };

  if (purchase.status === "refunded") return { ok: false, reason: "refunded" };

  const cookieSessId = readPurchaseCookie();
  let allowed =
    cookieSessId === purchase.stripe_session_id ||
    (authedUserId && authedUserId === purchase.user_id);

  if (!allowed && authedEmail && authedEmail.toLowerCase() === purchase.buyer_email.toLowerCase()) {
    allowed = true;
    if (authedUserId && !purchase.user_id) {
      await supabase
        .from("equity_report_purchases")
        .update({ user_id: authedUserId })
        .eq("id", purchase.id);
    }
  }
  if (!allowed) return { ok: false, reason: "unauthorized" };

  if (opts.requireReady && purchase.status !== "ready") return { ok: false, reason: "not_ready", purchase };
  if (opts.requireLiving && purchase.tier !== "living") return { ok: false, reason: "wrong_tier", purchase };
  if (opts.requireLiveNotExpired && purchase.live_access_expires_at && new Date(purchase.live_access_expires_at) < new Date()) {
    return { ok: false, reason: "expired", purchase };
  }
  return { ok: true, purchase };
}
