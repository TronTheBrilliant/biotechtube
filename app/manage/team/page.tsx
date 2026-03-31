"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Save, Loader2, Users, X } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { useDashboard } from "@/app/manage/layout";

const supabase = createBrowserClient();

interface TeamMember {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  display_order: number;
}

const STARTER_LIMIT = 5;

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

export default function TeamPage() {
  const { company, claim } = useDashboard();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<TeamMember> | null>(null);
  const [saving, setSaving] = useState(false);

  const isPremium =
    claim.plan === "professional" ||
    claim.plan === "enterprise" ||
    claim.plan === "premium";

  const atLimit = !isPremium && members.length >= STARTER_LIMIT;

  const loadMembers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("company_team")
      .select("*")
      .eq("company_id", company.id)
      .order("display_order");
    setMembers(data || []);
    setLoading(false);
  }, [company.id]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const saveMember = async () => {
    if (!editing || !editing.name) return;
    setSaving(true);

    if (editing.id) {
      await supabase
        .from("company_team")
        .update({
          name: editing.name,
          title: editing.title || null,
          bio: editing.bio || null,
          photo_url: editing.photo_url || null,
          linkedin_url: editing.linkedin_url || null,
        })
        .eq("id", editing.id);
    } else {
      await supabase.from("company_team").insert({
        company_id: company.id,
        name: editing.name,
        title: editing.title || null,
        bio: editing.bio || null,
        photo_url: editing.photo_url || null,
        linkedin_url: editing.linkedin_url || null,
        display_order: members.length,
      });
    }

    setSaving(false);
    setEditing(null);
    loadMembers();
  };

  const deleteMember = async (id: string) => {
    await supabase.from("company_team").delete().eq("id", id);
    loadMembers();
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div style={{ maxWidth: 720 }}>
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
            Team Members
          </h1>
          <p
            style={{
              fontSize: 12,
              color: "var(--color-text-tertiary)",
              marginTop: 4,
            }}
          >
            {isPremium
              ? `${members.length} members · Unlimited`
              : `${members.length} / ${STARTER_LIMIT} members · Starter plan`}
          </p>
        </div>

        {!editing && (
          <button
            onClick={() => {
              if (atLimit) return;
              setEditing({ name: "", title: "", bio: "", photo_url: "", linkedin_url: "" });
            }}
            disabled={atLimit}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: atLimit ? "var(--color-bg-secondary)" : "var(--color-accent)",
              color: atLimit ? "var(--color-text-tertiary)" : "white",
              border: atLimit ? "0.5px solid var(--color-border-subtle)" : "none",
              fontSize: 12,
              fontWeight: 500,
              padding: "7px 12px",
              borderRadius: 6,
              cursor: atLimit ? "not-allowed" : "pointer",
              flexShrink: 0,
            }}
          >
            <Plus size={13} />
            Add Member
          </button>
        )}
      </div>

      {/* Limit warning */}
      {atLimit && (
        <div
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 12,
            color: "var(--color-text-secondary)",
          }}
        >
          Starter plan is limited to {STARTER_LIMIT} team members. Upgrade to Professional for unlimited.
        </div>
      )}

      {/* Add / Edit form */}
      {editing && (
        <div
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid #059669",
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
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-text-primary)",
              }}
            >
              {editing.id ? "Edit Member" : "Add Member"}
            </span>
            <button
              onClick={() => setEditing(null)}
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div>
              <label style={labelStyle}>Name *</label>
              <input
                type="text"
                value={editing.name || ""}
                onChange={(e) => setEditing((m) => ({ ...m, name: e.target.value }))}
                placeholder="Jane Smith"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Title</label>
              <input
                type="text"
                value={editing.title || ""}
                onChange={(e) => setEditing((m) => ({ ...m, title: e.target.value }))}
                placeholder="CEO & Co-Founder"
                style={inputStyle}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Bio</label>
              <textarea
                value={editing.bio || ""}
                onChange={(e) => setEditing((m) => ({ ...m, bio: e.target.value }))}
                placeholder="Brief bio..."
                rows={3}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }}
              />
            </div>
            <div>
              <label style={labelStyle}>Photo URL</label>
              <input
                type="url"
                value={editing.photo_url || ""}
                onChange={(e) => setEditing((m) => ({ ...m, photo_url: e.target.value }))}
                placeholder="https://example.com/photo.jpg"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>LinkedIn URL</label>
              <input
                type="url"
                value={editing.linkedin_url || ""}
                onChange={(e) => setEditing((m) => ({ ...m, linkedin_url: e.target.value }))}
                placeholder="https://linkedin.com/in/..."
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button
              onClick={saveMember}
              disabled={saving || !editing.name}
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
                cursor: saving || !editing.name ? "not-allowed" : "pointer",
                opacity: saving || !editing.name ? 0.5 : 1,
              }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save
            </button>
            <button
              onClick={() => setEditing(null)}
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

      {/* Members list */}
      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "32px 0",
          }}
        >
          <Loader2 size={18} className="animate-spin" style={{ color: "var(--color-text-tertiary)" }} />
        </div>
      ) : members.length === 0 && !editing ? (
        <div
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
            borderRadius: 8,
            padding: "40px 20px",
            textAlign: "center",
          }}
        >
          <Users
            size={28}
            style={{ color: "var(--color-text-tertiary)", margin: "0 auto 12px" }}
          />
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            No team members added yet
          </p>
          <p
            style={{
              fontSize: 11,
              color: "var(--color-text-tertiary)",
              marginTop: 4,
            }}
          >
            Showcase your leadership team to investors and partners.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {members.map((member) => (
            <div
              key={member.id}
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
                borderRadius: 8,
                padding: "10px 12px",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "var(--color-accent-subtle)",
                  color: "var(--color-accent)",
                  fontSize: 11,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  overflow: "hidden",
                }}
              >
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={member.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  getInitials(member.name)
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {member.name}
                  </span>
                  {member.linkedin_url && (
                    <a
                      href={member.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 10,
                        color: "var(--color-text-accent)",
                        textDecoration: "none",
                      }}
                    >
                      LinkedIn
                    </a>
                  )}
                </div>
                {member.title && (
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-secondary)",
                      margin: "2px 0 0",
                    }}
                  >
                    {member.title}
                  </p>
                )}
                {member.bio && (
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-tertiary)",
                      margin: "4px 0 0",
                      lineHeight: 1.5,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as const,
                    }}
                  >
                    {member.bio}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => setEditing(member)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-text-tertiary)",
                    padding: 6,
                    borderRadius: 4,
                  }}
                  title="Edit"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => deleteMember(member.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#dc2626",
                    padding: 6,
                    borderRadius: 4,
                  }}
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
