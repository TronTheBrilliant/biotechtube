"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PaywallCard } from "@/components/PaywallCard";
import { FundingInteractiveChart } from "@/components/charts/FundingInteractiveChart";
import fundingHistorical from "@/data/funding-historical.json";

interface HistoricalRound {
  company: string;
  companySlug: string;
  type: string;
  amount: number;
  currency: string;
  date: string;
  leadInvestor: string;
  quarter: string;
}

const roundBadgeColors: Record<string, { bg: string; text: string }> = {
  Seed: { bg: "#f0fdf4", text: "#166534" },
  "Series A": { bg: "#eff6ff", text: "#1d4ed8" },
  "Series B": { bg: "#f5f3ff", text: "#5b21b6" },
  "Series C": { bg: "#fef3e2", text: "#b45309" },
  "Series D": { bg: "#fef3e2", text: "#92400e" },
  Grant: { bg: "#e8f5f0", text: "#0a3d2e" },
  Public: { bg: "#f7f7f6", text: "#6b6b65" },
  "Public Offering": { bg: "#f7f7f6", text: "#6b6b65" },
  "Follow-on": { bg: "#f7f7f6", text: "#6b6b65" },
  IPO: { bg: "#fef9c3", text: "#854d0e" },
  Mega: { bg: "#fce7f3", text: "#9d174d" },
};

const allRounds = (fundingHistorical as HistoricalRound[]).sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
);

const totalRaisedM = allRounds.reduce((sum, r) => sum + r.amount, 0);
const largestRound = allRounds.reduce((max, r) => (r.amount > max.amount ? r : max), allRounds[0]);
const uniqueCompanies = new Set(allRounds.map((r) => r.companySlug)).size;

const roundTypes = ["All", ...Array.from(new Set(allRounds.map((r) => r.type)))];
const dateRanges = ["All time", "Last 30 days", "Last 90 days", "Last 12 months"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function FundingPage() {
  const [roundFilter, setRoundFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All time");

  const filtered = useMemo(() => {
    return allRounds.filter((r) => {
      if (roundFilter !== "All") {
        if (roundFilter === "Public") {
          if (r.type !== "Public" && r.type !== "Public Offering") return false;
        } else if (r.type !== roundFilter) return false;
      }
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
  }, [roundFilter, dateFilter]);

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
            {allRounds.length} funding rounds tracked across {uniqueCompanies} companies
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "TOTAL TRACKED", value: `$${(totalRaisedM / 1000).toFixed(1)}B` },
            { label: "LARGEST ROUND", value: `$${largestRound.amount}M (${largestRound.company})` },
            { label: "TOTAL ROUNDS", value: `${allRounds.length}` },
            { label: "COMPANIES", value: `${uniqueCompanies}` },
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

        {/* Interactive funding chart — all timeframes */}
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
          <FundingInteractiveChart height={350} />
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
                {filtered.length} results
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
                <span className="text-10 uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>Quarter</span>
              </div>

              {/* Table rows */}
              <div>
                {filtered.map((row, i) => {
                  const badge = roundBadgeColors[row.type] || roundBadgeColors.Seed;

                  return (
                    <div
                      key={`${row.companySlug}-${row.date}-${i}`}
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
                        <Link
                          href={`/company/${row.companySlug}`}
                          style={{ color: "inherit", textDecoration: "none" }}
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
                        ${row.amount}M
                      </span>
                      <span className="text-12 hidden min-[480px]:block" style={{ color: "var(--color-text-secondary)" }}>
                        {row.leadInvestor}
                      </span>
                      <span className="text-12 hidden min-[480px]:block" style={{ color: "var(--color-text-tertiary)" }}>
                        {formatDate(row.date)}
                      </span>
                      <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>
                        {row.quarter}
                      </span>
                    </div>
                  );
                })}
              </div>
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
