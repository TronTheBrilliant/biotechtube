"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { ArrowUpRight, ArrowDownRight, Globe } from "lucide-react";
import { TvAreaChart } from "@/components/charts/TvAreaChart";
import { formatMarketCap, formatPercent, pctColor } from "@/lib/market-utils";

// ── Types ──

interface Props {
  countryName: string;
  flag: string;
  region: string;
  description: string;
  bioHubs: string[];
  history: {
    snapshot_date: string;
    combined_market_cap: number | null;
    total_volume: number | null;
  }[];
  latestSnapshot: {
    combined_market_cap: number;
    change_1d_pct: number | null;
    change_7d_pct: number | null;
    change_30d_pct: number | null;
    public_company_count: number | null;
  };
  topCompanies: {
    slug: string;
    name: string;
    ticker: string | null;
    valuation: number | null;
    logo_url: string | null;
    website: string | null;
    city: string | null;
    stage: string | null;
    company_type: string | null;
  }[];
  totalCompanyCount: number;
}

// ── Component ──

export default function CountryDetailClient({
  countryName,
  flag,
  region,
  description,
  bioHubs,
  history,
  latestSnapshot,
  topCompanies,
  totalCompanyCount,
}: Props) {
  type Timeframe = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "Max";
  const timeframes: Timeframe[] = ["1M", "3M", "6M", "1Y", "3Y", "5Y", "Max"];
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>("Max");

  // Company pagination
  const [companyPage, setCompanyPage] = useState(1);
  const COMPANIES_PER_PAGE = 20;
  const companyStart = (companyPage - 1) * COMPANIES_PER_PAGE;
  const companyEnd = companyStart + COMPANIES_PER_PAGE;
  const visibleCompanies = topCompanies.slice(companyStart, companyEnd);
  const totalCompanyPages = Math.ceil(topCompanies.length / COMPANIES_PER_PAGE);

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

  // Prepare chart data points (max 500)
  const chartPoints = useMemo(() => {
    const totalPoints = filteredHistory.length;
    const maxPoints = 500;
    const step =
      totalPoints > maxPoints ? Math.ceil(totalPoints / maxPoints) : 1;
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
        (points.length === 0 ||
          points[points.length - 1].time !== last.snapshot_date)
      ) {
        points.push({
          time: last.snapshot_date,
          value: last.combined_market_cap,
        });
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

  return (
    <div
      className="page-content"
      style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}
    >
      <Nav />

      <div className="max-w-[1200px] mx-auto px-4 md:px-6">
        {/* Hero */}
        <div className="pt-6 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={16} style={{ color: "var(--color-accent)" }} />
            <Link
              href="/countries"
              className="text-10 uppercase tracking-[0.5px] font-medium hover:underline"
              style={{ color: "var(--color-accent)" }}
            >
              COUNTRIES
            </Link>
          </div>
          <div className="flex items-center gap-3 mb-2">
            {flag && <span className="text-[48px] leading-none">{flag}</span>}
            <h1
              className="text-[32px] font-medium tracking-tight"
              style={{
                color: "var(--color-text-primary)",
                letterSpacing: "-0.5px",
              }}
            >
              {countryName}
            </h1>
          </div>
          {region && (
            <span
              className="inline-block text-11 font-medium px-2.5 py-1 rounded-full mb-3"
              style={{
                background: "var(--color-bg-secondary)",
                color: "var(--color-text-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
              }}
            >
              {region}
            </span>
          )}
          {description && (
            <p
              className="text-13 max-w-2xl"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {description}
            </p>
          )}
        </div>

        {/* Stats Cards */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-5"
          style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}
        >
          <div
            className="rounded-lg p-3.5"
            style={{
              background: "var(--color-bg-secondary)",
              border: "0.5px solid var(--color-border-subtle)",
            }}
          >
            <div
              className="text-10 uppercase tracking-[0.5px] font-medium mb-1"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Biotech Market Cap
            </div>
            <div
              className="text-[20px] font-medium tracking-tight"
              style={{
                color: "var(--color-text-primary)",
                letterSpacing: "-0.3px",
              }}
            >
              {formatMarketCap(latestSnapshot.combined_market_cap)}
            </div>
          </div>

          <div
            className="rounded-lg p-3.5"
            style={{
              background: "var(--color-bg-secondary)",
              border: "0.5px solid var(--color-border-subtle)",
            }}
          >
            <div
              className="text-10 uppercase tracking-[0.5px] font-medium mb-1"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Public Companies
            </div>
            <div
              className="text-[20px] font-medium tracking-tight"
              style={{
                color: "var(--color-text-primary)",
                letterSpacing: "-0.3px",
              }}
            >
              {(latestSnapshot.public_company_count ?? 0).toLocaleString()}
            </div>
          </div>

          <div
            className="rounded-lg p-3.5"
            style={{
              background: "var(--color-bg-secondary)",
              border: "0.5px solid var(--color-border-subtle)",
            }}
          >
            <div
              className="text-10 uppercase tracking-[0.5px] font-medium mb-1"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Total Companies
            </div>
            <div
              className="text-[20px] font-medium tracking-tight"
              style={{
                color: "var(--color-text-primary)",
                letterSpacing: "-0.3px",
              }}
            >
              {totalCompanyCount.toLocaleString()}
            </div>
          </div>

          <div
            className="rounded-lg p-3.5"
            style={{
              background: "var(--color-bg-secondary)",
              border: "0.5px solid var(--color-border-subtle)",
            }}
          >
            <div
              className="text-10 uppercase tracking-[0.5px] font-medium mb-1"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              30D Performance
            </div>
            <div
              className="text-[20px] font-medium tracking-tight"
              style={{
                color: pctColor(latestSnapshot.change_30d_pct ?? null),
                letterSpacing: "-0.3px",
              }}
            >
              {formatPercent(latestSnapshot.change_30d_pct ?? null)}
            </div>
          </div>
        </div>

        {/* Market Cap Index Chart */}
        {chartPoints.length > 0 && (
          <section className="py-5">
            <div className="flex items-center justify-between mb-2">
              <h2
                className="text-10 uppercase tracking-[0.5px] font-medium"
                style={{ color: "var(--color-text-secondary)" }}
              >
                BIOTECH MARKET CAP INDEX
              </h2>
              <div
                className="flex items-center gap-1 p-0.5 rounded-lg"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "0.5px solid var(--color-border-subtle)",
                }}
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
            <div
              className="rounded-lg overflow-hidden border"
              style={{
                background: "var(--color-bg-secondary)",
                borderColor: "var(--color-border-subtle)",
              }}
            >
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

        {/* Bio Hubs */}
        {bioHubs.length > 0 && (
          <section
            className="py-5 border-t"
            style={{ borderColor: "var(--color-border-subtle)" }}
          >
            <h2
              className="text-10 uppercase tracking-[0.5px] font-medium mb-3"
              style={{ color: "var(--color-text-secondary)" }}
            >
              BIOTECH HUBS
            </h2>
            <div className="flex flex-wrap gap-2">
              {bioHubs.map((hub) => (
                <span
                  key={hub}
                  className="inline-block text-12 font-medium px-3 py-1.5 rounded-full"
                  style={{
                    background: "var(--color-bg-secondary)",
                    color: "var(--color-text-primary)",
                    border: "0.5px solid var(--color-border-subtle)",
                  }}
                >
                  {hub}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Top Companies Table */}
        {topCompanies.length > 0 && (
          <section
            className="py-5 border-t"
            style={{ borderColor: "var(--color-border-subtle)" }}
          >
            <h2
              className="text-10 uppercase tracking-[0.5px] font-medium mb-3"
              style={{ color: "var(--color-text-secondary)" }}
            >
              COMPANIES
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
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr
                      style={{
                        borderBottom: "0.5px solid var(--color-border-subtle)",
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
                        className="text-right text-10 font-medium px-3 py-2"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        Valuation
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCompanies.map((c, i) => (
                      <tr
                        key={c.slug}
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
                          {companyStart + i + 1}
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
                              size={28}
                            />
                            <span
                              className="text-12 font-medium"
                              style={{ color: "var(--color-text-primary)" }}
                            >
                              {c.name}
                            </span>
                            {c.ticker && (
                              <span
                                className="text-11"
                                style={{ color: "var(--color-text-tertiary)" }}
                              >
                                {c.ticker}
                              </span>
                            )}
                          </Link>
                        </td>
                        <td
                          className="px-3 py-2 text-12 text-right"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {c.valuation
                            ? formatMarketCap(c.valuation)
                            : "\u2014"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalCompanyPages > 1 && (
                <div
                  className="flex items-center justify-between px-3 py-2.5"
                  style={{
                    borderTop: "0.5px solid var(--color-border-subtle)",
                  }}
                >
                  <span
                    className="text-11"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Showing {companyStart + 1}–{Math.min(companyEnd, topCompanies.length)} of{" "}
                    {topCompanies.length.toLocaleString()} companies
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCompanyPage((p) => Math.max(1, p - 1))}
                      disabled={companyPage === 1}
                      className="text-11 font-medium px-2.5 py-1 rounded-md transition-colors duration-100"
                      style={{
                        background: companyPage === 1 ? "transparent" : "var(--color-bg-primary)",
                        color: companyPage === 1 ? "var(--color-text-tertiary)" : "var(--color-text-secondary)",
                        border: "0.5px solid var(--color-border-subtle)",
                        cursor: companyPage === 1 ? "default" : "pointer",
                        opacity: companyPage === 1 ? 0.5 : 1,
                      }}
                    >
                      Previous
                    </button>
                    <span
                      className="text-11"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      Page {companyPage} of {totalCompanyPages}
                    </span>
                    <button
                      onClick={() => setCompanyPage((p) => Math.min(totalCompanyPages, p + 1))}
                      disabled={companyPage === totalCompanyPages}
                      className="text-11 font-medium px-2.5 py-1 rounded-md transition-colors duration-100"
                      style={{
                        background: companyPage === totalCompanyPages ? "transparent" : "var(--color-bg-primary)",
                        color: companyPage === totalCompanyPages ? "var(--color-text-tertiary)" : "var(--color-text-secondary)",
                        border: "0.5px solid var(--color-border-subtle)",
                        cursor: companyPage === totalCompanyPages ? "default" : "pointer",
                        opacity: companyPage === totalCompanyPages ? 0.5 : 1,
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Empty state */}
        {chartPoints.length === 0 && topCompanies.length === 0 && (
          <div className="py-12 text-center">
            <p
              className="text-13"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              No market data available for this country yet.
            </p>
          </div>
        )}

        {/* Back link */}
        <div
          className="py-5 border-t"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          <Link
            href="/countries"
            className="text-13 font-medium hover:underline"
            style={{ color: "var(--color-accent)" }}
          >
            &larr; Back to countries
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
