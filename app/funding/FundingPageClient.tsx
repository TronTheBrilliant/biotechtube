"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  TopInvestorRow,
  InvestorStats,
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

const DONUT_COLORS = [
  "#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444",
  "#10b981", "#ec4899", "#f97316", "#6366f1", "#14b8a6",
];

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

type InvestorSortKey = "total_invested" | "deal_count" | "avg_deal_size" | "investor_name";

interface Props {
  annualData: FundingAnnualRow[];
  quarterlyData: FundingQuarterlyRow[];
  monthlyData: FundingMonthlyRow[];
  rounds: FundingRoundRow[];
  stats: FundingStats;
  topInvestors: TopInvestorRow[];
  investorStats: InvestorStats;
}

export default function FundingPageClient({
  annualData,
  quarterlyData,
  monthlyData,
  rounds,
  stats,
  topInvestors,
  investorStats,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const investorFilter = searchParams.get("investor");

  const [roundFilter, setRoundFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All time");
  const [investorSort, setInvestorSort] = useState<InvestorSortKey>("total_invested");
  const [investorSortDir, setInvestorSortDir] = useState<"asc" | "desc">("desc");

  const roundTypes = useMemo(() => {
    const types = new Set(rounds.map((r) => r.round_type).filter(Boolean) as string[]);
    return ["All", ...Array.from(types).sort()];
  }, [rounds]);

  const filtered = useMemo(() => {
    return rounds.filter((r) => {
      // Investor URL filter
      if (investorFilter && r.lead_investor !== investorFilter) return false;

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
  }, [rounds, roundFilter, dateFilter, investorFilter]);

  const sortedInvestors = useMemo(() => {
    const sorted = [...topInvestors].sort((a, b) => {
      const aVal = a[investorSort];
      const bVal = b[investorSort];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return investorSortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return investorSortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return sorted.slice(0, 30);
  }, [topInvestors, investorSort, investorSortDir]);

  const donutTop10 = useMemo(() => topInvestors.slice(0, 10), [topInvestors]);
  const donutTotal = useMemo(() => donutTop10.reduce((s, i) => s + i.total_invested, 0), [donutTop10]);
  const donutGradient = useMemo(() => {
    let cumulative = 0;
    const stops: string[] = [];
    donutTop10.forEach((inv, idx) => {
      const pct = (inv.total_invested / donutTotal) * 100;
      stops.push(`${DONUT_COLORS[idx]} ${cumulative}% ${cumulative + pct}%`);
      cumulative += pct;
    });
    return `conic-gradient(${stops.join(", ")})`;
  }, [donutTop10, donutTotal]);

  const handleInvestorSort = useCallback((key: InvestorSortKey) => {
    if (investorSort === key) {
      setInvestorSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setInvestorSort(key);
      setInvestorSortDir("desc");
    }
  }, [investorSort]);

  const handleInvestorClick = useCallback((name: string) => {
    router.push(`/funding?investor=${encodeURIComponent(name)}`);
  }, [router]);

  const clearInvestorFilter = useCallback(() => {
    router.push("/funding");
  }, [router]);

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

  const sortArrow = (key: InvestorSortKey) => {
    if (investorSort !== key) return "";
    return investorSortDir === "asc" ? " \u25B2" : " \u25BC";
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

        {/* ════════════════════════════════════════════
            INVESTOR ANALYTICS SECTION
            ════════════════════════════════════════════ */}

        {/* Investor stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "TOP INVESTORS TRACKED", value: investorStats.uniqueInvestors.toLocaleString() },
            { label: "LARGEST INVESTOR", value: `${investorStats.largestInvestorName}`, sub: formatAmount(investorStats.largestInvestorTotal) },
            { label: "MOST ACTIVE", value: `${investorStats.mostActiveName}`, sub: `${investorStats.mostActiveDeals.toLocaleString()} deals` },
            { label: "AVG DEAL SIZE", value: formatAmount(investorStats.avgDealSizeAll) },
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
                className="text-[18px] font-medium leading-tight"
                style={{ color: "var(--color-accent)" }}
              >
                {stat.value}
              </div>
              {"sub" in stat && stat.sub && (
                <div className="text-11 mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                  {stat.sub}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Donut chart + Most Active Investors Table */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6">
          {/* Donut chart */}
          <div
            className="rounded-lg px-4 py-4 flex-shrink-0"
            style={{
              background: "var(--color-bg-secondary)",
              border: "0.5px solid var(--color-border-subtle)",
              width: "100%",
              maxWidth: 380,
            }}
          >
            <h2
              className="text-10 uppercase tracking-[0.5px] font-medium mb-4"
              style={{ color: "var(--color-text-secondary)" }}
            >
              TOP 10 INVESTORS BY CAPITAL DEPLOYED
            </h2>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: "50%",
                  background: donutGradient,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 110,
                    height: 110,
                    borderRadius: "50%",
                    background: "var(--color-bg-secondary)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div className="text-[18px] font-medium" style={{ color: "var(--color-accent)" }}>
                    {formatAmount(donutTotal)}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
                    Top 10 Total
                  </div>
                </div>
              </div>
            </div>
            {/* Legend */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {donutTop10.map((inv, idx) => (
                <div
                  key={inv.investor_name}
                  style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                  onClick={() => handleInvestorClick(inv.investor_name)}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: DONUT_COLORS[idx],
                      flexShrink: 0,
                    }}
                  />
                  <span className="text-11 flex-1 truncate" style={{ color: "var(--color-text-primary)" }}>
                    {inv.investor_name}
                  </span>
                  <span className="text-11 font-medium" style={{ color: "var(--color-text-secondary)" }}>
                    {formatAmount(inv.total_invested)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Most Active Investors Table */}
          <div
            className="rounded-lg overflow-hidden flex-1 min-w-0"
            style={{
              background: "var(--color-bg-secondary)",
              border: "0.5px solid var(--color-border-subtle)",
            }}
          >
            <div className="px-4 py-3" style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}>
              <h2
                className="text-10 uppercase tracking-[0.5px] font-medium"
                style={{ color: "var(--color-text-secondary)" }}
              >
                MOST ACTIVE BIOTECH INVESTORS
              </h2>
            </div>
            <style>{`
              .investor-row { grid-template-columns: 32px 2fr 1fr 0.7fr 0.8fr; }
              @media (min-width: 640px) { .investor-row { grid-template-columns: 32px 2fr 1fr 0.7fr 0.8fr 2.5fr; } }
            `}</style>
            {/* Table header */}
            <div
              className="investor-row grid px-4 py-2"
              style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}
            >
              <span className="text-10 uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>#</span>
              <span
                className="text-10 uppercase tracking-[0.5px] font-medium cursor-pointer select-none"
                style={{ color: "var(--color-text-tertiary)" }}
                onClick={() => handleInvestorSort("investor_name")}
              >
                Investor{sortArrow("investor_name")}
              </span>
              <span
                className="text-10 uppercase tracking-[0.5px] font-medium cursor-pointer select-none"
                style={{ color: "var(--color-text-tertiary)" }}
                onClick={() => handleInvestorSort("total_invested")}
              >
                Total{sortArrow("total_invested")}
              </span>
              <span
                className="text-10 uppercase tracking-[0.5px] font-medium cursor-pointer select-none"
                style={{ color: "var(--color-text-tertiary)" }}
                onClick={() => handleInvestorSort("deal_count")}
              >
                Deals{sortArrow("deal_count")}
              </span>
              <span
                className="text-10 uppercase tracking-[0.5px] font-medium cursor-pointer select-none"
                style={{ color: "var(--color-text-tertiary)" }}
                onClick={() => handleInvestorSort("avg_deal_size")}
              >
                Avg Size{sortArrow("avg_deal_size")}
              </span>
              <span className="text-10 uppercase tracking-[0.5px] font-medium hidden sm:block" style={{ color: "var(--color-text-tertiary)" }}>
                Top Portfolio
              </span>
            </div>
            {/* Table rows */}
            <div style={{ maxHeight: 500, overflowY: "auto" }}>
              {sortedInvestors.map((inv, i) => (
                <div
                  key={inv.investor_name}
                  className="investor-row grid px-4 py-2.5 transition-colors duration-100"
                  style={{
                    borderBottom: "0.5px solid var(--color-border-subtle)",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => handleInvestorClick(inv.investor_name)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--color-bg-tertiary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "";
                  }}
                >
                  <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>{i + 1}</span>
                  <span className="text-12 font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                    {inv.investor_name}
                  </span>
                  <span className="text-12 font-medium" style={{ color: "var(--color-accent)" }}>
                    {formatAmount(inv.total_invested)}
                  </span>
                  <span className="text-12" style={{ color: "var(--color-text-secondary)" }}>
                    {inv.deal_count}
                  </span>
                  <span className="text-12" style={{ color: "var(--color-text-secondary)" }}>
                    {formatAmount(inv.avg_deal_size)}
                  </span>
                  <span className="text-11 hidden sm:block truncate" style={{ color: "var(--color-text-tertiary)" }}>
                    {inv.top_companies}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Two-column layout: Funding rounds table */}
        <div className="flex gap-6" style={{ alignItems: "flex-start" }}>
          {/* Main column */}
          <div className="flex-1 min-w-0">
            {/* Investor filter banner */}
            {investorFilter && (
              <div
                className="rounded-lg px-4 py-3 mb-4 flex items-center justify-between"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "0.5px solid var(--color-border-medium)",
                }}
              >
                <span className="text-13" style={{ color: "var(--color-text-primary)" }}>
                  Showing deals by <strong>{investorFilter}</strong> ({filtered.length} rounds)
                </span>
                <button
                  onClick={clearInvestorFilter}
                  className="text-12 px-3 py-1 rounded"
                  style={{
                    background: "var(--color-bg-tertiary)",
                    color: "var(--color-text-secondary)",
                    border: "0.5px solid var(--color-border-medium)",
                    cursor: "pointer",
                  }}
                >
                  Clear filter
                </button>
              </div>
            )}

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

              {/* Table rows -- show first 100 */}
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
                      <span
                        className="text-12 hidden min-[480px]:block truncate"
                        style={{ color: "var(--color-text-secondary)", cursor: row.lead_investor ? "pointer" : "default" }}
                        onClick={(e) => {
                          if (row.lead_investor && row.lead_investor !== "Undisclosed") {
                            e.stopPropagation();
                            handleInvestorClick(row.lead_investor);
                          }
                        }}
                      >
                        {row.lead_investor || "Undisclosed"}
                      </span>
                      <span className="text-12 hidden min-[480px]:block" style={{ color: "var(--color-text-tertiary)" }}>
                        {row.announced_date ? formatDate(row.announced_date) : "N/A"}
                      </span>
                      <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>
                        {row.country || "\u2014"}
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
