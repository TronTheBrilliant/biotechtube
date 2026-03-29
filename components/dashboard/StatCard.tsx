"use client";

import type { ReactNode } from "react";

/* ─── Types ─── */

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  subtitle: string;
  accentValue?: boolean;
}

/* ─── Component ─── */

export function StatCard({
  icon,
  label,
  value,
  subtitle,
  accentValue = false,
}: StatCardProps) {
  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        border: "0.5px solid var(--color-border-subtle)",
        borderRadius: 8,
        padding: "12px 14px",
      }}
    >
      {/* Label row */}
      <div
        className="flex items-center gap-1"
        style={{ marginBottom: 6 }}
      >
        <span
          className="flex-shrink-0"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {icon}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: "var(--color-text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {label}
        </span>
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: 20,
          fontWeight: 500,
          color: accentValue
            ? "var(--color-text-accent)"
            : "var(--color-text-primary)",
          letterSpacing: "-0.5px",
          lineHeight: 1.2,
          marginBottom: 2,
        }}
      >
        {value}
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 10,
          color: "var(--color-text-tertiary)",
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}
