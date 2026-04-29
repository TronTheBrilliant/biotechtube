"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import HeroWithLogo from "@/components/news/HeroWithLogo";
import type { PlaceholderStyle } from "@/lib/article-engine/types";
import { Rss, Clock, ChevronRight } from "lucide-react";

// ── Types ──

interface ArticleRow {
  slug: string;
  headline: string;
  subtitle: string | null;
  summary: string | null;
  type: string;
  company_id: string | null;
  hero_image_url: string | null;
  hero_placeholder_style: PlaceholderStyle | null;
  published_at: string | null;
  reading_time_min: number | null;
}

type CompanyMap = Record<string, { name: string; logo_url: string | null; slug: string }>;

// ── Constants ──

// One Voice Rule: type pills are neutral chrome. The label IS the signal.
// "Breaking" gets the only colored variant — it's the one type whose value
// is "look at me right now."
const TYPE_CONFIG: Record<string, { label: string; tone: "default" | "breaking" }> = {
  funding_deal: { label: "Funding", tone: "default" },
  clinical_trial: { label: "Clinical Trial", tone: "default" },
  market_analysis: { label: "Market", tone: "default" },
  company_deep_dive: { label: "Spotlight", tone: "default" },
  weekly_roundup: { label: "Roundup", tone: "default" },
  breaking_news: { label: "Breaking", tone: "breaking" },
  science_essay: { label: "Deep Science", tone: "default" },
  innovation_spotlight: { label: "Innovation", tone: "default" },
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "funding_deal", label: "Funding" },
  { key: "clinical_trial", label: "Clinical Trials" },
  { key: "market_analysis", label: "Market" },
  { key: "company_deep_dive", label: "Companies" },
  { key: "weekly_roundup", label: "Roundups" },
  { key: "breaking_news", label: "Breaking" },
  { key: "science_essay", label: "Deep Science" },
  { key: "innovation_spotlight", label: "Innovation" },
];

// ── Helpers ──

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return "Just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;

  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? { label: "News", tone: "default" as const };
}

function typePillStyle(tone: "default" | "breaking"): React.CSSProperties {
  if (tone === "breaking") {
    return {
      color: "var(--color-negative)",
      background: "var(--color-bg-secondary)",
      border: "0.5px solid var(--color-negative)",
    };
  }
  return {
    color: "var(--color-text-secondary)",
    background: "var(--color-bg-tertiary)",
    border: "0.5px solid var(--color-border-subtle)",
  };
}

// ── Component ──

export function NewsClient({
  initialArticles,
  typeCounts,
  totalCount,
  initialType,
  initialCompanyMap,
}: {
  initialArticles: ArticleRow[];
  typeCounts: Record<string, number>;
  totalCount: number;
  initialType: string;
  initialCompanyMap: CompanyMap;
}) {
  const [activeFilter, setActiveFilter] = useState(initialType);
  const [articles, setArticles] = useState<ArticleRow[]>(initialArticles);
  const [companyMap, setCompanyMap] = useState<CompanyMap>(initialCompanyMap);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialArticles.length > 10);

  // The displayed articles (first 10; the 11th is only used to detect hasMore)
  const displayArticles = articles.slice(0, page * 10);
  const featured = displayArticles[0] || null;
  const gridArticles = displayArticles.slice(1);

  const fetchArticles = useCallback(
    async (type: string, pageNum: number, append: boolean) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (type !== "all") params.set("type", type);
        params.set("page", String(pageNum));
        const res = await fetch(`/api/news?${params}`);
        const json = await res.json();
        const newArticles: ArticleRow[] = json.articles || [];
        const newCompanies: CompanyMap = json.companies || {};

        if (append) {
          setArticles((prev) => [...prev, ...newArticles]);
          setCompanyMap((prev) => ({ ...prev, ...newCompanies }));
        } else {
          setArticles(newArticles);
          setCompanyMap(newCompanies);
        }
        setHasMore(newArticles.length >= 10);
      } catch {
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleFilterChange = (type: string) => {
    setActiveFilter(type);
    setPage(1);
    fetchArticles(type, 1, false);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchArticles(activeFilter, nextPage, true);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <span
            className="block mb-2 font-semibold uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.5px",
              color: "var(--color-text-tertiary)",
            }}
          >
            Intelligence
          </span>
          <h1
            className="text-display-sm"
            style={{ color: "var(--color-text-primary)", margin: 0 }}
          >
            Biotech Intelligence
          </h1>
          <p
            className="mt-2"
            style={{
              fontSize: 14,
              color: "var(--color-text-secondary)",
              lineHeight: 1.55,
              maxWidth: 560,
            }}
          >
            Daily analysis of funding, clinical trials, market moves, and company news, drawn from public sources.
          </p>
        </div>

        {/* RSS link */}
        <a
          href="/api/feed/rss"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          style={{
            fontSize: 12,
            color: "var(--color-text-tertiary)",
          }}
        >
          <Rss size={14} />
          RSS
        </a>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          const count = tab.key === "all" ? totalCount : typeCounts[tab.key] || 0;
          return (
            <button
              key={tab.key}
              onClick={() => handleFilterChange(tab.key)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-sm transition-colors"
              style={{
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.2px",
                color: isActive ? "var(--color-accent-dark, var(--color-accent))" : "var(--color-text-secondary)",
                background: isActive ? "var(--color-accent-subtle)" : "var(--color-bg-secondary)",
                border: isActive
                  ? "1px solid var(--color-accent)"
                  : "0.5px solid var(--color-border-subtle)",
                cursor: "pointer",
              }}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    background: isActive ? "var(--color-bg-primary)" : "var(--color-bg-tertiary)",
                    color: isActive ? "var(--color-accent)" : "var(--color-text-tertiary)",
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {articles.length === 0 && !loading && (
        <div
          className="text-center py-16 rounded-xl"
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
          }}
        >
          <p style={{ fontSize: 14, color: "var(--color-text-tertiary)" }}>
            No articles found for this category.
          </p>
        </div>
      )}

      {/* Featured article (first/most recent) */}
      {featured && (
        <Link
          href={`/news/${featured.slug}`}
          className="block rounded-xl overflow-hidden mb-8 transition-shadow duration-150 hover:shadow-md group"
          style={{
            background: "var(--color-bg-primary)",
            border: "0.5px solid var(--color-border-subtle)",
          }}
        >
          <div className="md:flex">
            {/* Hero */}
            <div className="md:w-3/5 h-60 md:h-80 overflow-hidden relative">
              <HeroWithLogo
                imageUrl={featured.hero_image_url}
                placeholderStyle={featured.hero_placeholder_style}
                headline={featured.headline}
                companyLogo={featured.company_id && companyMap[featured.company_id]?.logo_url}
                companyName={featured.company_id && companyMap[featured.company_id]?.name}
                className="w-full h-full"
              />
            </div>

            {/* Content */}
            <div className="md:w-2/5 p-5 md:p-6 flex flex-col justify-center">
              {/* Type badge + date */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="px-2 py-0.5 rounded-sm uppercase"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.4px",
                    ...typePillStyle(getTypeConfig(featured.type).tone),
                  }}
                >
                  {getTypeConfig(featured.type).label}
                </span>
                <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                  {timeAgo(featured.published_at)}
                </span>
              </div>

              {/* Company info */}
              {featured.company_id && companyMap[featured.company_id] && (
                <div className="flex items-center gap-2 mb-2">
                  {companyMap[featured.company_id].logo_url ? (
                    <img
                      src={companyMap[featured.company_id].logo_url!}
                      alt=""
                      className="rounded"
                      style={{ width: 20, height: 20, objectFit: 'contain' }}
                    />
                  ) : (
                    <div
                      className="rounded flex items-center justify-center"
                      style={{
                        width: 20, height: 20,
                        background: 'var(--color-accent)',
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {companyMap[featured.company_id].name.charAt(0)}
                    </div>
                  )}
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    {companyMap[featured.company_id].name}
                  </span>
                </div>
              )}

              <h2
                className="line-clamp-3 mb-2 group-hover:opacity-80 transition-opacity"
                style={{
                  fontSize: "clamp(18px, 2.5vw, 24px)",
                  fontWeight: 500,
                  color: "var(--color-text-primary)",
                  lineHeight: 1.3,
                  letterSpacing: "-0.01em",
                }}
              >
                {featured.headline}
              </h2>

              {featured.subtitle && (
                <p
                  className="line-clamp-2 mb-3"
                  style={{
                    fontSize: 14,
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {featured.subtitle}
                </p>
              )}

              {featured.reading_time_min && (
                <div
                  className="flex items-center gap-1 mt-auto"
                  style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}
                >
                  <Clock size={12} />
                  {featured.reading_time_min} min read
                </div>
              )}
            </div>
          </div>
        </Link>
      )}

      {/* Article grid */}
      {gridArticles.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-5 mb-8">
          {gridArticles.map((article) => {
            const cfg = getTypeConfig(article.type);
            return (
              <Link
                key={article.slug}
                href={`/news/${article.slug}`}
                className="block rounded-xl overflow-hidden transition-shadow duration-150 hover:shadow-md group"
                style={{
                  background: "var(--color-bg-primary)",
                  border: "0.5px solid var(--color-border-subtle)",
                }}
              >
                {/* Hero image */}
                <div className="h-56 overflow-hidden relative">
                  <HeroWithLogo
                    imageUrl={article.hero_image_url}
                    placeholderStyle={article.hero_placeholder_style}
                    headline={article.headline}
                    companyLogo={article.company_id && companyMap[article.company_id]?.logo_url}
                    companyName={article.company_id && companyMap[article.company_id]?.name}
                    className="w-full h-full"
                  />
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Type badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="px-2 py-0.5 rounded-sm uppercase"
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.4px",
                        ...typePillStyle(cfg.tone),
                      }}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  {/* Company info */}
                  {article.company_id && companyMap[article.company_id] && (
                    <div className="flex items-center gap-2 mb-1.5">
                      {companyMap[article.company_id].logo_url ? (
                        <img
                          src={companyMap[article.company_id].logo_url!}
                          alt=""
                          className="rounded"
                          style={{ width: 16, height: 16, objectFit: 'contain' }}
                        />
                      ) : (
                        <div
                          className="rounded flex items-center justify-center"
                          style={{
                            width: 16, height: 16,
                            background: 'var(--color-accent)',
                            color: 'white',
                            fontSize: 9,
                            fontWeight: 700,
                          }}
                        >
                          {companyMap[article.company_id].name.charAt(0)}
                        </div>
                      )}
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                        {companyMap[article.company_id].name}
                      </span>
                    </div>
                  )}

                  {/* Headline */}
                  <h3
                    className="line-clamp-2 mb-1.5 group-hover:opacity-80 transition-opacity"
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: "var(--color-text-primary)",
                      lineHeight: 1.35,
                    }}
                  >
                    {article.headline}
                  </h3>

                  {/* Summary */}
                  {article.summary && (
                    <p
                      className="line-clamp-2 mb-3"
                      style={{
                        fontSize: 13,
                        color: "var(--color-text-secondary)",
                        lineHeight: 1.5,
                      }}
                    >
                      {article.summary}
                    </p>
                  )}

                  {/* Reading time + date */}
                  <div
                    className="flex items-center gap-3"
                    style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}
                  >
                    {article.reading_time_min && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {article.reading_time_min} min
                      </span>
                    )}
                    <span>{formatDate(article.published_at)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center mb-8">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-md transition-colors hover:bg-[var(--color-bg-tertiary)]"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-text-primary)",
              background: "var(--color-bg-primary)",
              border: "0.5px solid var(--color-border-medium)",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Loading…" : "Load more"}
            {!loading && <ChevronRight size={14} />}
          </button>
        </div>
      )}
    </div>
  );
}
