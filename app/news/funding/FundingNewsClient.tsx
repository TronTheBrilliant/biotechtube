"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { formatMarketCap } from "@/lib/market-utils";
import {
  DollarSign, TrendingUp, Calendar, Building2, Filter,
  ArrowUpRight, Zap, Globe, Tag,
} from "lucide-react";

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

interface DashboardStats {
  monthTotal: number;
  monthCount: number;
  quarterTotal: number;
  yearTotal: number;
  largestThisWeek: { company_name: string; amount_usd: number; round_type: string } | null;
  topSector: string | null;
}

interface Props {
  articles: Article[];
  stats: DashboardStats;
}

const ROUND_FILTERS = ["All", "Seed", "Series A", "Series B", "Series C", "IPO", "Grant", "Venture"];

const SIZE_LABELS: Record<string, string> = {
  mega: "Mega Deal ($500M+)",
  growth: "Growth ($100-500M)",
  early: "Early ($30-100M)",
  seed: "Seed ($10-30M)",
};

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

export function FundingNewsClient({ articles, stats }: Props) {
  const [roundFilter, setRoundFilter] = useState("All");

  const filtered = useMemo(() => {
    if (roundFilter === "All") return articles;
    return articles.filter((a) => a.round_type === roundFilter);
  }, [articles, roundFilter]);

  // Pick top 3 featured: prioritize largest deals, diversify by round type
  const featured = useMemo(() => {
    const candidates = articles.filter((a) => a.is_featured && a.amount_usd && a.amount_usd > 0);
    candidates.sort((a, b) => (b.amount_usd || 0) - (a.amount_usd || 0));
    // Try to diversify by round type
    const picked: Article[] = [];
    const seenTypes = new Set<string>();
    for (const c of candidates) {
      if (picked.length >= 3) break;
      if (!seenTypes.has(c.round_type || "")) {
        picked.push(c);
        seenTypes.add(c.round_type || "");
      }
    }
    // Fill remaining slots with largest
    for (const c of candidates) {
      if (picked.length >= 3) break;
      if (!picked.includes(c)) picked.push(c);
    }
    return picked;
  }, [articles]);

  return (
    <div>
      <Nav />
      <main className="min-h-screen" style={{ background: "var(--color-bg-secondary)" }}>
        {/* Hero */}
        <div className="max-w-[1200px] mx-auto px-5 pt-20 pb-6">
          <h1 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 500, color: "var(--color-text-primary)", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            Funding News
          </h1>
          <p className="mt-2" style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>
            Last 30 days: <span style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>{formatMarketCap(stats.monthTotal)}</span> across {stats.monthCount} rounds
            {" · "}Last 90 days: <span style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>{formatMarketCap(stats.quarterTotal)}</span>
          </p>
        </div>

        <div className="max-w-[1200px] mx-auto px-5 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main feed */}
            <div className="flex-1 min-w-0">
              {/* Featured articles */}
              {featured.length > 0 && (
                <div className="mb-8">
                  <h2 className="flex items-center gap-2 mb-4" style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <Zap size={14} style={{ color: "var(--color-accent)" }} />
                    Featured Deals
                  </h2>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
                    {featured.map((article) => (
                      <FeaturedCard key={article.id} article={article} />
                    ))}
                  </div>
                </div>
              )}

              {/* Filter tabs */}
              <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
                <Filter size={14} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
                {ROUND_FILTERS.map((filter) => {
                  const count = filter === "All" ? articles.length : articles.filter(a => a.round_type === filter).length;
                  return (
                    <button
                      key={filter}
                      onClick={() => setRoundFilter(filter)}
                      className="px-3 py-1.5 rounded-full transition-all shrink-0"
                      style={{
                        fontSize: 12,
                        fontWeight: roundFilter === filter ? 500 : 400,
                        color: roundFilter === filter ? "white" : "var(--color-text-secondary)",
                        background: roundFilter === filter ? "var(--color-accent)" : "var(--color-bg-primary)",
                        border: roundFilter === filter ? "none" : "0.5px solid var(--color-border-subtle)",
                      }}
                    >
                      {filter} <span style={{ opacity: 0.7 }}>({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Article feed */}
              <div className="flex flex-col gap-4">
                {filtered.length === 0 && (
                  <div className="text-center py-12" style={{ color: "var(--color-text-tertiary)", fontSize: 14 }}>
                    No articles for this filter yet.
                  </div>
                )}
                {filtered.map((article, idx) => {
                  const roundColor = ROUND_COLORS[article.round_type || ""] || "var(--color-accent)";
                  const date = article.round_date ? new Date(article.round_date) : null;

                  return (
                    <Link
                      key={article.id}
                      href={`/news/funding/${article.slug}`}
                      className="group rounded-xl overflow-hidden transition-all hover:shadow-sm block"
                      style={{
                        background: "var(--color-bg-primary)",
                        border: "0.5px solid var(--color-border-subtle)",
                      }}
                    >
                      <div className="px-4 py-3">
                        {/* Top meta: company + round + amount */}
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500 }}>
                            {article.company_name}
                          </span>
                          {article.round_type && (
                            <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: 9, fontWeight: 500, color: roundColor, background: `${roundColor}12` }}>
                              {article.round_type}
                            </span>
                          )}
                          {article.amount_usd && article.amount_usd > 0 && (
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>
                              {formatMarketCap(article.amount_usd)}
                            </span>
                          )}
                        </div>

                        {/* Headline */}
                        <h3
                          className="group-hover:underline"
                          style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.35 }}
                        >
                          {article.headline}
                        </h3>

                        {/* Date at bottom */}
                        {date && (
                          <span className="mt-1.5 block" style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                            {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Sidebar */}
            <aside className="w-full lg:w-72 shrink-0">
              <div className="sticky top-20 flex flex-col gap-4">
                {/* Quick links */}
                <div className="rounded-xl p-5" style={{ background: "var(--color-bg-primary)", border: "0.5px solid var(--color-border-subtle)" }}>
                  <h4 className="mb-3" style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>Explore Funding</h4>
                  <div className="flex flex-col gap-2">
                    <SidebarLink href="/funding" label="Full Funding Tracker" icon={<DollarSign size={13} />} />
                    <SidebarLink href="/charts" label="Funding Charts" icon={<TrendingUp size={13} />} />
                    <SidebarLink href="/top-investors" label="Top Investors" icon={<Building2 size={13} />} />
                    <SidebarLink href="/countries" label="Funding by Country" icon={<Globe size={13} />} />
                  </div>
                </div>

                {/* Deal size breakdown */}
                <div className="rounded-xl p-5" style={{ background: "var(--color-bg-primary)", border: "0.5px solid var(--color-border-subtle)" }}>
                  <h4 className="mb-3" style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>By Deal Size</h4>
                  <div className="flex flex-col gap-2">
                    {Object.entries(SIZE_LABELS).map(([key, label]) => {
                      const count = articles.filter((a) => a.deal_size_category === key).length;
                      if (count === 0) return null;
                      return (
                        <div key={key} className="flex justify-between" style={{ fontSize: 12 }}>
                          <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
                          <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Powered by badge */}
                <div className="text-center py-3">
                  <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                    Articles generated by AI · Updated daily
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--color-bg-primary)", border: "0.5px solid var(--color-border-subtle)" }}>
      <div className="flex items-center gap-1.5 mb-2">
        <span style={{ color: "var(--color-text-tertiary)" }}>{icon}</span>
        <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function FeaturedCard({ article }: { article: Article }) {
  const roundColor = ROUND_COLORS[article.round_type || ""] || "var(--color-accent)";
  const date = article.round_date ? new Date(article.round_date) : null;
  return (
    <Link
      href={`/news/funding/${article.slug}`}
      className="group rounded-xl overflow-hidden transition-all hover:shadow-md block flex-shrink-0"
      style={{
        background: "var(--color-bg-primary)",
        border: "0.5px solid var(--color-border-subtle)",
        width: 200,
        minHeight: 220,
      }}
    >
      <div className="p-4 flex flex-col justify-between h-full">
        {/* Top: company + round + amount */}
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500 }}>
              {article.company_name}
            </span>
            {article.round_type && (
              <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: 9, fontWeight: 500, color: roundColor, background: `${roundColor}12` }}>
                {article.round_type}
              </span>
            )}
            {article.amount_usd && article.amount_usd > 0 && (
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                {formatMarketCap(article.amount_usd)}
              </span>
            )}
          </div>
          <h3
            className="group-hover:underline"
            style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.35 }}
          >
            {article.headline}
          </h3>
        </div>

        {/* Bottom: date + sector */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            {date && (
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
            {article.sector && (
              <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>· {article.sector}</span>
            )}
          </div>
          <ArrowUpRight size={12} style={{ color: "var(--color-accent)" }} />
        </div>
      </div>
    </Link>
  );
}

function SidebarLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 py-1.5 transition-opacity hover:opacity-70"
      style={{ fontSize: 13, color: "var(--color-text-secondary)" }}
    >
      <span style={{ color: "var(--color-accent)" }}>{icon}</span>
      {label}
    </Link>
  );
}
