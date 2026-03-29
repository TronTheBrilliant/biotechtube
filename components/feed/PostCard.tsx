"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Trash2, MoreHorizontal, Pencil, X, Check } from "lucide-react";
import { PostEngagement } from "./PostEngagement";
import { formatDistanceToNow } from "date-fns";

export interface PostAuthor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface PostCompany {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export interface Post {
  id: string;
  post_type: "update" | "article" | "repost";
  title?: string | null;
  body: string;
  image_url?: string | null;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  liked_by_user?: boolean;
  bookmarked_by_user?: boolean;
  created_at: string;
  updated_at?: string | null;
  author?: PostAuthor | null;
  company?: PostCompany | null;
  shared_post?: Post | null;
}

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onLike: () => void;
  onDelete?: () => void;
  onBookmark?: () => void;
  truncate?: boolean;
}

const TRUNCATE_LIMIT = 300;

function renderPostBody(text: string): React.ReactNode {
  // Split text into segments: hashtags, URLs, and plain text
  const pattern = /(#[A-Za-z][A-Za-z0-9_]+|https?:\/\/[^\s<]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("#")) {
      parts.push(
        <span
          key={`${match.index}-ht`}
          style={{ color: "var(--color-accent)", cursor: "pointer" }}
        >
          {token}
        </span>
      );
    } else {
      parts.push(
        <a
          key={`${match.index}-url`}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--color-accent)", textDecoration: "none" }}
          onClick={(e) => e.stopPropagation()}
        >
          {token}
        </a>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function AvatarCircle({
  src,
  name,
  size = 32,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
}) {
  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  if (src) {
    return (
      <Image
        src={src}
        alt={name || "avatar"}
        width={size}
        height={size}
        style={{ borderRadius: "50%", objectFit: "cover", border: "0.5px solid var(--color-border-subtle)" }}
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
        fontSize: size * 0.35,
        fontWeight: 500,
        color: "var(--color-accent)",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function QuotedPost({ post }: { post: Post }) {
  const displayName = post.company ? post.company.name : post.author?.full_name || "Unknown";
  const avatarSrc = post.company ? post.company.logo_url : post.author?.avatar_url;

  return (
    <div
      style={{
        background: "var(--color-bg-secondary)",
        border: "0.5px solid var(--color-border-subtle)",
        borderRadius: 8,
        padding: "10px 12px",
        marginTop: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <AvatarCircle src={avatarSrc} name={displayName} size={20} />
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>
          {displayName}
        </span>
        <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </span>
      </div>
      {post.title && (
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 }}>
          {post.title}
        </div>
      )}
      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>
        {post.body.slice(0, 200)}{post.body.length > 200 ? "..." : ""}
      </p>
    </div>
  );
}

export function PostCard({ post, currentUserId, onLike, onDelete, onBookmark, truncate = true }: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body);
  const [editTitle, setEditTitle] = useState(post.title || "");
  const [saving, setSaving] = useState(false);

  const isCompanyPost = !!post.company;
  const displayName = isCompanyPost ? post.company!.name : post.author?.full_name || "Unknown";
  const avatarSrc = isCompanyPost ? post.company!.logo_url : post.author?.avatar_url;
  const isOwner = currentUserId && (currentUserId === post.author?.id);

  const shouldTruncate = truncate && post.body.length > TRUNCATE_LIMIT;
  const displayBody = shouldTruncate && !expanded
    ? post.body.slice(0, TRUNCATE_LIMIT)
    : post.body;

  const timestamp = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  // Check if post was edited (updated_at > created_at + 1 minute)
  const isEdited = post.updated_at && (() => {
    const created = new Date(post.created_at).getTime();
    const updated = new Date(post.updated_at!).getTime();
    return updated - created > 60000;
  })();

  async function handleSaveEdit() {
    if (!currentUserId || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/feed/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId,
          body: editBody,
          title: post.post_type === "article" ? editTitle : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Update the post in-place via shallow mutation (parent will re-render)
        post.body = data.post.body;
        post.title = data.post.title;
        post.updated_at = data.post.updated_at;
        setEditing(false);
      }
    } catch {
      // Silently fail
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    setEditBody(post.body);
    setEditTitle(post.title || "");
    setEditing(false);
  }

  return (
    <div
      style={{
        background: "var(--color-bg-primary)",
        border: "0.5px solid var(--color-border-subtle)",
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 12,
      }}
    >
      {/* Author row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AvatarCircle src={avatarSrc} name={displayName} size={32} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
                {displayName}
              </span>
              {isCompanyPost && (
                <ShieldCheck
                  size={12}
                  style={{ color: "var(--color-accent)", flexShrink: 0 }}
                  aria-label="Verified company"
                />
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{timestamp}</span>
              {isEdited && (
                <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}> &middot; Edited</span>
              )}
            </div>
          </div>
        </div>

        {isOwner && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Post menu"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                color: "var(--color-text-tertiary)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  background: "var(--color-bg-primary)",
                  border: "0.5px solid var(--color-border-subtle)",
                  borderRadius: 6,
                  minWidth: 120,
                  zIndex: 20,
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => {
                    setEditing(true);
                    setMenuOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: 12,
                    color: "var(--color-text-primary)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <Pencil size={12} /> Edit
                </button>
                {onDelete && (
                  <button
                    onClick={() => {
                      onDelete();
                      setMenuOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: 12,
                      color: "#dc3545",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editing mode */}
      {editing ? (
        <div style={{ marginBottom: 8 }}>
          {post.post_type === "article" && (
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Article title"
              style={{
                width: "100%",
                fontSize: 14,
                fontWeight: 500,
                padding: "6px 8px",
                marginBottom: 8,
                border: "0.5px solid var(--color-border-subtle)",
                borderRadius: 6,
                background: "var(--color-bg-secondary)",
                color: "var(--color-text-primary)",
                outline: "none",
              }}
            />
          )}
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={4}
            style={{
              width: "100%",
              fontSize: 13,
              padding: "8px",
              border: "0.5px solid var(--color-border-subtle)",
              borderRadius: 6,
              background: "var(--color-bg-secondary)",
              color: "var(--color-text-primary)",
              lineHeight: 1.65,
              resize: "vertical",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                fontWeight: 500,
                padding: "5px 12px",
                borderRadius: 5,
                border: "none",
                background: "var(--color-accent)",
                color: "#fff",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              <Check size={12} /> Save
            </button>
            <button
              onClick={handleCancelEdit}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                fontWeight: 500,
                padding: "5px 12px",
                borderRadius: 5,
                border: "0.5px solid var(--color-border-subtle)",
                background: "transparent",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
              }}
            >
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Article title */}
          {post.post_type === "article" && post.title && (
            <Link href={`/feed/${post.id}`} style={{ textDecoration: "none" }}>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: "var(--color-text-primary)",
                  margin: "0 0 8px",
                  lineHeight: 1.4,
                }}
              >
                {post.title}
              </h3>
            </Link>
          )}

          {/* Body */}
          <Link href={`/feed/${post.id}`} style={{ textDecoration: "none" }}>
            <p
              style={{
                fontSize: 13,
                color: "var(--color-text-primary)",
                lineHeight: 1.65,
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {renderPostBody(displayBody)}
              {shouldTruncate && !expanded && "..."}
            </p>
          </Link>

          {shouldTruncate && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                color: "var(--color-accent)",
                padding: "4px 0 0",
                fontWeight: 500,
              }}
            >
              Read more
            </button>
          )}
        </>
      )}

      {/* Image */}
      {post.image_url && (
        <div style={{ marginTop: 10 }}>
          <Image
            src={post.image_url}
            alt="Post image"
            width={600}
            height={400}
            style={{
              width: "100%",
              height: "auto",
              maxHeight: 400,
              objectFit: "cover",
              borderRadius: 8,
              border: "0.5px solid var(--color-border-subtle)",
            }}
          />
        </div>
      )}

      {/* Quoted/reposted content */}
      {post.shared_post && <QuotedPost post={post.shared_post} />}

      {/* Engagement bar */}
      <div style={{ marginTop: 10 }}>
        <PostEngagement
          postId={post.id}
          userId={currentUserId}
          likeCount={post.like_count || 0}
          commentCount={post.comment_count || 0}
          shareCount={post.share_count || 0}
          liked={post.liked_by_user || false}
          bookmarked={post.bookmarked_by_user || false}
          onLike={onLike}
          onComment={() => {}}
          onShare={() => {}}
          onBookmark={onBookmark}
        />
      </div>
    </div>
  );
}
