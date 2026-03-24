"use client";

import Link from "next/link";

interface HotProduct {
  product_name: string;
  company_name: string | null;
  company_slug: string | null;
  stage: string | null;
  indication: string | null;
  hype_score: number;
  trending_direction: string;
}

interface Props {
  products: HotProduct[];
}

function getHypeStyle(score: number): { emoji: string; color: string; gradient: string } {
  if (score >= 80) return { emoji: "\uD83D\uDD25", color: "#dc2626", gradient: "linear-gradient(90deg, #ef4444, #f97316)" };
  if (score >= 60) return { emoji: "\uD83D\uDCC8", color: "#16a34a", gradient: "linear-gradient(90deg, #22c55e, #16a34a)" };
  if (score >= 40) return { emoji: "\u26A1", color: "#2563eb", gradient: "linear-gradient(90deg, #3b82f6, #2563eb)" };
  return { emoji: "\uD83D\uDCA4", color: "#9ca3af", gradient: "linear-gradient(90deg, #d1d5db, #9ca3af)" };
}

const STAGE_COLORS: Record<string, string> = {
  "Phase 3": "#dbeafe",
  "Phase 2/3": "#dbeafe",
  "Phase 2": "#ede9fe",
  "Phase 1/2": "#ede9fe",
  "Phase 1": "#e8f5f0",
  "Pre-clinical": "#f3f4f6",
  Approved: "#d1fae5",
};

export default function HotProducts({ products }: Props) {
  return (
    <div>
      {products.map((p, i) => {
        const hype = getHypeStyle(p.hype_score);
        return (
          <Link
            key={`${p.product_name}-${i}`}
            href={p.company_slug ? `/company/${p.company_slug}` : "/products"}
            className="px-4 py-2.5 flex items-center gap-3 transition-colors duration-100 hover:bg-[var(--color-bg-secondary)]"
            style={
              i < products.length - 1
                ? { borderBottom: "0.5px solid var(--color-border-subtle)" }
                : undefined
            }
          >
            {/* Rank */}
            <span
              className="text-12 font-bold tabular-nums w-5 text-center flex-shrink-0"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {i + 1}
            </span>

            {/* Product info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="text-13 font-medium truncate"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {p.product_name}
                </span>
                {p.stage && (
                  <span
                    className="text-10 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                    style={{
                      background: STAGE_COLORS[p.stage] ?? "#f3f4f6",
                      color: "#1a1a1a",
                    }}
                  >
                    {p.stage}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {p.company_name && (
                  <span
                    className="text-11 truncate"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {p.company_name}
                  </span>
                )}
                {p.company_name && p.indication && (
                  <span
                    className="text-11"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    {"\u00B7"}
                  </span>
                )}
                {p.indication && (
                  <span
                    className="text-11 truncate"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    {p.indication}
                  </span>
                )}
              </div>
            </div>

            {/* Hype score badge */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: 32,
                  background: "var(--color-bg-tertiary)",
                  overflow: "hidden",
                }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${p.hype_score}%`,
                    background: hype.gradient,
                  }}
                />
              </div>
              <span
                className="text-12 font-bold tabular-nums"
                style={{ color: hype.color, minWidth: 20 }}
              >
                {p.hype_score}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
