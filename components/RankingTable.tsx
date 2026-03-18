"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Company } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";

const stageColors: Record<string, { bg: string; text: string; border: string }> = {
  Approved: { bg: "#e8f5f0", text: "#0a3d2e", border: "#5DCAA5" },
  "Phase 3": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 2": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 1/2": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Phase 1": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Pre-clinical": { bg: "#f7f7f6", text: "#6b6b65", border: "rgba(0,0,0,0.14)" },
};

function generateSparkline() {
  return Array.from({ length: 12 }, (_, i) => ({
    v: 50 + Math.random() * 50 + i * 3,
  }));
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

interface RankingTableProps {
  companies: Company[];
}

export function RankingTable({ companies }: RankingTableProps) {
  const paywallIndex = 5;

  return (
    <div>
      {/* Header */}
      <div
        className="ranking-grid grid items-center gap-2 py-2 border-b"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        <style>{`
          .ranking-grid { grid-template-columns: 24px 1fr auto; }
          @media (min-width: 768px) { .ranking-grid { grid-template-columns: 32px 1fr 80px 70px 80px 90px 30px; } }
        `}</style>
        <span className="text-10 uppercase tracking-[0.3px] text-center">#</span>
        <span className="text-10 uppercase tracking-[0.3px]">Company</span>
        <span className="text-10 uppercase tracking-[0.3px] text-right hidden md:block">Valuation</span>
        <span className="text-10 uppercase tracking-[0.3px] text-right md:text-right">Stage</span>
        <span className="text-10 uppercase tracking-[0.3px] text-right hidden md:block">Raised</span>
        <span className="text-10 uppercase tracking-[0.3px] text-right hidden md:block">30d</span>
        <span className="hidden md:block" />
      </div>

      {/* Rows */}
      {companies.map((company, index) => {
        const isLocked = index >= paywallIndex;
        const sparkData = generateSparkline();
        const sc = stageColors[company.stage] || stageColors["Pre-clinical"];
        const isPublic = company.type === "Public";

        return (
          <Link
            key={company.slug}
            href={`/company/${company.slug}`}
            className="ranking-grid grid items-center gap-2 py-2.5 border-b cursor-pointer transition-colors duration-100"
            style={{
              ...(isLocked
                ? {
                    filter: "blur(2px)",
                    opacity: 0.4,
                    pointerEvents: "none",
                    userSelect: "none",
                  }
                : {}),
            }}
            onMouseEnter={(e) => {
              if (!isLocked) {
                e.currentTarget.style.background = "var(--color-bg-secondary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isLocked) {
                e.currentTarget.style.background = "";
              }
            }}
          >
            <span
              className="text-12 text-center"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {index + 1}
            </span>

            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 border"
                style={{
                  background: "var(--color-bg-secondary)",
                  borderColor: "var(--color-border-subtle)",
                }}
              >
                <span
                  className="text-[9px] font-medium"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {getInitials(company.name)}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-13 font-medium truncate"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {company.name}
                  </span>
                  {company.ticker && (
                    <span
                      className="text-[9px] font-medium px-1 py-[1px] rounded-sm flex-shrink-0 hidden sm:inline md:hidden"
                      style={{
                        background: "var(--color-bg-secondary)",
                        color: "var(--color-text-tertiary)",
                        border: "0.5px solid var(--color-border-subtle)",
                      }}
                    >
                      {company.ticker}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-[1px]">
                  <span className="text-10" style={{ color: "var(--color-text-tertiary)" }}>
                    {company.city}, {company.country}
                  </span>
                  <span className="text-10 md:hidden" style={{ color: "var(--color-text-tertiary)" }}>·</span>
                  <span className="text-10 font-medium md:hidden" style={{ color: "var(--color-accent)" }}>
                    {formatCurrency(company.totalRaised)}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-[2px] md:hidden">
                  {company.focus.slice(0, 2).map((f) => (
                    <span
                      key={f}
                      className="text-[9px] px-1.5 py-[1px] rounded-sm"
                      style={{
                        background: "var(--color-bg-tertiary)",
                        color: "var(--color-text-tertiary)",
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-right hidden md:block">
              {company.valuation ? (
                <span
                  className="text-12"
                  style={{
                    color: isPublic
                      ? "var(--color-text-primary)"
                      : "var(--color-text-tertiary)",
                  }}
                >
                  {company.isEstimated && (
                    <span style={{ color: "var(--color-text-tertiary)" }}>est. </span>
                  )}
                  {formatCurrency(company.valuation)}
                </span>
              ) : (
                <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>
                  —
                </span>
              )}
            </div>

            <div className="flex justify-end">
              <span
                className="text-10 px-2 py-[3px] rounded-sm border whitespace-nowrap"
                style={{
                  background: sc.bg,
                  color: sc.text,
                  borderColor: sc.border,
                  borderWidth: "0.5px",
                }}
              >
                {company.stage}
              </span>
            </div>

            <div className="text-right hidden md:block">
              <span
                className="text-12 font-medium"
                style={{ color: "var(--color-accent)" }}
              >
                {formatCurrency(company.totalRaised)}
              </span>
            </div>

            <div className="hidden md:flex justify-end">
              <div className="w-[80px] h-[28px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparkData}>
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke={isPublic ? "#1a7a5e" : "#9e9e96"}
                      strokeWidth={1.5}
                      strokeDasharray={isPublic ? undefined : "3 2"}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="hidden md:flex justify-center">
              <Star
                size={14}
                className="cursor-pointer transition-colors duration-150"
                style={{ color: "var(--color-text-tertiary)" }}
              />
            </div>
          </Link>
        );
      })}

      {/* Paywall overlay */}
      <div
        className="flex items-center gap-2.5 py-3.5"
        style={{
          background: `linear-gradient(to bottom, transparent, var(--color-bg-primary))`,
        }}
      >
        <span className="text-14">🔒</span>
        <span className="text-12" style={{ color: "var(--color-text-secondary)" }}>
          Sign up to see all 14,000+ companies
        </span>
        <Link
          href="/signup"
          className="text-12"
          style={{ color: "var(--color-accent)" }}
        >
          Create free account →
        </Link>
      </div>
    </div>
  );
}
