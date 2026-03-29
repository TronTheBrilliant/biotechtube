"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";

/* ─── Types ─── */

interface PremiumGateProps {
  plan: string;
  requiredPlan: "professional" | "enterprise";
  featureName: string;
  children: ReactNode;
  companySlug?: string;
}

/* ─── Helpers ─── */

const PLAN_LEVELS: Record<string, number> = {
  starter: 0,
  professional: 1,
  enterprise: 2,
};

function meetsRequirement(current: string, required: string): boolean {
  const currentLevel = PLAN_LEVELS[current.toLowerCase()] ?? 0;
  const requiredLevel = PLAN_LEVELS[required.toLowerCase()] ?? 1;
  return currentLevel >= requiredLevel;
}

/* ─── Component ─── */

export function PremiumGate({
  plan,
  requiredPlan,
  featureName,
  children,
  companySlug,
}: PremiumGateProps) {
  if (meetsRequirement(plan, requiredPlan)) {
    return <>{children}</>;
  }

  const requiredLabel =
    requiredPlan === "enterprise" ? "Enterprise" : "Professional";

  return (
    <div className="relative" style={{ minHeight: 120 }}>
      {/* Blurred content */}
      <div
        style={{
          filter: "blur(4px)",
          opacity: 0.4,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {children}
      </div>

      {/* Upgrade CTA overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3"
        style={{ zIndex: 10 }}
      >
        <div
          className="flex items-center gap-1"
          style={{
            color: "var(--color-text-secondary)",
            fontSize: 12,
          }}
        >
          <Lock size={14} />
          <span style={{ fontWeight: 500 }}>
            Upgrade to unlock {featureName}
          </span>
        </div>
        <p
          style={{
            fontSize: 11,
            color: "var(--color-text-tertiary)",
            textAlign: "center",
            maxWidth: 280,
          }}
        >
          This feature requires the {requiredLabel} plan or higher.
        </p>
        <Link
          href={companySlug ? `/claim/${companySlug}` : "/companies"}
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "white",
            background: "var(--color-accent)",
            padding: "7px 14px",
            borderRadius: 6,
            textDecoration: "none",
            transition: "all 150ms ease-out",
          }}
        >
          Upgrade to {requiredLabel}
        </Link>
      </div>
    </div>
  );
}
