"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Save, Loader2, Newspaper, X, Calendar } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { useDashboard } from "@/app/manage/layout";
import { useAuth } from "@/lib/auth";

const supabase = createBrowserClient();

interface NewsItem {
  id: string;
  title: string;
  content: string | null;
  published_at: string;
}

const inputStyle: React.CSSProperties = {
  background: "var(--color-bg-secondary)",
  border: "0.5px solid var(--color-border-subtle)",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 13,
  color: "var(--color-text-primary)",
  width: "100%",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  color: "var(--color-text-tertiary)",
  display: "block",
  marginBottom: 6,
};

export default function NewsPage() {
  const { company } = useDashboard();
  const { user } = useAuth();

  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const loadNews = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("company_news")
      .select("id, title, content, published_at")
      .eq("company_id", company.id)
      .order("published_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  }, [company.id]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const publishNews = async () => {
    if (!title.trim() || !user) return;
    setSaving(true);

    await supabase.from("company_news").insert({
      company_id: company.id,
      title: title.trim(),
      content: content.trim() || null,
      created_by: user.id,
    });

    setTitle("");
    setContent("");
    setShowForm(false);
    setSaving(false);
    loadNews();
  };

  const deleteItem = async (id: string) => {
    await supabase.from("company_news").delete().eq("id", id);
    loadNews();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 24,
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: "var(--color-text-primary)",
              margin: 0,
            }}
          >
            News &amp; Updates
          </h1>
          <p
            style={{
              fontSize: 12,
              color: "var(--color-text-tertiary)",
              marginTop: 4,
            }}
          >
            Share company milestones, announcements, and updates
          </p>
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--color-accent)",
              color: "white",
              fontSize: 12,
              fontWeight: 500,
              padding: "7px 12px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Plus size={13} />
            Post Update
          </button>
        )}
      </div>

      {/* Post form */}
      {showForm && (
        <div
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid #1a7a5e",
            borderRadius: 8,
            padding: "16px 20px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-text-primary)",
              }}
            >
              New Update
            </span>
            <button
              onClick={() => {
                setShowForm(false);
                setTitle("");
                setContent("");
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-tertiary)",
                padding: 4,
              }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Update title"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your update here..."
                rows={5}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button
              onClick={publishNews}
              disabled={saving || !title.trim()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "var(--color-accent)",
                color: "white",
                fontSize: 12,
                fontWeight: 500,
                padding: "7px 14px",
                borderRadius: 6,
                border: "none",
                cursor: saving || !title.trim() ? "not-allowed" : "pointer",
                opacity: saving || !title.trim() ? 0.5 : 1,
              }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Publish
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setTitle("");
                setContent("");
              }}
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: "7px 14px",
                borderRadius: 6,
                background: "transparent",
                border: "0.5px solid var(--color-border-subtle)",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* News list */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <Loader2 size={18} className="animate-spin" style={{ color: "var(--color-text-tertiary)" }} />
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
            borderRadius: 8,
            padding: "40px 20px",
            textAlign: "center",
          }}
        >
          <Newspaper
            size={28}
            style={{ color: "var(--color-text-tertiary)", margin: "0 auto 12px" }}
          />
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            No updates posted yet
          </p>
          <p
            style={{
              fontSize: 11,
              color: "var(--color-text-tertiary)",
              marginTop: 4,
            }}
          >
            Keep investors and partners informed with regular updates.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {items.map((item, idx) => (
            <div
              key={item.id}
              style={{
                padding: "12px 16px",
                borderBottom:
                  idx < items.length - 1
                    ? "0.5px solid var(--color-border-subtle)"
                    : "none",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--color-text-primary)",
                    margin: 0,
                    marginBottom: 4,
                  }}
                >
                  {item.title}
                </p>
                {item.content && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                      margin: "0 0 6px",
                      lineHeight: 1.5,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as const,
                    }}
                  >
                    {item.content}
                  </p>
                )}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 10,
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  <Calendar size={10} />
                  {formatDate(item.published_at)}
                </span>
              </div>

              <button
                onClick={() => deleteItem(item.id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#dc2626",
                  padding: 6,
                  borderRadius: 4,
                  flexShrink: 0,
                }}
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
