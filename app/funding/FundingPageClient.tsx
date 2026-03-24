"use client";

import { useState, useMemo } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PaywallCard } from "@/components/PaywallCard";
import { FundingInteractiveChart } from "@/components/charts/FundingInteractiveChart";
import type {
  FundingAnnualRow,
  FundingQuarterlyRow,
  FundingMonthlyRow,
  FundingRoundRow,
  FundingStats,
} from "@/lib/funding-queries";

const roundBadgeColors: Record<string, { bg: string; text: string }> = {
  Seed: { bg: "#f0fdf4", text: "#166534" },
  "Series A": { bg: "#eff6ff", text: "#1d4ed8" },
  "Series B": { bg: "#f5f3ff", text: "#5b21b6" },
  "Series C": { bg: "#fef3e2", text: "#b45309" },
  "Series D": { bg: "#fef3e2", text: "#92400e" },
  Grant: { bg: "#e8f5f0", text: "#0a3d2e" },
  Public: { bg: "var(--color-bg-secondary)", text: "var(--color-text-secondary)" },
  "Public Offering": { bg: "var(--color-bg-secondary)", text: "var(--color-text-secondary)" },
  "Follow-on": { bg: "var(--color-bg-secondary)", text: "var(--color-text-secondary)" },
  IPO: { bg: "#fef9c3", text: "#854d0e" },
  PIPE: { bg: "#fce7f3", text: "#9d174d" },
  Mega: { bg: "#fce7f3", text: "#9d174d" },
};

const dateRanges = ["All time", "Last 30 days", "Last 90 days", "Last 12 months"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatAmount(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(0)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd}`;
}

interface Props {
  annualData: FundingAnnualRow[];
  quarterlyData: FundingQuarterlyRow[];
  monthlyData: FundingMonthlyRow[];
  rounds: FundingRoundRow[];
  stats: FundingStats;
}

export default function FundingPageClient({
  annualData,
  quarterlyData,
  monthlyData,
  rounds,
  stats,
}: Props) {
  const [roundFilter, setRoundFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All time");

  const roundTypes = useMemo(() => {
    const types = new Set(rounds.map((r) => r.round_type).filter(Boolean) as string[]);
    return ["All", ...Array.from(types).sort()];
  }, [rounds]);

  const filtered = useMemo(() => {
    return rounds.filter((r) => {
      if (roundFilter !== "All") {
        if (roundFilter === "Public") {
          if (r.round_type !== "Public" && r.round_type !== "Public Offering") return false;
        } else if (r.round_type !== roundFilter) return false;
      }
      if (dateFilter !== "All time" && r.announced_date) {
        const now = new Date();
        const d = new Date(r.announced_date);
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        if (dateFilter === "Last 30 days" && diffDays > 30) return false;
        if (dateFilter === "Last 90 days" && diffDays > 90) return false;
        if (dateFilter === "Last 12 months" && diffDays > 365) return false;
      }
      return true;
    });
  }, [rounds, roundFilter, dateFilter]);

  const selectStyle: React.CSSProperties = {
    background: "var(--color-bg-secondary)",
    border: "0.5px solid var(--color-border-medium)",
    color: "var(--color-text-primary)",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 12,
    outline: "none",
    cursor: "pointer",
  };

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-[32px] font-medium mb-1 tracking-tight"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
          >
            Biotech Funding Tracker
          </h1>
          <p className="text-13" style={{ color: "var(--color-text-secondary)" }}>
            {stats.totalRounds.toLocaleString()} funding rounds tracked across{" "}
            {stats.totalCompanies.toLocaleString()} companies since 1990
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "TOTAL TRACKED", value: formatAmount(stats.totalTracked) },
            {
              label: "LARGEST ROUND",
              value: `${formatAmount(stats.largestRound)} (${stats.largestRoundCompany})`,
            },
            { label: "TOTAL ROUNDS", value: stats.totalRounds.toLocaleString() },
            { label: "COMPANIES", value: stats.totalCompanies.toLocaleString() },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg px-4 py-3"
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
              }}
            >
              <div
                className="text-10 uppercase tracking-[0.5px] font-medium mb-1"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {stat.label}
              </div>
              <div
                className="text-[20px] font-medium"
                style={{ color: "var(--color-accent)" }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Interactive funding chart */}
        <div
          className="rounded-lg px-4 py-4 mb-6"
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
          }}
        >
          <h2
            className="text-10 uppercase tracking-[0.5px] font-medium mb-3"
            style={{ color: "var(--color-text-secondary)" }}
          >
            BIOTECH VC FUNDING
          </h2>
          <FundingInteractiveChart
            annualData={annualData}
            quarterlyData={quarterlyData}
            monthlyData={monthlyData}
            height={350}
          />
          <p
            className="text-[10px] mt-2 text-right"
            style={{ color: "var(--color-text-tertiary)", opacity: 0.7 }}
          >
            Data coverage improves for recent years. Pre-2010 data reflects major rounds only.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6" style={{ alignItems: "flex-start" }}>
          {/* Main column */}
          <div className="flex-1 min-w-0">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <select
                value={roundFilter}
                onChange={(e) => setRoundFilter(e.target.value)}
                style={selectStyle}
              >
                {roundTypes.map((t) => (
                  <option key={t} value={t}>
                    {t === "All" ? "All rounds" : t}
                  </option>
                ))}
              </select>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={selectStyle}
              >
                {dateRanges.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <span
                className="text-12"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {filtered.length.toLocaleString()} results
              </span>
            </div>

            {/* Funding table */}
            <div
              className="rounded-lg overflow-hidden"
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
              }}
            >
              {/* Table header */}
              <style>{`
                .funding-row { grid-template-columns: 2fr 1fr 1fr 0.8fr; }
                @media (min-width: 480px) { .funding-row { grid-template-columns: 2fr 1fr 1fr 1.5fr 1fr 0.8fr; } }
              `}</style>
              <div
                className="funding-row grid px-4 py-2.5"
                style={{
                  borderBottom: "0.5px solid var(--color-border-subtle)",
                }}
              >
                <span className="text-10 uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>Company</span>
                <span className="text-10 uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>Round</span>
                <span className="text-10 uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>Amount</span>
                <span className="text-10 uppercase tracking-[0.5px] font-medium hidden min-[480px]:block" style={{ color: "var(--color-text-tertiary)" }}>Lead Investor</span>
                <span className="text-10 uppercase tracking-[0.5px] font-medium hidden min-[480px]:block" style={{ color: "var(--color-text-tertiary)" }}>Date</span>
                <span className="text-10 uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>Country</span>
              </div>

              {/* Table rows — show first 100 */}
              <div>
                {filtered.slice(0, 100).map((row, i) => {
                  const badge = roundBadgeColors[row.round_type || ""] || { bg: "var(--color-bg-secondary)", text: "var(--color-text-secondary)" };

                  return (
                    <div
                      key={`${row.company_name}-${row.announced_date}-${i}`}
                      className="funding-row grid px-4 py-3 transition-colors duration-100"
                      style={{
                        borderBottom: "0.5px solid var(--color-border-subtle)",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--color-bg-tertiary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "";
                      }}
                    >
                      <span className="text-12 font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {row.company_name}
                      </span>
                      <span>
                        <span
                          className="inline-block px-2 py-[2px] rounded text-[10px] font-medium"
                          style={{ background: badge.bg, color: badge.text }}
                        >
                          {row.round_type || "Unknown"}
                        </span>
                      </span>
                      <span className="text-12 font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {formatAmount(row.amount_usd)}
                      </span>
                      <span className="text-12 hidden min-[480px]:block" style={{ color: "var(--color-text-secondary)" }}>
                        {row.lead_investor || "Undisclosed"}
                      </span>
                      <span className="text-12 hidden min-[480px]:block" style={{ color: "var(--color-text-tertiary)" }}>
                        {row.announced_date ? formatDate(row.announced_date) : "N/A"}
                      </span>
                      <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>
                        {row.country || "—"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {filtered.length > 100 && (
                <div
                  className="px-4 py-3 text-center text-12"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  Showing 100 of {filtered.length.toLocaleString()} rounds
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block" style={{ width: 260, flexShrink: 0 }}>
            <PaywallCard />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
