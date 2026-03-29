"use client";

import { useState, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase";

const supabase = createBrowserClient();

interface PostComposerProps {
  userId: string;
  companyId?: string;
  companyName?: string;
  onPostCreated: () => void;
}

type PostMode = "update" | "article";

export function PostComposer({ userId, companyId, companyName, onPostCreated }: PostComposerProps) {
  const [mode, setMode] = useState<PostMode>("update");
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const MAX_CHARS = 500;
  const charsLeft = MAX_CHARS - body.length;
  const isOverLimit = charsLeft < 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || isOverLimit) return;
    if (mode === "article" && !title.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_type: mode,
          title: mode === "article" ? title.trim() : undefined,
          body: body.trim(),
          company_id: companyId || undefined,
          author_id: userId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to post");
      }

      setBody("");
      setTitle("");
      onPostCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Get initials for avatar fallback
  function getUserInitials() {
    return "U";
  }

  return (
    <div
      style={{
        background: "var(--color-bg-primary)",
        border: "0.5px solid var(--color-border-subtle)",
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 16,
      }}
    >
      {companyName && (
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 8 }}>
          Posting as <span style={{ color: "var(--color-text-accent)", fontWeight: 500 }}>{companyName}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          {/* Avatar */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--color-accent-subtle)",
              border: "0.5px solid var(--color-border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 500,
              color: "var(--color-accent)",
            }}
          >
            {getUserInitials()}
          </div>

          <div style={{ flex: 1 }}>
            {/* Mode toggle */}
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              {(["update", "article"] as PostMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: "3px 10px",
                    borderRadius: 4,
                    border: "0.5px solid",
                    borderColor: mode === m ? "var(--color-accent)" : "var(--color-border-subtle)",
                    background: mode === m ? "var(--color-accent-subtle)" : "transparent",
                    color: mode === m ? "var(--color-accent)" : "var(--color-text-tertiary)",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Title input for article mode */}
            {mode === "article" && (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title..."
                maxLength={200}
                style={{
                  width: "100%",
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "8px 12px",
                  background: "var(--color-bg-secondary)",
                  border: "0.5px solid var(--color-border-subtle)",
                  borderRadius: 8,
                  color: "var(--color-text-primary)",
                  outline: "none",
                  marginBottom: 8,
                  boxSizing: "border-box",
                }}
              />
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share an update..."
              rows={3}
              style={{
                width: "100%",
                fontSize: 13,
                padding: "8px 12px",
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

            {/* Footer row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  color: isOverLimit ? "#e55" : charsLeft < 50 ? "var(--color-text-secondary)" : "var(--color-text-tertiary)",
                }}
              >
                {charsLeft} / {MAX_CHARS}
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {error && (
                  <span style={{ fontSize: 11, color: "#e55" }}>{error}</span>
                )}
                <button
                  type="submit"
                  disabled={loading || !body.trim() || isOverLimit || (mode === "article" && !title.trim())}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "6px 16px",
                    borderRadius: 6,
                    border: "none",
                    background: "var(--color-accent)",
                    color: "#fff",
                    cursor: loading || !body.trim() || isOverLimit ? "not-allowed" : "pointer",
                    opacity: loading || !body.trim() || isOverLimit ? 0.6 : 1,
                  }}
                >
                  {loading ? "Posting..." : "Post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
