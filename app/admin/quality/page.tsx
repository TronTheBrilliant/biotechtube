"use client";

import { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import {
  Shield, AlertTriangle, CheckCircle, MessageSquare,
  Send, Plus, X, Flag, Activity, Clock, Database, RefreshCw,
  Users, Loader2, Clipboard, Zap, Newspaper, DollarSign,
  Search, FileText, ListChecks, ArrowUpRight, Copy,
} from "lucide-react";

/* ================================================================
   TYPES
   ================================================================ */

interface IntegrityCheck {
  id: string;
  check_type: string;
  severity: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  description: string;
  status: string;
  created_at: string;
}

interface ErrorReport {
  id: string;
  company_id: string | null;
  page_url: string | null;
  issue_type: string;
  description: string;
  reporter_email: string | null;
  status: string;
  resolution_note: string | null;
  created_at: string;
}

interface CiaLog {
  company_id: string;
  quality_score: number;
  last_checked_at: string;
  company_name?: string;
}

interface AiModel {
  id: string;
  name: string;
  provider: string;
  api_key_env_var: string | null;
  api_key_direct: string | null;
  base_url: string | null;
  model_id: string;
  is_default: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  model_used?: string;
}

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  apiAction?: string;
  terminalCommand?: string;
}

interface PlatformStats {
  totalCompanies: number;
  verifiedPct: number;
  publicTickers: number;
  pipelineProducts: number;
  blogArticles: number;
  watchlistItems: number;
  openIssues: number;
  pendingReports: number;
}

interface Freshness {
  lastPrice: string;
  lastNews: string;
  pipelineCount: number;
  lastWatchlist: string;
}

/* ================================================================
   CONSTANTS
   ================================================================ */

const ADMIN_EMAIL = "trond.skattum@gmail.com";

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "cia",
    icon: <Zap size={18} />,
    label: "Run CIA",
    description: "50 worst profiles",
    terminalCommand: "npx tsx scripts/cia-agent.ts --batch 50",
  },
  {
    id: "news",
    icon: <Newspaper size={18} />,
    label: "Scrape News",
    description: "Biotech news sources",
    terminalCommand: "npx tsx scripts/scrape-biotech-news.ts",
  },
  {
    id: "prices",
    icon: <DollarSign size={18} />,
    label: "Update Prices",
    description: "All public tickers",
    apiAction: "refresh-prices",
  },
  {
    id: "integrity",
    icon: <Search size={18} />,
    label: "Check Integrity",
    description: "Full data audit",
    terminalCommand: "npx tsx scripts/daily-integrity-check.ts",
  },
  {
    id: "recap",
    icon: <FileText size={18} />,
    label: "Weekly Recap",
    description: "Generate blog post",
    terminalCommand: "npx tsx scripts/generate-weekly-recap.ts",
  },
  {
    id: "watchlists",
    icon: <ListChecks size={18} />,
    label: "Refresh Lists",
    description: "Curated watchlists",
    terminalCommand: "npx tsx scripts/populate-curated-watchlists.ts",
  },
];

/* ================================================================
   HELPERS
   ================================================================ */

function daysAgo(dateStr: string): number {
  if (!dateStr || dateStr === "N/A") return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function freshnessColor(dateStr: string, thresholdDays: number): string {
  const d = daysAgo(dateStr);
  if (d <= thresholdDays) return "#22c55e";
  if (d <= thresholdDays * 2) return "#eab308";
  return "#ef4444";
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === "N/A") return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeAgo(dateStr: string): string {
  const d = daysAgo(dateStr);
  if (d === 0) return "today";
  if (d === 1) return "1d ago";
  return `${d}d ago`;
}

/* ================================================================
   COMPONENT
   ================================================================ */

export default function QualityDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [supabase] = useState(() => createBrowserClient());

  // All data state
  const [stats, setStats] = useState<PlatformStats>({
    totalCompanies: 0, verifiedPct: 0, publicTickers: 0,
    pipelineProducts: 0, blogArticles: 0, watchlistItems: 0,
    openIssues: 0, pendingReports: 0,
  });
  const [issues, setIssues] = useState<IntegrityCheck[]>([]);
  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [ciaLogs, setCiaLogs] = useState<CiaLog[]>([]);
  const [freshness, setFreshness] = useState<Freshness>({
    lastPrice: "", lastNews: "", pipelineCount: 0, lastWatchlist: "",
  });
  const [models, setModels] = useState<AiModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [newModel, setNewModel] = useState({
    name: "", provider: "deepseek", apiKeyDirect: "", baseUrl: "", modelId: "",
  });
  const [resolveNotes, setResolveNotes] = useState<Record<string, string>>({});
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Health score
  const healthScore = Math.max(0, Math.min(100, Math.round(
    100 - (stats.openIssues * 2) - (stats.pendingReports * 3) + (stats.verifiedPct * 0.5)
  )));
  const healthColor = healthScore >= 80 ? "#22c55e" : healthScore >= 50 ? "#eab308" : "#ef4444";

  /* ─── Load all data ONCE ─── */
  const loadedRef = useRef(false);

  useEffect(() => {
    if (authLoading || loadedRef.current) return;
    if (user?.email !== ADMIN_EMAIL) { setPageLoading(false); return; }
    loadedRef.current = true;

    (async () => {
      try {
        // Batch 1: All counts and lists in parallel
        const [
          companyRes, verifiedRes, tickerRes, pipelineRes, blogRes,
          watchlistRes, flagRes, reportCountRes,
          issueRes, reportListRes, ciaRes, modelRes,
          priceRes, newsRes,
        ] = await Promise.all([
          supabase.from("companies").select("*", { count: "exact", head: true }),
          supabase.from("profile_quality").select("*", { count: "exact", head: true }).gte("quality_score", 7),
          supabase.from("companies").select("*", { count: "exact", head: true }).not("ticker", "is", null),
          supabase.from("product_scores").select("*", { count: "exact", head: true }),
          supabase.from("blog_posts").select("*", { count: "exact", head: true }).eq("status", "published"),
          supabase.from("curated_watchlist_items").select("*", { count: "exact", head: true }),
          supabase.from("integrity_checks").select("*", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("error_reports").select("*", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("integrity_checks").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(20),
          supabase.from("error_reports").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(10),
          supabase.from("profile_quality").select("company_id, quality_score, last_checked_at").order("last_checked_at", { ascending: false }).limit(10),
          supabase.from("admin_ai_models").select("*").order("is_default", { ascending: false }),
          supabase.from("company_price_history").select("date").order("date", { ascending: false }).limit(1),
          supabase.from("news_items").select("published_date").order("published_date", { ascending: false }).limit(1),
        ]);

        const total = companyRes.count || 0;
        const verified = verifiedRes.count || 0;

        setStats({
          totalCompanies: total,
          verifiedPct: total > 0 ? Math.round((verified / total) * 100) : 0,
          publicTickers: tickerRes.count || 0,
          pipelineProducts: pipelineRes.count || 0,
          blogArticles: blogRes.count || 0,
          watchlistItems: watchlistRes.count || 0,
          openIssues: flagRes.count || 0,
          pendingReports: reportCountRes.count || 0,
        });

        const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
        setIssues(
          (issueRes.data || []).sort(
            (a: any, b: any) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)
          )
        );
        setReports(reportListRes.data || []);

        // CIA logs with company names
        const ciaData = ciaRes.data || [];
        if (ciaData.length > 0) {
          const ids = ciaData.map((c: any) => c.company_id);
          const { data: companies } = await supabase.from("companies").select("id, name").in("id", ids);
          const nameMap = new Map((companies || []).map((c: any) => [c.id, c.name]));
          setCiaLogs(ciaData.map((c: any) => ({ ...c, company_name: nameMap.get(c.company_id) || "Unknown" })));
        }

        // Models
        const mods = modelRes.data || [];
        setModels(mods);
        if (mods.length > 0) {
          const def = mods.find((m: any) => m.is_default) || mods[0];
          setSelectedModelId(def.id);
        }

        // Freshness
        setFreshness({
          lastPrice: priceRes.data?.[0]?.date || "N/A",
          lastNews: newsRes.data?.[0]?.published_date?.split("T")[0] || "N/A",
          pipelineCount: pipelineRes.count || 0,
          lastWatchlist: "N/A",
        });
      } catch (err) {
        console.error("Dashboard load error:", err);
      }
      setPageLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  /* ─── Toast auto-dismiss ─── */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ─── Actions ─── */
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };

  const runAction = async (action: QuickAction) => {
    if (action.terminalCommand && !action.apiAction) {
      // Copy command to clipboard and show toast
      try {
        await navigator.clipboard.writeText(action.terminalCommand);
        showToast(`Command copied: ${action.terminalCommand}`, "info");
      } catch {
        showToast(`Run: ${action.terminalCommand}`, "info");
      }
      return;
    }

    if (action.apiAction) {
      setActionLoading((prev) => ({ ...prev, [action.id]: true }));
      try {
        const res = await fetch("/api/admin/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: action.apiAction }),
        });
        const data = await res.json();
        if (data.terminalCommand) {
          try { await navigator.clipboard.writeText(data.terminalCommand); } catch {}
        }
        showToast(data.message || "Action completed", data.success ? "success" : "error");
      } catch (err: any) {
        showToast(`Error: ${err.message}`, "error");
      } finally {
        setActionLoading((prev) => ({ ...prev, [action.id]: false }));
      }
    }
  };

  const dismissIssue = async (id: string) => {
    await supabase.from("integrity_checks").update({ status: "dismissed", resolved_at: new Date().toISOString() }).eq("id", id);
    setIssues((prev) => prev.filter((i) => i.id !== id));
    setStats((s) => ({ ...s, openIssues: Math.max(0, s.openIssues - 1) }));
    showToast("Issue dismissed");
  };

  const resolveIssue = async (id: string) => {
    await supabase.from("integrity_checks").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id);
    setIssues((prev) => prev.filter((i) => i.id !== id));
    setStats((s) => ({ ...s, openIssues: Math.max(0, s.openIssues - 1) }));
    showToast("Issue resolved");
  };

  const resolveReport = async (id: string) => {
    const note = resolveNotes[id] || "";
    await supabase.from("error_reports").update({ status: "resolved", resolution_note: note, resolved_at: new Date().toISOString() }).eq("id", id);
    setReports((prev) => prev.filter((r) => r.id !== id));
    setStats((s) => ({ ...s, pendingReports: Math.max(0, s.pendingReports - 1) }));
    showToast("Report resolved");
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, modelId: selectedModelId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.response, model_used: data.modelUsed }]);
    } catch (err: any) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const addModel = async () => {
    if (!newModel.name || !newModel.modelId) return;
    const { data, error } = await supabase.from("admin_ai_models").insert({
      name: newModel.name,
      provider: newModel.provider,
      api_key_direct: newModel.apiKeyDirect || null,
      base_url: newModel.baseUrl || null,
      model_id: newModel.modelId,
      is_default: false,
    }).select().single();
    if (!error && data) {
      setModels((prev) => [...prev, data]);
      setShowAddModel(false);
      setNewModel({ name: "", provider: "deepseek", apiKeyDirect: "", baseUrl: "", modelId: "" });
      showToast("Model added");
    }
  };

  /* ─── Auth guard ─── */
  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg-primary)" }}>
        <Loader2 className="animate-spin" size={32} style={{ color: "var(--color-accent)" }} />
      </div>
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg-primary)" }}>
        <div className="text-center">
          <Shield size={48} className="mx-auto mb-4" style={{ color: "var(--color-text-tertiary)" }} />
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>Access Denied</h1>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  /* ================================================================
     RENDER
     ================================================================ */

  const statCards = [
    { label: "Companies", value: stats.totalCompanies.toLocaleString(), icon: <Database size={15} />, color: "#3b82f6" },
    { label: "Verified", value: `${stats.verifiedPct}%`, icon: <CheckCircle size={15} />, color: "#22c55e" },
    { label: "Tickers", value: stats.publicTickers.toLocaleString(), icon: <DollarSign size={15} />, color: "#8b5cf6" },
    { label: "Pipeline", value: stats.pipelineProducts.toLocaleString(), icon: <Activity size={15} />, color: "#06b6d4" },
    { label: "Articles", value: stats.blogArticles.toString(), icon: <Newspaper size={15} />, color: "#f59e0b" },
  ];

  const freshnessItems = [
    { label: "Prices", value: freshness.lastPrice, threshold: 2, actionId: "prices" },
    { label: "News", value: freshness.lastNews, threshold: 3, actionId: "news" },
    { label: "Pipelines", value: null, count: freshness.pipelineCount },
    { label: "Watchlists", value: freshness.lastWatchlist, threshold: 7, actionId: "watchlists" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}>

      {/* ─── Toast notification ─── */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-[13px] font-medium shadow-lg flex items-center gap-2 animate-in slide-in-from-top"
          style={{
            background: toast.type === "success" ? "#22c55e" : toast.type === "error" ? "#ef4444" : "#3b82f6",
            color: "white",
            animation: "slideDown 0.3s ease-out",
          }}
        >
          {toast.type === "info" && <Copy size={14} />}
          {toast.message}
        </div>
      )}

      {/* ─── Top Header Bar ─── */}
      <div
        className="border-b px-6 py-5"
        style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}
      >
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--color-accent)" }}
            >
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Quality Command Center</h1>
              <p className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                BiotechTube Platform Administration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right mr-2">
              <div
                className="text-[11px] uppercase tracking-wider font-semibold"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                Health
              </div>
              <div className="text-[13px] font-medium" style={{ color: healthColor }}>
                {healthScore >= 80 ? "Excellent" : healthScore >= 50 ? "Fair" : "Critical"}
              </div>
            </div>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-[16px] font-bold"
              style={{
                border: `3px solid ${healthColor}`,
                color: healthColor,
                background: `${healthColor}10`,
              }}
            >
              {healthScore}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {/* ─── Quick Actions ─── */}
        <section>
          <div
            className="text-[11px] uppercase tracking-wider font-semibold mb-3"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Quick Actions
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => runAction(action)}
                disabled={actionLoading[action.id]}
                className="rounded-xl border p-4 text-left transition-all hover:border-[var(--color-accent)] group relative"
                style={{
                  borderColor: "var(--color-border-subtle)",
                  background: "var(--color-bg-secondary)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span style={{ color: "var(--color-accent)" }}>
                    {actionLoading[action.id] ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      action.icon
                    )}
                  </span>
                  {action.terminalCommand && !action.apiAction && (
                    <Clipboard size={12} style={{ color: "var(--color-text-tertiary)" }} />
                  )}
                </div>
                <div className="text-[13px] font-semibold">{action.label}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                  {action.description}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ─── Platform Stats ─── */}
        <section>
          <div
            className="text-[11px] uppercase tracking-wider font-semibold mb-3"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Platform Stats
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {statCards.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border p-4"
                style={{
                  borderColor: "var(--color-border-subtle)",
                  background: "var(--color-bg-secondary)",
                }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span style={{ color: s.color }}>{s.icon}</span>
                  <span
                    className="text-[11px] uppercase tracking-wider font-semibold"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    {s.label}
                  </span>
                </div>
                <div className="text-[24px] font-bold leading-none">{s.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Two-Column Layout: Issues + AI ─── */}
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Left Column: Issues (60%) */}
          <div className="flex-1 lg:w-[60%] space-y-6">

            {/* Integrity Issues */}
            <section
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}
            >
              <div
                className="px-5 py-3 border-b flex items-center justify-between"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} style={{ color: "#eab308" }} />
                  <h2
                    className="text-[11px] uppercase tracking-wider font-semibold"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Issues
                  </h2>
                  {stats.openIssues > 0 && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: "#eab30820", color: "#eab308" }}
                    >
                      {stats.openIssues}
                    </span>
                  )}
                </div>
              </div>
              <div
                className="max-h-[360px] overflow-y-auto divide-y"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                {issues.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <CheckCircle size={24} className="mx-auto mb-2" style={{ color: "#22c55e" }} />
                    <div className="text-[13px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                      No open issues
                    </div>
                  </div>
                ) : (
                  issues.map((issue) => (
                    <div
                      key={issue.id}
                      className="px-5 py-3.5 flex items-start gap-3 hover:bg-[var(--color-bg-primary)] transition-colors"
                      style={{ borderColor: "var(--color-border-subtle)" }}
                    >
                      <span className="mt-0.5 text-[14px]">
                        {issue.severity === "critical" ? (
                          <span style={{ color: "#ef4444" }}>&#9679;</span>
                        ) : issue.severity === "warning" ? (
                          <span style={{ color: "#eab308" }}>&#9679;</span>
                        ) : (
                          <span style={{ color: "#3b82f6" }}>&#9679;</span>
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium leading-snug">{issue.description}</div>
                        <div
                          className="text-[11px] mt-1 flex items-center gap-2"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          <span className="uppercase font-semibold">{issue.check_type}</span>
                          {issue.entity_name && (
                            <>
                              <span>&#183;</span>
                              <span>{issue.entity_name}</span>
                            </>
                          )}
                          <span>&#183;</span>
                          <span>{timeAgo(issue.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => resolveIssue(issue.id)}
                          className="text-[11px] px-2.5 py-1 rounded-md font-medium transition-opacity hover:opacity-80"
                          style={{ background: "#22c55e20", color: "#22c55e" }}
                        >
                          Fix
                        </button>
                        <button
                          onClick={() => dismissIssue(issue.id)}
                          className="text-[11px] px-2.5 py-1 rounded-md font-medium transition-opacity hover:opacity-80"
                          style={{ background: "var(--color-bg-primary)", color: "var(--color-text-tertiary)" }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* User Reports */}
            <section
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}
            >
              <div
                className="px-5 py-3 border-b flex items-center justify-between"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                <div className="flex items-center gap-2">
                  <Flag size={15} style={{ color: "#ef4444" }} />
                  <h2
                    className="text-[11px] uppercase tracking-wider font-semibold"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    User Reports
                  </h2>
                  {stats.pendingReports > 0 && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: "#ef444420", color: "#ef4444" }}
                    >
                      {stats.pendingReports}
                    </span>
                  )}
                </div>
              </div>
              <div
                className="max-h-[300px] overflow-y-auto divide-y"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                {reports.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <CheckCircle size={24} className="mx-auto mb-2" style={{ color: "#22c55e" }} />
                    <div className="text-[13px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                      No pending reports
                    </div>
                  </div>
                ) : (
                  reports.map((report) => (
                    <div
                      key={report.id}
                      className="px-5 py-3.5"
                      style={{ borderColor: "var(--color-border-subtle)" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium leading-snug">{report.description}</div>
                          <div
                            className="text-[11px] mt-1 flex flex-wrap items-center gap-2"
                            style={{ color: "var(--color-text-tertiary)" }}
                          >
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase"
                              style={{ background: "var(--color-accent-subtle, #3b82f620)", color: "var(--color-accent)" }}
                            >
                              {report.issue_type}
                            </span>
                            {report.reporter_email && <span>{report.reporter_email}</span>}
                            <span>&#183;</span>
                            <span>{timeAgo(report.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          value={resolveNotes[report.id] || ""}
                          onChange={(e) => setResolveNotes((prev) => ({ ...prev, [report.id]: e.target.value }))}
                          placeholder="Resolution note..."
                          className="flex-1 text-[12px] px-3 py-1.5 rounded-lg border outline-none transition-colors focus:border-[var(--color-accent)]"
                          style={{
                            borderColor: "var(--color-border-subtle)",
                            background: "var(--color-bg-primary)",
                            color: "var(--color-text-primary)",
                          }}
                        />
                        <button
                          onClick={() => resolveReport(report.id)}
                          className="text-[11px] px-3 py-1.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
                          style={{ background: "#22c55e" }}
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* CIA Activity */}
            <section
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}
            >
              <div
                className="px-5 py-3 border-b flex items-center justify-between"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                <div className="flex items-center gap-2">
                  <Activity size={15} style={{ color: "var(--color-accent)" }} />
                  <h2
                    className="text-[11px] uppercase tracking-wider font-semibold"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    CIA Activity
                  </h2>
                </div>
                <button
                  onClick={() => runAction(QUICK_ACTIONS[0])}
                  className="text-[11px] px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-80"
                  style={{ background: "var(--color-accent)", color: "white" }}
                >
                  <RefreshCw size={11} /> Run on 50 more
                </button>
              </div>
              <div
                className="max-h-[260px] overflow-y-auto divide-y"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                {ciaLogs.length === 0 ? (
                  <div className="px-5 py-8 text-center text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
                    No CIA activity yet
                  </div>
                ) : (
                  ciaLogs.map((log, i) => (
                    <div key={i} className="px-5 py-2.5 flex items-center justify-between">
                      <span className="text-[13px] font-medium">{log.company_name}</span>
                      <div className="flex items-center gap-3 text-[12px]">
                        <span
                          className="font-mono font-bold"
                          style={{
                            color: log.quality_score >= 7
                              ? "#22c55e"
                              : log.quality_score >= 4
                              ? "#eab308"
                              : "#ef4444",
                          }}
                        >
                          {log.quality_score}/10
                        </span>
                        <span style={{ color: "var(--color-text-tertiary)" }}>
                          {formatDate(log.last_checked_at)}
                        </span>
                        <CheckCircle size={12} style={{ color: "#22c55e" }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Data Freshness */}
            <section
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}
            >
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--color-border-subtle)" }}>
                <Clock size={15} style={{ color: "#3b82f6" }} />
                <h2
                  className="text-[11px] uppercase tracking-wider font-semibold"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  Data Freshness
                </h2>
              </div>
              <div className="px-5 py-4 space-y-3">
                {freshnessItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                      {item.label}
                    </span>
                    <div className="flex items-center gap-2">
                      {item.count !== undefined ? (
                        <span className="text-[12px] font-mono font-semibold" style={{ color: "#22c55e" }}>
                          {item.count.toLocaleString()} total
                        </span>
                      ) : (
                        <>
                          <span
                            className="text-[8px]"
                            style={{ color: freshnessColor(item.value || "N/A", item.threshold || 2) }}
                          >
                            &#9679;
                          </span>
                          <span className="text-[12px] font-mono" style={{ color: "var(--color-text-primary)" }}>
                            {item.value === "N/A" ? "N/A" : `${formatDate(item.value!)} (${timeAgo(item.value!)})`}
                          </span>
                          {item.actionId && daysAgo(item.value || "N/A") > (item.threshold || 2) && (
                            <button
                              onClick={() => {
                                const a = QUICK_ACTIONS.find((q) => q.id === item.actionId);
                                if (a) runAction(a);
                              }}
                              className="text-[10px] px-2 py-0.5 rounded font-semibold transition-opacity hover:opacity-80"
                              style={{ background: "var(--color-accent)", color: "white" }}
                            >
                              Refresh
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: AI Assistant (40%) */}
          <div className="lg:w-[40%]">
            <div
              className="rounded-xl border sticky top-4 flex flex-col overflow-hidden"
              style={{
                borderColor: "var(--color-border-subtle)",
                background: "var(--color-bg-secondary)",
                height: "calc(100vh - 120px)",
              }}
            >
              {/* Chat header */}
              <div
                className="px-4 py-3 border-b flex items-center justify-between"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={15} style={{ color: "var(--color-accent)" }} />
                  <h2
                    className="text-[11px] uppercase tracking-wider font-semibold"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    AI Assistant
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedModelId}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                    className="text-[11px] px-2 py-1 rounded-md border outline-none cursor-pointer"
                    style={{
                      borderColor: "var(--color-border-subtle)",
                      background: "var(--color-bg-primary)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowAddModel(!showAddModel)}
                    className="w-6 h-6 rounded-md flex items-center justify-center border transition-opacity hover:opacity-80"
                    style={{
                      borderColor: "var(--color-border-subtle)",
                      color: "var(--color-text-tertiary)",
                    }}
                  >
                    {showAddModel ? <X size={12} /> : <Plus size={12} />}
                  </button>
                </div>
              </div>

              {/* Add model form */}
              {showAddModel && (
                <div
                  className="px-4 py-3 border-b space-y-2"
                  style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-primary)" }}
                >
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Add Model
                  </div>
                  {[
                    { placeholder: "Name (e.g. GPT-4)", key: "name" as const },
                    { placeholder: "API Key", key: "apiKeyDirect" as const, type: "password" },
                    { placeholder: "Base URL", key: "baseUrl" as const },
                    { placeholder: "Model ID (e.g. deepseek-chat)", key: "modelId" as const },
                  ].map((field) => (
                    <input
                      key={field.key}
                      placeholder={field.placeholder}
                      type={field.type || "text"}
                      value={newModel[field.key]}
                      onChange={(e) => setNewModel({ ...newModel, [field.key]: e.target.value })}
                      className="w-full text-[12px] px-3 py-1.5 rounded-lg border outline-none transition-colors focus:border-[var(--color-accent)]"
                      style={{
                        borderColor: "var(--color-border-subtle)",
                        background: "var(--color-bg-secondary)",
                        color: "var(--color-text-primary)",
                      }}
                    />
                  ))}
                  <select
                    value={newModel.provider}
                    onChange={(e) => setNewModel({ ...newModel, provider: e.target.value })}
                    className="w-full text-[12px] px-3 py-1.5 rounded-lg border outline-none"
                    style={{
                      borderColor: "var(--color-border-subtle)",
                      background: "var(--color-bg-secondary)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    <option value="deepseek">DeepSeek</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="custom">Custom (OpenAI-compatible)</option>
                  </select>
                  <button
                    onClick={addModel}
                    className="w-full text-[12px] px-3 py-2 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: "var(--color-accent)" }}
                  >
                    Add Model
                  </button>
                </div>
              )}

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center py-16">
                    <MessageSquare size={28} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)" }} />
                    <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-tertiary)" }}>
                      Ask about platform quality, anomalies, or data health.
                    </p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[85%] rounded-xl px-4 py-2.5 text-[13px] leading-relaxed"
                      style={{
                        background: msg.role === "user" ? "var(--color-accent)" : "var(--color-bg-primary)",
                        color: msg.role === "user" ? "white" : "var(--color-text-primary)",
                        border: msg.role === "assistant" ? "1px solid var(--color-border-subtle)" : "none",
                      }}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      {msg.model_used && msg.role === "assistant" && (
                        <div className="text-[10px] mt-1.5 opacity-50">{msg.model_used}</div>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div
                      className="rounded-xl px-4 py-3 border"
                      style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
                    >
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--color-accent)", animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--color-accent)", animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--color-accent)", animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat input */}
              <div className="px-4 py-3 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
                    placeholder="Ask about platform quality..."
                    className="flex-1 text-[13px] px-4 py-2.5 rounded-xl border outline-none transition-colors focus:border-[var(--color-accent)]"
                    style={{
                      borderColor: "var(--color-border-subtle)",
                      background: "var(--color-bg-primary)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                  <button
                    onClick={sendChat}
                    disabled={chatLoading || !chatInput.trim()}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-opacity hover:opacity-90"
                    style={{ background: "var(--color-accent)" }}
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Toast animation ─── */}
      <style jsx global>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
