"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import {
  ADMIN_EMAIL,
  ConfirmDialog,
  timeAgo,
  TYPE_CONFIG,
  STATUS_COLORS as SHARED_STATUS_COLORS,
  CONFIDENCE_COLORS as SHARED_CONFIDENCE_COLORS,
} from "@/lib/admin-utils";
import { AdminNav } from "@/components/admin/AdminNav";
import { Loader2, Search } from "lucide-react";

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

// Derive bg+text color maps from shared constants
const TYPE_COLORS: Record<string, { bg: string; text: string }> = Object.fromEntries(
  Object.entries(TYPE_CONFIG).map(([k, v]) => [k, { bg: `${v.color}20`, text: v.color }])
);

const STATUS_COLORS: Record<string, { bg: string; text: string }> = Object.fromEntries(
  Object.entries(SHARED_STATUS_COLORS).map(([k, c]) => [k, { bg: `${c}20`, text: c }])
);

const CONFIDENCE_COLORS: Record<string, { bg: string; text: string }> = Object.fromEntries(
  Object.entries(SHARED_CONFIDENCE_COLORS).map(([k, c]) => [k, { bg: `${c}20`, text: c }])
);

function formatLabel(s: string): string {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function ArticlesListClient() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [inReviewCount, setInReviewCount] = useState(0);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk action state
  const [bulkAction, setBulkAction] = useState<"publish" | "archive" | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  // Debounce search input
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 200);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Filter articles by search
  const filteredArticles = debouncedSearch
    ? articles.filter((a) =>
        a.headline.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : articles;

  // Fetch in_review count on mount
  useEffect(() => {
    if (authLoading || user?.email !== ADMIN_EMAIL) return;
    fetch("/api/admin/articles?status=in_review")
      .then((r) => r.json())
      .then((d) => setInReviewCount(d.articles?.length || 0))
      .catch((err) => console.error("Failed to fetch in_review count:", err));
  }, [authLoading, user]);

  // Fetch articles when filter changes
  const fetchArticles = useCallback(() => {
    if (authLoading || user?.email !== ADMIN_EMAIL) return;
    setLoading(true);
    fetch(`/api/admin/articles?status=${filter}`)
      .then((r) => r.json())
      .then((d) => setArticles(d.articles || []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [filter, authLoading, user]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredArticles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredArticles.map((a) => a.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Bulk action execution
  const executeBulkAction = async (action: "publish" | "archive") => {
    const ids = Array.from(selectedIds);
    const newStatus = action === "publish" ? "published" : "archived";
    setBulkProgress({ current: 0, total: ids.length });

    for (let i = 0; i < ids.length; i++) {
      setBulkProgress({ current: i + 1, total: ids.length });
      try {
        await fetch(`/api/admin/articles/${ids[i]}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
      } catch {
        // continue on individual failures
      }
    }

    setBulkProgress(null);
    clearSelection();
    fetchArticles();
    // Refresh in_review count
    fetch("/api/admin/articles?status=in_review")
      .then((r) => r.json())
      .then((d) => setInReviewCount(d.articles?.length || 0))
      .catch((err) => console.error("Failed to refresh in_review count:", err));
  };

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

  const allSelected = filteredArticles.length > 0 && selectedIds.size === filteredArticles.length;

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px", paddingBottom: selectedIds.size > 0 ? 80 : 24 }}>
        <AdminNav />

        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24, color: "var(--color-text-primary)" }}>
          Articles
        </h1>

        {/* Search input */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-text-tertiary)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Search articles by headline..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px 10px 36px",
              fontSize: 14,
              background: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border-subtle)",
              borderRadius: 8,
              color: "var(--color-text-primary)",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border-subtle)")}
          />
        </div>

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
        ) : filteredArticles.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 48,
              color: "var(--color-text-tertiary)",
              fontSize: 14,
            }}
          >
            {debouncedSearch ? "No articles match your search" : "No articles found"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Header row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "36px 100px 1fr 90px 80px 90px 70px",
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
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  style={{
                    width: 16,
                    height: 16,
                    cursor: "pointer",
                    accentColor: "var(--color-accent)",
                  }}
                />
              </span>
              <span>Type</span>
              <span>Headline</span>
              <span>Status</span>
              <span>Confidence</span>
              <span>Date</span>
              <span>Editor</span>
            </div>

            {/* Article rows */}
            {filteredArticles.map((article) => {
              const typeStyle = TYPE_COLORS[article.type] || { bg: "#6b728020", text: "#6b7280" };
              const statusStyle = STATUS_COLORS[article.status] || { bg: "#6b728020", text: "#6b7280" };
              const confStyle = CONFIDENCE_COLORS[article.confidence] || { bg: "#6b728020", text: "#6b7280" };
              const isSelected = selectedIds.has(article.id);

              return (
                <div
                  key={article.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "36px 100px 1fr 90px 80px 90px 70px",
                    gap: 12,
                    padding: "10px 12px",
                    alignItems: "center",
                    cursor: "pointer",
                    borderRadius: 6,
                    transition: "background 0.1s",
                    borderBottom: "1px solid var(--color-border-subtle)",
                    background: isSelected ? "var(--color-bg-secondary)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "var(--color-bg-secondary)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Checkbox */}
                  <span
                    style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(article.id);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(article.id)}
                      style={{
                        width: 16,
                        height: 16,
                        cursor: "pointer",
                        accentColor: "var(--color-accent)",
                      }}
                    />
                  </span>

                  {/* Rest of row — click navigates */}
                  <span
                    onClick={() => router.push(`/admin/articles/${article.id}`)}
                    style={{
                      display: "contents",
                    }}
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
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "var(--color-bg-primary)",
            borderTop: "1px solid var(--color-border-subtle)",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            zIndex: 100,
            boxShadow: "0 -4px 12px rgba(0,0,0,0.08)",
          }}
        >
          {bulkProgress ? (
            <span style={{ fontSize: 14, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 8 }}>
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              {bulkProgress.current === bulkProgress.total
                ? "Finishing..."
                : `${bulkAction === "publish" ? "Publishing" : "Archiving"} ${bulkProgress.current} of ${bulkProgress.total}...`}
            </span>
          ) : (
            <>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
                {selectedIds.size} selected
              </span>
              <button
                onClick={() => setBulkAction("publish")}
                style={{
                  padding: "8px 16px",
                  background: "#22c55e",
                  border: "none",
                  borderRadius: 6,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Publish Selected
              </button>
              <button
                onClick={() => setBulkAction("archive")}
                style={{
                  padding: "8px 16px",
                  background: "#ef4444",
                  border: "none",
                  borderRadius: 6,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Archive Selected
              </button>
              <button
                onClick={clearSelection}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  border: "1px solid var(--color-border-subtle)",
                  borderRadius: 6,
                  color: "var(--color-text-secondary)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Deselect All
              </button>
            </>
          )}
        </div>
      )}

      {/* Confirm dialog for bulk actions */}
      <ConfirmDialog
        open={bulkAction !== null}
        title={bulkAction === "publish" ? "Publish Articles" : "Archive Articles"}
        message={
          bulkAction === "publish"
            ? `Publish ${selectedIds.size} article${selectedIds.size > 1 ? "s" : ""}?`
            : `Archive ${selectedIds.size} article${selectedIds.size > 1 ? "s" : ""}?`
        }
        confirmLabel={bulkAction === "publish" ? "Publish" : "Archive"}
        variant={bulkAction === "archive" ? "danger" : "default"}
        onConfirm={() => {
          const action = bulkAction!;
          setBulkAction(null);
          executeBulkAction(action);
        }}
        onCancel={() => setBulkAction(null)}
      />

      <Footer />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
