"use client";

import { useState } from "react";
import Link from "next/link";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { formatMarketCap, formatPercent, pctColor } from "@/lib/market-utils";

type Period = "24h" | "7d" | "30d";

export interface TrendingCompanyRow {
  slug: string;
  name: string;
  ticker: string | null;
  country: string | null;
  logo_url: string | null;
  website: string | null;
  change1d: number | null;
  change7d: number | null;
  change30d: number | null;
  marketCap: number;
}

interface Props {
  companies: TrendingCompanyRow[];
}

const PERIOD_LABELS: Record<Period, string> = {
  "24h": "24H",
  "7d": "7D",
  "30d": "30D",
};

function getChange(c: TrendingCompanyRow, period: Period): number | null {
  switch (period) {
    case "24h": return c.change1d;
    case "7d": return c.change7d;
    case "30d": return c.change30d;
  }
}

function CompanyTable({
  companies,
  period,
  isLosers,
}: {
  companies: TrendingCompanyRow[];
  period: Period;
  isLosers: boolean;
}) {
  const sorted = [...companies]
    .filter((c) => getChange(c, period) !== null)
    .sort((a, b) => {
      const aVal = getChange(a, period) ?? 0;
      const bVal = getChange(b, period) ?? 0;
      return isLosers ? aVal - bVal : bVal - aVal;
    })
    .filter((c) => {
      const val = getChange(c, period) ?? 0;
      return isLosers ? val < 0 : val > 0;
    })
    .slice(0, 50);

  const changeLabel = `${PERIOD_LABELS[period]} Change`;

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        background: "var(--color-bg-secondary)",
        borderColor: "var(--color-border-subtle)",
      }}
    >
      <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <table className="w-full">
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
                className="hidden md:table-cell text-left text-10 font-medium px-3 py-2"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                Country
              </th>
              <th
                className="text-right text-10 font-medium px-3 py-2"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {changeLabel}
              </th>
              <th
                className="text-right text-10 font-medium px-3 py-2"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                Market Cap
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => {
              const change = getChange(c, period);
              return (
                <tr
                  key={c.slug}
                  className="transition-colors duration-100 hover:bg-[var(--color-bg-primary)]"
                  style={{
                    borderBottom: "0.5px solid var(--color-border-subtle)",
                  }}
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
                      <div className="flex flex-col">
                        <span
                          className="text-12 font-medium truncate max-w-[150px] md:max-w-none inline-block"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {c.name}
                        </span>
                        {c.ticker && (
                          <span
                            className="text-10"
                            style={{ color: "var(--color-text-tertiary)" }}
                          >
                            {c.ticker}
                          </span>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td
                    className="hidden md:table-cell px-3 py-2 text-12"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {c.country || "\u2014"}
                  </td>
                  <td
                    className="text-right text-12 px-3 py-2 font-semibold"
                    style={{ color: pctColor(change) }}
                  >
                    {formatPercent(change)}
                  </td>
                  <td
                    className="text-right text-12 px-3 py-2"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {formatMarketCap(c.marketCap)}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-13"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  No data available for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TrendingClient({ companies }: Props) {
  const [period, setPeriod] = useState<Period>("7d");
  const [showLosers, setShowLosers] = useState(false);

  const periods: Period[] = ["24h", "7d", "30d"];

  // Stats
  const gainers = companies.filter((c) => {
    const val = getChange(c, period);
    return val !== null && val > 0;
  });
  const losers = companies.filter((c) => {
    const val = getChange(c, period);
    return val !== null && val < 0;
  });
  const bestGainer = gainers.length > 0
    ? gainers.reduce((best, c) => (getChange(c, period)! > getChange(best, period)! ? c : best))
    : null;

  return (
    <>
      {/* Period Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className="text-13 font-semibold px-4 py-1.5 rounded-full transition-all duration-150"
            style={{
              background: period === p ? "var(--color-accent)" : "var(--color-bg-secondary)",
              color: period === p ? "white" : "var(--color-text-secondary)",
              border: period === p ? "none" : "1px solid var(--color-border-subtle)",
            }}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Stats strip */}
      <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-6">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
            Gainers
          </span>
          <span
            className="text-[13px] font-semibold"
            style={{ color: "var(--color-accent)" }}
          >
            {gainers.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
            Losers
          </span>
          <span
            className="text-[13px] font-semibold"
            style={{ color: "#c0392b" }}
          >
            {losers.length}
          </span>
        </div>
        {bestGainer && (
          <div className="flex items-center gap-1.5">
            <span className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
              Best performer
            </span>
            <span
              className="text-[13px] font-semibold"
              style={{ color: "var(--color-accent)" }}
            >
              {formatPercent(getChange(bestGainer, period))}
            </span>
          </div>
        )}
      </div>

      {/* Gainers / Losers toggle + table */}
      <div>
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={() => setShowLosers(false)}
            className="text-[20px] md:text-[24px] font-bold tracking-tight transition-colors duration-150"
            style={{
              color: !showLosers ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
              letterSpacing: "-0.5px",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            Top Gainers
          </button>
          <button
            onClick={() => setShowLosers(true)}
            className="text-[20px] md:text-[24px] font-bold tracking-tight transition-colors duration-150"
            style={{
              color: showLosers ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
              letterSpacing: "-0.5px",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            Top Losers
          </button>
        </div>
        <CompanyTable companies={companies} period={period} isLosers={showLosers} />
      </div>
    </>
  );
}
