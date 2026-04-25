// biotechtube/app/research/thanks/[purchase_id]/ThanksClient.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Download, Headphones, Activity } from "lucide-react";

export function ThanksClient({ purchase, company }: { purchase: any; company: any }) {
  const [status, setStatus] = useState(purchase.status);

  useEffect(() => {
    if (status === "ready" || status === "failed" || status === "not_found" || status === "refunded") return;
    let consecutiveErrors = 0;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/research/purchase/${purchase.id}/status`).then(r => r.json());
        if (r?.status) {
          setStatus(r.status);
          consecutiveErrors = 0;
        }
      } catch {
        if (++consecutiveErrors >= 5) clearInterval(t);
      }
    }, 8000);
    return () => clearInterval(t);
  }, [status, purchase.id]);

  if (status === "failed") {
    return (
      <div>
        <h1 className="text-[28px] font-bold">Generation failed</h1>
        <p className="mt-3">Something went wrong producing your report. We've been notified and will refund you. Email research@biotechtube.io if you need help.</p>
      </div>
    );
  }

  if (status !== "ready") {
    return (
      <div className="text-center">
        <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: "var(--color-accent)" }} />
        <h1 className="text-[24px] font-bold">Generating your report on {company?.name}…</h1>
        <p className="mt-3" style={{ color: "var(--color-text-secondary)" }}>
          Usually 60-120 seconds. Save this URL — we'll also email it to {purchase.buyer_email}.
        </p>
        <p className="mt-2 text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>Status: {status}</p>
        <ClaimAccountForm prefilledEmail={purchase.buyer_email} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[28px] font-bold">Your equity research memo on {company?.name} is ready</h1>
      <p className="mt-2" style={{ color: "var(--color-text-secondary)" }}>
        Paid receipt sent to {purchase.buyer_email}. Bookmark this page.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        <a href={`/api/research/download/${purchase.id}`} className="flex items-center justify-center gap-2 py-3 rounded text-white font-medium" style={{ background: "var(--color-accent)" }}>
          <Download size={16} /> Download PDF
        </a>
        {purchase.tier === "living" && (
          <>
            <a href={`/api/research/audio/${purchase.id}`} className="flex items-center justify-center gap-2 py-3 rounded font-medium border" style={{ borderColor: "var(--color-border-subtle)" }}>
              <Headphones size={16} /> Audio (5 min)
            </a>
            <Link href={`/research/${company?.slug}/live/${purchase.stripe_session_id}`} className="flex items-center justify-center gap-2 py-3 rounded font-medium border" style={{ borderColor: "var(--color-border-subtle)" }}>
              <Activity size={16} /> Live dashboard
            </Link>
          </>
        )}
      </div>
      <ClaimAccountForm prefilledEmail={purchase.buyer_email} />
    </div>
  );
}

function ClaimAccountForm({ prefilledEmail }: { prefilledEmail: string }) {
  const [sent, setSent] = useState(false);
  async function send() {
    const { createBrowserClient } = await import("@/lib/supabase");
    const sb = createBrowserClient();
    await sb.auth.signInWithOtp({ email: prefilledEmail });
    setSent(true);
  }
  return (
    <div className="mt-8 p-4 rounded border" style={{ borderColor: "var(--color-border-subtle)" }}>
      <div className="text-[14px] font-semibold">Save your purchase to an account</div>
      <p className="text-[12px] mt-1" style={{ color: "var(--color-text-secondary)" }}>
        We'll send a magic-link to {prefilledEmail}. After login your purchase appears in <Link href="/research/dashboard" className="underline">My Reports</Link>.
      </p>
      {sent ? (
        <p className="mt-2 text-[12px]" style={{ color: "var(--color-accent)" }}>✓ Magic link sent.</p>
      ) : (
        <button onClick={send} className="mt-2 px-3 py-1.5 rounded text-[12px] font-medium text-white" style={{ background: "var(--color-text-primary)" }}>
          Send magic link
        </button>
      )}
    </div>
  );
}
