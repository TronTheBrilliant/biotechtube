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

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Bulk action execution
  const executeBulkAction = async (action: "publish" | "archive") => {
    const ids = Array.from(selectedIds);
    const newStatus = action === "publish" ? "published" : "archived";
    const actionLabel = action === "publish" ? "Published" : "Archived";
    setBulkProgress({ current: 0, total: ids.length });

    const failures: string[] = [];

    for (let i = 0; i < ids.length; i++) {
      setBulkProgress({ current: i + 1, total: ids.length });
      try {
        const res = await fetch(`/api/admin/articles/${ids[i]}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          const failedArticle = articles.find((a) => a.id === ids[i]);
          failures.push(failedArticle?.headline || ids[i]);
        }
      } catch {
        const failedArticle = articles.find((a) => a.id === ids[i]);
        failures.push(failedArticle?.headline || ids[i]);
      }
    }

    setBulkProgress(null);
    clearSelection();

    // Show detailed toast
    const successCount = ids.length - failures.length;
    if (failures.length === 0) {
      setToast({ message: `${actionLabel} ${ids.length} article${ids.length > 1 ? "s" : ""} successfully`, type: "success" });
    } else if (successCount > 0) {
      setToast({ message: `${actionLabel} ${successCount} of ${ids.length} articles. ${failures.length} failed: ${failures[0]}`, type: "error" });
    } else {
      setToast({ message: `Failed to ${action} ${ids.length} article${ids.length > 1 ? "s" : ""}`, type: "error" });
    }

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

        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4, color: "var(--color-text-primary)" }}>
          Articles
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: "0 0 20px" }}>
          Manage all generated and edited articles
        </p>

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

        {/* Count summary */}
        {!loading && articles.length > 0 && (
          <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 12 }}>
            {articles.length} article{articles.length !== 1 ? "s" : ""}
            {filter === "all" && (() => {
              const pub = articles.filter(a => a.status === "published").length;
              const rev = articles.filter(a => a.status === "in_review").length;
              const dra = articles.filter(a => a.status === "draft").length;
              const parts: string[] = [];
              if (pub > 0) parts.push(`${pub} published`);
              if (rev > 0) parts.push(`${rev} in review`);
              if (dra > 0) parts.push(`${dra} draft`);
              return parts.length > 0 ? " \u00b7 " + parts.join(" \u00b7 ") : "";
            })()}
          </div>
        )}

        {/* Article list */}
        {loading ? (
          <>
            <style>{`@keyframes skeletonPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                borderBottom: "1px solid var(--color-border-subtle)",
              }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: "var(--color-bg-secondary)", animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-bg-secondary)", animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 14, width: `${60 - i * 5}%`, background: "var(--color-bg-secondary)", borderRadius: 4, animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
                  <div style={{ height: 10, width: "40%", background: "var(--color-bg-secondary)", borderRadius: 4, marginTop: 6, animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
                </div>
                <div style={{ width: 60, height: 20, background: "var(--color-bg-secondary)", borderRadius: 4, animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
              </div>
            ))}
          </>
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
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Select all */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                marginBottom: 4,
              }}
            >
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
              <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                Select all ({filteredArticles.length})
              </span>
            </div>

            {/* Article rows */}
            {filteredArticles.map((article) => {
              const typeConf = TYPE_CONFIG[article.type];
              const typeDotColor = typeConf?.color || "#6b7280";
              const typeLabel = typeConf?.label || formatLabel(article.type);
              const statusColor = SHARED_STATUS_COLORS[article.status] || "#6b7280";
              const isSelected = selectedIds.has(article.id);

              const metaParts = [
                typeLabel,
                article.confidence ? `${article.confidence} confidence` : null,
                article.reading_time_min ? `${article.reading_time_min} min read` : null,
                `edited by ${article.edited_by || "AI"}`,
              ].filter(Boolean).join(" \u00b7 ");

              return (
                <div
                  key={article.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    cursor: "pointer",
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
                  onClick={() => router.push(`/admin/articles/${article.id}`)}
                >
                  {/* Checkbox */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(article.id);
                    }}
                    style={{ flexShrink: 0 }}
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
                  </div>

                  {/* Type dot */}
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: typeDotColor,
                      flexShrink: 0,
                    }}
                    title={typeLabel}
                  />

                  {/* Content - takes remaining space */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
                      {article.headline}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>
                      {metaParts}
                    </div>
                  </div>

                  {/* Status + date */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: statusColor + "18",
                        color: statusColor,
                        fontWeight: 500,
                      }}
                    >
                      {formatLabel(article.status)}
                    </span>
                    <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>
                      {timeAgo(article.published_at || article.created_at)}
                    </div>
                  </div>
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
          <div>
            <p style={{ margin: 0 }}>
              {bulkAction === "publish" ? "Publish" : "Archive"} these {selectedIds.size} article{selectedIds.size > 1 ? "s" : ""}?
            </p>
            <ul style={{ marginTop: 8, paddingLeft: 0, listStyle: "none", fontSize: 13, color: "var(--color-text-secondary)" }}>
              {articles
                .filter((a) => selectedIds.has(a.id))
                .map((a) => (
                  <li key={a.id} style={{ padding: "2px 0" }}>
                    &middot; {a.headline}
                  </li>
                ))}
            </ul>
          </div>
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

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: selectedIds.size > 0 ? 80 : 24,
            right: 24,
            padding: "12px 20px",
            background: "var(--color-bg-primary)",
            border: "1px solid var(--color-border-subtle)",
            borderLeft: toast.type === "error"
              ? "3px solid #c45a5a"
              : "3px solid #22c55e",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            color: "var(--color-text-primary)",
            fontSize: 13,
            fontWeight: 400,
            zIndex: 2001,
            maxWidth: 440,
          }}
        >
          {toast.message}
        </div>
      )}

      <Footer />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
