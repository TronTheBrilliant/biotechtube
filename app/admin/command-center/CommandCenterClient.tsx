"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import {
  Play, History, Loader2, X, Zap, FileText, Clock, Rss, Building2,
  ChevronDown, ChevronRight, Newspaper, RefreshCw, DollarSign, CheckCircle2,
  XCircle, Minus, AlertCircle,
} from "lucide-react";
import {
  ADMIN_EMAIL,
  AGENT_META,
  AgentStatus,
  AgentRun,
  ConfirmDialog,
  scoreColor,
  timeAgo,
  cronToHuman,
  TYPE_CONFIG,
  STATUS_COLORS as SHARED_STATUS_COLORS,
  CONFIDENCE_COLORS as SHARED_CONFIDENCE_COLORS,
} from "@/lib/admin-utils";
import { AdminNav } from "@/components/admin/AdminNav";

// ── Types ──

interface DashboardStats {
  articlesToday: number;
  articlesPending: number;
  totalArticles: number;
  rssItemsToday: number;
  companiesTotal: number;
  lastCronRun: string | null;
}

interface PipelineResult {
  attempted: number;
  generated: number;
  errors: string[];
}

interface CronResponse {
  ok?: boolean;
  elapsed_seconds?: number;
  results?: Record<string, PipelineResult>;
  error?: string;
  [key: string]: any;
}

interface ProgressEntry {
  id: string;
  label: string;
  cronPath: string;
  status: "running" | "completed" | "error";
  startedAt: number;
  elapsedSeconds: number;
  response: CronResponse | null;
}

interface RecentArticle {
  id: string;
  slug: string;
  type: string;
  status: string;
  confidence: string | null;
  headline: string;
  published_at: string | null;
  created_at: string;
}

// ── Constants ──

const ACTIVITY_PAGE_SIZE = 20;

const PIPELINE_LABELS: Record<string, string> = {
  breaking_news: "Breaking News",
  funding_deal: "Funding Deals",
  clinical_trial: "Clinical Trials",
  market_analysis: "Market Analysis",
  weekly_roundup: "Weekly Roundup",
  company_deep_dive: "Company Deep Dive",
  science_essay: "Science Essay",
  innovation_spotlight: "Innovation Spotlight",
};

// Derive flat color maps from shared config
const TYPE_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(TYPE_CONFIG).map(([k, v]) => [k, v.color])
);
const CONFIDENCE_COLORS = SHARED_CONFIDENCE_COLORS;
const STATUS_COLORS = SHARED_STATUS_COLORS;

// ── Component ──

export default function CommandCenterClient() {
  const { user, loading: authLoading } = useAuth();

  // Dashboard stats
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsError, setStatsError] = useState(false);

  // Agent management (existing)
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [overallHealth, setOverallHealth] = useState(0);
  const [activity, setActivity] = useState<AgentRun[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [hasMoreActivity, setHasMoreActivity] = useState(false);
  const [loadingMoreActivity, setLoadingMoreActivity] = useState(false);
  const [loading, setLoading] = useState(true);
  const [runningAgents, setRunningAgents] = useState<Set<string>>(new Set());
  const [historyAgent, setHistoryAgent] = useState<string | null>(null);
  const [historyRuns, setHistoryRuns] = useState<AgentRun[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirmRunAll, setConfirmRunAll] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Progress feed
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const progressTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Recent articles
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([]);

  // Activity section collapsed
  const [activityCollapsed, setActivityCollapsed] = useState(false);

  // ── Data Fetching ──

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      if (!data.error) {
        setStats(data);
        setStatsError(false);
      } else {
        console.error("Failed to fetch stats:", data.error);
        setStatsError(true);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
      setStatsError(true);
    }
  }, []);

  const fetchRecentArticles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/articles?limit=5");
      const data = await res.json();
      setRecentArticles((data.articles || []).slice(0, 5));
    } catch (err) {
      console.error("Failed to fetch recent articles:", err);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/status");
      const data = await res.json();
      setAgents(data.agents || []);
      setOverallHealth(data.overall_health || 0);
      const allActivity: AgentRun[] = data.activity || [];
      setActivity(allActivity.slice(0, activityPage * ACTIVITY_PAGE_SIZE));
      setHasMoreActivity(allActivity.length > activityPage * ACTIVITY_PAGE_SIZE);
    } catch (err) {
      console.error("Failed to fetch agent status:", err);
    }
    setLoading(false);
  }, [activityPage]);

  useEffect(() => {
    if (authLoading) return;
    if (user?.email !== ADMIN_EMAIL) { setLoading(false); return; }
    fetchStatus();
    fetchStats();
    fetchRecentArticles();
  }, [authLoading, user, fetchStatus, fetchStats, fetchRecentArticles]);

  // Polling
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    const interval = runningAgents.size > 0 ? 5000 : 60000;
    pollRef.current = setInterval(() => {
      fetchStatus();
      fetchStats();
    }, interval);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [runningAgents, fetchStatus, fetchStats]);

  // Pause polling when tab not visible
  useEffect(() => {
    const handler = () => {
      if (document.hidden && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      } else if (!document.hidden) {
        fetchStatus();
        fetchStats();
        const interval = runningAgents.size > 0 ? 5000 : 60000;
        pollRef.current = setInterval(() => {
          fetchStatus();
          fetchStats();
        }, interval);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [fetchStatus, fetchStats, runningAgents]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Cleanup progress timers on unmount
  useEffect(() => {
    return () => {
      progressTimersRef.current.forEach((t) => clearInterval(t));
    };
  }, []);

  // ── Agent Actions (existing) ──

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
    const enabledAgents = agents.filter((a) => a.enabled);
    const total = enabledAgents.length;
    if (total === 0) return;

    const entryId = `run-all-${Date.now()}`;
    const entry: ProgressEntry = {
      id: entryId,
      label: `Running Agents (0/${total})`,
      cronPath: "agents/run-all",
      status: "running",
      startedAt: Date.now(),
      elapsedSeconds: 0,
      response: null,
    };
    setProgressEntries((prev) => [entry, ...prev].slice(0, 10));

    // Tick elapsed time
    const timer = setInterval(() => {
      setProgressEntries((prev) =>
        prev.map((e) =>
          e.id === entryId && e.status === "running"
            ? { ...e, elapsedSeconds: Math.round((Date.now() - e.startedAt) / 1000) }
            : e
        )
      );
    }, 1000);
    progressTimersRef.current.set(entryId, timer);

    let succeeded = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < enabledAgents.length; i++) {
      const agent = enabledAgents[i];
      const agentName = AGENT_META[agent.agent_id]?.name || agent.agent_id;

      setRunningAgents((prev) => new Set(prev).add(agent.agent_id));
      try {
        const res = await fetch(`/api/agents/${agent.agent_id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ triggered_by: "manual" }),
        });
        const data = await res.json();
        if (data.error) {
          failed++;
        } else if (data.items_scanned === 0) {
          skipped++;
        } else {
          succeeded++;
        }
        await fetchStatus();
      } catch (err) {
        console.error(`Failed to run agent ${agent.agent_id}:`, err);
        failed++;
      }

      setRunningAgents((prev) => {
        const next = new Set(prev);
        next.delete(agent.agent_id);
        return next;
      });

      // Update progress label
      setProgressEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? { ...e, label: `Running Agents (${i + 1}/${total}) — ${agentName} done` }
            : e
        )
      );
    }

    clearInterval(timer);
    progressTimersRef.current.delete(entryId);

    // Final summary
    const parts: string[] = [];
    if (succeeded > 0) parts.push(`${succeeded} succeeded`);
    if (skipped > 0) parts.push(`${skipped} skipped`);
    if (failed > 0) parts.push(`${failed} failed`);

    setProgressEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? {
              ...e,
              label: `All agents complete: ${parts.join(", ")}`,
              status: failed > 0 ? "error" : "completed",
              elapsedSeconds: Math.round((Date.now() - e.startedAt) / 1000),
              response: { ok: failed === 0 },
            }
          : e
      )
    );
  };

  const loadMoreActivity = () => {
    setLoadingMoreActivity(true);
    setActivityPage((prev) => prev + 1);
    setTimeout(() => {
      fetchStatus().then(() => setLoadingMoreActivity(false));
    }, 0);
  };

  const openHistory = async (agentId: string) => {
    setHistoryAgent(agentId);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}?limit=20`);
      const data = await res.json();
      setHistoryRuns(data.runs || []);
    } catch (err) {
      console.error("Failed to fetch agent history:", err);
      setHistoryRuns([]);
    }
    setHistoryLoading(false);
  };

  // ── Cron Trigger ──

  const triggerCron = async (label: string, cronPath: string) => {
    const entryId = `${cronPath}-${Date.now()}`;
    const entry: ProgressEntry = {
      id: entryId,
      label,
      cronPath,
      status: "running",
      startedAt: Date.now(),
      elapsedSeconds: 0,
      response: null,
    };

    setProgressEntries((prev) => [entry, ...prev].slice(0, 10));

    // Tick elapsed time every second
    const timer = setInterval(() => {
      setProgressEntries((prev) =>
        prev.map((e) =>
          e.id === entryId && e.status === "running"
            ? { ...e, elapsedSeconds: Math.round((Date.now() - e.startedAt) / 1000) }
            : e
        )
      );
    }, 1000);
    progressTimersRef.current.set(entryId, timer);

    try {
      const res = await fetch("/api/admin/trigger-cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: cronPath }),
      });
      const data: CronResponse = await res.json();

      clearInterval(timer);
      progressTimersRef.current.delete(entryId);

      setProgressEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? {
                ...e,
                status: data.error ? "error" : "completed",
                elapsedSeconds: data.elapsed_seconds ?? Math.round((Date.now() - e.startedAt) / 1000),
                response: data,
              }
            : e
        )
      );

      // Refresh stats and articles after completion
      fetchStats();
      fetchRecentArticles();
      fetchStatus();
    } catch (err: any) {
      clearInterval(timer);
      progressTimersRef.current.delete(entryId);

      setProgressEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? {
                ...e,
                status: "error",
                elapsedSeconds: Math.round((Date.now() - e.startedAt) / 1000),
                response: { error: err.message },
              }
            : e
        )
      );
    }
  };

  const dismissProgress = (entryId: string) => {
    setProgressEntries((prev) => prev.filter((e) => e.id !== entryId));
  };

  // ── Render Helpers ──

  const isAnyCronRunning = progressEntries.some((e) => e.status === "running");

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

  const enabledAgentCount = agents.filter((a) => a.enabled).length;

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "6rem 1rem 2rem" }}>
        <AdminNav />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: "var(--color-text-primary)" }}>
              Mission Control
            </h1>
            <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "4px 0 0" }}>
              System Health {overallHealth}% &middot; {agents.length} agents &middot; {agents.filter(a => a.latest_run).length} have run
            </p>
          </div>
        </div>

        {/* ── Stats Dashboard ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
          <StatCard
            icon={<FileText size={18} />}
            label="Articles Today"
            value={stats?.articlesToday ?? "..."}
            subtitle={stats ? `${stats.articlesPending} pending review` : undefined}
            accentColor="#3b82f6"
          />
          <StatCard
            icon={<Clock size={18} />}
            label="Total Published"
            value={stats?.totalArticles ?? "..."}
            subtitle={stats?.lastCronRun ? `Last run: ${timeAgo(stats.lastCronRun)}` : undefined}
            accentColor="#10b981"
          />
          <StatCard
            icon={<Rss size={18} />}
            label="RSS Items Today"
            value={stats?.rssItemsToday ?? "..."}
            accentColor="#f59e0b"
          />
          <StatCard
            icon={<Building2 size={18} />}
            label="Companies"
            value={stats?.companiesTotal ?? "..."}
            accentColor="#8b5cf6"
          />
        </div>

        {/* Stats error indicator */}
        {statsError && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            marginBottom: 14,
            background: "#ef444410",
            border: "1px solid #ef444430",
            borderRadius: 8,
            fontSize: 12,
            color: "#ef4444",
          }}>
            <AlertCircle size={14} />
            Failed to load dashboard stats.
            <button
              onClick={() => fetchStats()}
              style={{
                background: "none",
                border: "none",
                color: "#ef4444",
                textDecoration: "underline",
                cursor: "pointer",
                fontSize: 12,
                padding: 0,
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Quick Actions ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 28 }}>
          <ActionCard
            icon={<Newspaper size={20} />}
            title="Generate Articles"
            description="Generate funding deals, breaking news, clinical trials, and more"
            buttonLabel="Generate Now"
            buttonIcon={<Zap size={14} />}
            accentColor="#3b82f6"
            disabled={isAnyCronRunning}
            onClick={() => triggerCron("Generate Articles", "/api/cron/generate-news")}
          />
          <ActionCard
            icon={<Rss size={20} />}
            title="Scrape News"
            description="Fetch latest RSS feeds from GlobeNewswire, PRNewswire"
            buttonLabel="Scrape Now"
            buttonIcon={<RefreshCw size={14} />}
            accentColor="#10b981"
            disabled={isAnyCronRunning}
            onClick={() => triggerCron("Scrape News", "/api/cron/scrape-funding")}
          />
          <ActionCard
            icon={<DollarSign size={20} />}
            title="Update Prices"
            description="Refresh stock prices for all public companies"
            buttonLabel="Update Now"
            buttonIcon={<RefreshCw size={14} />}
            accentColor="#f59e0b"
            disabled={isAnyCronRunning}
            onClick={() => triggerCron("Update Prices", "/api/cron/update-prices")}
          />
          <ActionCard
            icon={<Play size={20} />}
            title="Run All Agents"
            description={`Run data quality agents (${enabledAgentCount} agents)`}
            buttonLabel="Run All"
            buttonIcon={<Zap size={14} />}
            accentColor="#8b5cf6"
            disabled={runningAgents.size > 0}
            onClick={() => setConfirmRunAll(true)}
          />
        </div>

        {/* ── Progress Feed ── */}
        {progressEntries.length > 0 && (
          <div style={{ marginBottom: 28, display: "flex", flexDirection: "column", gap: 12 }}>
            {progressEntries.some((e) => e.status !== "running") && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setProgressEntries((prev) => prev.filter((e) => e.status === "running"))}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-text-tertiary)",
                    fontSize: 12,
                    cursor: "pointer",
                    padding: "2px 0",
                    textDecoration: "underline",
                  }}
                >
                  Clear completed
                </button>
              </div>
            )}
            {progressEntries.map((entry) => (
              <ProgressCard key={entry.id} entry={entry} onDismiss={() => dismissProgress(entry.id)} />
            ))}
          </div>
        )}

        {/* ── Recent Articles ── */}
        {recentArticles.length > 0 && (
          <div style={{
            background: "var(--color-bg-primary)",
            border: "1px solid var(--color-border-subtle)",
            borderRadius: 10,
            padding: 20,
            marginBottom: 28,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0, color: "var(--color-text-primary)" }}>
                Recent Articles
              </h2>
              <Link href="/admin/articles" style={{ fontSize: 12, color: "var(--color-text-tertiary)", textDecoration: "none" }}>
                View all
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recentArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/admin/articles/${article.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 8,
                    transition: "background 0.15s",
                    cursor: "pointer",
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-secondary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Type badge */}
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: TYPE_COLORS[article.type] || "#6b7280",
                      background: `${TYPE_COLORS[article.type] || "#6b7280"}18`,
                      padding: "3px 8px",
                      borderRadius: 4,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}>
                      {(article.type || "").replace(/_/g, " ")}
                    </span>

                    {/* Headline */}
                    <span style={{
                      fontSize: 13,
                      color: "var(--color-text-primary)",
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {article.headline}
                    </span>

                    {/* Confidence */}
                    {article.confidence && (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 500,
                        color: CONFIDENCE_COLORS[article.confidence] || "#6b7280",
                        flexShrink: 0,
                      }}>
                        {article.confidence}
                      </span>
                    )}

                    {/* Status badge */}
                    <span style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: STATUS_COLORS[article.status] || "#6b7280",
                      background: `${STATUS_COLORS[article.status] || "#6b7280"}18`,
                      padding: "2px 8px",
                      borderRadius: 4,
                      flexShrink: 0,
                    }}>
                      {article.status}
                    </span>

                    {/* Time */}
                    <span style={{
                      fontSize: 11,
                      color: "var(--color-text-tertiary)",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}>
                      {timeAgo(article.published_at || article.created_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Agent Activity (collapsible) ── */}
        <div style={{
          background: "var(--color-bg-primary)",
          border: "1px solid var(--color-border-subtle)",
          borderRadius: 10,
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}>
          {/* Collapse header */}
          <button
            onClick={() => setActivityCollapsed(!activityCollapsed)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "16px 20px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-primary)",
              fontSize: 14,
              fontWeight: 500,
              textAlign: "left",
            }}
          >
            {activityCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            Agent Activity
            <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: 400, marginLeft: 4 }}>
              {agents.length} agents &middot; System Health {overallHealth}%
            </span>
          </button>

          {!activityCollapsed && (
            <div style={{ padding: "0 20px 20px" }}>
              {/* Agent Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 20 }}>
                {agents.map((agent) => {
                  const meta = AGENT_META[agent.agent_id];
                  const isRunning = runningAgents.has(agent.agent_id);
                  return (
                    <div key={agent.agent_id} style={{
                      border: "1px solid var(--color-border-subtle)",
                      borderRadius: 8,
                      padding: 16,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 6,
                            background: "var(--color-bg-secondary)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "var(--color-text-secondary)",
                          }}>
                            {meta?.icon}
                          </div>
                          <div>
                            <Link
                              href={`/admin/agents/${agent.agent_id}`}
                              style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", textDecoration: "none" }}
                            >
                              {meta?.name || agent.agent_id}
                            </Link>
                            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                              {cronToHuman(agent.schedule_cron)} &middot; Last: {timeAgo(agent.latest_run?.started_at || null)}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {/* Enabled / Disabled badge */}
                          <span style={{
                            fontSize: 10,
                            fontWeight: 500,
                            padding: "2px 7px",
                            borderRadius: 999,
                            background: agent.enabled ? "#22c55e18" : "#9ca3af18",
                            color: agent.enabled ? "#22c55e" : "#9ca3af",
                          }}>
                            {agent.enabled ? "Enabled" : "Disabled"}
                          </span>
                          <div style={{ fontSize: 14, fontWeight: 600, color: scoreColor(agent.health_score) }}>
                            {agent.health_score}%
                          </div>
                        </div>
                      </div>

                      {/* Last run result badge */}
                      {agent.latest_run && (
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          marginBottom: 8,
                          fontSize: 11,
                        }}>
                          {agent.latest_run.status === "completed" ? (
                            <CheckCircle2 size={12} style={{ color: "#22c55e" }} />
                          ) : agent.latest_run.status === "failed" ? (
                            <XCircle size={12} style={{ color: "#ef4444" }} />
                          ) : (
                            <Loader2 size={12} className="animate-spin" style={{ color: "var(--color-text-tertiary)" }} />
                          )}
                          <span style={{
                            fontWeight: 500,
                            color: agent.latest_run.status === "completed"
                              ? "#22c55e"
                              : agent.latest_run.status === "failed"
                                ? "#ef4444"
                                : "var(--color-text-tertiary)",
                          }}>
                            {agent.latest_run.status === "completed" ? "Success" : agent.latest_run.status === "failed" ? "Failed" : "Running"}
                          </span>
                          <span style={{ color: "var(--color-text-tertiary)" }}>
                            {timeAgo(agent.latest_run.completed_at || agent.latest_run.started_at)}
                          </span>
                        </div>
                      )}

                      {/* Progress bar */}
                      <div style={{ height: 2, background: "var(--color-border-subtle)", borderRadius: 2, marginBottom: 10 }}>
                        <div style={{
                          height: 2,
                          background: scoreColor(agent.health_score),
                          borderRadius: 2,
                          width: `${agent.health_score}%`,
                          transition: "width 0.3s",
                        }} />
                      </div>

                      {/* Last run summary */}
                      {agent.latest_run && (
                        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 10 }}>
                          {agent.latest_run.summary || agent.latest_run.status} &middot;
                          Scanned {agent.latest_run.items_scanned}, fixed {agent.latest_run.items_fixed}
                        </div>
                      )}

                      {/* Buttons */}
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => runAgent(agent.agent_id)}
                          disabled={isRunning}
                          style={{
                            flex: 1,
                            padding: "6px 8px",
                            background: "var(--color-text-primary)",
                            border: "none",
                            borderRadius: 5,
                            color: "var(--color-bg-primary)",
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: isRunning ? "not-allowed" : "pointer",
                            opacity: isRunning ? 0.5 : 1,
                          }}
                        >
                          {isRunning ? (
                            <><Loader2 size={11} className="animate-spin" style={{ display: "inline", marginRight: 3, verticalAlign: -2 }} /> Running...</>
                          ) : (
                            <><Play size={11} style={{ display: "inline", marginRight: 3, verticalAlign: -2 }} /> Run</>
                          )}
                        </button>
                        <button
                          onClick={() => openHistory(agent.agent_id)}
                          style={{
                            padding: "6px 10px",
                            background: "transparent",
                            border: "1px solid var(--color-border-subtle)",
                            borderRadius: 5,
                            color: "var(--color-text-secondary)",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          <History size={11} style={{ display: "inline", marginRight: 3, verticalAlign: -2 }} />
                          History
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Activity Timeline */}
              <h3 style={{ fontSize: 13, fontWeight: 500, margin: "0 0 12px", color: "var(--color-text-secondary)" }}>
                Recent Runs
              </h3>
              <div style={{ position: "relative", paddingLeft: 20 }}>
                {/* Vertical line */}
                <div style={{
                  position: "absolute",
                  left: 5,
                  top: 6,
                  bottom: 6,
                  width: 1,
                  background: "var(--color-border-subtle)",
                }} />

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {activity.map((run) => (
                    <div key={run.id} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 10px",
                      borderRadius: 6,
                      position: "relative",
                    }}>
                      {/* Dot */}
                      <div style={{
                        position: "absolute",
                        left: -18,
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: run.status === "completed" ? "var(--color-text-tertiary)"
                          : run.status === "failed" ? "#c45a5a" : "#b58a1b",
                        border: "2px solid var(--color-bg-primary)",
                      }} />
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", flex: 1 }}>
                        <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
                          {AGENT_META[run.agent_id]?.name}
                        </span>{" "}
                        {run.summary || run.status}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>
                        {timeAgo(run.started_at)}
                      </div>
                    </div>
                  ))}
                  {activity.length === 0 && (
                    <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", textAlign: "center", padding: 20 }}>
                      No agent runs yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Load more */}
              {hasMoreActivity && (
                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <button
                    onClick={loadMoreActivity}
                    disabled={loadingMoreActivity}
                    style={{
                      padding: "6px 16px",
                      background: "transparent",
                      border: "1px solid var(--color-border-subtle)",
                      borderRadius: 5,
                      color: "var(--color-text-secondary)",
                      fontSize: 11,
                      cursor: loadingMoreActivity ? "not-allowed" : "pointer",
                      opacity: loadingMoreActivity ? 0.6 : 1,
                    }}
                  >
                    {loadingMoreActivity ? (
                      <><Loader2 size={11} className="animate-spin" style={{ display: "inline", marginRight: 3, verticalAlign: -2 }} /> Loading...</>
                    ) : (
                      "Load more"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Run All dialog */}
      <ConfirmDialog
        open={confirmRunAll}
        title="Run All Agents"
        message={`This will trigger all ${enabledAgentCount} enabled agents sequentially. Continue?`}
        confirmLabel="Run All"
        onConfirm={() => {
          setConfirmRunAll(false);
          runAllAgents();
        }}
        onCancel={() => setConfirmRunAll(false)}
      />

      {/* History Slide-out */}
      {historyAgent && (
        <div style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 420,
          background: "var(--color-bg-primary)",
          borderLeft: "1px solid var(--color-border-subtle)",
          zIndex: 1000,
          overflowY: "auto",
          padding: 24,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, margin: 0, color: "var(--color-text-primary)" }}>
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
            <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", textAlign: "center", padding: 40 }}>
              No runs yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {historyRuns.map((run) => (
                <div key={run.id} style={{
                  border: "1px solid var(--color-border-subtle)",
                  borderRadius: 8,
                  padding: 14,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.02em",
                      color: run.status === "completed" ? "var(--color-text-primary)" : run.status === "failed" ? "#c45a5a" : "#b58a1b",
                    }}>
                      {run.status}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                      {timeAgo(run.started_at)} &middot; {run.triggered_by}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>
                    {run.summary || "No summary"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
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
            background: "rgba(0,0,0,0.3)",
            zIndex: 999,
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24,
          padding: "12px 20px",
          background: "var(--color-bg-primary)",
          border: "1px solid var(--color-border-subtle)",
          borderLeft: toast.type === "error" ? "3px solid #c45a5a" : "3px solid var(--color-text-tertiary)",
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          color: "var(--color-text-primary)",
          fontSize: 12,
          fontWeight: 400,
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

// ── Sub-components ──

function StatCard({
  icon,
  label,
  value,
  subtitle,
  accentColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtitle?: string;
  accentColor: string;
}) {
  return (
    <div style={{
      background: "var(--color-bg-primary)",
      border: "1px solid var(--color-border-subtle)",
      borderRadius: 10,
      padding: "18px 20px",
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: `${accentColor}14`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accentColor,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: 500 }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1 }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 6 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  buttonLabel,
  buttonIcon,
  accentColor,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  buttonIcon: React.ReactNode;
  accentColor: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div style={{
      background: "var(--color-bg-primary)",
      border: "1px solid var(--color-border-subtle)",
      borderRadius: 10,
      padding: 20,
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: `${accentColor}14`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: accentColor,
          }}>
            {icon}
          </div>
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
            {title}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "0 0 16px", lineHeight: 1.5 }}>
          {description}
        </p>
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "9px 16px",
          background: accentColor,
          border: "none",
          borderRadius: 6,
          color: "#fff",
          fontSize: 13,
          fontWeight: 500,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          width: "100%",
          transition: "opacity 0.15s",
        }}
      >
        {buttonIcon}
        {buttonLabel}
      </button>
    </div>
  );
}

function ProgressCard({ entry, onDismiss }: { entry: ProgressEntry; onDismiss: () => void }) {
  const isRunning = entry.status === "running";
  const isError = entry.status === "error";
  const results = entry.response?.results;

  // Calculate totals
  let totalGenerated = 0;
  let totalAttempted = 0;
  let totalErrors = 0;
  if (results) {
    for (const r of Object.values(results)) {
      totalGenerated += r.generated;
      totalAttempted += r.attempted;
      totalErrors += r.errors.length;
    }
  }

  const formatElapsed = (s: number) => {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  return (
    <div style={{
      background: "var(--color-bg-primary)",
      border: `1px solid ${isError ? "#c45a5a40" : isRunning ? `${entry.cronPath.includes("generate-news") ? "#3b82f6" : "#10b981"}30` : "var(--color-border-subtle)"}`,
      borderRadius: 10,
      padding: "16px 20px",
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isRunning && !results ? 0 : 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isRunning ? (
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: "#3b82f6",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          ) : isError ? (
            <XCircle size={16} style={{ color: "#c45a5a" }} />
          ) : (
            <CheckCircle2 size={16} style={{ color: "#10b981" }} />
          )}
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
            {isRunning ? `Running: ${entry.label}` : isError ? `Failed: ${entry.label}` : `${entry.label} completed`}
          </span>
          <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
            {formatElapsed(entry.elapsedSeconds)}
          </span>
        </div>
        {!isRunning && (
          <button
            onClick={onDismiss}
            style={{ background: "none", border: "none", color: "var(--color-text-tertiary)", cursor: "pointer", padding: 4 }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Error message */}
      {isError && entry.response?.error && (
        <div style={{
          fontSize: 12,
          color: "#c45a5a",
          padding: "8px 12px",
          background: "#c45a5a10",
          borderRadius: 6,
        }}>
          <AlertCircle size={12} style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} />
          {entry.response.error}
        </div>
      )}

      {/* Pipeline results */}
      {results && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {Object.entries(results).map(([type, result]) => (
            <div key={type} style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 0",
              fontSize: 12,
            }}>
              {result.generated > 0 ? (
                <CheckCircle2 size={13} style={{ color: "#10b981", flexShrink: 0 }} />
              ) : result.errors.length > 0 ? (
                <XCircle size={13} style={{ color: "#c45a5a", flexShrink: 0 }} />
              ) : (
                <Minus size={13} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
              )}
              <span style={{
                color: result.generated > 0 ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                fontWeight: result.generated > 0 ? 500 : 400,
              }}>
                {PIPELINE_LABELS[type] || type}
              </span>
              <span style={{ color: "var(--color-text-tertiary)" }}>
                {result.generated > 0
                  ? `${result.generated} generated`
                  : result.attempted === 0
                    ? "no candidates"
                    : result.errors.length > 0
                      ? result.errors[0]?.substring(0, 80)
                      : "0 generated"
                }
              </span>
            </div>
          ))}

          {/* Total summary */}
          <div style={{
            borderTop: "1px solid var(--color-border-subtle)",
            marginTop: 8,
            paddingTop: 8,
            fontSize: 12,
            fontWeight: 500,
            color: "var(--color-text-primary)",
          }}>
            {totalGenerated} articles generated in {formatElapsed(entry.elapsedSeconds)}
            {totalErrors > 0 && (
              <span style={{ color: "#c45a5a", marginLeft: 8 }}>
                ({totalErrors} error{totalErrors > 1 ? "s" : ""})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Non-generate-news results (simple response) */}
      {entry.status === "completed" && !results && entry.response && (
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
          {entry.response.message || entry.response.summary || "Completed successfully"}
          {entry.response.inserted !== undefined && (
            <span style={{ color: "var(--color-text-tertiary)", marginLeft: 4 }}>
              &middot; {entry.response.inserted} items processed
            </span>
          )}
          {entry.response.updated !== undefined && (
            <span style={{ color: "var(--color-text-tertiary)", marginLeft: 4 }}>
              &middot; {entry.response.updated} updated
            </span>
          )}
        </div>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
