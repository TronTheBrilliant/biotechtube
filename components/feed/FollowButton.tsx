"use client";

import { useState } from "react";

interface FollowButtonProps {
  followingId: string;
  followingType: "user" | "company";
  userId?: string;
  initialFollowing?: boolean;
}

export function FollowButton({
  followingId,
  followingType,
  userId,
  initialFollowing = false,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!userId || loading) return;
    setLoading(true);

    const wasFollowing = following;
    setFollowing(!wasFollowing);

    try {
      const res = await fetch("/api/follow", {
        method: wasFollowing ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          following_id: followingId,
          following_type: followingType,
        }),
      });

      if (!res.ok) {
        // Revert on error
        setFollowing(wasFollowing);
      }
    } catch {
      setFollowing(wasFollowing);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={!userId || loading}
      style={{
        fontSize: 11,
        fontWeight: 500,
        padding: "4px 10px",
        borderRadius: 4,
        border: "0.5px solid",
        borderColor: following ? "var(--color-border-subtle)" : "var(--color-accent)",
        background: following ? "var(--color-bg-secondary)" : "transparent",
        color: following ? "var(--color-text-secondary)" : "var(--color-accent)",
        cursor: !userId || loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.7 : 1,
        transition: "all 0.15s ease",
        whiteSpace: "nowrap",
      }}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
