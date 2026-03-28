"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import {
  Shield, AlertTriangle, CheckCircle, Info, MessageSquare,
  Send, Plus, X, Flag, Activity, Clock, Database, RefreshCw,
  BarChart3, Users, AlertCircle, ChevronDown, Loader2, Trash2
} from "lucide-react";

/* ─── Types ─── */
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
  created_at?: string;
}

const ADMIN_EMAIL = "trond.skattum@gmail.com";

export default function QualityDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [supabase] = useState(() => createBrowserClient());

  /* ─── State ─── */
  const [stats, setStats] = useState({ totalCompanies: 0, verifiedPct: 0, openFlags: 0, pendingReports: 0 });
  const [issues, setIssues] = useState<IntegrityCheck[]>([]);
  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [ciaLogs, setCiaLogs] = useState<CiaLog[]>([]);
  const [freshness, setFreshness] = useState({ lastPrice: "", lastNews: "", pipelineCount: 0, lastWatchlist: "" });
  const [models, setModels] = useState<AiModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [newModel, setNewModel] = useState({ name: "", provider: "deepseek", apiKeyDirect: "", baseUrl: "", modelId: "" });
  const [resolveNotes, setResolveNotes] = useState<Record<string, string>>({});
  const [pageLoading, setPageLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* ─── Health Score ─── */
  const healthScore = Math.max(0, Math.min(100, Math.round(
    100 - (stats.openFlags * 2) - (stats.pendingReports * 3) + (stats.verifiedPct * 0.5)
  )));
  const healthColor = healthScore >= 80 ? "#22c55e" : healthScore >= 50 ? "#eab308" : "#ef4444";

  /* ─── Load Data ─── */
  const loadedRef = useRef(false);

  useEffect(() => {
    if (authLoading || loadedRef.current) return;
    if (user?.email !== ADMIN_EMAIL) { setPageLoading(false); return; }
    loadedRef.current = true;

    (async () => {
      try {
        // Batch 1: counts + lists
        const [companyRes, verifiedRes, flagRes, reportRes, issueRes, reportListRes, ciaRes, modelRes] = await Promise.all([
          supabase.from("companies").select("*", { count: "exact", head: true }),
          supabase.from("profile_quality").select("*", { count: "exact", head: true }).gte("quality_score", 7),
          supabase.from("integrity_checks").select("*", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("error_reports").select("*", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("integrity_checks").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(20),
          supabase.from("error_reports").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(10),
          supabase.from("profile_quality").select("company_id, quality_score, last_checked_at").order("last_checked_at", { ascending: false }).limit(10),
          supabase.from("admin_ai_models").select("*").order("is_default", { ascending: false }),
        ]);

        const total = companyRes.count || 0;
        const verified = verifiedRes.count || 0;
        setStats({
          totalCompanies: total,
          verifiedPct: total > 0 ? Math.round((verified / total) * 100) : 0,
          openFlags: flagRes.count || 0,
          pendingReports: reportRes.count || 0,
        });

        const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
        setIssues((issueRes.data || []).sort((a: any, b: any) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)));
        setReports(reportListRes.data || []);

        // CIA logs with names
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

        // Freshness (lighter queries)
        const [priceRes, newsRes, pipeRes] = await Promise.all([
          supabase.from("company_price_history").select("date").order("date", { ascending: false }).limit(1),
          supabase.from("news_items").select("published_date").order("published_date", { ascending: false }).limit(1),
          supabase.from("pipelines").select("*", { count: "exact", head: true }),
        ]);

        setFreshness({
          lastPrice: priceRes.data?.[0]?.date || "N/A",
          lastNews: newsRes.data?.[0]?.published_date?.split("T")[0] || "N/A",
          pipelineCount: pipeRes.count || 0,
          lastWatchlist: "N/A",
        });
      } catch (err) {
        console.error("Dashboard load error:", err);
      }
      setPageLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  /* ─── Actions ─── */
  const dismissIssue = async (id: string) => {
    await supabase.from("integrity_checks").update({ status: "dismissed", resolved_at: new Date().toISOString() }).eq("id", id);
    setIssues((prev) => prev.filter((i) => i.id !== id));
    setStats((s) => ({ ...s, openFlags: Math.max(0, s.openFlags - 1) }));
  };

  const resolveIssue = async (id: string) => {
    await supabase.from("integrity_checks").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id);
    setIssues((prev) => prev.filter((i) => i.id !== id));
    setStats((s) => ({ ...s, openFlags: Math.max(0, s.openFlags - 1) }));
  };

  const resolveReport = async (id: string) => {
    const note = resolveNotes[id] || "";
    await supabase.from("error_reports").update({ status: "resolved", resolution_note: note, resolved_at: new Date().toISOString() }).eq("id", id);
    setReports((prev) => prev.filter((r) => r.id !== id));
    setStats((s) => ({ ...s, pendingReports: Math.max(0, s.pendingReports - 1) }));
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
    }
  };

  /* ─── Freshness indicator ─── */
  const freshnessIndicator = (dateStr: string, thresholdDays: number) => {
    if (dateStr === "N/A") return <span className="text-gray-400">N/A</span>;
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days <= thresholdDays) return <span className="text-green-400">{dateStr} ({days}d ago)</span>;
    if (days <= thresholdDays * 2) return <span className="text-yellow-400">{dateStr} ({days}d ago)</span>;
    return <span className="text-red-400">{dateStr} ({days}d ago)</span>;
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

  /* ─── Render ─── */
  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}>
      {/* Top bar */}
      <div className="border-b px-6 py-4" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield size={24} style={{ color: "var(--color-accent)" }} />
              <h1 className="text-xl font-bold">Quality Dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Platform Health</div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2" style={{ borderColor: healthColor, color: healthColor }}>
                {healthScore}
              </div>
            </div>
          </div>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Companies", value: stats.totalCompanies.toLocaleString(), icon: <Database size={16} />, color: "#3b82f6" },
              { label: "Verified", value: `${stats.verifiedPct}%`, icon: <CheckCircle size={16} />, color: "#22c55e" },
              { label: "Open Flags", value: stats.openFlags, icon: <AlertTriangle size={16} />, color: "#eab308" },
              { label: "Pending Reports", value: stats.pendingReports, icon: <Flag size={16} />, color: "#ef4444" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border p-3" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-primary)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ color: s.color }}>{s.icon}</span>
                  <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{s.label}</span>
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column (60%) */}
          <div className="flex-1 lg:w-[60%] space-y-6">

            {/* Urgent Issues */}
            <section className="rounded-xl border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--color-border-subtle)" }}>
                <AlertTriangle size={16} style={{ color: "#eab308" }} />
                <h2 className="text-sm font-bold">Urgent Issues ({issues.length})</h2>
              </div>
              <div className="max-h-[400px] overflow-y-auto divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
                {issues.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--color-text-tertiary)" }}>No open issues</div>
                ) : issues.map((issue) => (
                  <div key={issue.id} className="px-5 py-3 flex items-start gap-3">
                    <span className="mt-0.5">
                      {issue.severity === "critical" ? "🔴" : issue.severity === "warning" ? "🟡" : "🔵"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium">{issue.description}</div>
                      <div className="text-[11px] mt-0.5 flex items-center gap-2" style={{ color: "var(--color-text-tertiary)" }}>
                        <span className="uppercase">{issue.check_type}</span>
                        {issue.entity_name && <span>· {issue.entity_name}</span>}
                        <span>· {new Date(issue.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => resolveIssue(issue.id)} className="text-[11px] px-2.5 py-1 rounded-md border font-medium hover:opacity-80 transition-opacity" style={{ borderColor: "#22c55e40", color: "#22c55e" }}>Resolve</button>
                      <button onClick={() => dismissIssue(issue.id)} className="text-[11px] px-2.5 py-1 rounded-md border font-medium hover:opacity-80 transition-opacity" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-tertiary)" }}>Dismiss</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* User Error Reports */}
            <section className="rounded-xl border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--color-border-subtle)" }}>
                <Flag size={16} style={{ color: "#ef4444" }} />
                <h2 className="text-sm font-bold">User Error Reports ({reports.length})</h2>
              </div>
              <div className="max-h-[400px] overflow-y-auto divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
                {reports.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--color-text-tertiary)" }}>No pending reports</div>
                ) : reports.map((report) => (
                  <div key={report.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium">{report.description}</div>
                        <div className="text-[11px] mt-0.5 flex flex-wrap items-center gap-2" style={{ color: "var(--color-text-tertiary)" }}>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase" style={{ background: "var(--color-accent-subtle)", color: "var(--color-accent)" }}>{report.issue_type}</span>
                          {report.page_url && <span className="truncate max-w-[200px]">{report.page_url}</span>}
                          {report.reporter_email && <span>· {report.reporter_email}</span>}
                          <span>· {new Date(report.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        value={resolveNotes[report.id] || ""}
                        onChange={(e) => setResolveNotes((prev) => ({ ...prev, [report.id]: e.target.value }))}
                        placeholder="Resolution note..."
                        className="flex-1 text-[12px] px-3 py-1.5 rounded-md border outline-none"
                        style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                      />
                      <button onClick={() => resolveReport(report.id)} className="text-[11px] px-3 py-1.5 rounded-md font-medium text-white" style={{ background: "#22c55e" }}>Resolve</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* CIA Agent Log */}
            <section className="rounded-xl border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--color-border-subtle)" }}>
                <div className="flex items-center gap-2">
                  <Activity size={16} style={{ color: "var(--color-accent)" }} />
                  <h2 className="text-sm font-bold">CIA Agent Log</h2>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await fetch("/api/cron/cia-agent", { method: "POST" });
                      loadData();
                    } catch {}
                  }}
                  className="text-[11px] px-3 py-1.5 rounded-md border font-medium flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                  style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)" }}
                >
                  <RefreshCw size={12} /> Run CIA on worst 50
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
                {ciaLogs.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--color-text-tertiary)" }}>No CIA activity yet</div>
                ) : ciaLogs.map((log, i) => (
                  <div key={i} className="px-5 py-2.5 flex items-center justify-between">
                    <div className="text-[13px]">
                      <span className="font-medium">{log.company_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
                      <span className="font-mono font-bold" style={{ color: log.quality_score >= 70 ? "#22c55e" : log.quality_score >= 40 ? "#eab308" : "#ef4444" }}>
                        {log.quality_score}/100
                      </span>
                      <span>{new Date(log.last_checked_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Data Freshness */}
            <section className="rounded-xl border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--color-border-subtle)" }}>
                <Clock size={16} style={{ color: "#3b82f6" }} />
                <h2 className="text-sm font-bold">Data Freshness</h2>
              </div>
              <div className="px-5 py-4 space-y-3">
                {[
                  { label: "Price data", value: freshnessIndicator(freshness.lastPrice, 2) },
                  { label: "News scraper", value: freshnessIndicator(freshness.lastNews, 3) },
                  { label: "Pipelines", value: <span className="text-blue-400">{freshness.pipelineCount.toLocaleString()} total</span> },
                  { label: "Curated watchlists", value: freshnessIndicator(freshness.lastWatchlist, 7) },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-[13px]">
                    <span style={{ color: "var(--color-text-secondary)" }}>{item.label}</span>
                    <span className="font-mono text-[12px]">{item.value}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right column (40%) — AI Chat */}
          <div className="lg:w-[40%]">
            <div className="rounded-xl border sticky top-4 flex flex-col" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)", height: "calc(100vh - 220px)" }}>
              {/* Chat header */}
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--color-border-subtle)" }}>
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} style={{ color: "var(--color-accent)" }} />
                  <h2 className="text-sm font-bold">AI Assistant</h2>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedModelId}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                    className="text-[12px] px-2 py-1 rounded-md border outline-none"
                    style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowAddModel(!showAddModel)}
                    className="p-1 rounded-md border hover:opacity-80 transition-opacity"
                    style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)" }}
                  >
                    {showAddModel ? <X size={14} /> : <Plus size={14} />}
                  </button>
                </div>
              </div>

              {/* Add model form */}
              {showAddModel && (
                <div className="px-4 py-3 border-b space-y-2" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-primary)" }}>
                  <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--color-text-tertiary)" }}>Add Model</div>
                  <input placeholder="Name (e.g. GPT-4)" value={newModel.name} onChange={(e) => setNewModel({ ...newModel, name: e.target.value })} className="w-full text-[12px] px-3 py-1.5 rounded-md border outline-none" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)", color: "var(--color-text-primary)" }} />
                  <select value={newModel.provider} onChange={(e) => setNewModel({ ...newModel, provider: e.target.value })} className="w-full text-[12px] px-3 py-1.5 rounded-md border outline-none" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)", color: "var(--color-text-primary)" }}>
                    <option value="deepseek">DeepSeek</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="custom">Custom (OpenAI-compatible)</option>
                  </select>
                  <input placeholder="API Key" type="password" value={newModel.apiKeyDirect} onChange={(e) => setNewModel({ ...newModel, apiKeyDirect: e.target.value })} className="w-full text-[12px] px-3 py-1.5 rounded-md border outline-none" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)", color: "var(--color-text-primary)" }} />
                  <input placeholder="Base URL (e.g. https://api.deepseek.com)" value={newModel.baseUrl} onChange={(e) => setNewModel({ ...newModel, baseUrl: e.target.value })} className="w-full text-[12px] px-3 py-1.5 rounded-md border outline-none" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)", color: "var(--color-text-primary)" }} />
                  <input placeholder="Model ID (e.g. deepseek-chat)" value={newModel.modelId} onChange={(e) => setNewModel({ ...newModel, modelId: e.target.value })} className="w-full text-[12px] px-3 py-1.5 rounded-md border outline-none" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)", color: "var(--color-text-primary)" }} />
                  <button onClick={addModel} className="w-full text-[12px] px-3 py-2 rounded-md font-medium text-white" style={{ background: "var(--color-accent)" }}>Add Model</button>
                </div>
              )}

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center py-12">
                    <MessageSquare size={32} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)" }} />
                    <p className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>Ask the AI assistant about data quality, anomalies, or platform health.</p>
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
                        <div className="text-[10px] mt-1 opacity-60">{msg.model_used}</div>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-xl px-4 py-2.5 border" style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}>
                      <Loader2 className="animate-spin" size={16} style={{ color: "var(--color-accent)" }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <div className="px-4 py-3 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
                    placeholder="Ask about data quality..."
                    className="flex-1 text-[13px] px-4 py-2.5 rounded-lg border outline-none"
                    style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                  />
                  <button
                    onClick={sendChat}
                    disabled={chatLoading || !chatInput.trim()}
                    className="px-4 py-2.5 rounded-lg font-medium text-white disabled:opacity-50 transition-opacity"
                    style={{ background: "var(--color-accent)" }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
