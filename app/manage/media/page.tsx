"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useDashboard } from "@/app/manage/layout";
import { PremiumGate } from "@/components/dashboard/PremiumGate";
import { Save, Loader2, Check, ExternalLink } from "lucide-react";

/* ─── Helpers ─── */

function getEmbedUrl(url: string): string | null {
  if (!url) return null;

  // YouTube: watch?v=ID or youtu.be/ID or embed/ID
  const ytMatch =
    url.match(/youtube\.com\/watch\?v=([\w-]+)/) ||
    url.match(/youtu\.be\/([\w-]+)/) ||
    url.match(/youtube\.com\/embed\/([\w-]+)/);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  // Vimeo: vimeo.com/ID
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return null;
}

/* ─── Inner content ─── */

function MediaContent() {
  const { claim, company, refreshClaim } = useDashboard();
  const supabase = createBrowserClient();

  const [videoUrl, setVideoUrl] = useState(claim.video_url || "");
  const [investorDeckUrl, setInvestorDeckUrl] = useState(claim.investor_deck_url || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    await supabase
      .from("company_claims")
      .update({
        video_url: videoUrl || null,
        investor_deck_url: investorDeckUrl || null,
      })
      .eq("id", claim.id);
    await refreshClaim();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const embedUrl = getEmbedUrl(videoUrl);

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "var(--color-text-tertiary)",
    display: "block",
    marginBottom: 6,
    fontWeight: 500,
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--color-bg-secondary)",
    border: "0.5px solid var(--color-border-subtle)",
    borderRadius: 6,
    fontSize: 13,
    padding: "8px 12px",
    color: "var(--color-text-primary)",
    outline: "none",
    width: "100%",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 2 }}>
            Media
          </h1>
          <p style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
            Add video content and investor materials to your profile
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 500,
            color: "white",
            background: saved ? "#16a34a" : "var(--color-accent)",
            padding: "7px 14px",
            borderRadius: 6,
            border: "none",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
            flexShrink: 0,
            transition: "background 200ms",
          }}
        >
          {saving ? (
            <Loader2 size={13} className="animate-spin" />
          ) : saved ? (
            <Check size={13} />
          ) : (
            <Save size={13} />
          )}
          {saved ? "Saved!" : "Save Media"}
        </button>
      </div>

      {/* Form card */}
      <div
        style={{
          background: "var(--color-bg-secondary)",
          border: "0.5px solid var(--color-border-subtle)",
          borderRadius: 8,
          overflow: "hidden",
          marginBottom: 20,
        }}
      >
        {/* Video URL */}
        <div style={{ padding: "16px 18px", borderBottom: "0.5px solid var(--color-border-subtle)" }}>
          <label style={labelStyle}>Video URL</label>
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 10 }}>
            YouTube or Vimeo URL for your company overview video.
          </p>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            style={inputStyle}
          />
        </div>

        {/* Investor Deck URL */}
        <div style={{ padding: "16px 18px" }}>
          <label style={labelStyle}>Investor Deck URL</label>
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 10 }}>
            Link to your investor presentation PDF or hosted deck (Docsend, Notion, etc.).
          </p>
          <input
            type="text"
            value={investorDeckUrl}
            onChange={(e) => setInvestorDeckUrl(e.target.value)}
            placeholder="https://docsend.com/view/..."
            style={inputStyle}
          />
        </div>
      </div>

      {/* Video preview */}
      {videoUrl && (
        <div style={{ marginBottom: 20 }}>
          <p
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--color-text-tertiary)",
              fontWeight: 500,
              marginBottom: 8,
            }}
          >
            Video Preview
          </p>
          {embedUrl ? (
            <div
              style={{
                position: "relative",
                paddingTop: "56.25%",
                borderRadius: 8,
                overflow: "hidden",
                border: "0.5px solid var(--color-border-subtle)",
              }}
            >
              <iframe
                src={embedUrl}
                title="Video preview"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
              />
            </div>
          ) : (
            <div
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
                borderRadius: 8,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", flex: 1 }}>
                URL entered — preview only available for YouTube and Vimeo links.
              </p>
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: "var(--color-text-accent)",
                  textDecoration: "none",
                  flexShrink: 0,
                }}
              >
                <ExternalLink size={12} />
                Open link
              </a>
            </div>
          )}
        </div>
      )}

      {/* Investor deck link */}
      {investorDeckUrl && (
        <div>
          <p
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--color-text-tertiary)",
              fontWeight: 500,
              marginBottom: 8,
            }}
          >
            Investor Deck
          </p>
          <div
            style={{
              background: "var(--color-bg-secondary)",
              border: "0.5px solid var(--color-border-subtle)",
              borderRadius: 8,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <p
              style={{
                fontSize: 12,
                color: "var(--color-text-secondary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                marginRight: 12,
              }}
            >
              {investorDeckUrl}
            </p>
            <a
              href={investorDeckUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                color: "var(--color-text-accent)",
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              <ExternalLink size={12} />
              Open
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Page ─── */

export default function MediaPage() {
  const { claim, company } = useDashboard();

  return (
    <PremiumGate
      plan={claim.plan}
      requiredPlan="professional"
      featureName="Media & Video"
      companySlug={company.slug}
    >
      <MediaContent />
    </PremiumGate>
  );
}
