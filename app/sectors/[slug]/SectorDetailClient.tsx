"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PaywallCard } from "@/components/PaywallCard";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { TvAreaChart } from "@/components/charts/TvAreaChart";
import { formatMarketCap, formatPercent, pctColor, capPercent } from "@/lib/market-utils";
import { getSectorEmoji, SECTOR_DESCRIPTIONS } from "@/lib/sector-emojis";

// ── Types ──

interface SectorInfo {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  description: string | null;
  company_count: number | null;
  public_company_count: number | null;
}

interface SectorHistoryPoint {
  snapshot_date: string;
  combined_market_cap: number | null;
  total_volume: number | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
}

interface LatestSnapshot {
  snapshot_date: string;
  combined_market_cap: number | null;
  total_volume: number | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
  company_count: number | null;
  public_company_count: number | null;
}

interface TopCompany {
  id: string;
  slug: string;
  name: string;
  ticker: string | null;
  country: string | null;
  valuation: number | null;
  logo_url: string | null;
  website: string | null;
}

interface Props {
  sector: SectorInfo;
  history: SectorHistoryPoint[];
  latestSnapshot: LatestSnapshot | null;
  topCompanies: TopCompany[];
}

// ── Component ──

export default function SectorDetailClient({
  sector,
  history,
  latestSnapshot,
  topCompanies,
}: Props) {
  type Timeframe = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "Max";
  const timeframes: Timeframe[] = ["1M", "3M", "6M", "1Y", "3Y", "5Y", "Max"];
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>("Max");

  // Filter history based on selected timeframe
  const filteredHistory = useMemo(() => {
    if (selectedTimeframe === "Max") return history;
    const now = new Date();
    const cutoff = new Date();
    switch (selectedTimeframe) {
      case "1M":
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case "3M":
        cutoff.setMonth(now.getMonth() - 3);
        break;
      case "6M":
        cutoff.setMonth(now.getMonth() - 6);
        break;
      case "1Y":
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
      case "3Y":
        cutoff.setFullYear(now.getFullYear() - 3);
        break;
      case "5Y":
        cutoff.setFullYear(now.getFullYear() - 5);
        break;
    }
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return history.filter((h) => h.snapshot_date >= cutoffStr);
  }, [history, selectedTimeframe]);

  // Prepare chart data points
  const chartPoints = useMemo(() => {
    const totalPoints = filteredHistory.length;
    const maxPoints = 500;
    const step = totalPoints > maxPoints ? Math.ceil(totalPoints / maxPoints) : 1;
    const points: { time: string; value: number }[] = [];
    for (let i = 0; i < totalPoints; i += step) {
      const row = filteredHistory[i];
      if (row.combined_market_cap != null) {
        points.push({ time: row.snapshot_date, value: row.combined_market_cap });
      }
    }
    if (totalPoints > 0) {
      const last = filteredHistory[totalPoints - 1];
      if (
        last.combined_market_cap != null &&
        (points.length === 0 || points[points.length - 1].time !== last.snapshot_date)
      ) {
        points.push({ time: last.snapshot_date, value: last.combined_market_cap });
      }
    }
    return points;
  }, [filteredHistory]);

  const currentMarketCap =
    chartPoints.length > 0 ? chartPoints[chartPoints.length - 1].value : 0;
  const startMarketCap = chartPoints.length > 0 ? chartPoints[0].value : 0;
  const periodChange = currentMarketCap - startMarketCap;
  const periodChangePct =
    startMarketCap > 0 ? (periodChange / startMarketCap) * 100 : 0;
  const isPositive = periodChange >= 0;

  // Stats for the hero strip
  const stats = [
    {
      label: "Market Cap",
      value: latestSnapshot
        ? formatMarketCap(latestSnapshot.combined_market_cap ?? 0)
        : "—",
    },
    {
      label: "1D",
      value: formatPercent(capPercent(latestSnapshot?.change_1d_pct ?? null, "1d")),
      color: pctColor(capPercent(latestSnapshot?.change_1d_pct ?? null, "1d")),
    },
    {
      label: "Companies",
      value: (sector.company_count ?? 0).toLocaleString(),
    },
    {
      label: "Public Cos",
      value: (sector.public_company_count ?? 0).toLocaleString(),
    },
  ];

  return (
    <div
      className="page-content"
      style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}
    >
      <Nav />

      {/* Hero */}
      <div
        className="px-5 pt-6 pb-4"
        style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}
      >
        <div className="mb-3">
          <Breadcrumbs items={[
            { label: "Home", href: "/" },
            { label: "Sectors", href: "/sectors" },
            { label: sector.name },
          ]} />
        </div>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 size={16} style={{ color: "var(--color-accent)" }} />
          <Link
            href="/sectors"
            className="text-10 uppercase tracking-[0.5px] font-medium hover:underline"
            style={{ color: "var(--color-accent)" }}
          >
            SECTORS
          </Link>
        </div>
        <h1
          className="text-[32px] font-medium tracking-tight mb-1"
          style={{
            color: "var(--color-text-primary)",
            letterSpacing: "-0.5px",
          }}
        >
          <span className="mr-2">{getSectorEmoji(sector.name)}</span>
          {sector.name}
        </h1>
        {(sector.description || SECTOR_DESCRIPTIONS[sector.slug]) && (
          <p
            className="text-14 mt-2 max-w-[600px]"
            style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}
          >
            {sector.description || SECTOR_DESCRIPTIONS[sector.slug] || ""}
          </p>
        )}
      </div>

      {/* Stats Strip */}
      <div
        className="flex items-center gap-4 px-5 py-3 overflow-x-auto"
        style={{
          borderBottom: "0.5px solid var(--color-border-subtle)",
          scrollbarWidth: "none",
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
          >
            <span
              className="text-11"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {s.label}
            </span>
            <span
              className="text-11 font-medium"
              style={{
                color: s.color ?? "var(--color-text-primary)",
              }}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div
        className="flex flex-col lg:grid"
        style={{ gridTemplateColumns: "1fr 260px" }}
      >
        <div
          className="px-5 py-4 min-w-0 lg:border-r"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          {/* Market Cap Chart */}
          {chartPoints.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2
                  className="text-10 uppercase tracking-[0.5px] font-medium"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  SECTOR MARKET CAP
                </h2>
                <div
                  className="flex items-center gap-1 p-0.5 rounded-lg"
                  style={{ background: "var(--color-bg-secondary)", border: "0.5px solid var(--color-border-subtle)" }}
                >
                  {timeframes.map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setSelectedTimeframe(tf)}
                      className="text-10 font-medium px-2 py-1 rounded-md transition-colors duration-100"
                      style={{
                        background:
                          selectedTimeframe === tf
                            ? "var(--color-accent)"
                            : "transparent",
                        color:
                          selectedTimeframe === tf
                            ? "white"
                            : "var(--color-text-secondary)",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span
                  className="text-[26px] font-medium tracking-tight"
                  style={{
                    color: "var(--color-text-primary)",
                    letterSpacing: "-0.5px",
                  }}
                >
                  {formatMarketCap(currentMarketCap)}
                </span>
                <span
                  className="flex items-center gap-0.5 text-13 font-medium"
                  style={{
                    color: isPositive ? "var(--color-accent)" : "#c0392b",
                  }}
                >
                  {isPositive ? (
                    <ArrowUpRight size={16} />
                  ) : (
                    <ArrowDownRight size={16} />
                  )}
                  {isPositive ? "+" : ""}
                  {periodChangePct.toFixed(1)}%
                </span>
                <span
                  className="text-11"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  {selectedTimeframe === "Max" ? "ALL" : selectedTimeframe}
                </span>
              </div>
              <div className="rounded-lg overflow-hidden border" style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border-subtle)" }}>
                <TvAreaChart
                  data={chartPoints}
                  height={380}
                  isPositive={isPositive}
                  formatValue={(v) => formatMarketCap(v)}
                  tooltipTitle="Market Cap"
                />
              </div>
            </section>
          )}

          {/* Top Companies */}
          {topCompanies.length > 0 && (
            <section
              className="mb-6 border-t pt-4"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              <h2
                className="text-10 uppercase tracking-[0.5px] font-medium mb-3"
                style={{ color: "var(--color-text-secondary)" }}
              >
                TOP COMPANIES
              </h2>
              <div
                className="rounded-lg border overflow-hidden"
                style={{
                  background: "var(--color-bg-secondary)",
                  borderColor: "var(--color-border-subtle)",
                }}
              >
                <div
                  className="overflow-x-auto"
                  style={{ scrollbarWidth: "none" }}
                >
                  <table className="w-full min-w-[550px]">
                    <thead>
                      <tr
                        style={{
                          borderBottom:
                            "0.5px solid var(--color-border-subtle)",
                        }}
                      >
                        <th
                          className="text-left text-10 font-medium px-3 py-2 w-10"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          #
                        </th>
                        <th
                          className="text-left text-10 font-medium px-3 py-2"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          Company
                        </th>
                        <th
                          className="text-left text-10 font-medium px-3 py-2"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          Country
                        </th>
                        <th
                          className="text-right text-10 font-medium px-3 py-2"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          Valuation
                        </th>
                        <th
                          className="text-left text-10 font-medium px-3 py-2"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          Ticker
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCompanies.map((c, i) => (
                        <tr
                          key={c.id}
                          className="transition-colors duration-100"
                          style={{
                            borderBottom:
                              "0.5px solid var(--color-border-subtle)",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "var(--color-bg-primary)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <td
                            className="px-3 py-2 text-12"
                            style={{ color: "var(--color-text-tertiary)" }}
                          >
                            {i + 1}
                          </td>
                          <td className="px-3 py-2">
                            <Link
                              href={`/company/${c.slug}`}
                              className="flex items-center gap-2 hover:underline"
                            >
                              <CompanyAvatar
                                name={c.name}
                                logoUrl={c.logo_url ?? undefined}
                                website={c.website ?? undefined}
                                size={24}
                              />
                              <span
                                className="text-12 font-medium"
                                style={{ color: "var(--color-text-primary)" }}
                              >
                                {c.name}
                              </span>
                            </Link>
                          </td>
                          <td
                            className="px-3 py-2 text-12"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            {c.country ?? "—"}
                          </td>
                          <td
                            className="px-3 py-2 text-12 text-right"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            {c.valuation
                              ? formatMarketCap(c.valuation)
                              : "—"}
                          </td>
                          <td
                            className="px-3 py-2 text-12"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            {c.ticker ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* Empty state if no data */}
          {chartPoints.length === 0 && topCompanies.length === 0 && (
            <div className="py-12 text-center">
              <p
                className="text-13"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                No market data available for this sector yet.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[260px] border-t lg:border-t-0">
          <div className="p-3.5">
            <PaywallCard />
          </div>
        </div>
      </div>

      {/* Internal links */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/sectors"
            className="text-[12px] font-medium px-4 py-2 rounded-lg border transition-colors hover:border-[var(--color-accent)]"
            style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)" }}
          >
            View all biotech sectors &rarr;
          </Link>
          <Link
            href="/top-companies"
            className="text-[12px] font-medium px-4 py-2 rounded-lg border transition-colors hover:border-[var(--color-accent)]"
            style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)" }}
          >
            Top biotech companies &rarr;
          </Link>
          <Link
            href="/markets"
            className="text-[12px] font-medium px-4 py-2 rounded-lg border transition-colors hover:border-[var(--color-accent)]"
            style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)" }}
          >
            Market overview &rarr;
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
