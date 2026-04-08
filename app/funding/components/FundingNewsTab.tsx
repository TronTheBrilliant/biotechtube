"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { TrendingUp, Building2, Globe, ArrowUpRight, Zap } from "lucide-react";
import { formatMarketCap } from "@/lib/market-utils";
import type { FundingPulse } from "@/lib/funding-intelligence-queries";

// ── Types ──

interface Article {
  id: string;
  slug: string;
  headline: string;
  subtitle: string | null;
  body: string;
  company_name: string;
  company_slug: string | null;
  round_type: string | null;
  amount_usd: number | null;
  lead_investor: string | null;
  round_date: string | null;
  sector: string | null;
  country: string | null;
  deal_size_category: string | null;
  article_type: string;
  is_featured: boolean;
  published_at: string;
}

interface Props {
  articles: Article[];
  pulse: FundingPulse;
}

// ── Constants ──

const ROUND_COLORS: Record<string, string> = {
  Seed: "#16a34a",
  "Series A": "#2563eb",
  "Series B": "#7c3aed",
  "Series C": "#d97706",
  "Series D": "#dc2626",
  IPO: "#059669",
  Grant: "#0891b2",
  Venture: "#6366f1",
};

const FILTER_PILLS = ["All", "Seed", "Series A", "Series B", "Series C", "IPO", "Grant", "Venture"];
const PAGE_SIZE = 10;

// ── Helpers ──

function roundColor(type: string | null): string {
  if (!type) return "#6b7280";
  return ROUND_COLORS[type] ?? "#6b7280";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1w ago";
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return months <= 1 ? "1mo ago" : `${months}mo ago`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Sector color palette ──

const SECTOR_COLORS = [
  "#16a34a", "#2563eb", "#7c3aed", "#d97706", "#dc2626",
  "#059669", "#0891b2", "#6366f1", "#db2777", "#ca8a04",
  "#0d9488", "#4f46e5", "#e11d48", "#65a30d",
];

function sectorColor(idx: number): string {
  return SECTOR_COLORS[idx % SECTOR_COLORS.length];
}

// ── Component ──

export function FundingNewsTab({ articles, pulse }: Props) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [page, setPage] = useState(0);

  // Live ticker
  const latestDealAge = pulse.latestDealDate
    ? Math.floor((Date.now() - new Date(pulse.latestDealDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const showTicker = latestDealAge !== null && latestDealAge <= 7 && pulse.latestDealCompany;

  // Featured deals — top 3 featured with amount, diversified by round_type
  const featuredDeals = useMemo(() => {
    const seen = new Set<string>();
    return articles
      .filter((a) => a.is_featured && a.amount_usd && a.amount_usd > 0)
      .filter((a) => {
        const key = a.round_type ?? "other";
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 3);
  }, [articles]);

  // Filtered articles
  const filtered = useMemo(() => {
    if (activeFilter === "All") return articles;
    return articles.filter((a) => a.round_type === activeFilter);
  }, [articles, activeFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Sector heatmap
  const sectorCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of articles) {
      if (a.sector) map.set(a.sector, (map.get(a.sector) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [articles]);

  // Deal flow sparkline — last 7 weeks
  const weekBars = useMemo(() => {
    const now = Date.now();
    const weeks = Array.from({ length: 7 }, () => 0);
    for (const a of articles) {
      const age = now - new Date(a.published_at).getTime();
      const weekIdx = Math.floor(age / (7 * 24 * 60 * 60 * 1000));
      if (weekIdx >= 0 && weekIdx < 7) weeks[6 - weekIdx]++;
    }
    return weeks;
  }, [articles]);
  const maxBar = Math.max(...weekBars, 1);

  // Deal size breakdown
  const sizeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of articles) {
      const cat = a.deal_size_category ?? "Unknown";
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [articles]);

  return (
    <div>
      {/* Live deal ticker */}
      {showTicker && (
        <div
          className="mb-6 rounded-lg px-4 py-2.5 flex items-center gap-2"
          style={{
            background: "var(--color-bg-accent-subtle, #f0fdf4)",
            border: "0.5px solid var(--color-border-subtle)",
          }}
        >
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
            style={{
              background: "var(--color-accent)",
              color: "white",
              animation: "fundingNewsPulse 2s ease-in-out infinite",
            }}
          >
            LIVE
          </span>
          <span className="text-[12px] truncate" style={{ color: "var(--color-text-secondary)" }}>
            <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>
              {pulse.latestDealCompany}
            </span>
            {" "}raised{" "}
            {pulse.latestDealAmount ? formatMarketCap(pulse.latestDealAmount) : ""}
            {pulse.latestDealType ? ` ${pulse.latestDealType}` : ""}
            {" "}· {latestDealAge === 0 ? "today" : `${latestDealAge}d ago`}
          </span>
          {pulse.latestDealSlug && (
            <Link
              href={`/news/funding/${pulse.latestDealSlug}`}
              className="text-[10px] font-medium shrink-0 ml-auto flex items-center gap-0.5"
              style={{ color: "var(--color-accent)" }}
            >
              View <ArrowUpRight size={10} />
            </Link>
          )}
          <style>{`@keyframes fundingNewsPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }`}</style>
        </div>
      )}

      {/* Featured deals — horizontal scroll */}
      {featuredDeals.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} style={{ color: "var(--color-accent)" }} />
            <h3 className="text-[14px] font-medium" style={{ color: "var(--color-text-primary)" }}>
              Featured Deals
            </h3>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
            {featuredDeals.map((a) => (
              <Link
                key={a.id}
                href={`/news/funding/${a.slug}`}
                className="shrink-0 rounded-xl flex flex-col justify-between hover:opacity-90 transition-opacity"
                style={{
                  width: 240,
                  background: "var(--color-bg-secondary)",
                  border: "0.5px solid var(--color-border-subtle)",
                  borderTop: `3px solid ${roundColor(a.round_type)}`,
                  padding: 16,
                  minHeight: 160,
                }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{
                        background: `${roundColor(a.round_type)}18`,
                        color: roundColor(a.round_type),
                      }}
                    >
                      {a.round_type ?? "Round"}
                    </span>
                    {a.amount_usd ? (
                      <span className="text-[12px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {formatMarketCap(a.amount_usd)}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[13px] font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
                    {a.company_name}
                  </div>
                  <div
                    className="text-[11px] line-clamp-2"
                    style={{ color: "var(--color-text-secondary)", lineHeight: "1.4" }}
                  >
                    {a.headline}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
                    {formatDate(a.round_date)} {a.sector ? `· ${a.sector}` : ""}
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: "var(--color-accent)" }}>
                    Read analysis &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Filter pills */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
            {FILTER_PILLS.map((pill) => (
              <button
                key={pill}
                onClick={() => { setActiveFilter(pill); setPage(0); }}
                className="text-[11px] font-medium px-3 py-1 rounded-full whitespace-nowrap transition-colors"
                style={{
                  background: activeFilter === pill ? "var(--color-bg-secondary)" : "transparent",
                  color: activeFilter === pill ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                  border: activeFilter === pill ? "0.5px solid var(--color-border-subtle)" : "0.5px solid transparent",
                }}
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Latest Rounds list */}
          <div className="flex flex-col gap-1">
            {paged.length === 0 && (
              <div className="text-[12px] py-8 text-center" style={{ color: "var(--color-text-tertiary)" }}>
                No articles found for this filter.
              </div>
            )}
            {paged.map((a) => (
              <Link
                key={a.id}
                href={`/news/funding/${a.slug}`}
                className="rounded-lg px-4 py-3 flex items-start gap-3 hover:opacity-80 transition-opacity group"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "0.5px solid var(--color-border-subtle)",
                }}
              >
                {/* Left accent dot */}
                <div
                  className="shrink-0 mt-1.5 rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    background: roundColor(a.round_type),
                    opacity: 0.7,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {a.company_name}
                    </span>
                    {a.round_type && (
                      <span
                        className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          background: `${roundColor(a.round_type)}18`,
                          color: roundColor(a.round_type),
                        }}
                      >
                        {a.round_type}
                      </span>
                    )}
                    {a.amount_usd ? (
                      <span className="text-[11px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                        {formatMarketCap(a.amount_usd)}
                      </span>
                    ) : null}
                  </div>
                  <div
                    className="text-[12px] line-clamp-1"
                    style={{ color: "var(--color-text-secondary)", lineHeight: "1.4" }}
                  >
                    {a.headline}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                    {formatDate(a.round_date || a.published_at)}
                    {a.sector ? ` · ${a.sector}` : ""}
                    {a.lead_investor ? ` · ${a.lead_investor}` : ""}
                  </div>
                </div>
                <ArrowUpRight
                  size={14}
                  className="shrink-0 mt-1 opacity-0 group-hover:opacity-60 transition-opacity"
                  style={{ color: "var(--color-text-tertiary)" }}
                />
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "0.5px solid var(--color-border-subtle)" }}>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-30"
                style={{
                  color: "var(--color-text-secondary)",
                  background: "var(--color-bg-secondary)",
                  border: "0.5px solid var(--color-border-subtle)",
                }}
              >
                Previous
              </button>
              <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-30"
                style={{
                  color: "var(--color-text-secondary)",
                  background: "var(--color-bg-secondary)",
                  border: "0.5px solid var(--color-border-subtle)",
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
          {/* Explore Funding quick links */}
          <div
            className="rounded-xl px-4 py-4"
            style={{
              background: "var(--color-bg-secondary)",
              border: "0.5px solid var(--color-border-subtle)",
            }}
          >
            <h4 className="text-[12px] font-medium mb-3" style={{ color: "var(--color-text-primary)" }}>
              Explore Funding
            </h4>
            <div className="flex flex-col gap-2">
              {[
                { label: "Charts", icon: TrendingUp, desc: "Volume & trends" },
                { label: "Top Investors", icon: Building2, desc: "Lead investors" },
                { label: "Countries", icon: Globe, desc: "Geographic breakdown" },
              ].map((item) => (
                <button
                  key={item.label}
                  className="flex items-center gap-3 text-left rounded-lg px-3 py-2 transition-opacity hover:opacity-80"
                  style={{
                    background: "var(--color-bg-primary, transparent)",
                    border: "0.5px solid var(--color-border-subtle)",
                  }}
                >
                  <item.icon size={14} style={{ color: "var(--color-accent)", opacity: 0.8 }} />
                  <div>
                    <div className="text-[12px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {item.label}
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
                      {item.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sector Heatmap */}
          {sectorCounts.length > 0 && (
            <div
              className="rounded-xl px-4 py-4"
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
              }}
            >
              <h4 className="text-[12px] font-medium mb-3" style={{ color: "var(--color-text-primary)" }}>
                Sector Heatmap
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {sectorCounts.map(([sector, count], idx) => (
                  <span
                    key={sector}
                    className="text-[10px] font-medium px-2 py-1 rounded-full"
                    style={{
                      background: `${sectorColor(idx)}14`,
                      color: sectorColor(idx),
                      border: `0.5px solid ${sectorColor(idx)}30`,
                    }}
                  >
                    {sector} ({count})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Deal Flow Sparkline */}
          <div
            className="rounded-xl px-4 py-4"
            style={{
              background: "var(--color-bg-secondary)",
              border: "0.5px solid var(--color-border-subtle)",
            }}
          >
            <h4 className="text-[12px] font-medium mb-3" style={{ color: "var(--color-text-primary)" }}>
              Deal Flow (7 weeks)
            </h4>
            <div className="flex items-end gap-1" style={{ height: 48 }}>
              {weekBars.map((count, i) => {
                const isMax = count === maxBar && count > 0;
                const h = maxBar > 0 ? (count / maxBar) * 100 : 0;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-sm transition-all"
                    style={{
                      height: `${Math.max(h, 4)}%`,
                      background: isMax ? "var(--color-accent)" : "var(--color-border-subtle)",
                      opacity: isMax ? 1 : 0.5,
                    }}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[9px]" style={{ color: "var(--color-text-tertiary)" }}>7w ago</span>
              <span className="text-[9px]" style={{ color: "var(--color-text-tertiary)" }}>This week</span>
            </div>
          </div>

          {/* By Deal Size */}
          {sizeCounts.length > 0 && (
            <div
              className="rounded-xl px-4 py-4"
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
              }}
            >
              <h4 className="text-[12px] font-medium mb-3" style={{ color: "var(--color-text-primary)" }}>
                By Deal Size
              </h4>
              <div className="flex flex-col gap-2">
                {sizeCounts.map(([cat, count]) => {
                  const pct = articles.length > 0 ? (count / articles.length) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>{cat}</span>
                        <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>{count}</span>
                      </div>
                      <div className="rounded-full overflow-hidden" style={{ height: 4, background: "var(--color-border-subtle)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: "var(--color-accent)",
                            opacity: 0.7,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center py-2">
            <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
              Articles generated by AI · Updated daily
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
