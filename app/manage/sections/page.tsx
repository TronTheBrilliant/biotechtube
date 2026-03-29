"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useDashboard } from "@/app/manage/layout";

const supabase = createBrowserClient();
import { PremiumGate } from "@/components/dashboard/PremiumGate";
import {
  Plus,
  Save,
  Trash2,
  Pencil,
  Loader2,
  Check,
  ChevronUp,
  ChevronDown,
  FileText,
} from "lucide-react";

/* ─── Inner content ─── */

function SectionsContent() {
  const { claim, company, refreshClaim } = useDashboard();

  const [sections, setSections] = useState<{ title: string; content: string }[]>(
    Array.isArray(claim.custom_sections) ? claim.custom_sections : []
  );
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async (updatedSections: { title: string; content: string }[]) => {
    setSaving(true);
    setSaved(false);
    await supabase
      .from("company_claims")
      .update({ custom_sections: updatedSections })
      .eq("id", claim.id);
    await refreshClaim();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const addSection = () => {
    const updated = [...sections, { title: "", content: "" }];
    setSections(updated);
    setEditingIdx(updated.length - 1);
  };

  const deleteSection = (idx: number) => {
    const updated = sections.filter((_, i) => i !== idx);
    setSections(updated);
    if (editingIdx === idx) setEditingIdx(null);
  };

  const moveSection = (idx: number, direction: "up" | "down") => {
    const updated = [...sections];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    setSections(updated);
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
            Custom Sections
          </h1>
          <p style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
            Add custom content blocks to your {company.name} profile
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={addSection}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
              color: "white",
              background: "var(--color-accent)",
              padding: "7px 14px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
            }}
          >
            <Plus size={13} />
            Add Section
          </button>
          <button
            onClick={() => save(sections)}
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
            {saved ? "Saved!" : "Save All"}
          </button>
        </div>
      </div>

      <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 16 }}>
        Add custom content blocks — Investor Relations, Technology Platform, Partnerships, etc.
      </p>

      {/* Empty state */}
      {sections.length === 0 ? (
        <div
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
            borderRadius: 8,
            padding: 40,
            textAlign: "center",
          }}
        >
          <FileText
            size={26}
            style={{ color: "var(--color-text-tertiary)", margin: "0 auto 10px" }}
          />
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>
            No custom sections yet.
          </p>
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Tell your story with custom content blocks.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sections.map((section, idx) => (
            <div
              key={idx}
              style={{
                background: "var(--color-bg-secondary)",
                border: `0.5px solid ${editingIdx === idx ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
                borderRadius: 8,
                padding: "14px 16px",
              }}
            >
              {editingIdx === idx ? (
                /* Edit mode */
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => {
                      const updated = [...sections];
                      updated[idx] = { ...updated[idx], title: e.target.value };
                      setSections(updated);
                    }}
                    placeholder="Section title (e.g. Investor Relations)"
                    style={{ ...inputStyle, fontWeight: 500 }}
                    autoFocus
                  />
                  <textarea
                    value={section.content}
                    onChange={(e) => {
                      const updated = [...sections];
                      updated[idx] = { ...updated[idx], content: e.target.value };
                      setSections(updated);
                    }}
                    placeholder="Section content. Supports **bold**, *italic*, and [links](url)."
                    rows={6}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                  <button
                    onClick={() => setEditingIdx(null)}
                    style={{
                      alignSelf: "flex-start",
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--color-text-accent)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px 0",
                    }}
                  >
                    Done editing
                  </button>
                </div>
              ) : (
                /* View mode */
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 3 }}>
                      {section.title || "(Untitled)"}
                    </p>
                    {section.content && (
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-tertiary)",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {section.content}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    {idx > 0 && (
                      <button
                        onClick={() => moveSection(idx, "up")}
                        style={{ padding: 5, borderRadius: 4, border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-tertiary)" }}
                      >
                        <ChevronUp size={13} />
                      </button>
                    )}
                    {idx < sections.length - 1 && (
                      <button
                        onClick={() => moveSection(idx, "down")}
                        style={{ padding: 5, borderRadius: 4, border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-tertiary)" }}
                      >
                        <ChevronDown size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => setEditingIdx(idx)}
                      style={{ padding: 5, borderRadius: 4, border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-tertiary)" }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => deleteSection(idx)}
                      style={{ padding: 5, borderRadius: 4, border: "none", background: "transparent", cursor: "pointer", color: "#dc2626" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Page ─── */

export default function SectionsPage() {
  const { claim, company } = useDashboard();

  return (
    <PremiumGate
      plan={claim.plan}
      requiredPlan="professional"
      featureName="Custom Sections"
      companySlug={company.slug}
    >
      <SectionsContent />
    </PremiumGate>
  );
}
