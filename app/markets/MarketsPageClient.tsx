"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PaywallCard } from "@/components/PaywallCard";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Globe,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { TvAreaChart } from "@/components/charts/TvAreaChart";
import {
  formatMarketCap,
  formatVolume,
  formatPercent,
  pctColor,
} from "@/lib/market-utils";

// ── Types ──

interface MarketSnapshot {
  snapshot_date: string;
  total_market_cap: number | null;
  public_companies_count: number | null;
  total_volume: number | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
  change_ytd_pct: number | null;
  top_gainer_id: string | null;
  top_gainer_pct: number | null;
  top_loser_id: string | null;
  top_loser_pct: number | null;
}

interface SectorData {
  id: string;
  name: string;
  slug: string;
  short_name: string | null;
  combined_market_cap: number | null;
  total_volume: number | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
  company_count: number | null;
  public_company_count: number | null;
}

interface CountryData {
  country: string;
  combined_market_cap: number | null;
  total_volume: number | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
  public_company_count: number | null;
}

interface Props {
  latestSnapshot: MarketSnapshot | null;
  history: MarketSnapshot[];
  sectors: SectorData[];
  countries: CountryData[];
}

// ── Constants ──

const timescales = ["1Y", "3Y", "5Y", "10Y", "Max"] as const;
type Timescale = (typeof timescales)[number];

const timescaleDays: Record<Timescale, number> = {
  "1Y": 365,
  "3Y": 1095,
  "5Y": 1825,
  "10Y": 3650,
  Max: 20000,
};

const COUNTRY_FLAGS: Record<string, string> = {
  "United States": "\u{1F1FA}\u{1F1F8}",
  Canada: "\u{1F1E8}\u{1F1E6}",
  "United Kingdom": "\u{1F1EC}\u{1F1E7}",
  Germany: "\u{1F1E9}\u{1F1EA}",
  France: "\u{1F1EB}\u{1F1F7}",
  Switzerland: "\u{1F1E8}\u{1F1ED}",
  Norway: "\u{1F1F3}\u{1F1F4}",
  Sweden: "\u{1F1F8}\u{1F1EA}",
  Denmark: "\u{1F1E9}\u{1F1F0}",
  Finland: "\u{1F1EB}\u{1F1EE}",
  Israel: "\u{1F1EE}\u{1F1F1}",
  Australia: "\u{1F1E6}\u{1F1FA}",
  Japan: "\u{1F1EF}\u{1F1F5}",
  China: "\u{1F1E8}\u{1F1F3}",
  "South Korea": "\u{1F1F0}\u{1F1F7}",
  India: "\u{1F1EE}\u{1F1F3}",
  Belgium: "\u{1F1E7}\u{1F1EA}",
  Netherlands: "\u{1F1F3}\u{1F1F1}",
  Italy: "\u{1F1EE}\u{1F1F9}",
  Spain: "\u{1F1EA}\u{1F1F8}",
  Singapore: "\u{1F1F8}\u{1F1EC}",
  "Hong Kong": "\u{1F1ED}\u{1F1F0}",
  Ireland: "\u{1F1EE}\u{1F1EA}",
  Austria: "\u{1F1E6}\u{1F1F9}",
  Brazil: "\u{1F1E7}\u{1F1F7}",
};

// ── Component ──

export default function MarketsPageClient({
  latestSnapshot,
  history,
  sectors,
  countries,
}: Props) {
  const [timescale, setTimescale] = useState<Timescale>("Max");

  // Filter server-provided history client-side based on selected timescale.
  // All data is already available from SSR -- no client-side API call needed.
  const chartData = useMemo(() => {
    const days = timescaleDays[timescale];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return history.filter((row) => row.snapshot_date >= cutoffStr);
  }, [timescale, history]);

  const handleTimescaleChange = useCallback(
    (ts: Timescale) => {
      if (ts === timescale) return;
      setTimescale(ts);
    },
    [timescale]
  );

  // Prepare chart data points
  const chartPoints = useMemo(() => {
    const validData = chartData.filter((row) => row.total_market_cap != null);
    const totalPoints = validData.length;
    const maxPoints = 500;
    const step = totalPoints > maxPoints ? Math.ceil(totalPoints / maxPoints) : 1;
    const points: { time: string; value: number }[] = [];
    for (let i = 0; i < totalPoints; i += step) {
      const row = validData[i];
      points.push({ time: row.snapshot_date, value: row.total_market_cap! });
    }
    if (totalPoints > 0) {
      const last = validData[totalPoints - 1];
      if (points.length === 0 || points[points.length - 1].time !== last.snapshot_date) {
        points.push({ time: last.snapshot_date, value: last.total_market_cap! });
      }
    }
    return points;
  }, [chartData]);

  const currentMarketCap =
    chartPoints.length > 0 ? chartPoints[chartPoints.length - 1].value : 0;
  const startMarketCap = chartPoints.length > 0 ? chartPoints[0].value : 0;
  const periodChange = currentMarketCap - startMarketCap;
  const periodChangePct =
    startMarketCap > 0 ? (periodChange / startMarketCap) * 100 : 0;
  const isPositive = periodChange >= 0;

  // Stats strip items
  const stats = latestSnapshot
    ? [
        {
          label: "Total Market Cap",
          value: formatMarketCap(latestSnapshot.total_market_cap ?? 0),
        },
        {
          label: "1D",
          value: formatPercent(latestSnapshot.change_1d_pct ?? null),
          color: pctColor(latestSnapshot.change_1d_pct ?? null),
        },
        {
          label: "7D",
          value: formatPercent(latestSnapshot.change_7d_pct ?? null),
          color: pctColor(latestSnapshot.change_7d_pct ?? null),
        },
        {
          label: "30D",
          value: formatPercent(latestSnapshot.change_30d_pct ?? null),
          color: pctColor(latestSnapshot.change_30d_pct ?? null),
        },
        {
          label: "Public Companies",
          value: (latestSnapshot.public_companies_count ?? 0).toLocaleString(),
        },
        {
          label: "24h Volume",
          value: formatVolume(latestSnapshot.total_volume ?? 0),
        },
      ]
    : [];

  return (
    <div
      className="page-content"
      style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}
    >
      <Nav />

      {/* Hero */}
      <div
        className="max-w-[1200px] mx-auto px-4 md:px-6 pt-6 pb-4"
        style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Activity size={16} style={{ color: "var(--color-accent)" }} />
          <span
            className="text-10 uppercase tracking-[0.5px] font-medium"
            style={{ color: "var(--color-accent)" }}
          >
            MARKET DATA
          </span>
        </div>
        <h1
          className="text-[32px] font-medium tracking-tight mb-1"
          style={{
            color: "var(--color-text-primary)",
            letterSpacing: "-0.5px",
          }}
        >
          Global Biotech Markets
        </h1>
        <p className="text-13" style={{ color: "var(--color-text-secondary)" }}>
          Real-time market data tracking biotech companies worldwide. Updated
          daily.
        </p>
      </div>

      {/* Stats Strip */}
      <div
        className="flex items-center gap-4 max-w-[1200px] mx-auto px-4 md:px-6 py-3 overflow-x-auto"
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
        className="flex flex-col lg:grid max-w-[1200px] mx-auto"
        style={{ gridTemplateColumns: "1fr 260px" }}
      >
        <div
          className="px-4 md:px-6 py-4 min-w-0 lg:border-r"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          {/* Market Cap Chart */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2
                className="text-10 uppercase tracking-[0.5px] font-medium"
                style={{ color: "var(--color-text-secondary)" }}
              >
                TOTAL MARKET CAP
              </h2>
              <div className="flex items-center gap-1">
                {timescales.map((ts) => (
                  <button
                    key={ts}
                    onClick={() => handleTimescaleChange(ts)}
                    className="text-10 font-medium px-2 py-1 rounded transition-all duration-150"
                    style={{
                      background:
                        timescale === ts ? "var(--color-accent)" : "transparent",
                      color:
                        timescale === ts
                          ? "white"
                          : "var(--color-text-tertiary)",
                    }}
                  >
                    {ts}
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
                style={{ color: isPositive ? "var(--color-accent)" : "#c0392b" }}
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
                {timescale}
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

          {/* Top Movers */}
          {latestSnapshot && (latestSnapshot.top_gainer_pct != null || latestSnapshot.top_loser_pct != null) && (
            <section
              className="mb-6 border-t pt-4"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              <h2
                className="text-10 uppercase tracking-[0.5px] font-medium mb-3"
                style={{ color: "var(--color-text-secondary)" }}
              >
                TOP MOVERS TODAY
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {latestSnapshot.top_gainer_pct != null && (
                  <div
                    className="rounded-lg p-3 border"
                    style={{
                      background: "var(--color-bg-secondary)",
                      borderColor: "var(--color-border-subtle)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp size={14} style={{ color: "var(--color-accent)" }} />
                      <span
                        className="text-10 font-medium"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        Top Gainer
                      </span>
                    </div>
                    <span
                      className="text-[20px] font-medium"
                      style={{ color: "var(--color-accent)" }}
                    >
                      {formatPercent(latestSnapshot.top_gainer_pct)}
                    </span>
                  </div>
                )}
                {latestSnapshot.top_loser_pct != null && (
                  <div
                    className="rounded-lg p-3 border"
                    style={{
                      background: "var(--color-bg-secondary)",
                      borderColor: "var(--color-border-subtle)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingDown size={14} style={{ color: "#c0392b" }} />
                      <span
                        className="text-10 font-medium"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        Top Loser
                      </span>
                    </div>
                    <span
                      className="text-[20px] font-medium"
                      style={{ color: "#c0392b" }}
                    >
                      {formatPercent(latestSnapshot.top_loser_pct)}
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Sector Performance */}
          {sectors.length > 0 && (
            <section
              className="mb-6 border-t pt-4"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={14} style={{ color: "var(--color-accent)" }} />
                <h2
                  className="text-10 uppercase tracking-[0.5px] font-medium"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  SECTOR PERFORMANCE
                </h2>
              </div>
              <div
                className="rounded-lg border overflow-hidden"
                style={{
                  background: "var(--color-bg-secondary)",
                  borderColor: "var(--color-border-subtle)",
                }}
              >
                <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr
                        style={{
                          borderBottom: "0.5px solid var(--color-border-subtle)",
                        }}
                      >
                        <th
                          className="text-left text-10 font-medium px-3 py-2"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          Sector
                        </th>
                        <th
                          className="text-right text-10 font-medium px-3 py-2"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          Market Cap
                        </th>
                        <th
                          className="text-right text-10 font-medium px-3 py-2"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          1D %
                        </th>
                        <th
                          className="text-right text-10 font-medium px-3 py-2"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          7D %
                        </th>
                        <th
                          className="text-right text-10 font-medium px-3 py-2"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          30D %
                        </th>
                        <th
                          className="text-right text-10 font-medium px-3 py-2"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          Public Cos
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectors.map((s) => (
                        <tr
                          key={s.id}
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
                          <td className="px-3 py-2">
                            <Link
                              href={`/sectors/${s.slug}`}
                              className="text-12 font-medium hover:underline"
                              style={{ color: "var(--color-text-primary)" }}
                            >
                              {s.short_name ?? s.name}
                            </Link>
                          </td>
                          <td
                            className="text-right text-12 px-3 py-2"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            {formatMarketCap(s.combined_market_cap ?? 0)}
                          </td>
                          <td
                            className="text-right text-12 px-3 py-2 font-medium"
                            style={{ color: pctColor(s.change_1d_pct) }}
                          >
                            {formatPercent(s.change_1d_pct)}
                          </td>
                          <td
                            className="text-right text-12 px-3 py-2 font-medium"
                            style={{ color: pctColor(s.change_7d_pct) }}
                          >
                            {formatPercent(s.change_7d_pct)}
                          </td>
                          <td
                            className="text-right text-12 px-3 py-2 font-medium"
                            style={{ color: pctColor(s.change_30d_pct) }}
                          >
                            {formatPercent(s.change_30d_pct)}
                          </td>
                          <td
                            className="text-right text-12 px-3 py-2"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            {s.public_company_count ?? "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* Country Performance */}
          {countries.length > 0 && (
            <section
              className="mb-6 border-t pt-4"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Globe size={14} style={{ color: "var(--color-accent)" }} />
                <h2
                  className="text-10 uppercase tracking-[0.5px] font-medium"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  MARKET BY COUNTRY
                </h2>
              </div>
              <div
                className="rounded-lg border overflow-hidden"
                style={{
                  background: "var(--color-bg-secondary)",
                  borderColor: "var(--color-border-subtle)",
                }}
              >
                <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr
                        style={{
                          borderBottom: "0.5px solid var(--color-border-subtle)",
                        }}
                      >
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
                          Market Cap
                        </th>
                        <th
                          className="text-right text-10 font-medium px-3 py-2"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          1D %
                        </th>
                        <th
                          className="text-right text-10 font-medium px-3 py-2"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          7D %
                        </th>
                        <th
                          className="text-right text-10 font-medium px-3 py-2"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          Public Cos
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {countries.map((c) => (
                        <tr
                          key={c.country}
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
                          <td className="px-3 py-2">
                            <span className="text-12 font-medium" style={{ color: "var(--color-text-primary)" }}>
                              {COUNTRY_FLAGS[c.country] ?? ""}{" "}
                              {c.country}
                            </span>
                          </td>
                          <td
                            className="text-right text-12 px-3 py-2"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            {formatMarketCap(c.combined_market_cap ?? 0)}
                          </td>
                          <td
                            className="text-right text-12 px-3 py-2 font-medium"
                            style={{ color: pctColor(c.change_1d_pct) }}
                          >
                            {formatPercent(c.change_1d_pct)}
                          </td>
                          <td
                            className="text-right text-12 px-3 py-2 font-medium"
                            style={{ color: pctColor(c.change_7d_pct) }}
                          >
                            {formatPercent(c.change_7d_pct)}
                          </td>
                          <td
                            className="text-right text-12 px-3 py-2"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            {c.public_company_count ?? "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* Paywall CTA */}
          <section
            className="border-t pt-4 pb-4"
            style={{ borderColor: "var(--color-border-subtle)" }}
          >
            <div
              className="rounded-lg p-4 border"
              style={{
                borderColor: "var(--color-border-subtle)",
                background: "var(--color-bg-secondary)",
              }}
            >
              <div
                className="text-13 font-medium mb-1"
                style={{ color: "var(--color-text-primary)" }}
              >
                Want deeper market analytics?
              </div>
              <p
                className="text-11 mb-3"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Pro subscribers get access to sector breakdowns, geographic heat
                maps, therapeutic area deep dives, and downloadable reports.
              </p>
              <Link
                href="/signup"
                className="inline-block text-12 font-medium px-4 py-2 rounded text-white"
                style={{ background: "var(--color-accent)" }}
              >
                Start free trial
              </Link>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[260px] border-t lg:border-t-0">
          <div className="p-3.5">
            <PaywallCard />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
