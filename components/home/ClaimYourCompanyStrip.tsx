"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, ArrowRight } from "lucide-react";

const STORAGE_KEY = "btt:claim-strip-dismissed-at";
const DISMISS_DAYS = 30;

export function ClaimYourCompanyStrip() {
  // SSR-safe initial state: don't render until we've checked localStorage on client
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setVisible(true);
        return;
      }
      const dismissedAt = Number(raw);
      const ageMs = Date.now() - dismissedAt;
      const expiredMs = DISMISS_DAYS * 24 * 60 * 60 * 1000;
      setVisible(ageMs > expiredMs);
    } catch {
      // localStorage unavailable (private mode, etc.) — show by default
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore — strip still hides for the session via state
    }
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Claim your company"
      className="hidden md:flex items-center justify-center gap-3 h-[28px] px-5 text-[12px]"
      style={{
        background: "var(--color-accent-subtle)",
        borderBottom: "0.5px solid var(--color-border-subtle)",
        color: "var(--color-accent-dark)",
      }}
    >
      <span style={{ fontWeight: 500 }}>
        Is your company in the index?
      </span>
      <Link
        href="/claim"
        className="inline-flex items-center gap-1 font-semibold transition-opacity hover:opacity-80"
        style={{ color: "var(--color-accent)" }}
      >
        Claim your profile
        <ArrowRight size={12} strokeWidth={2.25} />
      </Link>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss for 30 days"
        className="ml-3 flex items-center justify-center rounded-sm transition-opacity hover:opacity-100"
        style={{
          width: 18,
          height: 18,
          color: "var(--color-accent-dark)",
          opacity: 0.5,
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        <X size={12} strokeWidth={2.25} />
      </button>
    </div>
  );
}
