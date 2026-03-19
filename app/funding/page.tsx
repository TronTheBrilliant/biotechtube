"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { RecentlyFunded } from "@/components/RecentlyFunded";
import { PaywallCard } from "@/components/PaywallCard";
import { InvestmentChart } from "@/components/InvestmentChart";
import { Company, FundingRound } from "@/lib/types";
import fundingData from "@/data/funding.json";
import companiesData from "@/data/companies.json";
import { formatCurrency } from "@/lib/formatting";

interface FundingRow {
  companySlug: string;
  company: string;
  type: string;
  amount: number;
  currency: string;
  date: string;
  leadInvestor: string;
  country: string;
  flag: string;
}

const roundBadgeColors: Record<string, { bg: string; text: string }> = {
  Seed: { bg: "#f0fdf4", text: "#166534" },
  "Series A": { bg: "#eff6ff", text: "#1d4ed8" },
  "Series B": { bg: "#f5f3ff", text: "#5b21b6" },
  "Series C": { bg: "#fef3e2", text: "#b45309" },
  Grant: { bg: "#e8f5f0", text: "#0a3d2e" },
  Public: { bg: "#f7f7f6", text: "#6b6b65" },
  "Public Offering": { bg: "#f7f7f6", text: "#6b6b65" },
  "Follow-on": { bg: "#f7f7f6", text: "#6b6b65" },
};

const jsonRounds: FundingRow[] = fundingData.map((r) => {
  const company = companiesData.find((c) => c.slug === r.companySlug);
  return {
    companySlug: r.companySlug,
    company: company?.name || r.companySlug,
    type: r.type,
    amount: r.amount,
    currency: r.currency,
    date: r.date,
    leadInvestor: r.leadInvestor || "Undisclosed",
    country: company?.country || "Norway",
    flag: "\u{1F1F3}\u{1F1F4}",
  };
});

const extraRounds: FundingRow[] = [
  { companySlug: "biovica", company: "Biovica International", type: "Series C", amount: 22000000, currency: "USD", date: "2026-01-10", leadInvestor: "HealthCap", country: "Sweden", flag: "\u{1F1F8}\u{1F1EA}" },
  { companySlug: "immunovia", company: "Immunovia AB", type: "Series B", amount: 15000000, currency: "USD", date: "2025-12-15", leadInvestor: "Novo Seeds", country: "Sweden", flag: "\u{1F1F8}\u{1F1EA}" },
  { companySlug: "bavarian-nordic", company: "Bavarian Nordic", type: "Public Offering", amount: 45000000, currency: "USD", date: "2025-11-20", leadInvestor: "Public markets", country: "Denmark", flag: "\u{1F1E9}\u{1F1F0}" },
  { companySlug: "evotec", company: "Evotec SE", type: "Grant", amount: 5000000, currency: "EUR", date: "2025-11-05", leadInvestor: "EU Horizon", country: "Germany", flag: "\u{1F1E9}\u{1F1EA}" },
];

const allRounds: FundingRow[] = [...jsonRounds, ...extraRounds].sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
);

const roundTypes = ["All", "Seed", "Series A", "Series B", "Series C", "Grant", "Public"];
const countries = ["All", ...Array.from(new Set(allRounds.map((r) => r.country)))];
const dateRanges = ["All time", "Last 30 days", "Last 90 days", "Last 12 months"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function FundingPage() {
  const [roundFilter, setRoundFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All time");

  const filtered = useMemo(() => {
    return allRounds.filter((r) => {
      if (roundFilter !== "All") {
        if (roundFilter === "Public") {
          if (r.type !== "Public" && r.type !== "Public Offering") return false;
        } else if (r.type !== roundFilter) return false;
      }
      if (countryFilter !== "All" && r.country !== countryFilter) return false;
      if (dateFilter !== "All time") {
        const now = new Date();
        const d = new Date(r.date);
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        if (dateFilter === "Last 30 days" && diffDays > 30) return false;
        if (dateFilter === "Last 90 days" && diffDays > 90) return false;
        if (dateFilter === "Last 12 months" && diffDays > 365) return false;
      }
      return true;
    });
  }, [roundFilter, countryFilter, dateFilter]);

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
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
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
            Live investment data from public sources
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "TOTAL TRACKED YTD", value: "$340M" },
            { label: "LARGEST ROUND", value: "$18M (Oncoinvent)" },
            { label: "MOST ACTIVE CITY", value: "Oslo" },
            { label: "AVERAGE ROUND SIZE", value: "$12.5M" },
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

        {/* Investment chart */}
        <div
          className="rounded-lg px-4 py-2 mb-6"
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
          }}
        >
          <InvestmentChart />
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
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                style={selectStyle}
              >
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c === "All" ? "All countries" : c}
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

              {/* Table rows */}
              <div style={{ position: "relative" }}>
                {filtered.map((row, i) => {
                  const badge = roundBadgeColors[row.type] || roundBadgeColors.Seed;
                  const isBlurred = i >= 5;

                  return (
                    <div
                      key={`${row.companySlug}-${row.date}-${i}`}
                      className="funding-row grid px-4 py-3 transition-colors duration-100"
                      style={{
                        borderBottom: "0.5px solid var(--color-border-subtle)",
                        alignItems: "center",
                        filter: isBlurred ? "blur(5px)" : "none",
                        userSelect: isBlurred ? "none" : "auto",
                        cursor: isBlurred ? "default" : "pointer",
                      }}
                      onMouseEnter={(e) => {
                        if (!isBlurred) e.currentTarget.style.background = "var(--color-bg-tertiary)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isBlurred) e.currentTarget.style.background = "";
                      }}
                    >
                      <span className="text-12 font-medium" style={{ color: "var(--color-text-primary)" }}>
                        <Link
                          href={`/company/${row.companySlug}`}
                          style={{ color: "inherit", textDecoration: "none" }}
                          onClick={(e) => isBlurred && e.preventDefault()}
                        >
                          {row.company}
                        </Link>
                      </span>
                      <span>
                        <span
                          className="inline-block px-2 py-[2px] rounded text-[10px] font-medium"
                          style={{ background: badge.bg, color: badge.text }}
                        >
                          {row.type}
                        </span>
                      </span>
                      <span className="text-12 font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {formatCurrency(row.amount, row.currency)}
                      </span>
                      <span className="text-12 hidden min-[480px]:block" style={{ color: "var(--color-text-secondary)" }}>
                        {row.leadInvestor}
                      </span>
                      <span className="text-12 hidden min-[480px]:block" style={{ color: "var(--color-text-tertiary)" }}>
                        {formatDate(row.date)}
                      </span>
                      <span className="text-12">
                        {row.flag}
                      </span>
                    </div>
                  );
                })}

                {/* Paywall overlay */}
                {filtered.length > 5 && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: "180px",
                      background: "linear-gradient(transparent, var(--color-bg-secondary) 80%)",
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                      paddingBottom: 20,
                      pointerEvents: "auto",
                      zIndex: 2,
                    }}
                  >
                    <Link
                      href="/signup"
                      className="text-13 font-medium px-5 py-2.5 rounded-lg text-white"
                      style={{ background: "var(--color-accent)" }}
                    >
                      Sign up to see all funding rounds
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block" style={{ width: 260, flexShrink: 0 }}>
            <div
              className="rounded-lg overflow-hidden mb-4"
              style={{
                border: "0.5px solid var(--color-border-subtle)",
                background: "var(--color-bg-secondary)",
              }}
            >
              <RecentlyFunded funding={fundingData as FundingRound[]} companies={companiesData as Company[]} />
            </div>
            <PaywallCard />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
