"use client";

import { useState, useEffect, useCallback } from "react";
import { Heart } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { useUser } from "@/lib/auth";

interface WatchlistButtonProps {
  companyId: string;
  size?: number;
  showLabel?: boolean;
}

export function WatchlistButton({ companyId, size = 18, showLabel = false }: WatchlistButtonProps) {
  const { user } = useUser();
  const [isWatched, setIsWatched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const supabase = createBrowserClient();

  // Check if company is in watchlist
  useEffect(() => {
    if (!user || !companyId) return;

    async function check() {
      const { data } = await supabase
        .from("user_watchlist")
        .select("id")
        .eq("user_id", user!.id)
        .eq("company_id", companyId)
        .maybeSingle();

      setIsWatched(!!data);
    }

    check();
  }, [user, companyId, supabase]);

  const toggle = useCallback(async () => {
    if (!user) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2500);
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      if (isWatched) {
        await supabase
          .from("user_watchlist")
          .delete()
          .eq("user_id", user.id)
          .eq("company_id", companyId);
        setIsWatched(false);
      } else {
        await supabase
          .from("user_watchlist")
          .insert({ user_id: user.id, company_id: companyId });
        setIsWatched(true);
      }
    } catch (err) {
      console.error("Watchlist toggle error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, companyId, isWatched, loading, supabase]);

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={toggle}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg transition-all duration-200"
        style={{
          padding: showLabel ? "6px 12px" : "6px",
          background: isWatched ? "rgba(239, 68, 68, 0.08)" : "var(--color-bg-secondary)",
          border: `1px solid ${isWatched ? "rgba(239, 68, 68, 0.2)" : "var(--color-border-subtle)"}`,
          color: isWatched ? "#ef4444" : "var(--color-text-tertiary)",
          opacity: loading ? 0.6 : 1,
          cursor: loading ? "wait" : "pointer",
        }}
        onMouseEnter={(e) => {
          if (!isWatched) {
            e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
            e.currentTarget.style.color = "#ef4444";
          }
        }}
        onMouseLeave={(e) => {
          if (!isWatched) {
            e.currentTarget.style.borderColor = "var(--color-border-subtle)";
            e.currentTarget.style.color = "var(--color-text-tertiary)";
          }
        }}
        title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
      >
        <Heart
          size={size}
          fill={isWatched ? "#ef4444" : "none"}
          strokeWidth={isWatched ? 0 : 1.5}
        />
        {showLabel && (
          <span className="text-[12px] font-medium">
            {isWatched ? "Watching" : "Watch"}
          </span>
        )}
      </button>

      {/* Tooltip for unauthenticated users */}
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap"
          style={{
            background: "var(--color-bg-tertiary)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border-subtle)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            animation: "fadeIn 0.15s ease",
            zIndex: 50,
          }}
        >
          <a href="/login" className="underline" style={{ color: "var(--color-accent)" }}>
            Sign in
          </a>{" "}
          to watch companies
        </div>
      )}
    </div>
  );
}
