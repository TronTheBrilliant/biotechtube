"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bookmark, Plus, Check, Loader2 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { useUser } from "@/lib/auth";
import {
  useWatchlistCollections,
  type WatchlistCollection,
} from "@/lib/useWatchlistCollections";

interface PipelineWatchButtonProps {
  pipelineId: string;
  size?: number;
  showLabel?: boolean;
}

const supabase = createBrowserClient();

export function PipelineWatchButton({
  pipelineId,
  size = 16,
  showLabel = false,
}: PipelineWatchButtonProps) {
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

  // Fetch which collections this pipeline belongs to
  useEffect(() => {
    if (!user || !pipelineId) return;

    async function check() {
      const { data } = await supabase
        .from("user_pipeline_watchlist")
        .select("collection_id")
        .eq("user_id", user!.id)
        .eq("pipeline_id", pipelineId);

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
  }, [user, pipelineId, collections]);

  // Close picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
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

    if (!isWatched) {
      setLoading(true);
      const def = await ensureDefault();
      if (def) {
        await supabase.from("user_pipeline_watchlist").insert({
          user_id: user.id,
          pipeline_id: pipelineId,
          collection_id: def.id,
        });
        setMemberOf(new Set([def.id]));
      }
      setLoading(false);
      return;
    }

    setShowPicker((prev) => !prev);
  }, [user, isWatched, pipelineId, ensureDefault]);

  const toggleCollection = useCallback(
    async (col: WatchlistCollection) => {
      if (!user) return;
      const inCol = memberOf.has(col.id);

      if (inCol) {
        await supabase
          .from("user_pipeline_watchlist")
          .delete()
          .eq("user_id", user.id)
          .eq("pipeline_id", pipelineId)
          .eq("collection_id", col.id);
        setMemberOf((prev) => {
          const next = new Set(prev);
          next.delete(col.id);
          return next;
        });
      } else {
        await supabase.from("user_pipeline_watchlist").insert({
          user_id: user.id,
          pipeline_id: pipelineId,
          collection_id: col.id,
        });
        setMemberOf((prev) => new Set(prev).add(col.id));
      }
    },
    [user, pipelineId, memberOf]
  );

  const handleCreateNew = useCallback(async () => {
    if (!newListName.trim() || creating) return;
    setCreating(true);
    const col = await createCollection(newListName.trim());
    if (col && user) {
      await supabase.from("user_pipeline_watchlist").insert({
        user_id: user.id,
        pipeline_id: pipelineId,
        collection_id: col.id,
      });
      setMemberOf((prev) => new Set(prev).add(col.id));
    }
    setNewListName("");
    setCreating(false);
  }, [newListName, creating, createCollection, user, pipelineId]);

  const openPicker = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user) {
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 2500);
        return;
      }
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
        className="inline-flex items-center gap-1 rounded-md transition-all duration-200"
        style={{
          padding: showLabel ? "4px 8px" : "4px",
          background: isWatched
            ? "rgba(59, 130, 246, 0.08)"
            : "transparent",
          border: `1px solid ${isWatched ? "rgba(59, 130, 246, 0.2)" : "var(--color-border-subtle)"}`,
          color: isWatched ? "#3b82f6" : "var(--color-text-tertiary)",
          opacity: loading ? 0.6 : 1,
          cursor: loading ? "wait" : "pointer",
        }}
        onMouseEnter={(e) => {
          if (!isWatched) {
            e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.3)";
            e.currentTarget.style.color = "#3b82f6";
          }
        }}
        onMouseLeave={(e) => {
          if (!isWatched) {
            e.currentTarget.style.borderColor = "var(--color-border-subtle)";
            e.currentTarget.style.color = "var(--color-text-tertiary)";
          }
        }}
        title={isWatched ? "Manage watchlists" : "Watch this product"}
      >
        {loading ? (
          <Loader2 size={size} className="animate-spin" />
        ) : (
          <Bookmark
            size={size}
            fill={isWatched ? "#3b82f6" : "none"}
            strokeWidth={isWatched ? 0 : 1.5}
          />
        )}
        {showLabel && (
          <span className="text-[11px] font-medium">
            {isWatched ? "Saved" : "Save"}
          </span>
        )}
      </button>

      {isWatched && (
        <button
          onClick={openPicker}
          className="ml-[-1px] rounded-r-md transition-all duration-200 flex items-center justify-center"
          style={{
            padding: "4px 3px",
            background: "rgba(59, 130, 246, 0.08)",
            border: "1px solid rgba(59, 130, 246, 0.2)",
            borderLeft: "none",
            color: "#3b82f6",
            cursor: "pointer",
          }}
          title="Choose watchlists"
        >
          <svg
            width={9}
            height={9}
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
            right: 0,
            minWidth: 210,
            maxWidth: 260,
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
                    width: 16,
                    height: 16,
                    border: memberOf.has(col.id)
                      ? "none"
                      : "1.5px solid var(--color-border-medium)",
                    background: memberOf.has(col.id)
                      ? "var(--color-accent)"
                      : "transparent",
                  }}
                >
                  {memberOf.has(col.id) && (
                    <Check size={10} color="#fff" strokeWidth={2.5} />
                  )}
                </span>
                <span className="truncate text-[12px]">{col.name}</span>
              </button>
            ))}
          </div>

          <div
            style={{ borderTop: "1px solid var(--color-border-subtle)" }}
            className="px-3 py-2"
          >
            <div className="flex items-center gap-1.5">
              <Plus
                size={13}
                style={{ color: "var(--color-text-tertiary)" }}
              />
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateNew();
                }}
                placeholder="New list..."
                className="flex-1 text-[11px] bg-transparent outline-none"
                style={{
                  color: "var(--color-text-primary)",
                  minWidth: 0,
                }}
              />
              {newListName.trim() && (
                <button
                  onClick={handleCreateNew}
                  disabled={creating}
                  className="text-[10px] font-medium px-2 py-0.5 rounded"
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
          to watch products
        </div>
      )}
    </div>
  );
}
