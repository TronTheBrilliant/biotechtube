"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Trash2 } from "lucide-react";
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
  created_at: string;
  author?: PostAuthor | null;
  company?: PostCompany | null;
  shared_post?: Post | null;
}

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onLike: () => void;
  onDelete?: () => void;
  truncate?: boolean;
}

const TRUNCATE_LIMIT = 300;

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

export function PostCard({ post, currentUserId, onLike, onDelete, truncate = true }: PostCardProps) {
  const [expanded, setExpanded] = useState(false);

  const isCompanyPost = !!post.company;
  const displayName = isCompanyPost ? post.company!.name : post.author?.full_name || "Unknown";
  const avatarSrc = isCompanyPost ? post.company!.logo_url : post.author?.avatar_url;
  const isOwner = currentUserId && (currentUserId === post.author?.id);

  const shouldTruncate = truncate && post.body.length > TRUNCATE_LIMIT;
  const displayBody = shouldTruncate && !expanded
    ? post.body.slice(0, TRUNCATE_LIMIT)
    : post.body;

  const timestamp = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

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
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{timestamp}</div>
          </div>
        </div>

        {isOwner && onDelete && (
          <button
            onClick={onDelete}
            aria-label="Delete post"
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
            <Trash2 size={13} />
          </button>
        )}
      </div>

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
          {displayBody}
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
          onLike={onLike}
          onComment={() => {}}
          onShare={() => {}}
        />
      </div>
    </div>
  );
}
