"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Info, X } from "lucide-react";
import { Company, FundingRound } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";
import { CompanyAvatar } from "@/components/CompanyAvatar";

/* ── Constants ──────────────────────────────────────────────── */

const stageColors: Record<string, { bg: string; text: string; border: string }> = {
  Approved: { bg: "#e8f5f0", text: "#0a3d2e", border: "#5DCAA5" },
  "Phase 3": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 2": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 1/2": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Phase 1": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Pre-clinical": { bg: "var(--color-bg-secondary)", text: "var(--color-text-secondary)", border: "var(--color-border-medium)" },
};

const roundBadgeColors: Record<string, { bg: string; text: string }> = {
  Seed: { bg: "#f0fdf4", text: "#166534" },
  "Series A": { bg: "#eff6ff", text: "#1d4ed8" },
  "Series B": { bg: "#f5f3ff", text: "#5b21b6" },
  "Series C": { bg: "#fef3e2", text: "#b45309" },
  Grant: { bg: "#e8f5f0", text: "#0a3d2e" },
};

const roundEmoji: Record<string, string> = {
  Seed: "🌱", "Series A": "🅰️", "Series B": "🅱️", "Series C": "🚀", Grant: "🏛️",
};

function relativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const days = Math.round((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

function formatPrice(price: number, currency: string | null): string {
  const sym = currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "NOK" ? "kr" : currency === "SEK" ? "kr" : currency === "CHF" ? "CHF " : currency === "JPY" ? "¥" : "$";
  if (currency === "JPY") return `${sym}${Math.round(price).toLocaleString()}`;
  return `${sym}${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ── Types ──────────────────────────────────────────────────── */

type Mode = "top" | "trending" | "funded" | "new";

interface StockQuote {
  price: number | null;
  change30d: number | null;
  currency: string | null;
}

interface RankingTableProps {
  companies: Company[];
  mode?: Mode;
  funding?: FundingRound[];
  startRank?: number;
}

/* ── Top mode grid ─────────────────────────────────────────── */

const TOP_GRID = "32px minmax(130px, 1fr) 74px 74px 58px 56px 78px";

/* ── Component ─────────────────────────────────────────────── */

export function RankingTable({ companies, mode = "top", funding = [], startRank = 0 }: RankingTableProps) {
  const [stockData, setStockData] = useState<Record<string, StockQuote>>({});
  const [stockLoading, setStockLoading] = useState(false);
  const [trendingInfoOpen, setTrendingInfoOpen] = useState(false);

  // Fetch stock data for "top" mode
  const fetchStockData = useCallback(async (tickers: string[]) => {
    if (tickers.length === 0) return;
    setStockLoading(true);
    try {
      const res = await fetch(`/api/stock/batch?symbols=${tickers.join(",")}`);
      if (res.ok) {
        const data = await res.json();
        setStockData(data);
      }
    } catch {
      // silently fail — rows will show "—"
    } finally {
      setStockLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode !== "top") return;
    const tickers = companies
      .filter((c) => c.type === "Public" && c.ticker)
      .map((c) => c.ticker!)
      .filter((t, i, arr) => arr.indexOf(t) === i);
    fetchStockData(tickers);
  }, [companies, mode, fetchStockData]);

  /* ═══════════════════════════════════════════════════════════
   * TOP MODE — Horizontally scrollable clean table
   * ═══════════════════════════════════════════════════════════ */
  if (mode === "top") {
    return (
      <div>
        {/* Trending score info banner */}
        {trendingInfoOpen && (
          <div
            className="flex items-start gap-2.5 mx-3 md:mx-5 mt-2 mb-1 px-3.5 py-3 rounded-lg"
            style={{ background: "var(--color-bg-secondary)", border: "0.5px solid var(--color-border-subtle)" }}
          >
            <Info size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-accent)" }} />
            <div className="flex-1 min-w-0">
              <div className="text-12 font-medium" style={{ color: "var(--color-text-primary)" }}>
                Trending Score
              </div>
              <div className="text-11 mt-0.5 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                Based on profile views over the past 7 days. A higher score means more investor and researcher interest in the company.
              </div>
            </div>
            <button
              onClick={() => setTrendingInfoOpen(false)}
              className="flex-shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors"
            >
              <X size={12} style={{ color: "var(--color-text-tertiary)" }} />
            </button>
          </div>
        )}

        {/* Scrollable table container */}
        <div
          className="overflow-x-auto"
          style={{ scrollbarWidth: "thin", WebkitOverflowScrolling: "touch" }}
        >
          <div style={{ minWidth: "620px" }}>
            {/* Header */}
            <div
              className="grid items-center py-2.5 px-3 md:px-5"
              style={{
                gridTemplateColumns: TOP_GRID,
                gap: "8px",
                borderBottom: "0.5px solid var(--color-border-subtle)",
              }}
            >
              <span className="text-[10px] uppercase tracking-[0.6px] text-center font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                #
              </span>
              <span className="text-[10px] uppercase tracking-[0.6px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                Company
              </span>
              <span className="text-[10px] uppercase tracking-[0.6px] text-right font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                Mkt Cap
              </span>
              <span className="text-[10px] uppercase tracking-[0.6px] text-right font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                Price
              </span>
              <span className="text-[10px] uppercase tracking-[0.6px] text-right font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                30d
              </span>
              <button
                onClick={() => setTrendingInfoOpen(!trendingInfoOpen)}
                className="flex items-center justify-end gap-[3px] text-[10px] uppercase tracking-[0.6px] font-medium"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                Score
                <Info size={9} style={{ opacity: 0.6 }} />
              </button>
              <span className="text-[10px] uppercase tracking-[0.6px] text-right font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                Stage
              </span>
            </div>

            {/* Rows */}
            {companies.map((company, index) => {
              const rank = startRank + index + 1;
              const stock = stockData[company.ticker || ""];
              const sc = stageColors[company.stage] || stageColors["Pre-clinical"];
              const isPublic = company.type === "Public" && !!company.ticker;

              return (
                <Link
                  key={company.slug}
                  href={`/company/${company.slug}`}
                  className="grid items-center py-2.5 md:py-3 px-3 md:px-5 transition-colors duration-100 cursor-pointer"
                  style={{
                    gridTemplateColumns: TOP_GRID,
                    gap: "8px",
                    borderBottom: "0.5px solid var(--color-border-subtle)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-secondary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                >
                  {/* Rank */}
                  <div className="text-center">
                    <span
                      className="text-[14px] md:text-[16px] font-semibold tabular-nums"
                      style={{ color: rank <= 3 ? "var(--color-accent)" : "var(--color-text-primary)" }}
                    >
                      {rank}
                    </span>
                  </div>

                  {/* Company */}
                  <div className="flex items-center gap-2 min-w-0">
                    <CompanyAvatar name={company.name} logoUrl={company.logoUrl} website={company.website} size={30} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] md:text-[14px] font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                          {company.name}
                        </span>
                        {company.ticker && (
                          <span
                            className="text-[9px] font-medium px-[4px] py-[1px] rounded-[3px] flex-shrink-0"
                            style={{
                              background: "var(--color-bg-tertiary)",
                              color: "var(--color-text-tertiary)",
                            }}
                          >
                            {company.ticker}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] md:text-[11px] mt-[1px] truncate" style={{ color: "var(--color-text-tertiary)" }}>
                        {company.country}
                        {company.focus[0] && <span style={{ opacity: 0.6 }}> · </span>}
                        {company.focus[0] && company.focus[0]}
                      </div>
                    </div>
                  </div>

                  {/* Market Cap */}
                  <div className="text-right">
                    {company.valuation ? (
                      <span className="text-[12px] md:text-[13px] font-semibold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                        {formatCurrency(company.valuation)}
                      </span>
                    ) : (
                      <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>—</span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    {stock?.price != null ? (
                      <span className="text-[12px] md:text-[13px] tabular-nums" style={{ color: "var(--color-text-secondary)" }}>
                        {formatPrice(stock.price, stock.currency)}
                      </span>
                    ) : stockLoading && isPublic ? (
                      <div className="h-3.5 w-14 rounded-sm ml-auto animate-pulse" style={{ background: "var(--color-bg-tertiary)" }} />
                    ) : (
                      <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>—</span>
                    )}
                  </div>

                  {/* 30d Change */}
                  <div className="text-right">
                    {stock?.change30d != null ? (
                      <span
                        className="text-[12px] md:text-[13px] font-semibold tabular-nums"
                        style={{ color: stock.change30d >= 0 ? "#1a7a5e" : "#c0392b" }}
                      >
                        {stock.change30d >= 0 ? "+" : ""}{stock.change30d.toFixed(1)}%
                      </span>
                    ) : stockLoading && isPublic ? (
                      <div className="h-3.5 w-11 rounded-sm ml-auto animate-pulse" style={{ background: "var(--color-bg-tertiary)" }} />
                    ) : (
                      <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>—</span>
                    )}
                  </div>

                  {/* Trending Score */}
                  <div className="text-right">
                    {company.profileViews ? (
                      <span className="text-[12px] md:text-[13px] tabular-nums" style={{ color: "var(--color-text-secondary)" }}>
                        {company.profileViews >= 1000
                          ? `${(company.profileViews / 1000).toFixed(1)}K`
                          : company.profileViews.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>—</span>
                    )}
                  </div>

                  {/* Stage */}
                  <div className="flex justify-end">
                    {company.stage ? (
                      <span
                        className="text-[10px] md:text-[11px] px-[5px] py-[2px] rounded-[3px] border whitespace-nowrap"
                        style={{ background: sc.bg, color: sc.text, borderColor: sc.border, borderWidth: "0.5px" }}
                      >
                        {company.stage}
                      </span>
                    ) : (
                      <span
                        className="text-[10px] md:text-[11px] px-[5px] py-[2px] rounded-[3px] border whitespace-nowrap"
                        style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)", borderColor: "var(--color-border-medium)", borderWidth: "0.5px" }}
                      >
                        —
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Scroll hint on mobile */}
        <div className="md:hidden px-4 py-2 text-center">
          <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
            ← Swipe for more data →
          </span>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
   * TRENDING MODE — Views, rank, momentum
   * ═══════════════════════════════════════════════════════════ */
  if (mode === "trending") {
    const TRENDING_GRID = "32px minmax(130px, 1fr) 68px 58px 60px 78px";
    return (
      <div>
        <div className="overflow-x-auto" style={{ scrollbarWidth: "thin", WebkitOverflowScrolling: "touch" }}>
          <div style={{ minWidth: "540px" }}>
            {/* Header */}
            <div
              className="grid items-center py-2.5 px-3 md:px-5"
              style={{ gridTemplateColumns: TRENDING_GRID, gap: "8px", borderBottom: "0.5px solid var(--color-border-subtle)" }}
            >
              <span className="text-[10px] uppercase tracking-[0.6px] text-center font-medium" style={{ color: "var(--color-text-tertiary)" }}>#</span>
              <span className="text-[10px] uppercase tracking-[0.6px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>Company</span>
              <span className="text-[10px] uppercase tracking-[0.6px] text-right font-medium" style={{ color: "var(--color-text-tertiary)" }}>Views</span>
              <span className="text-[10px] uppercase tracking-[0.6px] text-right font-medium" style={{ color: "var(--color-text-tertiary)" }}>Rank</span>
              <span className="text-[10px] uppercase tracking-[0.6px] text-right font-medium" style={{ color: "var(--color-text-tertiary)" }}>Mkt Cap</span>
              <span className="text-[10px] uppercase tracking-[0.6px] text-right font-medium" style={{ color: "var(--color-text-tertiary)" }}>Stage</span>
            </div>

            {/* Rows */}
            {companies.map((company, index) => {
              const rank = startRank + index + 1;
              const sc = stageColors[company.stage] || stageColors["Pre-clinical"];
              return (
                <Link
                  key={company.slug}
                  href={`/company/${company.slug}`}
                  className="grid items-center py-2.5 md:py-3 px-3 md:px-5 transition-colors duration-100 cursor-pointer"
                  style={{ gridTemplateColumns: TRENDING_GRID, gap: "8px", borderBottom: "0.5px solid var(--color-border-subtle)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-secondary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                >
                  <div className="text-center">
                    <span className="text-[14px] md:text-[16px] font-semibold tabular-nums" style={{ color: "var(--color-text-primary)" }}>{rank}</span>
                  </div>

                  <div className="flex items-center gap-2 min-w-0">
                    <CompanyAvatar name={company.name} logoUrl={company.logoUrl} website={company.website} size={30} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] md:text-[14px] font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{company.name}</span>
                        {company.ticker && (
                          <span className="text-[9px] font-medium px-[4px] py-[1px] rounded-[3px] flex-shrink-0" style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-tertiary)" }}>
                            {company.ticker}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] md:text-[11px] mt-[1px] truncate" style={{ color: "var(--color-text-tertiary)" }}>
                        {company.country}{company.focus[0] && <span style={{ opacity: 0.6 }}> · </span>}{company.focus[0]}
                      </div>
                    </div>
                  </div>

                  {/* Views */}
                  <div className="text-right">
                    {company.profileViews ? (
                      <span className="text-[12px] md:text-[13px] font-semibold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                        {company.profileViews >= 1000 ? `${(company.profileViews / 1000).toFixed(1)}K` : company.profileViews.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>—</span>
                    )}
                  </div>

                  {/* Trending rank */}
                  <div className="text-right">
                    {company.trending ? (
                      <span className="text-[12px] md:text-[13px] font-medium tabular-nums" style={{ color: "var(--color-accent)" }}>
                        #{company.trending}
                      </span>
                    ) : (
                      <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>—</span>
                    )}
                  </div>

                  {/* Mkt Cap */}
                  <div className="text-right">
                    {company.valuation ? (
                      <span className="text-[12px] md:text-[13px] tabular-nums" style={{ color: "var(--color-text-secondary)" }}>
                        {formatCurrency(company.valuation)}
                      </span>
                    ) : (
                      <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>—</span>
                    )}
                  </div>

                  {/* Stage */}
                  <div className="flex justify-end">
                    {company.stage ? (
                      <span className="text-[10px] md:text-[11px] px-[5px] py-[2px] rounded-[3px] border whitespace-nowrap" style={{ background: sc.bg, color: sc.text, borderColor: sc.border, borderWidth: "0.5px" }}>
                        {company.stage}
                      </span>
                    ) : (
                      <span className="text-[10px] md:text-[11px] px-[5px] py-[2px] rounded-[3px] border whitespace-nowrap" style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)", borderColor: "var(--color-border-medium)", borderWidth: "0.5px" }}>—</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
        <div className="md:hidden px-4 py-2 text-center">
          <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>← Swipe for more data →</span>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
   * FUNDED MODE — Recent funding rounds
   * ═══════════════════════════════════════════════════════════ */
  if (mode === "funded") {
    const FUNDED_GRID = "32px minmax(130px, 1fr) 72px 74px minmax(100px, 1fr) 62px";
    const fundingMap = new Map<string, FundingRound>();
    for (const f of funding) {
      if (!fundingMap.has(f.companySlug)) fundingMap.set(f.companySlug, f);
    }

    return (
      <div>
        <div className="overflow-x-auto" style={{ scrollbarWidth: "thin", WebkitOverflowScrolling: "touch" }}>
          <div style={{ minWidth: "580px" }}>
            {/* Header */}
            <div
              className="grid items-center py-2.5 px-3 md:px-5"
              style={{ gridTemplateColumns: FUNDED_GRID, gap: "8px", borderBottom: "0.5px solid var(--color-border-subtle)" }}
            >
              <span className="text-[10px] uppercase tracking-[0.6px] text-center font-medium" style={{ color: "var(--color-text-tertiary)" }}>#</span>
              <span className="text-[10px] uppercase tracking-[0.6px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>Company</span>
              <span className="text-[10px] uppercase tracking-[0.6px] text-right font-medium" style={{ color: "var(--color-text-tertiary)" }}>Round</span>
              <span className="text-[10px] uppercase tracking-[0.6px] text-right font-medium" style={{ color: "var(--color-text-tertiary)" }}>Amount</span>
              <span className="text-[10px] uppercase tracking-[0.6px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>Lead Investor</span>
              <span className="text-[10px] uppercase tracking-[0.6px] text-right font-medium" style={{ color: "var(--color-text-tertiary)" }}>When</span>
            </div>

            {/* Rows */}
            {companies.map((company, index) => {
              const rank = startRank + index + 1;
              const fr = fundingMap.get(company.slug);
              return (
                <Link
                  key={company.slug}
                  href={`/company/${company.slug}`}
                  className="grid items-center py-2.5 md:py-3 px-3 md:px-5 transition-colors duration-100 cursor-pointer"
                  style={{ gridTemplateColumns: FUNDED_GRID, gap: "8px", borderBottom: "0.5px solid var(--color-border-subtle)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-secondary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                >
                  <div className="text-center">
                    <span className="text-[14px] md:text-[16px] font-semibold tabular-nums" style={{ color: "var(--color-text-primary)" }}>{rank}</span>
                  </div>

                  <div className="flex items-center gap-2 min-w-0">
                    <CompanyAvatar name={company.name} logoUrl={company.logoUrl} website={company.website} size={30} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] md:text-[14px] font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{company.name}</span>
                      </div>
                      <div className="text-[10px] md:text-[11px] mt-[1px] truncate" style={{ color: "var(--color-text-tertiary)" }}>
                        {company.country}{company.focus[0] && <span style={{ opacity: 0.6 }}> · </span>}{company.focus[0]}
                      </div>
                    </div>
                  </div>

                  {/* Round type */}
                  <div className="flex justify-end">
                    {fr ? (
                      <span
                        className="text-[10px] md:text-[11px] px-[5px] py-[2px] rounded-[3px] whitespace-nowrap font-medium"
                        style={{ background: (roundBadgeColors[fr.type] || roundBadgeColors.Seed).bg, color: (roundBadgeColors[fr.type] || roundBadgeColors.Seed).text }}
                      >
                        {roundEmoji[fr.type] || ""} {fr.type}
                      </span>
                    ) : (
                      <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>—</span>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    {fr ? (
                      <span className="text-[12px] md:text-[13px] font-semibold tabular-nums" style={{ color: "var(--color-accent)" }}>
                        {formatCurrency(fr.amount, fr.currency)}
                      </span>
                    ) : (
                      <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>—</span>
                    )}
                  </div>

                  {/* Lead Investor */}
                  <div className="truncate">
                    <span className="text-[12px] md:text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                      {fr?.leadInvestor || "—"}
                    </span>
                  </div>

                  {/* When */}
                  <div className="text-right">
                    <span className="text-[12px] md:text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
                      {fr ? relativeDate(fr.date) : "—"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
        <div className="md:hidden px-4 py-2 text-center">
          <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>← Swipe for more data →</span>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
   * NEW MODE — Newest companies
   * ═══════════════════════════════════════════════════════════ */
  const NEW_GRID = "32px minmax(130px, 1fr) 56px 68px 78px minmax(100px, 1fr)";
  return (
    <div>
      <div className="overflow-x-auto" style={{ scrollbarWidth: "thin", WebkitOverflowScrolling: "touch" }}>
        <div style={{ minWidth: "580px" }}>
          {/* Header */}
          <div
            className="grid items-center py-2.5 px-3 md:px-5"
            style={{ gridTemplateColumns: NEW_GRID, gap: "8px", borderBottom: "0.5px solid var(--color-border-subtle)" }}
          >
            <span className="text-[10px] uppercase tracking-[0.6px] text-center font-medium" style={{ color: "var(--color-text-tertiary)" }}>#</span>
            <span className="text-[10px] uppercase tracking-[0.6px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>Company</span>
            <span className="text-[10px] uppercase tracking-[0.6px] text-right font-medium" style={{ color: "var(--color-text-tertiary)" }}>Est.</span>
            <span className="text-[10px] uppercase tracking-[0.6px] text-right font-medium" style={{ color: "var(--color-text-tertiary)" }}>Mkt Cap</span>
            <span className="text-[10px] uppercase tracking-[0.6px] text-right font-medium" style={{ color: "var(--color-text-tertiary)" }}>Stage</span>
            <span className="text-[10px] uppercase tracking-[0.6px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>About</span>
          </div>

          {/* Rows */}
          {companies.map((company, index) => {
            const rank = startRank + index + 1;
            const sc = stageColors[company.stage] || stageColors["Pre-clinical"];
            return (
              <Link
                key={company.slug}
                href={`/company/${company.slug}`}
                className="grid items-center py-2.5 md:py-3 px-3 md:px-5 transition-colors duration-100 cursor-pointer"
                style={{ gridTemplateColumns: NEW_GRID, gap: "8px", borderBottom: "0.5px solid var(--color-border-subtle)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-secondary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
              >
                <div className="text-center">
                  <span className="text-[14px] md:text-[16px] font-semibold tabular-nums" style={{ color: "var(--color-text-primary)" }}>{rank}</span>
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <CompanyAvatar name={company.name} logoUrl={company.logoUrl} website={company.website} size={30} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] md:text-[14px] font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{company.name}</span>
                      {company.ticker && (
                        <span className="text-[9px] font-medium px-[4px] py-[1px] rounded-[3px] flex-shrink-0" style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-tertiary)" }}>
                          {company.ticker}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] md:text-[11px] mt-[1px] truncate" style={{ color: "var(--color-text-tertiary)" }}>
                      {company.country}{company.focus[0] && <span style={{ opacity: 0.6 }}> · </span>}{company.focus[0]}
                    </div>
                  </div>
                </div>

                {/* Founded year */}
                <div className="text-right">
                  {company.founded > 0 ? (
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-[12px] md:text-[13px] font-semibold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                        {company.founded}
                      </span>
                      {company.founded >= 2023 && (
                        <span className="text-[8px] px-[3px] py-[1px] rounded-[2px] font-semibold" style={{ background: "var(--color-accent-subtle)", color: "var(--color-accent-dark)" }}>NEW</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>—</span>
                  )}
                </div>

                {/* Mkt Cap */}
                <div className="text-right">
                  {company.valuation ? (
                    <span className="text-[12px] md:text-[13px] tabular-nums" style={{ color: "var(--color-text-secondary)" }}>
                      {formatCurrency(company.valuation)}
                    </span>
                  ) : (
                    <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>—</span>
                  )}
                </div>

                {/* Stage */}
                <div className="flex justify-end">
                  {company.stage ? (
                    <span className="text-[10px] md:text-[11px] px-[5px] py-[2px] rounded-[3px] border whitespace-nowrap" style={{ background: sc.bg, color: sc.text, borderColor: sc.border, borderWidth: "0.5px" }}>
                      {company.stage}
                    </span>
                  ) : (
                    <span className="text-[10px] md:text-[11px] px-[5px] py-[2px] rounded-[3px] border whitespace-nowrap" style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)", borderColor: "var(--color-border-medium)", borderWidth: "0.5px" }}>—</span>
                  )}
                </div>

                {/* About */}
                <div className="truncate">
                  <span className="text-[11px] md:text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
                    {company.description
                      ? (company.description.length > 60 ? company.description.slice(0, 60) + "..." : company.description)
                      : "—"
                    }
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="md:hidden px-4 py-2 text-center">
        <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>← Swipe for more data →</span>
      </div>
    </div>
  );
}
