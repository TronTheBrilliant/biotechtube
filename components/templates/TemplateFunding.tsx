"use client";
import { formatMarketCap } from "@/lib/market-utils";
import type { DbFundingRound } from "@/lib/template-types";

interface Props {
  rounds: DbFundingRound[];
}

export function TemplateFunding({ rounds }: Props) {
  if (rounds.length === 0) return null;

  const sorted = [...rounds]
    .filter((r) => r.announced_date)
    .sort((a, b) => (a.announced_date || "").localeCompare(b.announced_date || ""));

  const totalRaised = sorted.reduce((sum, r) => sum + (r.amount_usd || 0), 0);

  return (
    <section id="funding" className="py-20 sm:py-28" style={{ background: "var(--t-bg-secondary)" }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <SectionLabel>Funding</SectionLabel>
        <h2 className="mt-3" style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 300, color: "var(--t-text)", letterSpacing: "-0.01em" }}>
          Funding History
        </h2>
        {totalRaised > 0 && (
          <p className="mt-4" style={{ fontSize: 16, color: "var(--t-text-secondary)" }}>
            {formatMarketCap(totalRaised)} raised across {sorted.length} round{sorted.length !== 1 ? "s" : ""}.
          </p>
        )}

        {/* Timeline */}
        <div className="mt-12 relative">
          {/* Vertical line */}
          <div
            className="absolute left-6 top-0 bottom-0 w-px hidden sm:block"
            style={{ background: "var(--t-border-medium)" }}
          />

          <div className="flex flex-col gap-6">
            {sorted.map((round) => {
              const date = round.announced_date ? new Date(round.announced_date) : null;
              const dateStr = date
                ? date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
                : "Unknown";

              return (
                <div key={round.id} className="flex items-start gap-6 sm:pl-0">
                  {/* Dot */}
                  <div className="hidden sm:flex shrink-0 w-12 justify-center relative z-10">
                    <div
                      className="w-3 h-3 rounded-full mt-1.5"
                      style={{
                        background: "var(--t-brand)",
                        boxShadow: `0 0 0 4px var(--t-bg-secondary)`,
                      }}
                    />
                  </div>

                  {/* Card */}
                  <div
                    className="flex-1 rounded-xl p-5 transition-all"
                    style={{
                      background: "var(--t-bg)",
                      border: "0.5px solid var(--t-border)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-full mb-2"
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            background: "var(--t-brand-subtle)",
                            color: "var(--t-brand)",
                          }}
                        >
                          {round.round_type || "Unknown"}
                        </span>
                        <div style={{ fontSize: 13, color: "var(--t-text-tertiary)" }}>
                          {dateStr}
                        </div>
                      </div>
                      <div className="text-right">
                        <div style={{ fontSize: 20, fontWeight: 400, color: "var(--t-text)" }}>
                          {round.amount_usd ? formatMarketCap(round.amount_usd) : "Undisclosed"}
                        </div>
                        {round.lead_investor && (
                          <div style={{ fontSize: 12, color: "var(--t-text-tertiary)", marginTop: 2 }}>
                            Led by {round.lead_investor}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 500, color: "var(--t-brand)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
      {children}
    </div>
  );
}
