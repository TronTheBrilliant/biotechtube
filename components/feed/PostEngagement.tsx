"use client";

import { useState } from "react";
import { Heart, MessageSquare, Share2 } from "lucide-react";

interface PostEngagementProps {
  postId: string;
  userId?: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  liked: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
}

export function PostEngagement({
  postId,
  userId,
  likeCount,
  commentCount,
  shareCount,
  liked,
  onLike,
  onComment,
  onShare,
}: PostEngagementProps) {
  const [optimisticLiked, setOptimisticLiked] = useState(liked);
  const [optimisticCount, setOptimisticCount] = useState(likeCount);
  const [liking, setLiking] = useState(false);

  async function handleLike() {
    if (!userId) {
      onLike();
      return;
    }

    if (liking) return;
    setLiking(true);

    const wasLiked = optimisticLiked;
    // Optimistic update
    setOptimisticLiked(!wasLiked);
    setOptimisticCount((c) => (wasLiked ? Math.max(0, c - 1) : c + 1));

    try {
      const res = await fetch(`/api/feed/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!res.ok) {
        // Revert on error
        setOptimisticLiked(wasLiked);
        setOptimisticCount((c) => (wasLiked ? c + 1 : Math.max(0, c - 1)));
      } else {
        onLike();
      }
    } catch {
      // Revert on error
      setOptimisticLiked(wasLiked);
      setOptimisticCount((c) => (wasLiked ? c + 1 : Math.max(0, c - 1)));
    } finally {
      setLiking(false);
    }
  }

  const btnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: "none",
    border: "none",
    padding: "4px 0",
    cursor: "pointer",
    color: "var(--color-text-tertiary)",
    fontSize: 12,
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, paddingTop: 10, borderTop: "0.5px solid var(--color-border-subtle)" }}>
      {/* Like */}
      <button style={btnStyle} onClick={handleLike} aria-label="Like post">
        <Heart
          size={14}
          style={{
            color: optimisticLiked ? "var(--color-accent)" : "var(--color-text-tertiary)",
            fill: optimisticLiked ? "var(--color-accent)" : "none",
            transition: "all 0.15s ease",
          }}
        />
        <span style={{ color: "var(--color-text-tertiary)", fontSize: 12 }}>
          {optimisticCount > 0 ? optimisticCount : ""}
        </span>
      </button>

      {/* Comment */}
      <button style={btnStyle} onClick={onComment} aria-label="Comment">
        <MessageSquare size={14} style={{ color: "var(--color-text-tertiary)" }} />
        <span style={{ color: "var(--color-text-tertiary)", fontSize: 12 }}>
          {commentCount > 0 ? commentCount : ""}
        </span>
      </button>

      {/* Share */}
      <button style={btnStyle} onClick={onShare} aria-label="Share">
        <Share2 size={14} style={{ color: "var(--color-text-tertiary)" }} />
        <span style={{ color: "var(--color-text-tertiary)", fontSize: 12 }}>
          {shareCount > 0 ? shareCount : ""}
        </span>
      </button>
    </div>
  );
}
