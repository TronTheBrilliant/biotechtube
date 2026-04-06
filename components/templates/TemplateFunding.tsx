"use client";
import { DollarSign } from "lucide-react";
import { formatMarketCap } from "@/lib/market-utils";
import type { DbFundingRound } from "@/lib/template-types";

interface Props {
  rounds: DbFundingRound[];
  brandColor: string;
}

const ROUND_COLORS: Record<string, string> = {
  Seed: "#16a34a",
  "Series A": "#2563eb",
  "Series B": "#7c3aed",
  "Series C": "#d97706",
  "Series D": "#dc2626",
  IPO: "#059669",
  Grant: "#0891b2",
};

export function TemplateFunding({ rounds, brandColor }: Props) {
  if (rounds.length === 0) return null;

  const sorted = [...rounds]
    .filter((r) => r.announced_date)
    .sort((a, b) => (a.announced_date || "").localeCompare(b.announced_date || ""));

  const totalRaised = sorted.reduce((sum, r) => sum + (r.amount_usd || 0), 0);
  const maxAmount = Math.max(...sorted.map((r) => r.amount_usd || 0), 1);

  return (
    <section id="funding" className="py-20 sm:py-28" style={{ background: "var(--color-bg-secondary)" }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex items-center gap-2">
          <DollarSign size={14} style={{ color: brandColor }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: brandColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Funding
          </span>
        </div>
        <h2 className="mt-3" style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 300, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
          Funding History
        </h2>
        {totalRaised > 0 && (
          <p className="mt-3" style={{ fontSize: 16, color: "var(--color-text-secondary)" }}>
            {formatMarketCap(totalRaised)} raised across {sorted.length} round{sorted.length !== 1 ? "s" : ""}.
          </p>
        )}

        {/* Horizontal scrollable timeline */}
        <div className="mt-10 overflow-x-auto no-scrollbar pb-4">
          <div className="flex gap-4" style={{ minWidth: sorted.length * 220 }}>
            {sorted.map((round, i) => {
              const date = round.announced_date ? new Date(round.announced_date) : null;
              const dateStr = date
                ? date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
                : "Unknown";
              const roundColor = ROUND_COLORS[round.round_type || ""] || brandColor;
              const barHeight = round.amount_usd ? Math.max(20, (round.amount_usd / maxAmount) * 120) : 20;

              return (
                <div key={round.id} className="flex flex-col items-center shrink-0" style={{ width: 200 }}>
                  {/* Amount */}
                  <div className="mb-2 text-center">
                    <div style={{ fontSize: 20, fontWeight: 400, color: "var(--color-text-primary)" }}>
                      {round.amount_usd ? formatMarketCap(round.amount_usd) : "—"}
                    </div>
                  </div>

                  {/* Bar */}
                  <div
                    className="w-full rounded-lg transition-all"
                    style={{
                      height: barHeight,
                      background: `${roundColor}18`,
                      border: `0.5px solid ${roundColor}30`,
                      position: "relative",
                    }}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-lg"
                      style={{
                        height: "100%",
                        background: `linear-gradient(180deg, ${roundColor}08 0%, ${roundColor}25 100%)`,
                      }}
                    />
                  </div>

                  {/* Round info */}
                  <div className="mt-3 text-center">
                    <span
                      className="inline-block px-2.5 py-0.5 rounded-full mb-1"
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: roundColor,
                        background: `${roundColor}12`,
                      }}
                    >
                      {round.round_type || "Unknown"}
                    </span>
                    <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{dateStr}</div>
                    {round.lead_investor && round.lead_investor !== "Undisclosed" && (
                      <div className="mt-1 truncate" style={{ fontSize: 11, color: "var(--color-text-secondary)", maxWidth: 180 }}>
                        {round.lead_investor}
                      </div>
                    )}
                  </div>

                  {/* Connector line */}
                  {i < sorted.length - 1 && (
                    <div
                      className="absolute hidden"
                      style={{
                        height: 1,
                        background: "var(--color-border-subtle)",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scroll hint on mobile */}
        <div className="sm:hidden text-center mt-2">
          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Scroll to see all rounds →
          </span>
        </div>
      </div>
    </section>
  );
}
