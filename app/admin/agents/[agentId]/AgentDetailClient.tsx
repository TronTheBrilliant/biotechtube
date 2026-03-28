"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { AdminNav } from "@/components/admin/AdminNav";
import { useAuth } from "@/lib/auth";
import {
  Loader2, Play, Settings, Save, X, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  ADMIN_EMAIL,
  AGENT_META,
  type AgentRun,
  type AgentFix,
  scoreColor,
  timeAgo,
  cronToHuman,
} from "@/lib/admin-utils";

interface AgentStats {
  total_runs: number;
  total_fixed: number;
  total_scanned: number;
  last_run_at: string | null;
  health: { score: number; summary: string };
}

interface AgentConfig {
  agent_id: string;
  enabled: boolean;
  schedule_cron: string;
  batch_size: number;
  model_id: string | null;
  config: Record<string, unknown>;
}

interface AiModel {
  id: string;
  name: string;
  provider: string;
  model_id: string;
}

export default function AgentDetailClient() {
  const { agentId } = useParams<{ agentId: string }>();
  const { user, loading: authLoading } = useAuth();
  const meta = AGENT_META[agentId] || { name: agentId, icon: null, color: "#666", description: "" };

  // State
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Config editing
  const [editing, setEditing] = useState(false);
  const [editCron, setEditCron] = useState("");
  const [editBatch, setEditBatch] = useState(50);
  const [editModelId, setEditModelId] = useState<string | null>(null);
  const [editEnabled, setEditEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  // Run expansion + fixes
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [fixes, setFixes] = useState<Record<string, AgentFix[]>>({});
  const [fixesLoading, setFixesLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, runsRes] = await Promise.all([
        fetch(`/api/agents/${agentId}/stats`),
        fetch(`/api/agents/${agentId}?limit=50`),
      ]);
      const [statsData, runsData] = await Promise.all([statsRes.json(), runsRes.json()]);
      setStats(statsData);
      setRuns(runsData.runs || []);
    } catch {}
    setLoading(false);
  }, [agentId]);

  // Load config and models separately (only once)
  useEffect(() => {
    if (authLoading || user?.email !== ADMIN_EMAIL) return;
    (async () => {
      const [configRes, modelsRes] = await Promise.all([
        fetch(`/api/agents/status`),
        fetch(`/api/admin/chat`).catch(() => null), // models come from admin_ai_models
      ]);
      const configData = await configRes.json();
      const agent = configData.agents?.find((a: any) => a.agent_id === agentId);
      if (agent) {
        setConfig({
          agent_id: agent.agent_id,
          enabled: agent.enabled,
          schedule_cron: agent.schedule_cron,
          batch_size: agent.batch_size,
          model_id: null,
          config: {},
        });
        setEditCron(agent.schedule_cron);
        setEditBatch(agent.batch_size);
        setEditEnabled(agent.enabled);
      }
    })();
  }, [authLoading, user, agentId]);

  useEffect(() => {
    if (authLoading || user?.email !== ADMIN_EMAIL) return;
    fetchData();
  }, [authLoading, user, fetchData]);

  // Toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const runAgent = async () => {
    setRunning(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggered_by: "manual" }),
      });
      const data = await res.json();
      setToast({ message: data.summary || "Agent completed", type: data.error ? "error" : "success" });
      await fetchData();
    } catch (err: any) {
      setToast({ message: `Error: ${err.message}`, type: "error" });
    }
    setRunning(false);
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: editEnabled,
          schedule_cron: editCron,
          batch_size: editBatch,
          model_id: editModelId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.agent_config);
        setEditing(false);
        setToast({ message: "Configuration saved", type: "success" });
      } else {
        setToast({ message: data.error || "Failed to save", type: "error" });
      }
    } catch (err: any) {
      setToast({ message: `Error: ${err.message}`, type: "error" });
    }
    setSaving(false);
  };

  const toggleRun = async (runId: string) => {
    if (expandedRunId === runId) {
      setExpandedRunId(null);
      return;
    }
    setExpandedRunId(runId);
    if (!fixes[runId]) {
      setFixesLoading(runId);
      try {
        const res = await fetch(`/api/agents/${agentId}/fixes?run_id=${runId}`);
        const data = await res.json();
        setFixes((prev) => ({ ...prev, [runId]: data.fixes || [] }));
      } catch {}
      setFixesLoading(null);
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Nav />
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--color-text-tertiary)" }} />
        </div>
        <Footer />
      </>
    );
  }

  if (user?.email !== ADMIN_EMAIL) {
    return (
      <>
        <Nav />
        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--color-text-secondary)" }}>
          Admin access required
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "6rem 1rem 2rem" }}>
        <AdminNav />

        {/* Agent Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: `${meta.color}20`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: meta.color, fontSize: 22,
            }}>
              {meta.icon}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)" }}>{meta.name} Agent</div>
              <div style={{ fontSize: 13, color: "var(--color-text-tertiary)", marginTop: 2 }}>{meta.description}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{
              padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: config?.enabled ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${config?.enabled ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)"}`,
              color: config?.enabled ? "#22c55e" : "var(--color-text-tertiary)",
            }}>
              {config?.enabled ? "Enabled" : "Paused"}
            </span>
            <button onClick={runAgent} disabled={running} style={{
              padding: "8px 18px", background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8,
              color: "#818cf8", fontSize: 13, fontWeight: 600,
              cursor: running ? "not-allowed" : "pointer", opacity: running ? 0.5 : 1,
            }}>
              {running ? <><Loader2 size={14} className="animate-spin" style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} /> Running...</> : <><Play size={14} style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} /> Run Now</>}
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Health Score", value: `${stats?.health?.score ?? 0}%`, color: scoreColor(stats?.health?.score ?? 0) },
            { label: "Total Runs", value: String(stats?.total_runs ?? 0), color: "#fff" },
            { label: "Items Fixed", value: (stats?.total_fixed ?? 0).toLocaleString(), color: "#fff" },
            { label: "Last Run", value: timeAgo(stats?.last_run_at || null), color: "#fff" },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: "var(--color-bg-secondary, rgba(255,255,255,0.03))",
              border: "1px solid var(--color-border, rgba(255,255,255,0.06))",
              borderRadius: 10, padding: 16,
            }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--color-text-tertiary)", letterSpacing: 0.5, marginBottom: 6 }}>{stat.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Two-column: Config + Run History */}
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>
          {/* Configuration Panel */}
          <div style={{
            background: "var(--color-bg-secondary, rgba(255,255,255,0.03))",
            border: "1px solid var(--color-border, rgba(255,255,255,0.06))",
            borderRadius: 10, padding: 20, alignSelf: "start",
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 16 }}>Configuration</div>

            {!editing ? (
              <>
                {[
                  { label: "Schedule", value: cronToHuman(config?.schedule_cron || ""), sub: config?.schedule_cron },
                  { label: "Batch Size", value: `${config?.batch_size ?? 50} per run` },
                  { label: "AI Model", value: "Default" },
                  { label: "Status", value: config?.enabled ? "Enabled" : "Paused" },
                ].map((item) => (
                  <div key={item.label} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--color-text-tertiary)", marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{item.value}</div>
                    {item.sub && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>{item.sub}</div>}
                  </div>
                ))}
                <div style={{ borderTop: "1px solid var(--color-border, rgba(255,255,255,0.06))", paddingTop: 14, marginTop: 14 }}>
                  <button onClick={() => setEditing(true)} style={{
                    width: "100%", padding: "8px 14px", textAlign: "center",
                    background: "rgba(255,255,255,0.04)", border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
                    borderRadius: 6, color: "var(--color-text-tertiary)", fontSize: 12, cursor: "pointer",
                  }}>
                    <Settings size={12} style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} /> Edit Configuration
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, textTransform: "uppercase", color: "var(--color-text-tertiary)", display: "block", marginBottom: 4 }}>Schedule (cron)</label>
                  <input value={editCron} onChange={(e) => setEditCron(e.target.value)} style={{
                    width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 6,
                    background: "rgba(255,255,255,0.05)", border: "1px solid var(--color-border, rgba(255,255,255,0.1))",
                    color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box",
                  }} />
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>{cronToHuman(editCron)}</div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, textTransform: "uppercase", color: "var(--color-text-tertiary)", display: "block", marginBottom: 4 }}>Batch Size</label>
                  <input type="number" value={editBatch} onChange={(e) => setEditBatch(parseInt(e.target.value) || 50)} min={1} max={500} style={{
                    width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 6,
                    background: "rgba(255,255,255,0.05)", border: "1px solid var(--color-border, rgba(255,255,255,0.1))",
                    color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box",
                  }} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={editEnabled} onChange={(e) => setEditEnabled(e.target.checked)} />
                    <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>Enabled</span>
                  </label>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveConfig} disabled={saving} style={{
                    flex: 1, padding: "8px", textAlign: "center", background: "rgba(99,102,241,0.15)",
                    border: "1px solid rgba(99,102,241,0.3)", borderRadius: 6, color: "#818cf8",
                    fontSize: 12, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
                  }}>
                    {saving ? "Saving..." : <><Save size={12} style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} /> Save</>}
                  </button>
                  <button onClick={() => setEditing(false)} style={{
                    padding: "8px 12px", background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
                    borderRadius: 6, color: "var(--color-text-tertiary)", fontSize: 12, cursor: "pointer",
                  }}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Run History */}
          <div style={{
            background: "var(--color-bg-secondary, rgba(255,255,255,0.03))",
            border: "1px solid var(--color-border, rgba(255,255,255,0.06))",
            borderRadius: 10, padding: 20,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 16 }}>Run History</div>

            {runs.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--color-text-tertiary)", textAlign: "center", padding: 40 }}>
                No runs yet. Click "Run Now" to get started.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {runs.map((run) => {
                  const isExpanded = expandedRunId === run.id;
                  const runFixes = fixes[run.id] || [];
                  const isLoadingFixes = fixesLoading === run.id;
                  return (
                    <div key={run.id} style={{
                      background: isExpanded ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${isExpanded ? "rgba(99,102,241,0.2)" : "var(--color-border, rgba(255,255,255,0.06))"}`,
                      borderRadius: 8, padding: 14, cursor: "pointer",
                    }} onClick={() => toggleRun(run.id)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{
                            width: 8, height: 8, borderRadius: "50%",
                            background: run.status === "completed" ? "#22c55e" : run.status === "failed" ? "#ef4444" : "#eab308",
                          }} />
                          <span style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>
                            {run.summary || run.status}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                            {timeAgo(run.started_at)} &middot; {run.triggered_by}
                          </span>
                          <span style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 4,
                            background: run.status === "completed" ? "rgba(34,197,94,0.1)" : run.status === "failed" ? "rgba(239,68,68,0.1)" : "rgba(234,179,8,0.1)",
                            color: run.status === "completed" ? "#22c55e" : run.status === "failed" ? "#ef4444" : "#eab308",
                          }}>
                            {run.status}
                          </span>
                          {isExpanded ? <ChevronUp size={14} style={{ color: "var(--color-text-tertiary)" }} /> : <ChevronDown size={14} style={{ color: "var(--color-text-tertiary)" }} />}
                        </div>
                      </div>

                      {!isExpanded && (
                        <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 6 }}>
                          Scanned {run.items_scanned} &middot; Fixed {run.items_fixed} &middot; Issues {run.issues_found}
                        </div>
                      )}

                      {isExpanded && (
                        <div style={{ marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 10 }}>
                            Scanned {run.items_scanned} &middot; Fixed {run.items_fixed} &middot; Issues {run.issues_found}
                          </div>

                          {isLoadingFixes ? (
                            <div style={{ textAlign: "center", padding: 20 }}>
                              <Loader2 size={16} className="animate-spin" style={{ color: "var(--color-text-tertiary)" }} />
                            </div>
                          ) : runFixes.length === 0 ? (
                            <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", padding: "12px 0" }}>
                              No individual fixes recorded for this run.
                            </div>
                          ) : (
                            <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: 6, padding: 12 }}>
                              <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--color-text-tertiary)", marginBottom: 8 }}>
                                Changes ({runFixes.length})
                              </div>
                              {runFixes.slice(0, 5).map((fix) => (
                                <div key={fix.id} style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 4, flexWrap: "wrap" }}>
                                  <span style={{ color: "#818cf8", minWidth: 80 }}>{fix.entity_id.slice(0, 8)}...</span>
                                  <span style={{ minWidth: 70 }}>{fix.field}</span>
                                  <span style={{ color: "var(--color-text-tertiary)", opacity: 0.5 }}>{fix.old_value || "null"} →</span>
                                  <span style={{ color: "#22c55e" }}>{fix.new_value || "null"}</span>
                                  {fix.confidence && (
                                    <span style={{ marginLeft: "auto", opacity: 0.4 }}>{fix.confidence.toFixed(2)}</span>
                                  )}
                                </div>
                              ))}
                              {runFixes.length > 5 && (
                                <div style={{ textAlign: "center", marginTop: 8 }}>
                                  <span style={{ fontSize: 11, color: "#818cf8" }}>
                                    View all {runFixes.length} changes
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24,
          padding: "12px 20px",
          background: toast.type === "error" ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)",
          border: `1px solid ${toast.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
          borderRadius: 8, color: toast.type === "error" ? "#ef4444" : "#22c55e",
          fontSize: 13, fontWeight: 500, zIndex: 1001, maxWidth: 400,
        }}>
          {toast.message}
        </div>
      )}

      <Footer />
    </>
  );
}
