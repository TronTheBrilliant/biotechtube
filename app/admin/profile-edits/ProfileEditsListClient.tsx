"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { ADMIN_EMAIL, ConfirmDialog, timeAgo } from "@/lib/admin-utils";
import { AdminNav } from "@/components/admin/AdminNav";
import { Loader2 } from "lucide-react";

type Status = "pending" | "approved" | "rejected" | "applied" | "auto_applied";

interface Edit {
  id: string;
  company_id: string;
  source_type: string;
  source_id: string;
  proposed_changes: Record<string, unknown>;
  confidence: number;
  reasoning: string;
  status: Status;
  created_at: string;
  applied_at: string | null;
  companies: { id: string; name: string; slug: string; ticker: string | null } | null;
}

const STATUS_FILTERS = [
  { label: "Pending", value: "pending", color: "#eab308" },
  { label: "Auto-applied", value: "auto_applied", color: "#3b82f6" },
  { label: "Applied", value: "applied", color: "#22c55e" },
  { label: "Rejected", value: "rejected", color: "#ef4444" },
  { label: "All", value: "all", color: "var(--color-text-secondary)" },
];

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.9 ? "#22c55e" : value >= 0.6 ? "#eab308" : "#ef4444";
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 4,
      background: color + "18", color, fontWeight: 600,
    }}>
      {pct}%
    </span>
  );
}

function DiffPreview({ changes }: { changes: Record<string, unknown> }) {
  const keys = Object.keys(changes);
  if (keys.length === 0) return <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>(empty)</span>;
  return (
    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", fontFamily: "monospace" }}>
      {keys.slice(0, 3).map(k => (
        <div key={k}><b>{k}</b>: {JSON.stringify(changes[k]).slice(0, 80)}</div>
      ))}
      {keys.length > 3 && <div>… +{keys.length - 3} more</div>}
    </div>
  );
}

export default function ProfileEditsListClient() {
  const { user, loading: authLoading } = useAuth();
  const [edits, setEdits] = useState<Edit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<"approve" | "reject" | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchEdits = useCallback(() => {
    if (authLoading || user?.email !== ADMIN_EMAIL) return;
    setLoading(true);
    fetch(`/api/admin/profile-edits?status=${filter}`)
      .then(r => r.json())
      .then(d => setEdits(d.edits || []))
      .catch(() => setEdits([]))
      .finally(() => setLoading(false));
  }, [filter, authLoading, user]);

  useEffect(() => { fetchEdits() }, [fetchEdits]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const act = async (id: string, action: "approve" | "reject") => {
    if (busyId) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/profile-edits/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEdits(prev => prev.filter(e => e.id !== id));
      setToast({ message: `${action === "approve" ? "Applied" : "Rejected"} edit`, type: "success" });
    } catch {
      setToast({ message: `Failed to ${action}`, type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const executeBulk = async (action: "approve" | "reject") => {
    const ids = Array.from(selectedIds);
    setBulkProgress({ current: 0, total: ids.length });
    let failures = 0;
    for (let i = 0; i < ids.length; i++) {
      setBulkProgress({ current: i + 1, total: ids.length });
      try {
        const res = await fetch(`/api/admin/profile-edits/${ids[i]}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) failures++;
      } catch { failures++ }
    }
    setBulkProgress(null);
    setSelectedIds(new Set());
    setToast({
      message: failures === 0
        ? `${action === "approve" ? "Approved" : "Rejected"} ${ids.length}`
        : `${ids.length - failures} of ${ids.length} ok, ${failures} failed`,
      type: failures === 0 ? "success" : "error",
    });
    fetchEdits();
  };

  if (authLoading) {
    return (
      <div className="page-content"><Nav />
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
        </div>
        <Footer />
      </div>
    );
  }
  if (user?.email !== ADMIN_EMAIL) {
    return (
      <div className="page-content"><Nav />
        <div style={{ padding: 80, textAlign: "center", color: "var(--color-text-secondary)" }}>
          Admin access required
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="page-content" style={{ minHeight: "100vh" }}>
      <Nav />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px", paddingBottom: selectedIds.size > 0 ? 80 : 24 }}>
        <AdminNav />
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4, color: "var(--color-text-primary)" }}>
          Profile Edits
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: "0 0 20px" }}>
          AI-drafted changes from external sources awaiting review
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {STATUS_FILTERS.map(sf => {
            const active = filter === sf.value;
            return (
              <button key={sf.value} onClick={() => setFilter(sf.value)}
                style={{
                  padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 500,
                  cursor: "pointer", border: `1px solid ${sf.color}`,
                  background: active ? sf.color : "transparent",
                  color: active ? "#fff" : sf.color,
                }}>
                {sf.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : edits.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--color-text-tertiary)" }}>
            No edits in {filter} state
          </div>
        ) : (
          <div>
            {edits.map(e => {
              const checked = selectedIds.has(e.id);
              const isPending = e.status === "pending";
              return (
                <div key={e.id} style={{
                  display: "flex", gap: 12, padding: "12px 16px",
                  borderBottom: "1px solid var(--color-border-subtle)",
                  background: checked ? "var(--color-bg-secondary)" : "transparent",
                }}>
                  <input
                    type="checkbox"
                    disabled={!isPending}
                    checked={checked}
                    onChange={() => {
                      const next = new Set(selectedIds);
                      if (next.has(e.id)) next.delete(e.id); else next.add(e.id);
                      setSelectedIds(next);
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {e.companies ? (
                        <Link href={`/company/${e.companies.slug}`} style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
                          {e.companies.name}
                        </Link>
                      ) : (
                        <span style={{ fontSize: 14, color: "var(--color-text-tertiary)" }}>(orphan)</span>
                      )}
                      <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--color-bg-secondary)", color: "var(--color-text-tertiary)" }}>
                        {e.source_type}
                      </span>
                      <ConfidenceBadge value={e.confidence} />
                      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                        {timeAgo(e.created_at)}
                      </span>
                    </div>
                    <div style={{ marginTop: 6 }}><DiffPreview changes={e.proposed_changes} /></div>
                    {e.reasoning && (
                      <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 4, fontStyle: "italic" }}>
                        “{e.reasoning}”
                      </div>
                    )}
                  </div>
                  {isPending && (
                    <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                      <button
                        disabled={busyId === e.id}
                        onClick={() => act(e.id, "approve")}
                        style={{ padding: "4px 10px", background: "#22c55e", border: "none", borderRadius: 4, color: "#fff", fontSize: 12, cursor: "pointer" }}
                      >
                        {busyId === e.id ? "…" : "Approve"}
                      </button>
                      <button
                        disabled={busyId === e.id}
                        onClick={() => act(e.id, "reject")}
                        style={{ padding: "4px 10px", background: "transparent", border: "1px solid #ef4444", borderRadius: 4, color: "#ef4444", fontSize: 12, cursor: "pointer" }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "var(--color-bg-primary)", borderTop: "1px solid var(--color-border-subtle)",
          padding: "12px 24px", display: "flex", justifyContent: "center", gap: 16, zIndex: 100,
        }}>
          {bulkProgress ? (
            <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
              {bulkProgress.current} of {bulkProgress.total}…
            </span>
          ) : (
            <>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{selectedIds.size} selected</span>
              <button onClick={() => setBulkAction("approve")} style={{ padding: "8px 16px", background: "#22c55e", border: "none", borderRadius: 6, color: "#fff", fontSize: 13, cursor: "pointer" }}>Approve Selected</button>
              <button onClick={() => setBulkAction("reject")} style={{ padding: "8px 16px", background: "#ef4444", border: "none", borderRadius: 6, color: "#fff", fontSize: 13, cursor: "pointer" }}>Reject Selected</button>
              <button onClick={() => setSelectedIds(new Set())} style={{ padding: "8px 16px", background: "transparent", border: "1px solid var(--color-border-subtle)", borderRadius: 6, color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>Clear</button>
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={bulkAction !== null}
        title={bulkAction === "approve" ? "Approve edits" : "Reject edits"}
        message={<p>Apply to {selectedIds.size} edit{selectedIds.size > 1 ? "s" : ""}?</p>}
        confirmLabel={bulkAction === "approve" ? "Approve" : "Reject"}
        variant={bulkAction === "reject" ? "danger" : "default"}
        onConfirm={() => { const a = bulkAction!; setBulkAction(null); executeBulk(a) }}
        onCancel={() => setBulkAction(null)}
      />

      {toast && (
        <div style={{
          position: "fixed", bottom: selectedIds.size > 0 ? 80 : 24, right: 24,
          padding: "12px 20px", background: "var(--color-bg-primary)",
          border: "1px solid var(--color-border-subtle)",
          borderLeft: toast.type === "error" ? "3px solid #c45a5a" : "3px solid #22c55e",
          borderRadius: 8, fontSize: 13, zIndex: 2001,
        }}>
          {toast.message}
        </div>
      )}

      <Footer />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
