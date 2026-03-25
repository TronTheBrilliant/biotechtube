"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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

const COUNTRY_FLAGS: Record<string, string> = {
  "United States": "\u{1f1fa}\u{1f1f8}", "United Kingdom": "\u{1f1ec}\u{1f1e7}", Switzerland: "\u{1f1e8}\u{1f1ed}", Japan: "\u{1f1ef}\u{1f1f5}",
  China: "\u{1f1e8}\u{1f1f3}", Denmark: "\u{1f1e9}\u{1f1f0}", India: "\u{1f1ee}\u{1f1f3}", France: "\u{1f1eb}\u{1f1f7}", "South Korea": "\u{1f1f0}\u{1f1f7}",
  Germany: "\u{1f1e9}\u{1f1ea}", Belgium: "\u{1f1e7}\u{1f1ea}", "South Africa": "\u{1f1ff}\u{1f1e6}", Netherlands: "\u{1f1f3}\u{1f1f1}",
  Australia: "\u{1f1e6}\u{1f1fa}", Ireland: "\u{1f1ee}\u{1f1ea}", Israel: "\u{1f1ee}\u{1f1f1}", Canada: "\u{1f1e8}\u{1f1e6}", Norway: "\u{1f1f3}\u{1f1f4}",
  Sweden: "\u{1f1f8}\u{1f1ea}", "Hong Kong": "\u{1f1ed}\u{1f1f0}", Singapore: "\u{1f1f8}\u{1f1ec}", Spain: "\u{1f1ea}\u{1f1f8}", Italy: "\u{1f1ee}\u{1f1f9}",
  Brazil: "\u{1f1e7}\u{1f1f7}", Austria: "\u{1f1e6}\u{1f1f9}", Finland: "\u{1f1eb}\u{1f1ee}", Taiwan: "\u{1f1f9}\u{1f1fc}", Hungary: "\u{1f1ed}\u{1f1fa}",
  "New Zealand": "\u{1f1f3}\u{1f1ff}", Poland: "\u{1f1f5}\u{1f1f1}", "Saudi Arabia": "\u{1f1f8}\u{1f1e6}", Mexico: "\u{1f1f2}\u{1f1fd}",
  Argentina: "\u{1f1e6}\u{1f1f7}", Thailand: "\u{1f1f9}\u{1f1ed}", Turkey: "\u{1f1f9}\u{1f1f7}", Greece: "\u{1f1ec}\u{1f1f7}", Portugal: "\u{1f1f5}\u{1f1f9}",
  Malaysia: "\u{1f1f2}\u{1f1fe}", Indonesia: "\u{1f1ee}\u{1f1e9}", Philippines: "\u{1f1f5}\u{1f1ed}", Chile: "\u{1f1e8}\u{1f1f1}", Colombia: "\u{1f1e8}\u{1f1f4}",
};

const DONUT_COLORS = [
  "#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444",
  "#10b981", "#ec4899", "#f97316", "#6366f1", "#14b8a6",
];

const AMOUNT_RANGES = [
  { label: "Any amount", min: 0, max: Infinity },
  { label: "$0 \u2013 $1M", min: 0, max: 1_000_000 },
  { label: "$1M \u2013 $10M", min: 1_000_000, max: 10_000_000 },
  { label: "$10M \u2013 $100M", min: 10_000_000, max: 100_000_000 },
  { label: "$100M \u2013 $500M", min: 100_000_000, max: 500_000_000 },
  { label: "$500M+", min: 500_000_000, max: Infinity },
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

/* ─── shared filter control style ─── */
const filterControlStyle: React.CSSProperties = {
  background: "var(--color-bg-secondary)",
  border: "1px solid var(--color-border-subtle)",
  color: "var(--color-text-primary)",
  borderRadius: 8,
  padding: "0 12px",
  height: 42,
  fontSize: 13,
  fontWeight: 500,
  outline: "none",
  cursor: "pointer",
};

const filterInputStyle: React.CSSProperties = {
  ...filterControlStyle,
  cursor: "text",
  width: 180,
};

export default function FundingPageClient({
  annualData,
  quarterlyData,
  monthlyData,
  rounds,
  stats,
  topInvestors,
  investorStats,
}: Props) {
  /* ─── Filter state ─── */
  const [roundFilter, setRoundFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All time");
  const [countryFilter, setCountryFilter] = useState("All");
  const [investorSearch, setInvestorSearch] = useState("");
  const [selectedInvestor, setSelectedInvestor] = useState<string | null>(null);
  const [amountRange, setAmountRange] = useState("Any amount");
  const [companySearch, setCompanySearch] = useState("");

  /* Investor autocomplete */
  const [investorInputFocused, setInvestorInputFocused] = useState(false);
  const investorInputRef = useRef<HTMLInputElement>(null);
  const investorDropdownRef = useRef<HTMLDivElement>(null);

  /* Investor table sort */
  const [investorSort, setInvestorSort] = useState<InvestorSortKey>("total_invested");
  const [investorSortDir, setInvestorSortDir] = useState<"asc" | "desc">("desc");
  const [investorCountryFilter, setInvestorCountryFilter] = useState("All");

  // Recalculate top investors by country (client-side from rounds data)
  const filteredTopInvestors = useMemo(() => {
    const relevantRounds = investorCountryFilter === "All"
      ? rounds
      : rounds.filter(r => r.country === investorCountryFilter);

    const investorMap = new Map<string, { total: number; deals: number; companies: Set<string> }>();
    for (const r of relevantRounds) {
      if (!r.lead_investor || r.lead_investor === "Undisclosed") continue;
      const existing = investorMap.get(r.lead_investor) || { total: 0, deals: 0, companies: new Set<string>() };
      existing.total += r.amount_usd || 0;
      existing.deals += 1;
      if (r.company_name) existing.companies.add(r.company_name);
      investorMap.set(r.lead_investor, existing);
    }

    return Array.from(investorMap.entries())
      .map(([name, data]) => ({
        name,
        total_invested: data.total,
        deal_count: data.deals,
        avg_deal_size: data.deals > 0 ? data.total / data.deals : 0,
        top_portfolio: Array.from(data.companies).slice(0, 3).join(", "),
      }))
      .sort((a, b) => b.total_invested - a.total_invested)
      .slice(0, 50);
  }, [rounds, investorCountryFilter]);

  /* ─── Derived data ─── */
  const roundTypes = useMemo(() => {
    const types = new Set(rounds.map((r) => r.round_type).filter(Boolean) as string[]);
    return ["All", ...Array.from(types).sort()];
  }, [rounds]);

  const countries = useMemo(() => {
    const c = new Set(rounds.map((r) => r.country).filter(Boolean) as string[]);
    return ["All", ...Array.from(c).sort()];
  }, [rounds]);

  /* All unique investor names for autocomplete */
  const allInvestorNames = useMemo(() => {
    const names = new Set<string>();
    rounds.forEach((r) => {
      if (r.lead_investor && r.lead_investor !== "Undisclosed") names.add(r.lead_investor);
    });
    return Array.from(names).sort();
  }, [rounds]);

  const investorSuggestions = useMemo(() => {
    if (!investorSearch.trim() || selectedInvestor) return [];
    const q = investorSearch.toLowerCase();
    return allInvestorNames.filter((n) => n.toLowerCase().includes(q)).slice(0, 8);
  }, [investorSearch, allInvestorNames, selectedInvestor]);

  /* Close investor dropdown on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        investorInputRef.current &&
        !investorInputRef.current.contains(e.target as Node) &&
        investorDropdownRef.current &&
        !investorDropdownRef.current.contains(e.target as Node)
      ) {
        setInvestorInputFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ─── Filtered rounds ─── */
  const filtered = useMemo(() => {
    const selectedRange = AMOUNT_RANGES.find((r) => r.label === amountRange) || AMOUNT_RANGES[0];
    const companyQ = companySearch.trim().toLowerCase();

    return rounds.filter((r) => {
      if (selectedInvestor && r.lead_investor !== selectedInvestor) return false;
      if (countryFilter !== "All" && r.country !== countryFilter) return false;
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
      if (amountRange !== "Any amount") {
        if (r.amount_usd < selectedRange.min || r.amount_usd >= selectedRange.max) return false;
      }
      if (companyQ && !r.company_name.toLowerCase().includes(companyQ)) return false;
      return true;
    });
  }, [rounds, roundFilter, dateFilter, countryFilter, selectedInvestor, amountRange, companySearch]);

  /* ─── Investor table ─── */
  const sortedInvestors = useMemo(() => {
    const source = filteredTopInvestors as { name: string; total_invested: number; deal_count: number; avg_deal_size: number; top_portfolio: string }[];
    const sorted = [...source].sort((a, b) => {
      const aVal = a[investorSort as keyof typeof a];
      const bVal = b[investorSort as keyof typeof b];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return investorSortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return investorSortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return sorted.slice(0, 30);
  }, [filteredTopInvestors, investorSort, investorSortDir]);

  const investorCountries = useMemo(() => {
    const c = new Set(rounds.map((r) => r.country).filter(Boolean) as string[]);
    return ["All", ...Array.from(c).sort()];
  }, [rounds]);

  const donutTop10 = useMemo(() => filteredTopInvestors.slice(0, 10), [filteredTopInvestors]);
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

  const sortArrow = (key: InvestorSortKey) => {
    if (investorSort !== key) return "";
    return investorSortDir === "asc" ? " \u25B2" : " \u25BC";
  };

  /* ─── Active filters ─── */
  const hasActiveFilters =
    roundFilter !== "All" ||
    dateFilter !== "All time" ||
    countryFilter !== "All" ||
    selectedInvestor !== null ||
    amountRange !== "Any amount" ||
    companySearch.trim() !== "";

  const clearAllFilters = useCallback(() => {
    setRoundFilter("All");
    setDateFilter("All time");
    setCountryFilter("All");
    setInvestorSearch("");
    setSelectedInvestor(null);
    setAmountRange("Any amount");
    setCompanySearch("");
  }, []);

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
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-10 uppercase tracking-[0.5px] font-medium"
                style={{ color: "var(--color-text-secondary)" }}
              >
                TOP 10 INVESTORS
              </h2>
              <select
                value={investorCountryFilter}
                onChange={(e) => setInvestorCountryFilter(e.target.value)}
                style={{
                  ...filterControlStyle,
                  height: 30,
                  padding: "2px 8px",
                  fontSize: 11,
                }}
              >
                {investorCountries.map((c) => {
                  const flag = c === "All" ? "🌍" : (COUNTRY_FLAGS[c] || "🏳️");
                  return (
                    <option key={c} value={c}>
                      {flag} {c === "All" ? "Global" : c}
                    </option>
                  );
                })}
              </select>
            </div>
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
            {/* Legend -- informational only, no click */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {donutTop10.map((inv, idx) => (
                <div
                  key={inv.investor_name}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
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

          {/* Most Active Investors Table -- informational only, no click-to-filter */}
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
                  }}
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
            {/* Funding Rounds section */}
            <div className="mb-4 mt-2">
              <h2 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                Funding Rounds
              </h2>
              <p className="text-13 mt-1" style={{ color: "var(--color-text-secondary)" }}>
                Browse all tracked biotech funding rounds — from seed to IPO.
              </p>
            </div>

            {/* ─── Sticky filter bar ─── */}
            <div
              className="sticky top-0 z-20 rounded-lg px-4 py-3 mb-3"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border-subtle)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                {/* Round type */}
                <select
                  value={roundFilter}
                  onChange={(e) => setRoundFilter(e.target.value)}
                  style={filterControlStyle}
                >
                  {roundTypes.map((t) => (
                    <option key={t} value={t}>
                      {t === "All" ? "All rounds" : t}
                    </option>
                  ))}
                </select>

                {/* Time period */}
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  style={filterControlStyle}
                >
                  {dateRanges.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                {/* Country */}
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  style={filterControlStyle}
                >
                  {countries.map((c) => {
                    const flag = c === "All" ? "\u{1f30d}" : (COUNTRY_FLAGS[c] || "\u{1f3f3}\u{fe0f}");
                    return (
                      <option key={c} value={c}>
                        {flag} {c === "All" ? "All countries" : c}
                      </option>
                    );
                  })}
                </select>

                {/* Investor search with autocomplete */}
                <div style={{ position: "relative" }}>
                  <input
                    ref={investorInputRef}
                    type="text"
                    placeholder="Search investor..."
                    value={selectedInvestor || investorSearch}
                    onChange={(e) => {
                      setSelectedInvestor(null);
                      setInvestorSearch(e.target.value);
                    }}
                    onFocus={() => setInvestorInputFocused(true)}
                    style={filterInputStyle}
                  />
                  {investorInputFocused && investorSuggestions.length > 0 && (
                    <div
                      ref={investorDropdownRef}
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: 4,
                        background: "var(--color-bg-secondary)",
                        border: "1px solid var(--color-border-subtle)",
                        borderRadius: 8,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                        zIndex: 30,
                        maxHeight: 240,
                        overflowY: "auto",
                      }}
                    >
                      {investorSuggestions.map((name) => (
                        <div
                          key={name}
                          style={{
                            padding: "8px 12px",
                            fontSize: 13,
                            color: "var(--color-text-primary)",
                            cursor: "pointer",
                            borderBottom: "0.5px solid var(--color-border-subtle)",
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedInvestor(name);
                            setInvestorSearch(name);
                            setInvestorInputFocused(false);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--color-bg-tertiary)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "";
                          }}
                        >
                          {name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Amount range */}
                <select
                  value={amountRange}
                  onChange={(e) => setAmountRange(e.target.value)}
                  style={filterControlStyle}
                >
                  {AMOUNT_RANGES.map((r) => (
                    <option key={r.label} value={r.label}>
                      {r.label}
                    </option>
                  ))}
                </select>

                {/* Company search */}
                <input
                  type="text"
                  placeholder="Search company..."
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  style={filterInputStyle}
                />

                {/* Results count */}
                <span
                  className="text-12 ml-auto"
                  style={{ color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}
                >
                  {filtered.length.toLocaleString()} results
                </span>
              </div>

              {/* ─── Active filter pills ─── */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3" style={{ borderTop: "0.5px solid var(--color-border-subtle)" }}>
                  {roundFilter !== "All" && (
                    <FilterPill label={roundFilter} onRemove={() => setRoundFilter("All")} />
                  )}
                  {dateFilter !== "All time" && (
                    <FilterPill label={dateFilter} onRemove={() => setDateFilter("All time")} />
                  )}
                  {countryFilter !== "All" && (
                    <FilterPill
                      label={`${COUNTRY_FLAGS[countryFilter] || ""} ${countryFilter}`}
                      onRemove={() => setCountryFilter("All")}
                    />
                  )}
                  {selectedInvestor && (
                    <FilterPill
                      label={selectedInvestor}
                      onRemove={() => {
                        setSelectedInvestor(null);
                        setInvestorSearch("");
                      }}
                    />
                  )}
                  {amountRange !== "Any amount" && (
                    <FilterPill label={amountRange} onRemove={() => setAmountRange("Any amount")} />
                  )}
                  {companySearch.trim() !== "" && (
                    <FilterPill label={`"${companySearch}"`} onRemove={() => setCompanySearch("")} />
                  )}
                  <button
                    onClick={clearAllFilters}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-accent)",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      padding: "4px 8px",
                    }}
                  >
                    Clear all
                  </button>
                </div>
              )}
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
                        style={{ color: "var(--color-text-secondary)" }}
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
              {filtered.length === 0 && (
                <div
                  className="px-4 py-8 text-center text-13"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  No funding rounds match your filters.
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

/* ─── FilterPill component ─── */
function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "var(--color-accent-muted, rgba(59,130,246,0.12))",
        color: "var(--color-accent, #3b82f6)",
        fontSize: 12,
        fontWeight: 500,
        borderRadius: 6,
        padding: "4px 10px",
        lineHeight: 1,
      }}
    >
      {label}
      <button
        onClick={onRemove}
        style={{
          background: "none",
          border: "none",
          color: "inherit",
          cursor: "pointer",
          padding: 0,
          fontSize: 14,
          lineHeight: 1,
          marginLeft: 2,
          opacity: 0.7,
        }}
        aria-label={`Remove ${label} filter`}
      >
        \u00d7
      </button>
    </span>
  );
}
