"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useDashboard } from "@/app/manage/layout";

const supabase = createBrowserClient();
import { PremiumGate } from "@/components/dashboard/PremiumGate";
import { Save, Loader2, Check } from "lucide-react";

/* ─── Inner content ─── */

function BrandingContent() {
  const { company, claim, refreshClaim } = useDashboard();

  const [brandColor, setBrandColor] = useState(claim.brand_color || "#1a7a5e");
  const [heroTagline, setHeroTagline] = useState(claim.hero_tagline || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    await supabase
      .from("company_claims")
      .update({ brand_color: brandColor, hero_tagline: heroTagline })
      .eq("id", claim.id);
    await refreshClaim();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "var(--color-text-tertiary)",
    display: "block",
    marginBottom: 6,
    fontWeight: 500,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 2 }}>
            Branding
          </h1>
          <p style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
            Customize how your profile looks to visitors
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
          {saved ? "Saved!" : "Save Branding"}
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
        {/* Brand Color */}
        <div style={{ padding: "16px 18px", borderBottom: "0.5px solid var(--color-border-subtle)" }}>
          <label style={labelStyle}>Brand Color</label>
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 10 }}>
            Used as accent color throughout your premium profile — buttons, links, and badges.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 6,
                border: "0.5px solid var(--color-border-subtle)",
                cursor: "pointer",
                padding: 2,
                background: "var(--color-bg-secondary)",
              }}
            />
            <input
              type="text"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              placeholder="#1a7a5e"
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
                borderRadius: 6,
                fontSize: 13,
                padding: "8px 12px",
                color: "var(--color-text-primary)",
                outline: "none",
                width: 110,
                fontFamily: "monospace",
              }}
            />
            <div
              style={{
                flex: 1,
                height: 40,
                borderRadius: 6,
                background: `linear-gradient(135deg, ${brandColor}20, ${brandColor}60, ${brandColor})`,
              }}
            />
          </div>
        </div>

        {/* Hero Tagline */}
        <div style={{ padding: "16px 18px" }}>
          <label style={labelStyle}>Hero Tagline</label>
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 10 }}>
            Displayed below your company name in the profile hero section.
          </p>
          <textarea
            value={heroTagline}
            onChange={(e) => setHeroTagline(e.target.value)}
            placeholder="Pioneering next-generation cell therapies for solid tumors"
            rows={3}
            style={{
              background: "var(--color-bg-secondary)",
              border: "0.5px solid var(--color-border-subtle)",
              borderRadius: 6,
              fontSize: 13,
              padding: "8px 12px",
              color: "var(--color-text-primary)",
              outline: "none",
              width: "100%",
              resize: "vertical",
            }}
          />
        </div>
      </div>

      {/* Live preview */}
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
          Preview
        </p>
        <div
          style={{
            borderRadius: 8,
            overflow: "hidden",
            background: `linear-gradient(135deg, ${brandColor}12 0%, ${brandColor}06 50%, transparent 100%)`,
            border: `0.5px solid ${brandColor}30`,
          }}
        >
          <div
            style={{
              height: 3,
              background: `linear-gradient(90deg, ${brandColor}, ${brandColor}80, transparent)`,
            }}
          />
          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)" }}>
                {company.name}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  padding: "2px 8px",
                  borderRadius: 20,
                  color: "white",
                  background: brandColor,
                }}
              >
                Verified Company
              </span>
            </div>
            {heroTagline && (
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 6 }}>
                {heroTagline}
              </p>
            )}
            {!heroTagline && (
              <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 6, fontStyle: "italic" }}>
                Your tagline will appear here
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─── */

export default function BrandingPage() {
  const { claim, company } = useDashboard();

  return (
    <PremiumGate
      plan={claim.plan}
      requiredPlan="professional"
      featureName="Custom Branding"
      companySlug={company.slug}
    >
      <BrandingContent />
    </PremiumGate>
  );
}
