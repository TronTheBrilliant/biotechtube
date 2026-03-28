"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import {
  Users, TrendingUp, Beaker, FileText,
  Globe, Monitor, Play, History,
  Loader2, X, Zap,
} from "lucide-react";

// Matches the pattern in /admin/quality — hardcoded for client-side gating
// Server-side auth is enforced in the API routes
const ADMIN_EMAIL = "trond.skattum@gmail.com";

const AGENT_META: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
  profiles: { name: "Profiles", icon: <Users size={18} />, color: "#818cf8" },
  financial: { name: "Financial", icon: <TrendingUp size={18} />, color: "#22c55e" },
  pipeline: { name: "Pipeline", icon: <Beaker size={18} />, color: "#a855f7" },
  content: { name: "Content", icon: <FileText size={18} />, color: "#fb923c" },
  seo: { name: "SEO", icon: <Globe size={18} />, color: "#38bdf8" },
  ux: { name: "UX", icon: <Monitor size={18} />, color: "#f43f5e" },
};

interface AgentStatus {
  agent_id: string;
  enabled: boolean;
  schedule_cron: string;
  batch_size: number;
  health_score: number;
  health_summary: string;
  latest_run: {
    id: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    items_scanned: number;
    items_fixed: number;
    issues_found: number;
    summary: string | null;
  } | null;
}

interface AgentRun {
  id: string;
  agent_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  items_scanned: number;
  items_fixed: number;
  issues_found: number;
  summary: string | null;
  triggered_by: string;
}

function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#eab308";
  return "#ef4444";
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (d < 1) return "Just now";
  if (d < 60) return `${d}m ago`;
  const h = Math.floor(d / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function cronToHuman(cron: string): string {
  const parts = cron.split(" ");
  const hour = parts[1] || "*";
  const dow = parts[4] || "*";
  if (dow !== "*") return "Weekly";
  if (hour.startsWith("*/")) return `Every ${hour.replace("*/", "")}h`;
  if (hour === "0") return "Daily";
  return cron;
}

export default function CommandCenterClient() {
  const { user, loading: authLoading } = useAuth();
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [overallHealth, setOverallHealth] = useState(0);
  const [activity, setActivity] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAgents, setRunningAgents] = useState<Set<string>>(new Set());
  const [historyAgent, setHistoryAgent] = useState<string | null>(null);
  const [historyRuns, setHistoryRuns] = useState<AgentRun[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/status");
      const data = await res.json();
      setAgents(data.agents || []);
      setOverallHealth(data.overall_health || 0);
      setActivity(data.activity || []);
    } catch {
      // Silent fail on poll
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user?.email !== ADMIN_EMAIL) { setLoading(false); return; }
    fetchStatus();
  }, [authLoading, user, fetchStatus]);

  // Polling: 5s when agents running, 60s when idle
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    const interval = runningAgents.size > 0 ? 5000 : 60000;
    pollRef.current = setInterval(fetchStatus, interval);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [runningAgents, fetchStatus]);

  // Pause polling when tab not visible; restart when tab becomes visible again
  useEffect(() => {
    const handler = () => {
      if (document.hidden && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      } else if (!document.hidden) {
        fetchStatus();
        // Restart polling interval
        const interval = runningAgents.size > 0 ? 5000 : 60000;
        pollRef.current = setInterval(fetchStatus, interval);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [fetchStatus, runningAgents]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const runAgent = async (agentId: string) => {
    setRunningAgents((prev) => new Set(prev).add(agentId));
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggered_by: "manual" }),
      });
      const data = await res.json();
      setToast({
        message: data.summary || `${AGENT_META[agentId]?.name} completed`,
        type: data.error ? "error" : "success",
      });
      await fetchStatus();
    } catch (err: any) {
      setToast({ message: `Error: ${err.message}`, type: "error" });
    }
    setRunningAgents((prev) => {
      const next = new Set(prev);
      next.delete(agentId);
      return next;
    });
  };

  const runAllAgents = async () => {
    for (const agent of agents) {
      if (!agent.enabled) continue;
      await runAgent(agent.agent_id);
    }
  };

  const openHistory = async (agentId: string) => {
    setHistoryAgent(agentId);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}?limit=20`);
      const data = await res.json();
      setHistoryRuns(data.runs || []);
    } catch {
      setHistoryRuns([]);
    }
    setHistoryLoading(false);
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
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1rem" }}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>
              Command Center
            </h1>
            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: "4px 0 0" }}>
              6 agents &middot; {agents.filter(a => a.latest_run).length} have run
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{
              padding: "8px 16px",
              background: `${scoreColor(overallHealth)}15`,
              border: `1px solid ${scoreColor(overallHealth)}40`,
              borderRadius: 8,
              color: scoreColor(overallHealth),
              fontSize: 13,
              fontWeight: 600,
            }}>
              Health: {overallHealth}%
            </div>
            <button
              onClick={runAllAgents}
              disabled={runningAgents.size > 0}
              style={{
                padding: "8px 16px",
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.3)",
                borderRadius: 8,
                color: "#818cf8",
                fontSize: 13,
                fontWeight: 600,
                cursor: runningAgents.size > 0 ? "not-allowed" : "pointer",
                opacity: runningAgents.size > 0 ? 0.5 : 1,
              }}
            >
              <Zap size={14} style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} />
              Run All Agents
            </button>
          </div>
        </div>

        {/* Agent Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16, marginBottom: 24 }}>
          {agents.map((agent) => {
            const meta = AGENT_META[agent.agent_id];
            const isRunning = runningAgents.has(agent.agent_id);
            return (
              <div key={agent.agent_id} style={{
                background: "var(--color-bg-secondary, rgba(255,255,255,0.03))",
                border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
                borderRadius: 12,
                padding: 20,
              }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: `${meta?.color || "#666"}20`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: meta?.color || "#666",
                    }}>
                      {meta?.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>
                        {meta?.name || agent.agent_id}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                        {cronToHuman(agent.schedule_cron)} &middot; Last: {timeAgo(agent.latest_run?.started_at || null)}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: scoreColor(agent.health_score) }}>
                    {agent.health_score}%
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginBottom: 12 }}>
                  <div style={{
                    height: 4,
                    background: scoreColor(agent.health_score),
                    borderRadius: 2,
                    width: `${agent.health_score}%`,
                    transition: "width 0.3s",
                  }} />
                </div>

                {/* Summary */}
                <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 12 }}>
                  {agent.health_summary}
                </div>

                {/* Last run box */}
                {agent.latest_run && (
                  <div style={{
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    marginBottom: 14,
                    fontSize: 12,
                    color: "var(--color-text-tertiary)",
                  }}>
                    <div style={{ color: "var(--color-text-secondary)", fontWeight: 600, marginBottom: 4 }}>
                      Last run: {agent.latest_run.summary || agent.latest_run.status}
                    </div>
                    Scanned {agent.latest_run.items_scanned}, fixed {agent.latest_run.items_fixed}, found {agent.latest_run.issues_found} issues
                  </div>
                )}

                {/* Buttons */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => runAgent(agent.agent_id)}
                    disabled={isRunning}
                    style={{
                      flex: 1,
                      padding: 8,
                      textAlign: "center",
                      background: "rgba(99,102,241,0.12)",
                      border: "1px solid rgba(99,102,241,0.25)",
                      borderRadius: 6,
                      color: "#818cf8",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: isRunning ? "not-allowed" : "pointer",
                      opacity: isRunning ? 0.5 : 1,
                    }}
                  >
                    {isRunning ? (
                      <><Loader2 size={12} className="animate-spin" style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} /> Running...</>
                    ) : (
                      <><Play size={12} style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} /> Run Now</>
                    )}
                  </button>
                  <button
                    onClick={() => openHistory(agent.agent_id)}
                    style={{
                      padding: "8px 12px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
                      borderRadius: 6,
                      color: "var(--color-text-tertiary)",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    <History size={12} style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} />
                    History
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Activity Feed */}
        <div style={{
          background: "var(--color-bg-secondary, rgba(255,255,255,0.03))",
          border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
          borderRadius: 12,
          padding: 20,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 16px", color: "var(--color-text-primary)" }}>
            Recent Activity
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activity.map((run) => (
              <div key={run.id} style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                background: "rgba(255,255,255,0.02)",
                borderRadius: 8,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: run.status === "completed" ? "#22c55e"
                    : run.status === "failed" ? "#ef4444" : "#eab308",
                }} />
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", flex: 1 }}>
                  <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
                    {AGENT_META[run.agent_id]?.name}
                  </span>{" "}
                  {run.summary || run.status}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>
                  {timeAgo(run.started_at)}
                </div>
              </div>
            ))}
            {activity.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--color-text-tertiary)", textAlign: "center", padding: 20 }}>
                No agent runs yet. Click &ldquo;Run Now&rdquo; on any agent to get started.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Slide-out */}
      {historyAgent && (
        <div style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 420,
          background: "var(--color-bg-primary, #0a0a0f)",
          borderLeft: "1px solid var(--color-border, rgba(255,255,255,0.08))",
          zIndex: 1000,
          overflowY: "auto",
          padding: 24,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "var(--color-text-primary)" }}>
              {AGENT_META[historyAgent]?.name} History
            </h3>
            <button onClick={() => setHistoryAgent(null)} style={{
              background: "none", border: "none", color: "var(--color-text-tertiary)", cursor: "pointer",
            }}>
              <X size={20} />
            </button>
          </div>

          {historyLoading ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-text-tertiary)" }} />
            </div>
          ) : historyRuns.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--color-text-tertiary)", textAlign: "center", padding: 40 }}>
              No runs yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {historyRuns.map((run) => (
                <div key={run.id} style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                  padding: 14,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                      color: run.status === "completed" ? "#22c55e" : run.status === "failed" ? "#ef4444" : "#eab308",
                    }}>
                      {run.status}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                      {timeAgo(run.started_at)} &middot; {run.triggered_by}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>
                    {run.summary || "No summary"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                    Scanned {run.items_scanned} &middot; Fixed {run.items_fixed} &middot; Issues {run.issues_found}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Backdrop for history panel */}
      {historyAgent && (
        <div
          onClick={() => setHistoryAgent(null)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 999,
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24,
          padding: "12px 20px",
          background: toast.type === "error" ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)",
          border: `1px solid ${toast.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
          borderRadius: 8,
          color: toast.type === "error" ? "#ef4444" : "#22c55e",
          fontSize: 13,
          fontWeight: 500,
          zIndex: 1001,
          maxWidth: 400,
        }}>
          {toast.message}
        </div>
      )}

      <Footer />
    </>
  );
}
