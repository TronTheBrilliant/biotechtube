"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { formatMarketCap } from "@/lib/market-utils";
import {
  DollarSign, TrendingUp, Calendar, Building2, Filter,
  ChevronRight, ArrowUpRight, Zap, Globe, Tag,
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

  const featured = articles.filter((a) => a.is_featured).slice(0, 3);

  return (
    <div>
      <Nav />
      <main className="min-h-screen" style={{ background: "var(--color-bg-secondary)" }}>
        {/* Hero */}
        <div style={{ background: "var(--color-bg-primary)", borderBottom: "0.5px solid var(--color-border-subtle)" }}>
          <div className="max-w-[1200px] mx-auto px-5 pt-20 pb-10">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={16} style={{ color: "var(--color-accent)" }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-accent)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Funding Intelligence
              </span>
            </div>
            <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 500, color: "var(--color-text-primary)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              Biotech Funding News
            </h1>
            <p className="mt-3 max-w-xl" style={{ fontSize: 16, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              AI-generated analysis of the latest biotech funding rounds. Real-time deal flow intelligence across the global biotech industry.
            </p>

            {/* Dashboard strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-8">
              <StatCard label="This Month" value={formatMarketCap(stats.monthTotal)} sub={`${stats.monthCount} rounds`} icon={<Calendar size={14} />} />
              <StatCard label="This Quarter" value={formatMarketCap(stats.quarterTotal)} icon={<TrendingUp size={14} />} />
              <StatCard label="Year to Date" value={formatMarketCap(stats.yearTotal)} icon={<DollarSign size={14} />} />
              {stats.largestThisWeek && (
                <StatCard
                  label="Largest This Week"
                  value={formatMarketCap(stats.largestThisWeek.amount_usd)}
                  sub={stats.largestThisWeek.company_name}
                  icon={<Zap size={14} />}
                />
              )}
              {stats.topSector && (
                <StatCard label="Hot Sector" value={stats.topSector} icon={<Tag size={14} />} />
              )}
              <StatCard label="Articles" value={String(articles.length)} sub="AI-generated" icon={<Building2 size={14} />} />
            </div>
          </div>
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
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {featured.map((article) => (
                      <FeaturedCard key={article.id} article={article} />
                    ))}
                  </div>
                </div>
              )}

              {/* Filter tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
                {ROUND_FILTERS.map((filter) => (
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
                    {filter}
                  </button>
                ))}
              </div>

              {/* Article feed */}
              <div className="flex flex-col gap-4">
                {filtered.length === 0 && (
                  <div className="text-center py-12" style={{ color: "var(--color-text-tertiary)", fontSize: 14 }}>
                    No articles for this filter yet.
                  </div>
                )}
                {filtered.map((article) => {
                  const roundColor = ROUND_COLORS[article.round_type || ""] || "var(--color-accent)";
                  const date = article.round_date ? new Date(article.round_date) : null;
                  const excerpt = article.body.split("\n\n")[0]?.substring(0, 160) + "...";

                  return (
                    <Link
                      key={article.id}
                      href={`/news/funding/${article.slug}`}
                      className="group rounded-xl overflow-hidden transition-all hover:shadow-md block"
                      style={{
                        background: "var(--color-bg-primary)",
                        border: "0.5px solid var(--color-border-subtle)",
                      }}
                    >
                      {/* Color accent bar */}
                      <div className="h-0.5" style={{ background: roundColor }} />

                      <div className="p-5">
                        {/* Meta line */}
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          {article.round_type && (
                            <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 500, color: roundColor, background: `${roundColor}12` }}>
                              {article.round_type}
                            </span>
                          )}
                          {article.amount_usd && article.amount_usd > 0 && (
                            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>
                              {formatMarketCap(article.amount_usd)}
                            </span>
                          )}
                          {date && (
                            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                              {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          )}
                          {article.sector && (
                            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>· {article.sector}</span>
                          )}
                        </div>

                        {/* Headline */}
                        <h3
                          className="group-hover:underline"
                          style={{ fontSize: 17, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.35 }}
                        >
                          {article.headline}
                        </h3>

                        {/* Subtitle */}
                        {article.subtitle && (
                          <p className="mt-1.5" style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
                            {article.subtitle}
                          </p>
                        )}

                        {/* Excerpt */}
                        <p className="mt-2" style={{ fontSize: 13, color: "var(--color-text-tertiary)", lineHeight: 1.6 }}>
                          {excerpt}
                        </p>

                        {/* Company + investor + read more */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-3">
                            <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500 }}>
                              {article.company_name}
                            </span>
                            {article.lead_investor && article.lead_investor !== "Undisclosed" && (
                              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                                Led by {article.lead_investor}
                              </span>
                            )}
                          </div>
                          <span className="flex items-center gap-1" style={{ fontSize: 12, color: "var(--color-accent)", fontWeight: 500 }}>
                            Read <ChevronRight size={12} />
                          </span>
                        </div>
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
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--color-bg-primary)", border: "0.5px solid var(--color-border-subtle)" }}>
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${roundColor}, ${roundColor}60)` }} />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {article.round_type && (
            <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 9, fontWeight: 500, color: roundColor, background: `${roundColor}12` }}>
              {article.round_type}
            </span>
          )}
          {article.amount_usd && (
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
              {formatMarketCap(article.amount_usd)}
            </span>
          )}
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.35 }}>
          {article.headline}
        </h3>
        <div className="mt-2" style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
          {article.company_name}
        </div>
      </div>
    </div>
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
