"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Check, Loader2, Crown, ExternalLink } from "lucide-react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase";
import { useDashboard } from "@/app/manage/layout";

const supabase = createBrowserClient();

/* ─── Shared input/label styles (matching other manage pages) ─── */
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

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

export default function SettingsPage() {
  const { claim, company } = useDashboard();

  const [contactEmail, setContactEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Load current contact email */
  const loadSettings = useCallback(async () => {
    const { data } = await supabase
      .from("company_claims")
      .select("contact_email")
      .eq("id", claim.id)
      .single();

    if (data) {
      setContactEmail(data.contact_email || "");
    }
  }, [claim.id]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  /* Save handler */
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    const { error: updateErr } = await supabase
      .from("company_claims")
      .update({ contact_email: contactEmail || null })
      .eq("id", claim.id);

    if (updateErr) {
      setError("Failed to save. Please try again.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const planLabel = PLAN_LABELS[claim.plan] ?? claim.plan;

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: "var(--color-text-primary)",
            margin: 0,
          }}
        >
          Settings
        </h1>
        <p
          style={{
            fontSize: 12,
            color: "var(--color-text-tertiary)",
            marginTop: 4,
          }}
        >
          Manage contact details and your subscription
        </p>
      </div>

      {/* ── Contact section ── */}
      <div
        style={{
          background: "var(--color-bg-secondary)",
          border: "0.5px solid var(--color-border-subtle)",
          borderRadius: 8,
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        {/* Section label */}
        <div
          style={{
            padding: "12px 20px 10px",
            borderBottom: "0.5px solid var(--color-border-subtle)",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--color-text-secondary)",
            }}
          >
            Contact
          </span>
        </div>

        {/* Contact email field */}
        <div style={{ padding: "16px 20px" }}>
          <label style={labelStyle}>Contact Email</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="contact@yourcompany.com"
            style={inputStyle}
          />
          <p
            style={{
              fontSize: 11,
              color: "var(--color-text-tertiary)",
              marginTop: 6,
            }}
          >
            Shown to investors and partners who want to reach out to {company.name}.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p
          style={{
            fontSize: 12,
            color: "#c0392b",
            marginBottom: 10,
          }}
        >
          {error}
        </p>
      )}

      {/* Save button */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: saved ? "#16a34a" : "var(--color-accent)",
            color: "white",
            fontSize: 12,
            fontWeight: 500,
            padding: "7px 14px",
            borderRadius: 6,
            border: "none",
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.7 : 1,
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
          {saved ? "Saved!" : "Save Changes"}
        </button>

        {saved && (
          <span style={{ fontSize: 12, color: "#16a34a" }}>
            Settings updated successfully
          </span>
        )}
      </div>

      {/* ── Plan section ── */}
      <div
        style={{
          background: "var(--color-bg-secondary)",
          border: "0.5px solid var(--color-border-subtle)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {/* Section label */}
        <div
          style={{
            padding: "12px 20px 10px",
            borderBottom: "0.5px solid var(--color-border-subtle)",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--color-text-secondary)",
            }}
          >
            Subscription
          </span>
        </div>

        {/* Current plan display */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "0.5px solid var(--color-border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "var(--color-text-tertiary)",
                  marginBottom: 4,
                }}
              >
                Current Plan
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--color-text-primary)",
                  }}
                >
                  {planLabel}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 9,
                    fontWeight: 500,
                    padding: "2px 7px",
                    borderRadius: 999,
                    background: "var(--color-accent)",
                    color: "white",
                  }}
                >
                  <Crown size={8} />
                  {planLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade CTA */}
        <div style={{ padding: "14px 20px" }}>
          <Link
            href={`/claim/${company.slug}`}
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
              textDecoration: "none",
            }}
          >
            <ExternalLink size={12} />
            Change plan
          </Link>

          {/* Billing history placeholder */}
          <p
            style={{
              fontSize: 12,
              color: "var(--color-text-tertiary)",
              marginTop: 10,
            }}
          >
            Billing history coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
