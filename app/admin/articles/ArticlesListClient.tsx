"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { ADMIN_EMAIL } from "@/lib/admin-utils";
import { AdminNav } from "@/components/admin/AdminNav";
import { Loader2 } from "lucide-react";

type ArticleStatus = "published" | "in_review" | "draft" | "archived";

interface Article {
  id: string;
  slug: string;
  type: string;
  status: ArticleStatus;
  confidence: string;
  headline: string;
  subtitle: string;
  published_at: string | null;
  created_at: string;
  reading_time_min: number | null;
  edited_by: string | null;
}

const STATUS_FILTERS: { label: string; value: string; color: string }[] = [
  { label: "All", value: "all", color: "var(--color-text-secondary)" },
  { label: "Published", value: "published", color: "#22c55e" },
  { label: "In Review", value: "in_review", color: "#eab308" },
  { label: "Draft", value: "draft", color: "#9ca3af" },
  { label: "Archived", value: "archived", color: "#ef4444" },
];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  funding_deal: { bg: "#065f4620", text: "#10b981" },
  clinical_trial: { bg: "#1e40af20", text: "#3b82f6" },
  market_analysis: { bg: "#6b21a820", text: "#a855f7" },
  company_deep_dive: { bg: "#9a340620", text: "#f97316" },
  weekly_roundup: { bg: "#854d0e20", text: "#eab308" },
  breaking_news: { bg: "#991b1b20", text: "#ef4444" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  published: { bg: "#22c55e20", text: "#22c55e" },
  in_review: { bg: "#eab30820", text: "#eab308" },
  draft: { bg: "#9ca3af20", text: "#9ca3af" },
  archived: { bg: "#ef444420", text: "#ef4444" },
};

const CONFIDENCE_COLORS: Record<string, { bg: string; text: string }> = {
  high: { bg: "#22c55e20", text: "#22c55e" },
  medium: { bg: "#eab30820", text: "#eab308" },
  low: { bg: "#ef444420", text: "#ef4444" },
};

function formatLabel(s: string): string {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function ArticlesListClient() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [inReviewCount, setInReviewCount] = useState(0);

  // Fetch in_review count on mount
  useEffect(() => {
    if (authLoading || user?.email !== ADMIN_EMAIL) return;
    fetch("/api/admin/articles?status=in_review")
      .then((r) => r.json())
      .then((d) => setInReviewCount(d.articles?.length || 0))
      .catch(() => {});
  }, [authLoading, user]);

  // Fetch articles when filter changes
  useEffect(() => {
    if (authLoading || user?.email !== ADMIN_EMAIL) return;
    setLoading(true);
    fetch(`/api/admin/articles?status=${filter}`)
      .then((r) => r.json())
      .then((d) => setArticles(d.articles || []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [filter, authLoading, user]);

  if (authLoading) {
    return (
      <>
        <Nav />
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
        </div>
        <Footer />
      </>
    );
  }

  if (user?.email !== ADMIN_EMAIL) {
    return (
      <>
        <Nav />
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", color: "var(--color-text-secondary)" }}>
          Admin access required
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
        <AdminNav />

        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24, color: "var(--color-text-primary)" }}>
          Articles
        </h1>

        {/* Status filter pills */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {STATUS_FILTERS.map((sf) => {
            const isActive = filter === sf.value;
            const showCount = sf.value === "in_review" && inReviewCount > 0;
            return (
              <button
                key={sf.value}
                onClick={() => setFilter(sf.value)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  border: `1px solid ${sf.color}`,
                  background: isActive ? sf.color : "transparent",
                  color: isActive ? "#fff" : sf.color,
                  transition: "all 0.15s",
                }}
              >
                {sf.label}
                {showCount && (
                  <span
                    style={{
                      background: isActive ? "rgba(255,255,255,0.3)" : sf.color,
                      color: isActive ? "#fff" : "#fff",
                      borderRadius: 999,
                      padding: "1px 7px",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {inReviewCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Article list */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "var(--color-text-tertiary)" }} />
          </div>
        ) : articles.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 48,
              color: "var(--color-text-tertiary)",
              fontSize: 14,
            }}
          >
            No articles found
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Header row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "100px 1fr 90px 80px 90px 70px",
                gap: 12,
                padding: "8px 12px",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                borderBottom: "1px solid var(--color-border-subtle)",
              }}
            >
              <span>Type</span>
              <span>Headline</span>
              <span>Status</span>
              <span>Confidence</span>
              <span>Date</span>
              <span>Editor</span>
            </div>

            {/* Article rows */}
            {articles.map((article) => {
              const typeStyle = TYPE_COLORS[article.type] || { bg: "#6b728020", text: "#6b7280" };
              const statusStyle = STATUS_COLORS[article.status] || { bg: "#6b728020", text: "#6b7280" };
              const confStyle = CONFIDENCE_COLORS[article.confidence] || { bg: "#6b728020", text: "#6b7280" };

              return (
                <div
                  key={article.id}
                  onClick={() => router.push(`/admin/articles/${article.id}`)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "100px 1fr 90px 80px 90px 70px",
                    gap: 12,
                    padding: "10px 12px",
                    alignItems: "center",
                    cursor: "pointer",
                    borderRadius: 6,
                    transition: "background 0.1s",
                    borderBottom: "1px solid var(--color-border-subtle)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Type badge */}
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 500,
                      background: typeStyle.bg,
                      color: typeStyle.text,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {formatLabel(article.type)}
                  </span>

                  {/* Headline */}
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={article.headline}
                  >
                    {article.headline.length > 60
                      ? article.headline.slice(0, 60) + "..."
                      : article.headline}
                  </span>

                  {/* Status badge */}
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 500,
                      background: statusStyle.bg,
                      color: statusStyle.text,
                    }}
                  >
                    {formatLabel(article.status)}
                  </span>

                  {/* Confidence badge */}
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 500,
                      background: confStyle.bg,
                      color: confStyle.text,
                    }}
                  >
                    {article.confidence ? formatLabel(article.confidence) : "-"}
                  </span>

                  {/* Date */}
                  <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                    {timeAgo(article.published_at || article.created_at)}
                  </span>

                  {/* Edited by */}
                  <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                    {article.edited_by || "AI"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
