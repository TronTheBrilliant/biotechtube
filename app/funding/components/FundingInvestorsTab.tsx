"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import type { FundingRoundRow, InvestorStats } from "@/lib/funding-queries";
import type { CoInvestorPair } from "@/lib/funding-intelligence-queries";

/* ── Types ── */

interface Props {
  rounds: FundingRoundRow[];
  investorStats: InvestorStats;
  coInvestors: CoInvestorPair[];
}

type SortMode = "total" | "deals" | "avg";

interface InvestorAgg {
  name: string;
  total: number;
  deals: number;
  avg: number;
  countries: string[];
}

interface InvestorDetail {
  sectors: string[];
  recentDeals: { company: string; amount: number; date: string }[];
}

/* ── Constants ── */

const DONUT_COLORS = [
  "#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444",
  "#10b981", "#ec4899", "#f97316", "#6366f1", "#14b8a6",
];

const COUNTRY_FLAGS: Record<string, string> = {
  US: "\u{1f1fa}\u{1f1f8}", UK: "\u{1f1ec}\u{1f1e7}", Switzerland: "\u{1f1e8}\u{1f1ed}",
  Japan: "\u{1f1ef}\u{1f1f5}", China: "\u{1f1e8}\u{1f1f3}", Denmark: "\u{1f1e9}\u{1f1f0}",
  India: "\u{1f1ee}\u{1f1f3}", France: "\u{1f1eb}\u{1f1f7}", "South Korea": "\u{1f1f0}\u{1f1f7}",
  Germany: "\u{1f1e9}\u{1f1ea}", Belgium: "\u{1f1e7}\u{1f1ea}", Netherlands: "\u{1f1f3}\u{1f1f1}",
  Australia: "\u{1f1e6}\u{1f1fa}", Ireland: "\u{1f1ee}\u{1f1ea}", Israel: "\u{1f1ee}\u{1f1f1}",
  Canada: "\u{1f1e8}\u{1f1e6}", Norway: "\u{1f1f3}\u{1f1f4}", Sweden: "\u{1f1f8}\u{1f1ea}",
  Singapore: "\u{1f1f8}\u{1f1ec}", Spain: "\u{1f1ea}\u{1f1f8}",
};

const PAGE_SIZE = 20;

/* ── Helpers ── */

function formatAmount(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(0)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd}`;
}

function flagFor(country: string | null): string {
  if (!country) return "";
  return COUNTRY_FLAGS[country] ?? "";
}

/* ── Component ── */

export function FundingInvestorsTab({ rounds, investorStats, coInvestors }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>("total");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(0);
  const [expandedInvestor, setExpandedInvestor] = useState<string | null>(null);
  const detailCache = useRef<Map<string, InvestorDetail>>(new Map());
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<Map<string, InvestorDetail>>(new Map());

  /* Aggregate investors from rounds */
  const allInvestors = useMemo<InvestorAgg[]>(() => {
    const map = new Map<string, { total: number; deals: number; countries: Set<string> }>();
    for (const r of rounds) {
      const inv = r.lead_investor?.trim();
      if (!inv) continue;
      const existing = map.get(inv);
      if (existing) {
        existing.total += r.amount_usd || 0;
        existing.deals += 1;
        if (r.country) existing.countries.add(r.country);
      } else {
        const countries = new Set<string>();
        if (r.country) countries.add(r.country);
        map.set(inv, { total: r.amount_usd || 0, deals: 1, countries });
      }
    }
    return Array.from(map.entries()).map(([name, d]) => ({
      name,
      total: d.total,
      deals: d.deals,
      avg: d.deals > 0 ? d.total / d.deals : 0,
      countries: Array.from(d.countries),
    }));
  }, [rounds]);

  /* Countries for filter */
  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    for (const inv of allInvestors) {
      for (const c of inv.countries) set.add(c);
    }
    return Array.from(set).sort();
  }, [allInvestors]);

  /* Filtered + sorted */
  const filteredTopInvestors = useMemo(() => {
    let list = allInvestors;
    if (countryFilter !== "all") {
      list = list.filter((inv) => inv.countries.includes(countryFilter));
    }
    const sorted = [...list];
    if (sortMode === "total") sorted.sort((a, b) => b.total - a.total);
    else if (sortMode === "deals") sorted.sort((a, b) => b.deals - a.deals);
    else sorted.sort((a, b) => b.avg - a.avg);
    return sorted;
  }, [allInvestors, countryFilter, sortMode]);

  const top10 = filteredTopInvestors.slice(0, 10);
  const totalForDonut = top10.reduce((s, i) => s + i.total, 0);

  /* Donut conic-gradient */
  const donutGradient = useMemo(() => {
    if (top10.length === 0 || totalForDonut === 0) return "conic-gradient(var(--color-border) 0deg 360deg)";
    let cumDeg = 0;
    const stops: string[] = [];
    for (let i = 0; i < top10.length; i++) {
      const deg = (top10[i].total / totalForDonut) * 360;
      stops.push(`${DONUT_COLORS[i]} ${cumDeg}deg ${cumDeg + deg}deg`);
      cumDeg += deg;
    }
    return `conic-gradient(${stops.join(", ")})`;
  }, [top10, totalForDonut]);

  /* Expanded list pagination */
  const pagedInvestors = showAll
    ? filteredTopInvestors.slice(0, (page + 1) * PAGE_SIZE)
    : top10;
  const hasMore = showAll && (page + 1) * PAGE_SIZE < filteredTopInvestors.length;

  /* Expand investor detail */
  const toggleInvestor = useCallback(async (name: string) => {
    if (expandedInvestor === name) {
      setExpandedInvestor(null);
      return;
    }
    setExpandedInvestor(name);
    if (detailCache.current.has(name)) {
      setDetailData((prev) => new Map(prev).set(name, detailCache.current.get(name)!));
      return;
    }
    setLoadingDetail(name);
    try {
      const res = await fetch(`/api/funding/investor-details?investor=${encodeURIComponent(name)}`);
      if (res.ok) {
        const data: InvestorDetail = await res.json();
        detailCache.current.set(name, data);
        setDetailData((prev) => new Map(prev).set(name, data));
      }
    } catch {
      /* silently fail */
    } finally {
      setLoadingDetail(null);
    }
  }, [expandedInvestor]);

  const sortPills: { key: SortMode; label: string }[] = [
    { key: "total", label: "By Total Invested" },
    { key: "deals", label: "By Deal Count" },
    { key: "avg", label: "By Avg Deal Size" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Stat Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
        }}
        className="md:!grid-cols-4"
      >
        <StatCard label="Top Investors Tracked" value={investorStats.uniqueInvestors.toLocaleString()} />
        <StatCard
          label="Largest Investor"
          value={investorStats.largestInvestorName}
          sub={formatAmount(investorStats.largestInvestorTotal)}
        />
        <StatCard
          label="Most Active"
          value={investorStats.mostActiveName}
          sub={`${investorStats.mostActiveDeals} deals`}
        />
        <StatCard label="Avg Deal Size" value={formatAmount(investorStats.avgDealSizeAll)} />
      </div>

      {/* ── Sort Pills ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {sortPills.map((p) => (
          <button
            key={p.key}
            onClick={() => { setSortMode(p.key); setShowAll(false); setPage(0); }}
            style={{
              padding: "4px 12px",
              borderRadius: 9999,
              border: sortMode === p.key ? "0.5px solid var(--color-accent)" : "0.5px solid var(--color-border)",
              background: sortMode === p.key ? "var(--color-accent)" : "transparent",
              color: sortMode === p.key ? "#fff" : "var(--color-text-secondary)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Donut + Ranked List ── */}
      <div
        style={{
          display: "grid",
          gap: 16,
        }}
        className="md:!grid-cols-[280px_1fr]"
      >
        {/* Donut */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
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
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: "var(--color-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 500, color: "var(--color-text)" }}>
                {top10.length}
              </span>
              <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                Top Investors
              </span>
            </div>
          </div>

          {/* Country filter */}
          <select
            value={countryFilter}
            onChange={(e) => { setCountryFilter(e.target.value); setShowAll(false); setPage(0); }}
            style={{
              padding: "4px 8px",
              borderRadius: 8,
              border: "0.5px solid var(--color-border)",
              background: "var(--color-bg)",
              color: "var(--color-text)",
              fontSize: 13,
              fontWeight: 400,
              width: "100%",
              maxWidth: 220,
            }}
          >
            <option value="all">All Countries</option>
            {availableCountries.map((c) => (
              <option key={c} value={c}>
                {flagFor(c)} {c}
              </option>
            ))}
          </select>
        </div>

        {/* Ranked List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {pagedInvestors.map((inv, i) => {
            const isExpanded = expandedInvestor === inv.name;
            const detail = detailData.get(inv.name);
            const isLoading = loadingDetail === inv.name;

            return (
              <div key={inv.name} style={{ display: "flex", flexDirection: "column" }}>
                <div
                  onClick={() => toggleInvestor(inv.name)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "0.5px solid var(--color-border)",
                    background: isExpanded ? "var(--color-bg-secondary)" : "transparent",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                >
                  {/* Rank + color dot */}
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: i < 10 ? DONUT_COLORS[i] : "var(--color-border)",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                      width: 24,
                      textAlign: "right",
                      flexShrink: 0,
                      fontWeight: 400,
                    }}
                  >
                    {i + 1}
                  </span>

                  {/* Name */}
                  <span
                    style={{
                      flex: 1,
                      fontSize: 14,
                      fontWeight: 500,
                      color: "var(--color-text)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {inv.name}
                  </span>

                  {/* Stats */}
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text)", flexShrink: 0 }}>
                    {formatAmount(inv.total)}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                      flexShrink: 0,
                      minWidth: 60,
                      textAlign: "right",
                    }}
                  >
                    {inv.deals} deal{inv.deals !== 1 ? "s" : ""} / {formatAmount(inv.avg)} avg
                  </span>

                  {/* Expand arrow */}
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.15s ease",
                      flexShrink: 0,
                    }}
                  >
                    ▾
                  </span>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "8px 12px 8px 44px",
                      borderLeft: `0.5px solid ${i < 10 ? DONUT_COLORS[i] : "var(--color-border)"}`,
                      marginLeft: 16,
                    }}
                  >
                    {isLoading ? (
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Loading...</span>
                    ) : detail ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {/* Sector pills */}
                        {detail.sectors.length > 0 && (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {detail.sectors.map((s) => (
                              <span
                                key={s}
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: 9999,
                                  border: "0.5px solid var(--color-border)",
                                  fontSize: 11,
                                  color: "var(--color-text-secondary)",
                                  fontWeight: 400,
                                }}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Recent deals */}
                        {detail.recentDeals.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500 }}>
                              Recent Deals
                            </span>
                            {detail.recentDeals.map((d, di) => (
                              <div
                                key={di}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  fontSize: 12,
                                  color: "var(--color-text)",
                                }}
                              >
                                <span style={{ flex: 1, fontWeight: 400 }}>{d.company}</span>
                                <span style={{ fontWeight: 500, color: "var(--color-accent)" }}>
                                  {formatAmount(d.amount)}
                                </span>
                                <span style={{ color: "var(--color-text-secondary)", fontSize: 11 }}>
                                  {new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {detail.sectors.length === 0 && detail.recentDeals.length === 0 && (
                          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                            No additional details available.
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        No details available.
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Show all / pagination */}
          {!showAll && filteredTopInvestors.length > 10 && (
            <button
              onClick={() => setShowAll(true)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "0.5px solid var(--color-border)",
                background: "transparent",
                color: "var(--color-accent)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "center",
                marginTop: 4,
              }}
            >
              Show all {filteredTopInvestors.length} investors
            </button>
          )}
          {hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "0.5px solid var(--color-border)",
                background: "transparent",
                color: "var(--color-accent)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "center",
                marginTop: 4,
              }}
            >
              Load more ({filteredTopInvestors.length - (page + 1) * PAGE_SIZE} remaining)
            </button>
          )}
        </div>
      </div>

      {/* ── Co-Investors Panel ── */}
      {coInvestors.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: 12,
            borderRadius: 8,
            border: "0.5px solid var(--color-border)",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text)" }}>
            Co-Investor Networks
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {coInvestors.map((pair, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 13,
                  padding: "4px 0",
                  borderBottom: i < coInvestors.length - 1 ? "0.5px solid var(--color-border)" : "none",
                }}
              >
                <span style={{ fontWeight: 500, color: "var(--color-accent)" }}>{pair.investorA}</span>
                <span style={{ color: "var(--color-text-secondary)" }}>+</span>
                <span style={{ fontWeight: 500, color: "var(--color-accent)" }}>{pair.investorB}</span>
                <span style={{ color: "var(--color-text-secondary)", marginLeft: "auto", fontSize: 12 }}>
                  {pair.sharedCompanies} shared {pair.sharedCompanies === 1 ? "company" : "companies"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Responsive grid override */}
      <style>{`
        @media (min-width: 768px) {
          .md\\:!grid-cols-4 { grid-template-columns: repeat(4, 1fr) !important; }
          .md\\:!grid-cols-\\[280px_1fr\\] { grid-template-columns: 280px 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Stat Card ── */

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 8,
        border: "0.5px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 400 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 18,
          fontWeight: 500,
          color: "var(--color-text)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 400 }}>
          {sub}
        </span>
      )}
    </div>
  );
}
