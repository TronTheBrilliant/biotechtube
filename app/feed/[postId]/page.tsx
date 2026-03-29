"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { PostCard, type Post } from "@/components/feed/PostCard";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { formatDistanceToNow } from "date-fns";

const supabase = createBrowserClient();

interface Comment {
  id: string;
  body: string;
  created_at: string;
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface PostWithComments extends Post {
  comments?: Comment[];
}

function CommentAvatar({ src, name, size = 24 }: { src?: string | null; name?: string | null; size?: number }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  if (src) {
    return (
      <Image
        src={src}
        alt={name || "avatar"}
        width={size}
        height={size}
        style={{ borderRadius: "50%", objectFit: "cover", border: "0.5px solid var(--color-border-subtle)", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--color-accent-subtle)",
        border: "0.5px solid var(--color-border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.37,
        fontWeight: 500,
        color: "var(--color-accent)",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const postId = params?.postId as string;

  const [post, setPost] = useState<PostWithComments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;
    fetchPost();
  }, [postId]);

  async function fetchPost() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/feed/${postId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Post not found");
        throw new Error("Failed to load post");
      }
      const data = await res.json();
      setPost(data.post);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim() || !user || submittingComment) return;

    setSubmittingComment(true);
    setCommentError(null);

    try {
      const res = await fetch(`/api/feed/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: commentBody.trim(),
          author_id: user.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to post comment");
      }

      const data = await res.json();
      setCommentBody("");

      // Optimistically add the comment
      setPost((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          comment_count: (prev.comment_count || 0) + 1,
          comments: [
            ...(prev.comments || []),
            {
              ...data.comment,
              author: {
                id: user.id,
                full_name: user.user_metadata?.full_name || null,
                avatar_url: user.user_metadata?.avatar_url || null,
              },
            },
          ],
        };
      });
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  }

  function handlePostLiked() {
    setPost((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        liked_by_user: !prev.liked_by_user,
        like_count: (prev.like_count || 0) + (prev.liked_by_user ? -1 : 1),
      };
    });
  }

  async function handleDeletePost() {
    if (!user || !post) return;
    if (!confirm("Delete this post?")) return;

    try {
      const res = await fetch(`/api/feed/${post.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (res.ok) {
        router.push("/feed");
      }
    } catch {
      // Silently fail
    }
  }

  return (
    <>
      <Nav />
      <div className="page-content">
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>
          {/* Back link */}
          <Link
            href="/feed"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              color: "var(--color-accent)",
              textDecoration: "none",
              marginBottom: 16,
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={13} />
            Back to feed
          </Link>

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
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
                borderRadius: 10,
                padding: "40px 20px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--color-text-tertiary)",
              }}
            >
              {error}
            </div>
          ) : post ? (
            <>
              {/* Full post card (not truncated) */}
              <PostCard
                post={post}
                currentUserId={user?.id}
                onLike={handlePostLiked}
                onDelete={user?.id === post.author?.id ? handleDeletePost : undefined}
                truncate={false}
              />

              {/* Comments section */}
              <div
                style={{
                  background: "var(--color-bg-primary)",
                  border: "0.5px solid var(--color-border-subtle)",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--color-border-subtle)" }}>
                  <h3 style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>
                    {(post.comment_count || 0) === 0
                      ? "No comments yet"
                      : `${post.comment_count} comment${post.comment_count !== 1 ? "s" : ""}`}
                  </h3>
                </div>

                {/* Comment input */}
                {user ? (
                  <form onSubmit={handleSubmitComment} style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--color-border-subtle)" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <CommentAvatar
                        src={user.user_metadata?.avatar_url}
                        name={user.user_metadata?.full_name}
                        size={24}
                      />
                      <div style={{ flex: 1 }}>
                        <textarea
                          value={commentBody}
                          onChange={(e) => setCommentBody(e.target.value)}
                          placeholder="Write a comment..."
                          rows={2}
                          maxLength={500}
                          style={{
                            width: "100%",
                            fontSize: 13,
                            padding: "7px 10px",
                            background: "var(--color-bg-secondary)",
                            border: "0.5px solid var(--color-border-subtle)",
                            borderRadius: 8,
                            color: "var(--color-text-primary)",
                            outline: "none",
                            resize: "vertical",
                            fontFamily: "inherit",
                            lineHeight: 1.5,
                            boxSizing: "border-box",
                          }}
                        />
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6, gap: 8, alignItems: "center" }}>
                          {commentError && (
                            <span style={{ fontSize: 11, color: "#e55" }}>{commentError}</span>
                          )}
                          <button
                            type="submit"
                            disabled={!commentBody.trim() || submittingComment}
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              padding: "5px 14px",
                              borderRadius: 6,
                              border: "none",
                              background: "var(--color-accent)",
                              color: "#fff",
                              cursor: !commentBody.trim() || submittingComment ? "not-allowed" : "pointer",
                              opacity: !commentBody.trim() || submittingComment ? 0.6 : 1,
                            }}
                          >
                            {submittingComment ? "Posting..." : "Reply"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--color-border-subtle)" }}>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-tertiary)" }}>
                      <Link href="/login" style={{ color: "var(--color-accent)" }}>Sign in</Link> to leave a comment.
                    </p>
                  </div>
                )}

                {/* Comment list */}
                {(post.comments || []).length > 0 ? (
                  (post.comments || []).map((comment) => (
                    <div
                      key={comment.id}
                      style={{
                        padding: "12px 16px",
                        borderBottom: "0.5px solid var(--color-border-subtle)",
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                    >
                      <CommentAvatar
                        src={comment.author?.avatar_url}
                        name={comment.author?.full_name}
                        size={24}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>
                            {comment.author?.full_name || "Anonymous"}
                          </span>
                          <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-primary)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                          {comment.body}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "20px 16px", textAlign: "center", fontSize: 12, color: "var(--color-text-tertiary)" }}>
                    Be the first to comment.
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
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
