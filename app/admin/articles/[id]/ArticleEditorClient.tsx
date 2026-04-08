"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapLink from "@tiptap/extension-link";
import TiptapImage from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { PullQuote } from "@/lib/tiptap/extensions/pull-quote";
import { CompanyCard } from "@/lib/tiptap/extensions/company-card";
import { ChartEmbed } from "@/lib/tiptap/extensions/chart-embed";
import { PipelineTable } from "@/lib/tiptap/extensions/pipeline-table";
import { DataCallout } from "@/lib/tiptap/extensions/data-callout";
import { Divider } from "@/lib/tiptap/extensions/divider-block";
import { SlashCommand } from "@/lib/tiptap/extensions/slash-command";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { AdminNav } from "@/components/admin/AdminNav";
import BlockRenderer from "@/components/news/BlockRenderer";
import { useAuth } from "@/lib/auth";
import { ADMIN_EMAIL } from "@/lib/admin-utils";
import { createBrowserClient } from "@/lib/supabase";
import {
  Loader2,
  ArrowLeft,
  Eye,
  Save,
  X,
  Plus,
  Trash2,
  Copy,
  Upload,
} from "lucide-react";

import type { ArticleStatus, Source, TipTapDoc } from "@/lib/article-engine/types";

const STATUS_OPTIONS: { value: ArticleStatus; label: string; color: string }[] = [
  { value: "draft", label: "Draft", color: "#9ca3af" },
  { value: "in_review", label: "Review", color: "#eab308" },
  { value: "published", label: "Published", color: "#22c55e" },
  { value: "archived", label: "Archived", color: "#ef4444" },
];

export default function ArticleEditorClient({ id }: { id: string }) {
  const { user, loading: authLoading } = useAuth();

  // Article data
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [headline, setHeadline] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState<ArticleStatus>("draft");
  const [slug, setSlug] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [heroImageUrl, setHeroImageUrl] = useState("");

  // UI state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Fetch article
  const fetchArticle = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/articles/${id}`);
      const data = await res.json();
      if (data.error) {
        setToast({ message: data.error, type: "error" });
        setLoading(false);
        return;
      }
      const a = data.article;
      setArticle(a);
      setHeadline(a.headline || "");
      setSubtitle(a.subtitle || "");
      setSummary(a.summary || "");
      setStatus(a.status || "draft");
      setSlug(a.slug || "");
      setSeoTitle(a.seo_title || "");
      setSeoDescription(a.seo_description || "");
      setSources(a.sources || []);
      setHeroImageUrl(a.hero_image_url || "");
    } catch (err: any) {
      setToast({ message: `Failed to load article: ${err.message}`, type: "error" });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    if (user?.email !== ADMIN_EMAIL) {
      setLoading(false);
      return;
    }
    fetchArticle();
  }, [authLoading, user, fetchArticle]);

  // Editor
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ heading: { levels: [2, 3] } }),
        TiptapLink,
        TiptapImage,
        Placeholder.configure({
          placeholder: "Start writing or type / for commands...",
        }),
        PullQuote,
        CompanyCard,
        ChartEmbed,
        PipelineTable,
        DataCallout,
        Divider,
        SlashCommand,
      ],
      content: article?.body || { type: "doc", content: [] },
      editorProps: {
        attributes: {
          style: "outline: none; min-height: 400px;",
        },
      },
    },
    [article]
  );

  // Save
  const handleSave = async () => {
    if (!editor) return;
    setSaving(true);
    try {
      const body = editor.getJSON() as TipTapDoc;
      const res = await fetch(`/api/admin/articles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline,
          subtitle,
          summary,
          body,
          status,
          slug,
          seo_title: seoTitle,
          seo_description: seoDescription,
          sources,
          hero_image_url: heroImageUrl,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setToast({ message: `Save failed: ${data.error}`, type: "error" });
      } else {
        setArticle(data.article);
        setToast({ message: "Article saved", type: "success" });
      }
    } catch (err: any) {
      setToast({ message: `Save failed: ${err.message}`, type: "error" });
    }
    setSaving(false);
  };

  // Copy AI prompt
  const handleCopyPrompt = () => {
    if (!article?.hero_image_prompt) return;
    navigator.clipboard.writeText(article.hero_image_prompt);
    setToast({ message: "Image prompt copied to clipboard", type: "success" });
  };

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const supabase = createBrowserClient();
      const path = `heroes/${slug || id}.webp`;
      const { error } = await supabase.storage
        .from("article-images")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const url = supabase.storage
        .from("article-images")
        .getPublicUrl(path).data.publicUrl;
      setHeroImageUrl(url);
      setToast({ message: "Hero image uploaded", type: "success" });
    } catch (err: any) {
      setToast({ message: `Upload failed: ${err.message}`, type: "error" });
    }
  };

  // Sources helpers
  const addSource = () => {
    setSources((prev) => [...prev, { name: "", url: "", date: "" }]);
  };
  const removeSource = (index: number) => {
    setSources((prev) => prev.filter((_, i) => i !== index));
  };
  const updateSource = (index: number, field: keyof Source, value: string) => {
    setSources((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <>
        <Nav />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60vh",
          }}
        >
          <Loader2
            size={32}
            className="animate-spin"
            style={{ color: "var(--color-text-tertiary)" }}
          />
        </div>
        <Footer />
      </>
    );
  }

  // Auth guard
  if (user?.email !== ADMIN_EMAIL) {
    return (
      <>
        <Nav />
        <div
          style={{
            textAlign: "center",
            padding: "4rem 1rem",
            color: "var(--color-text-secondary)",
          }}
        >
          Admin access required
        </div>
        <Footer />
      </>
    );
  }

  if (!article) {
    return (
      <>
        <Nav />
        <div
          style={{
            textAlign: "center",
            padding: "4rem 1rem",
            color: "var(--color-text-secondary)",
          }}
        >
          Article not found
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <style>{`
        .ProseMirror {
          color: var(--color-text-primary);
          font-size: 16px;
          line-height: 1.7;
        }
        .ProseMirror p { margin-bottom: 1rem; }
        .ProseMirror h2 { font-size: 1.5rem; font-weight: 700; margin-top: 2rem; margin-bottom: 0.75rem; }
        .ProseMirror h3 { font-size: 1.25rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; }
        .ProseMirror .is-empty::before {
          content: attr(data-placeholder);
          color: var(--color-text-tertiary);
          pointer-events: none;
          float: left;
          height: 0;
        }
      `}</style>

      <Nav />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "6rem 1rem 2rem" }}>
        <AdminNav />

        {/* Top bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <Link
            href="/admin/articles"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "var(--color-text-secondary)",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={14} />
            Back to Articles
          </Link>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setShowPreview(true)}
              style={{
                padding: "8px 16px",
                background: "transparent",
                border: "1px solid var(--color-border-subtle)",
                borderRadius: 6,
                color: "var(--color-text-secondary)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Eye size={14} />
              Preview
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "8px 16px",
                background: "var(--color-text-primary)",
                border: "none",
                borderRadius: 6,
                color: "var(--color-bg-primary)",
                fontSize: 13,
                fontWeight: 500,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Two-panel layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* Left panel: Editor */}
          <div>
            {/* Headline */}
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Article headline..."
              style={{
                width: "100%",
                fontSize: 24,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                background: "transparent",
                border: "none",
                outline: "none",
                marginBottom: 8,
                fontFamily: "inherit",
              }}
            />

            {/* Subtitle */}
            <textarea
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Subtitle..."
              rows={2}
              style={{
                width: "100%",
                fontSize: 16,
                color: "var(--color-text-secondary)",
                background: "transparent",
                border: "none",
                outline: "none",
                resize: "vertical",
                marginBottom: 20,
                fontFamily: "inherit",
                lineHeight: 1.5,
              }}
            />

            {/* Editor area */}
            <div
              style={{
                background: "var(--color-bg-primary)",
                border: "1px solid var(--color-border-subtle)",
                borderRadius: 10,
                padding: 24,
                minHeight: 500,
              }}
            >
              {editor && <EditorContent editor={editor} />}
            </div>
          </div>

          {/* Right panel: Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Status */}
            <SidebarSection title="STATUS">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {STATUS_OPTIONS.map((opt) => {
                  const isActive = status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setStatus(opt.value)}
                      style={{
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 500,
                        borderRadius: 6,
                        border: `1px solid ${opt.color}`,
                        background: isActive ? opt.color : "transparent",
                        color: isActive ? "#fff" : opt.color,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </SidebarSection>

            {/* SEO */}
            <SidebarSection title="SEO">
              <SidebarField label="Title">
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="SEO title..."
                  style={sidebarInputStyle}
                />
              </SidebarField>
              <SidebarField label="Description">
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="SEO description..."
                  rows={3}
                  style={{ ...sidebarInputStyle, resize: "vertical" }}
                />
              </SidebarField>
              <SidebarField label="Slug">
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="article-slug"
                  style={sidebarInputStyle}
                />
              </SidebarField>
            </SidebarSection>

            {/* Summary */}
            <SidebarSection title="SUMMARY">
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Article summary..."
                rows={3}
                style={{ ...sidebarInputStyle, resize: "vertical" }}
              />
            </SidebarSection>

            {/* Hero Image */}
            <SidebarSection title="HERO IMAGE">
              {heroImageUrl && (
                <div
                  style={{
                    width: "100%",
                    height: 140,
                    borderRadius: 8,
                    overflow: "hidden",
                    marginBottom: 10,
                    border: "1px solid var(--color-border-subtle)",
                  }}
                >
                  <img
                    src={heroImageUrl}
                    alt="Hero"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                {article.hero_image_prompt && (
                  <button
                    onClick={handleCopyPrompt}
                    style={{
                      ...sidebarButtonStyle,
                      flex: 1,
                    }}
                  >
                    <Copy size={12} style={{ marginRight: 4 }} />
                    Copy AI Prompt
                  </button>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    ...sidebarButtonStyle,
                    flex: 1,
                  }}
                >
                  <Upload size={12} style={{ marginRight: 4 }} />
                  Upload
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                />
              </div>
            </SidebarSection>

            {/* Sources */}
            <SidebarSection title="SOURCES">
              {sources.map((source, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    marginBottom: 10,
                    padding: 10,
                    background: "var(--color-bg-secondary)",
                    borderRadius: 6,
                    position: "relative",
                  }}
                >
                  <button
                    onClick={() => removeSource(i)}
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      background: "none",
                      border: "none",
                      color: "var(--color-text-tertiary)",
                      cursor: "pointer",
                      padding: 2,
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                  <input
                    type="text"
                    value={source.name}
                    onChange={(e) => updateSource(i, "name", e.target.value)}
                    placeholder="Source name"
                    style={{ ...sidebarInputStyle, fontSize: 11 }}
                  />
                  <input
                    type="text"
                    value={source.url}
                    onChange={(e) => updateSource(i, "url", e.target.value)}
                    placeholder="URL"
                    style={{ ...sidebarInputStyle, fontSize: 11 }}
                  />
                  <input
                    type="text"
                    value={source.date || ""}
                    onChange={(e) => updateSource(i, "date", e.target.value)}
                    placeholder="Date (optional)"
                    style={{ ...sidebarInputStyle, fontSize: 11 }}
                  />
                </div>
              ))}
              <button
                onClick={addSource}
                style={{
                  ...sidebarButtonStyle,
                  width: "100%",
                }}
              >
                <Plus size={12} style={{ marginRight: 4 }} />
                Add source
              </button>
            </SidebarSection>

            {/* Metadata (read-only) */}
            <SidebarSection title="METADATA">
              <MetadataRow label="Type" value={article.type?.replace(/_/g, " ")} />
              <MetadataRow label="Confidence" value={article.confidence} />
              <MetadataRow
                label="Reading time"
                value={article.reading_time_min ? `${article.reading_time_min} min` : "N/A"}
              />
              <MetadataRow label="Edited by" value={article.edited_by || "ai"} />
              <MetadataRow
                label="Style"
                value={article.article_style?.replace(/_/g, " ") || "N/A"}
              />
              <MetadataRow
                label="Created"
                value={
                  article.created_at
                    ? new Date(article.created_at).toLocaleDateString()
                    : "N/A"
                }
              />
            </SidebarSection>
          </div>
        </div>
      </div>

      {/* Preview modal */}
      {showPreview && editor && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2000,
            background: "var(--color-bg-primary)",
            overflowY: "auto",
          }}
        >
          {/* Preview header */}
          <div
            style={{
              position: "sticky",
              top: 0,
              background: "var(--color-bg-primary)",
              borderBottom: "1px solid var(--color-border-subtle)",
              padding: "12px 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              zIndex: 10,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-text-secondary)",
              }}
            >
              Preview
            </span>
            <button
              onClick={() => setShowPreview(false)}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Preview body */}
          <div
            style={{
              maxWidth: 720,
              margin: "0 auto",
              padding: "40px 24px 80px",
            }}
          >
            {heroImageUrl && (
              <div
                style={{
                  width: "100%",
                  height: 320,
                  borderRadius: 12,
                  overflow: "hidden",
                  marginBottom: 32,
                }}
              >
                <img
                  src={heroImageUrl}
                  alt={headline}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            )}
            <h1
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                marginBottom: 12,
                lineHeight: 1.2,
              }}
            >
              {headline}
            </h1>
            {subtitle && (
              <p
                style={{
                  fontSize: 18,
                  color: "var(--color-text-secondary)",
                  marginBottom: 32,
                  lineHeight: 1.5,
                }}
              >
                {subtitle}
              </p>
            )}
            <BlockRenderer doc={editor.getJSON() as TipTapDoc} />
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            padding: "12px 20px",
            background: "var(--color-bg-primary)",
            border: "1px solid var(--color-border-subtle)",
            borderLeft:
              toast.type === "error"
                ? "3px solid #c45a5a"
                : "3px solid var(--color-text-tertiary)",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            color: "var(--color-text-primary)",
            fontSize: 12,
            fontWeight: 400,
            zIndex: 2001,
            maxWidth: 400,
          }}
        >
          {toast.message}
        </div>
      )}

      <Footer />
    </>
  );
}

/* ── Sidebar helpers ── */

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--color-bg-primary)",
        border: "1px solid var(--color-border-subtle)",
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--color-text-tertiary)",
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function SidebarField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 11,
          color: "var(--color-text-tertiary)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "4px 0",
        fontSize: 12,
      }}
    >
      <span style={{ color: "var(--color-text-tertiary)" }}>{label}</span>
      <span
        style={{
          color: "var(--color-text-secondary)",
          fontWeight: 500,
          textTransform: "capitalize",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ── Shared styles ── */

const sidebarInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  fontSize: 12,
  color: "var(--color-text-primary)",
  background: "var(--color-bg-secondary)",
  border: "1px solid var(--color-border-subtle)",
  borderRadius: 6,
  outline: "none",
  fontFamily: "inherit",
};

const sidebarButtonStyle: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: 11,
  fontWeight: 500,
  color: "var(--color-text-secondary)",
  background: "transparent",
  border: "1px solid var(--color-border-subtle)",
  borderRadius: 6,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
