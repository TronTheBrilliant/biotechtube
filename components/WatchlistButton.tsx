"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Heart, Plus, Check, Loader2 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { useUser } from "@/lib/auth";
import {
  useWatchlistCollections,
  type WatchlistCollection,
} from "@/lib/useWatchlistCollections";

interface WatchlistButtonProps {
  companyId: string;
  size?: number;
  showLabel?: boolean;
}

const supabase = createBrowserClient();

export function WatchlistButton({
  companyId,
  size = 18,
  showLabel = false,
}: WatchlistButtonProps) {
  const { user } = useUser();
  const { collections, ensureDefault, createCollection } =
    useWatchlistCollections();
  const [memberOf, setMemberOf] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [creating, setCreating] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const isWatched = memberOf.size > 0;

  // Fetch which collections this company belongs to
  useEffect(() => {
    if (!user || !companyId) return;

    async function check() {
      const { data } = await supabase
        .from("user_watchlist")
        .select("collection_id")
        .eq("user_id", user!.id)
        .eq("company_id", companyId);

      if (data) {
        setMemberOf(
          new Set(
            data
              .map((d: { collection_id: string | null }) => d.collection_id)
              .filter(Boolean) as string[]
          )
        );
      }
    }

    check();
  }, [user, companyId, collections]);

  // Close picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
        setNewListName("");
      }
    }
    if (showPicker) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPicker]);

  const handleMainClick = useCallback(async () => {
    if (!user) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2500);
      return;
    }

    // If not watched at all, quick-add to default collection
    if (!isWatched) {
      setLoading(true);
      const def = await ensureDefault();
      if (def) {
        await supabase.from("user_watchlist").insert({
          user_id: user.id,
          company_id: companyId,
          collection_id: def.id,
        });
        setMemberOf(new Set([def.id]));
      }
      setLoading(false);
      return;
    }

    // If already watched, show picker to manage
    setShowPicker((prev) => !prev);
  }, [user, isWatched, companyId, ensureDefault]);

  const toggleCollection = useCallback(
    async (col: WatchlistCollection) => {
      if (!user) return;
      const inCol = memberOf.has(col.id);

      if (inCol) {
        await supabase
          .from("user_watchlist")
          .delete()
          .eq("user_id", user.id)
          .eq("company_id", companyId)
          .eq("collection_id", col.id);
        setMemberOf((prev) => {
          const next = new Set(prev);
          next.delete(col.id);
          return next;
        });
      } else {
        await supabase.from("user_watchlist").insert({
          user_id: user.id,
          company_id: companyId,
          collection_id: col.id,
        });
        setMemberOf((prev) => new Set(prev).add(col.id));
      }
    },
    [user, companyId, memberOf]
  );

  const handleCreateNew = useCallback(async () => {
    if (!newListName.trim() || creating) return;
    setCreating(true);
    const col = await createCollection(newListName.trim());
    if (col) {
      // Also add this company to the new collection
      if (user) {
        await supabase.from("user_watchlist").insert({
          user_id: user.id,
          company_id: companyId,
          collection_id: col.id,
        });
        setMemberOf((prev) => new Set(prev).add(col.id));
      }
    }
    setNewListName("");
    setCreating(false);
  }, [newListName, creating, createCollection, user, companyId]);

  const openPicker = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user) {
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 2500);
        return;
      }
      // Ensure at least a default exists
      await ensureDefault();
      setShowPicker((prev) => !prev);
    },
    [user, ensureDefault]
  );

  return (
    <div className="relative inline-flex items-center" ref={pickerRef}>
      <button
        onClick={handleMainClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg transition-all duration-200"
        style={{
          padding: showLabel ? "7px 14px" : "6px",
          background: isWatched
            ? "var(--color-accent)"
            : "var(--color-accent-subtle, #e8f5f0)",
          border: `1px solid ${isWatched ? "var(--color-accent)" : "var(--color-accent)"}`,
          color: isWatched ? "white" : "var(--color-accent)",
          opacity: loading ? 0.6 : 1,
          cursor: loading ? "wait" : "pointer",
          fontWeight: 600,
          borderRadius: 8,
        }}
        onMouseEnter={(e) => {
          if (!isWatched) {
            e.currentTarget.style.background = "var(--color-accent)";
            e.currentTarget.style.color = "white";
          }
        }}
        onMouseLeave={(e) => {
          if (!isWatched) {
            e.currentTarget.style.background = "var(--color-accent-subtle, #e8f5f0)";
            e.currentTarget.style.color = "var(--color-accent)";
          }
        }}
        title={isWatched ? "Manage watchlists" : "Add to watchlist"}
      >
        {loading ? (
          <Loader2 size={size} className="animate-spin" />
        ) : (
          <Heart
            size={size}
            fill={isWatched ? "#ef4444" : "none"}
            strokeWidth={isWatched ? 0 : 1.5}
          />
        )}
        {showLabel && (
          <span className="text-[12px] font-medium">
            {isWatched ? "Watching" : "Watch"}
          </span>
        )}
      </button>

      {/* Chevron/dropdown trigger for watched items */}
      {isWatched && (
        <button
          onClick={openPicker}
          className="ml-[-1px] rounded-r-lg transition-all duration-200 flex items-center justify-center"
          style={{
            padding: "6px 4px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderLeft: "none",
            color: "#ef4444",
            cursor: "pointer",
          }}
          title="Choose watchlists"
        >
          <svg
            width={10}
            height={10}
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M2.5 3.5L5 6L7.5 3.5" />
          </svg>
        </button>
      )}

      {/* Collection picker popover */}
      {showPicker && (
        <div
          className="absolute z-50 mt-1 rounded-xl shadow-lg overflow-hidden"
          style={{
            top: "100%",
            left: 0,
            minWidth: 220,
            maxWidth: 280,
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border-subtle)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          <div
            className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide"
            style={{
              color: "var(--color-text-tertiary)",
              borderBottom: "1px solid var(--color-border-subtle)",
            }}
          >
            Save to list
          </div>
          <div
            className="max-h-[200px] overflow-y-auto"
            style={{ scrollbarWidth: "thin" }}
          >
            {collections.map((col) => (
              <button
                key={col.id}
                onClick={() => toggleCollection(col)}
                className="flex items-center gap-2 w-full px-3 py-2 text-left transition-colors text-[13px]"
                style={{ color: "var(--color-text-primary)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "var(--color-bg-tertiary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  className="flex items-center justify-center rounded shrink-0"
                  style={{
                    width: 18,
                    height: 18,
                    border: memberOf.has(col.id)
                      ? "none"
                      : "1.5px solid var(--color-border-medium)",
                    background: memberOf.has(col.id)
                      ? "var(--color-accent)"
                      : "transparent",
                  }}
                >
                  {memberOf.has(col.id) && (
                    <Check size={12} color="#fff" strokeWidth={2.5} />
                  )}
                </span>
                <span className="truncate">{col.name}</span>
                {col.is_default && (
                  <span
                    className="text-[10px] ml-auto shrink-0"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    default
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Create new list */}
          <div
            style={{ borderTop: "1px solid var(--color-border-subtle)" }}
            className="px-3 py-2"
          >
            <div className="flex items-center gap-1.5">
              <Plus
                size={14}
                style={{ color: "var(--color-text-tertiary)", shrink: 0 }}
              />
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateNew();
                }}
                placeholder="New list name..."
                className="flex-1 text-[12px] bg-transparent outline-none"
                style={{
                  color: "var(--color-text-primary)",
                  minWidth: 0,
                }}
              />
              {newListName.trim() && (
                <button
                  onClick={handleCreateNew}
                  disabled={creating}
                  className="text-[11px] font-medium px-2 py-0.5 rounded"
                  style={{
                    background: "var(--color-accent)",
                    color: "#fff",
                    opacity: creating ? 0.6 : 1,
                  }}
                >
                  {creating ? "..." : "Add"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
          <a
            href="/login"
            className="underline"
            style={{ color: "var(--color-accent)" }}
          >
            Sign in
          </a>{" "}
          to watch companies
        </div>
      )}
    </div>
  );
}
