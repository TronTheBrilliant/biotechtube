"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { PostComposer } from "@/components/feed/PostComposer";
import { PostCard, type Post } from "@/components/feed/PostCard";
import { FeedSidebar } from "@/components/feed/FeedSidebar";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

const supabase = createBrowserClient();

const PAGE_SIZE = 20;

const FEED_TABS = [
  { label: "All", value: "all" },
  { label: "Companies", value: "companies" },
  { label: "People", value: "people" },
  { label: "Articles", value: "articles" },
];

export default function FeedClient() {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");

  const fetchPosts = useCallback(
    async (pageNum: number, append = false, filter?: string) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: String(PAGE_SIZE),
        });
        if (user?.id) params.set("user_id", user.id);
        const currentFilter = filter ?? activeFilter;
        if (currentFilter && currentFilter !== "all") {
          params.set("filter", currentFilter);
        }

        const res = await fetch(`/api/feed?${params}`);
        if (!res.ok) throw new Error("Failed to load feed");

        const data = await res.json();
        if (append) {
          setPosts((prev) => [...prev, ...(data.posts || [])]);
        } else {
          setPosts(data.posts || []);
        }
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user?.id, activeFilter]
  );

  useEffect(() => {
    if (!authLoading) {
      fetchPosts(1);
    }
  }, [authLoading, fetchPosts]);

  function handleFilterChange(value: string) {
    setActiveFilter(value);
    setPage(1);
    fetchPosts(1, false, value);
  }

  function handlePostCreated() {
    // Refresh the feed from page 1
    setPage(1);
    fetchPosts(1);
  }

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  }

  function handlePostLiked(postId: string) {
    // Optimistically toggle liked state in local list
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked_by_user: !p.liked_by_user,
              like_count: (p.like_count || 0) + (p.liked_by_user ? -1 : 1),
            }
          : p
      )
    );
  }

  function handleBookmarkToggled(postId: string) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, bookmarked_by_user: !p.bookmarked_by_user }
          : p
      )
    );
  }

  return (
    <>
      <Nav />
      <div className="page-content">
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "24px 16px",
          }}
        >
          {/* CTA for unauthenticated users */}
          {!authLoading && !user && (
            <div
              style={{
                background: "var(--color-accent-subtle)",
                border: "0.5px solid var(--color-accent)",
                borderRadius: 10,
                padding: "16px 20px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.5 }}>
                Join BiotechTube to share insights and follow companies.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <Link
                  href="/signup"
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "6px 16px",
                    borderRadius: 6,
                    background: "var(--color-accent)",
                    color: "#fff",
                    textDecoration: "none",
                  }}
                >
                  Sign up free
                </Link>
                <Link
                  href="/login"
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "6px 16px",
                    borderRadius: 6,
                    background: "transparent",
                    color: "var(--color-accent)",
                    border: "0.5px solid var(--color-accent)",
                    textDecoration: "none",
                  }}
                >
                  Sign in
                </Link>
              </div>
            </div>
          )}

          {/* Desktop grid: main feed + sidebar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 24,
            }}
            className="feed-grid"
          >
            {/* Main column */}
            <div style={{ minWidth: 0 }}>
              {/* Composer — only for authenticated users */}
              {user && (
                <PostComposer
                  userId={user.id}
                  onPostCreated={handlePostCreated}
                />
              )}

              {/* Filter tabs */}
              <nav
                style={{
                  display: "flex",
                  gap: 0,
                  borderBottom: "0.5px solid var(--color-border-subtle)",
                  marginBottom: 16,
                }}
              >
                {FEED_TABS.map((tab) => {
                  const isActive = activeFilter === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => handleFilterChange(tab.value)}
                      style={{
                        padding: "8px 14px",
                        fontSize: 13,
                        color: isActive
                          ? "var(--color-text-primary)"
                          : "var(--color-text-tertiary)",
                        background: "transparent",
                        border: "none",
                        borderBottom: isActive
                          ? "0.5px solid var(--color-accent)"
                          : "0.5px solid transparent",
                        fontWeight: isActive ? 500 : 400,
                        cursor: "pointer",
                        transition: "color 0.15s, border-color 0.15s",
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>

              {/* Feed */}
              {loading ? (
                <div style={{ padding: "40px 0", textAlign: "center" }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      border: "2px solid var(--color-border-subtle)",
                      borderTopColor: "var(--color-accent)",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                      margin: "0 auto",
                    }}
                  />
                </div>
              ) : error ? (
                <div
                  style={{
                    padding: "32px 16px",
                    textAlign: "center",
                    color: "var(--color-text-tertiary)",
                    fontSize: 13,
                  }}
                >
                  {error} —{" "}
                  <button
                    onClick={() => fetchPosts(1)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-accent)",
                      fontSize: 13,
                      padding: 0,
                    }}
                  >
                    Try again
                  </button>
                </div>
              ) : posts.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 48,
                    textAlign: "center",
                  }}
                >
                  <MessageSquare
                    size={32}
                    style={{ color: "var(--color-text-tertiary)", opacity: 0.3 }}
                  />
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: "var(--color-text-primary)",
                      margin: "12px 0 0",
                    }}
                  >
                    No posts yet
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-tertiary)",
                      margin: "4px 0 0",
                    }}
                  >
                    Be the first to share an insight with the biotech community.
                  </p>
                </div>
              ) : (
                <>
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={user?.id}
                      onLike={() => handlePostLiked(post.id)}
                      onBookmark={() => handleBookmarkToggled(post.id)}
                    />
                  ))}

                  {/* Load more */}
                  {page < totalPages && (
                    <div style={{ textAlign: "center", paddingTop: 8, paddingBottom: 16 }}>
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          padding: "8px 24px",
                          borderRadius: 6,
                          border: "0.5px solid var(--color-border-subtle)",
                          background: "var(--color-bg-secondary)",
                          color: "var(--color-text-secondary)",
                          cursor: loadingMore ? "not-allowed" : "pointer",
                          opacity: loadingMore ? 0.7 : 1,
                        }}
                      >
                        {loadingMore ? "Loading..." : "Load more"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sidebar — hidden on mobile via CSS */}
            <div className="feed-sidebar-col">
              <FeedSidebar />
            </div>
          </div>
        </div>
      </div>
      <Footer />

      <style>{`
        @media (min-width: 768px) {
          .feed-grid {
            grid-template-columns: 1fr 280px !important;
          }
        }
        .feed-sidebar-col {
          display: none;
        }
        @media (min-width: 768px) {
          .feed-sidebar-col {
            display: block;
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
