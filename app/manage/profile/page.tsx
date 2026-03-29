"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Check, Loader2 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { useDashboard } from "@/app/manage/layout";

/* ─── Shared input style ─── */
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

export default function ProfilePage() {
  const { company } = useDashboard();
  const supabase = createBrowserClient();

  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Load current values */
  const loadProfile = useCallback(async () => {
    const { data } = await supabase
      .from("companies")
      .select("description, website, city, country")
      .eq("id", company.id)
      .single();

    if (data) {
      setDescription(data.description || "");
      setWebsite(data.website || "");
      setCity(data.city || "");
      setCountry(data.country || "");
    }
  }, [company.id, supabase]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  /* Save handler */
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    const { error: updateErr } = await supabase
      .from("companies")
      .update({ description, website, city, country })
      .eq("id", company.id);

    if (updateErr) {
      setError("Failed to save. Please try again.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

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
          Edit Profile
        </h1>
        <p
          style={{
            fontSize: 12,
            color: "var(--color-text-tertiary)",
            marginTop: 4,
          }}
        >
          Update your public company profile information
        </p>
      </div>

      {/* Form card */}
      <div
        style={{
          background: "var(--color-bg-secondary)",
          border: "0.5px solid var(--color-border-subtle)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {/* Description */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "0.5px solid var(--color-border-subtle)",
          }}
        >
          <label style={labelStyle}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what your company does, its mission, and technology..."
            rows={5}
            style={{
              ...inputStyle,
              resize: "vertical",
              lineHeight: 1.65,
            }}
          />
        </div>

        {/* Website */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "0.5px solid var(--color-border-subtle)",
          }}
        >
          <label style={labelStyle}>Website</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://your-company.com"
            style={inputStyle}
          />
        </div>

        {/* City & Country */}
        <div
          style={{
            padding: "16px 20px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          <div>
            <label style={labelStyle}>City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Oslo"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Country</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Norway"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p
          style={{
            fontSize: 12,
            color: "#c0392b",
            marginTop: 10,
          }}
        >
          {error}
        </p>
      )}

      {/* Save button */}
      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
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
          <span
            style={{
              fontSize: 12,
              color: "#16a34a",
            }}
          >
            Profile updated successfully
          </span>
        )}
      </div>
    </div>
  );
}
