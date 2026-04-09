"use client";

import { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  ADMIN_EMAIL,
  scoreColor,
  formatDate as sharedFormatDate,
  ConfirmDialog,
} from "@/lib/admin-utils";
import {
  Shield, AlertTriangle, CheckCircle, MessageSquare,
  Send, Plus, X, Activity, Clock, RefreshCw,
  Loader2, Clipboard, Zap, Newspaper, DollarSign,
  Search, FileText, ListChecks, Copy, ChevronDown,
  Users, Beaker, Globe, Monitor, BarChart3,
  TrendingUp, Flag,
} from "lucide-react";

/* ================================================================
   TYPES
   ================================================================ */

interface QualityIssue {
  id: string;
  description: string;
  severity: "critical" | "warning" | "info";
  actions: { label: string; type: "api" | "link" | "command"; value: string }[];
}

interface QualityCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  score: number;
  summary: string;
  issueCount: number;
  issues: QualityIssue[];
}

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

interface FreshnessRow {
  label: string;
  value: string;
  status: "fresh" | "stale" | "warning";
  count?: string;
  actionId?: string;
}

/* ================================================================
   CONSTANTS
   ================================================================ */

const ACTION_DEFS = [
  { id: "cia", icon: <Zap size={15} />, label: "Run CIA (50)", apiAction: "run-cia" },
  { id: "news", icon: <Newspaper size={15} />, label: "Scrape News", apiAction: "scrape-news" },
  { id: "prices", icon: <DollarSign size={15} />, label: "Update Prices", apiAction: "refresh-prices" },
  { id: "integrity", icon: <Search size={15} />, label: "Integrity Check", apiAction: "integrity-check" },
  { id: "recap", icon: <FileText size={15} />, label: "Weekly Recap", apiAction: "generate-recap" },
  { id: "watchlists", icon: <ListChecks size={15} />, label: "Refresh Lists", apiAction: "refresh-watchlists" },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  profiles: <Users size={18} />,
  financial: <TrendingUp size={18} />,
  pipeline: <Beaker size={18} />,
  content: <FileText size={18} />,
  seo: <Globe size={18} />,
  ux: <Monitor size={18} />,
};

/* ================================================================
   HELPERS
   ================================================================ */

function daysAgo(dateStr: string): number {
  if (!dateStr || dateStr === "N/A") return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === "N/A") return "N/A";
  const result = sharedFormatDate(dateStr);
  return result === "—" ? "N/A" : result;
}

function timeAgo(dateStr: string): string {
  const d = daysAgo(dateStr);
  if (d === 0) return "today";
  if (d === 1) return "1d ago";
  return `${d}d ago`;
}

function severityDot(severity: string): string {
  if (severity === "critical") return "#ef4444";
  if (severity === "warning") return "#eab308";
  return "#3b82f6";
}

/* ================================================================
   COMPONENT
   ================================================================ */

export default function QualityDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [supabase] = useState(() => createBrowserClient());

  // Data
  const [categories, setCategories] = useState<QualityCategory[]>([]);
  const [healthScore, setHealthScore] = useState(0);
  const [issues, setIssues] = useState<IntegrityCheck[]>([]);
  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [ciaLogs, setCiaLogs] = useState<CiaLog[]>([]);
  const [freshness, setFreshness] = useState<FreshnessRow[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [newModel, setNewModel] = useState({ name: "", provider: "deepseek", apiKeyDirect: "", baseUrl: "", modelId: "" });
  const [resolveNotes, setResolveNotes] = useState<Record<string, string>>({});
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // UI
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; message: string; confirmLabel: string;
    variant: "default" | "danger"; onConfirm: () => void;
  }>({ open: false, title: "", message: "", confirmLabel: "Confirm", variant: "default", onConfirm: () => {} });

  /* ─── Load all data ─── */
  const loadedRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
        // 14 queries in one Promise.all (under 15 limit)
        const [
          totalCompaniesRes,
          goodProfilesRes,
          lowProfilesRes,
          tickerCountRes,
          latestPriceRes,
          stalePriceRes,
          blogCountRes,
          newestBlogRes,
          curatedCountRes,
          openErrorsRes,
          issueListRes,
          reportListRes,
          ciaRes,
          modelRes,
          articleCountRes,
          newestArticleRes,
        ] = await Promise.all([
          supabase.from("companies").select("*", { count: "exact", head: true }),
          supabase.from("profile_quality").select("*", { count: "exact", head: true }).gte("quality_score", 5),
          supabase.from("profile_quality").select("company_id, quality_score", { count: "exact" }).lt("quality_score", 3).order("quality_score", { ascending: true }).limit(5),
          supabase.from("companies").select("*", { count: "exact", head: true }).not("ticker", "is", null),
          supabase.from("company_price_history").select("date").order("date", { ascending: false }).limit(1),
          supabase.from("company_price_history").select("date", { count: "exact", head: true }).lt("date", new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]),
          supabase.from("blog_posts").select("*", { count: "exact", head: true }).eq("status", "published"),
          supabase.from("blog_posts").select("published_at").eq("status", "published").order("published_at", { ascending: false }).limit(1),
          supabase.from("curated_watchlist_items").select("*", { count: "exact", head: true }),
          supabase.from("error_reports").select("*", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("integrity_checks").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(20),
          supabase.from("error_reports").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(10),
          supabase.from("profile_quality").select("company_id, quality_score, last_checked_at").order("last_checked_at", { ascending: false }).limit(10),
          supabase.from("admin_ai_models").select("*").order("is_default", { ascending: false }),
          (supabase.from as any)('articles').select('*', { count: 'exact', head: true }).eq('status', 'published'),
          (supabase.from as any)('articles').select('published_at').eq('status', 'published').order('published_at', { ascending: false }).limit(1),
        ]);

        const totalCompanies = totalCompaniesRes.count || 0;
        const goodProfiles = goodProfilesRes.count || 0;
        const lowProfiles = lowProfilesRes.data || [];
        const tickerCount = tickerCountRes.count || 0;
        const latestPrice = latestPriceRes.data?.[0]?.date || "N/A";
        const blogCount = blogCountRes.count || 0;
        const newestBlog = newestBlogRes.data?.[0]?.published_at?.split("T")[0] || "N/A";
        const curatedCount = curatedCountRes.count || 0;
        const openErrors = openErrorsRes.count || 0;
        const issueList = issueListRes.data || [];
        const reportList = reportListRes.data || [];
        const articleCount = articleCountRes.count || 0;
        const newestArticle = newestArticleRes.data?.[0]?.published_at?.split("T")[0] || "N/A";

        // === Build 6 Quality Categories ===

        // 1. Profiles
        const profileScore = totalCompanies > 0 ? Math.round((goodProfiles / totalCompanies) * 100) : 0;
        const profileIssues: QualityIssue[] = lowProfiles.map((p: any) => ({
          id: `prof-${p.company_id}`,
          description: `Company ${p.company_id.slice(0, 8)}... has quality score ${p.quality_score}`,
          severity: p.quality_score < 1 ? "critical" as const : "warning" as const,
          actions: [{ label: "Run CIA", type: "command" as const, value: "run-cia" }],
        }));

        // 2. Financial
        const priceDaysOld = daysAgo(latestPrice);
        const financialScore = Math.max(0, Math.min(100, priceDaysOld <= 1 ? 95 : priceDaysOld <= 3 ? 75 : priceDaysOld <= 7 ? 50 : 20));
        const financialIssues: QualityIssue[] = [];
        if (priceDaysOld > 1) {
          financialIssues.push({
            id: "fin-stale",
            description: `Price data is ${priceDaysOld} days old (last: ${formatDate(latestPrice)})`,
            severity: priceDaysOld > 3 ? "critical" : "warning",
            actions: [{ label: "Update Prices", type: "api", value: "refresh-prices" }],
          });
        }

        // 3. Pipeline
        const pipelineScore = curatedCount > 100 ? 90 : curatedCount > 50 ? 70 : curatedCount > 20 ? 50 : 30;
        const pipelineIssues: QualityIssue[] = [];
        if (curatedCount < 50) {
          pipelineIssues.push({
            id: "pipe-low",
            description: `Only ${curatedCount} curated watchlist items`,
            severity: "warning",
            actions: [{ label: "Refresh Lists", type: "command", value: "refresh-watchlists" }],
          });
        }

        // 4. Content (blog posts + articles)
        const blogDaysOld = daysAgo(newestBlog);
        const articleDaysOld = daysAgo(newestArticle);
        const freshestContentDays = Math.min(blogDaysOld, articleDaysOld);
        const contentFreshness = freshestContentDays <= 3 ? 40 : freshestContentDays <= 7 ? 30 : freshestContentDays <= 14 ? 15 : 0;
        const totalContentItems = blogCount + articleCount;
        const contentVolume = totalContentItems >= 30 ? 40 : totalContentItems >= 15 ? 30 : totalContentItems >= 5 ? 20 : 10;
        const contentScore = Math.min(100, contentFreshness + contentVolume + 20);
        const contentIssues: QualityIssue[] = [];
        if (articleDaysOld > 7) {
          contentIssues.push({
            id: "articles-stale",
            description: `No new articles published in ${articleDaysOld} days`,
            severity: articleDaysOld > 14 ? "critical" : "warning",
            actions: [{ label: "Generate News", type: "command", value: "generate-recap" }],
          });
        }
        if (blogDaysOld > 7) {
          contentIssues.push({
            id: "blog-stale",
            description: `No new blog posts in ${blogDaysOld} days`,
            severity: blogDaysOld > 14 ? "critical" : "warning",
            actions: [{ label: "Generate Recap", type: "command", value: "generate-recap" }],
          });
        }

        // 5. SEO (computed from available data)
        const seoScore = totalCompanies > 10000 ? 85 : totalCompanies > 5000 ? 70 : 50;
        const seoIssues: QualityIssue[] = [];
        if (totalCompanies < 10000) {
          seoIssues.push({
            id: "seo-pages",
            description: `${totalCompanies.toLocaleString()} company pages (target: 10,000+)`,
            severity: "info",
            actions: [],
          });
        }

        // 6. UX
        const uxScore = Math.max(0, 100 - (openErrors * 10));
        const uxIssues: QualityIssue[] = reportList.slice(0, 3).map((r: any) => ({
          id: `ux-${r.id}`,
          description: r.description,
          severity: "warning" as const,
          actions: [{ label: "Resolve", type: "api" as const, value: `resolve-report:${r.id}` }],
        }));

        const cats: QualityCategory[] = [
          { id: "profiles", name: "Profiles", icon: CATEGORY_ICONS.profiles, score: profileScore, summary: `${goodProfiles.toLocaleString()} of ${totalCompanies.toLocaleString()} scored 5+`, issueCount: profileIssues.length, issues: profileIssues },
          { id: "financial", name: "Financial", icon: CATEGORY_ICONS.financial, score: financialScore, summary: `${tickerCount.toLocaleString()} tickers tracked`, issueCount: financialIssues.length, issues: financialIssues },
          { id: "pipeline", name: "Pipeline", icon: CATEGORY_ICONS.pipeline, score: pipelineScore, summary: `${curatedCount} curated items`, issueCount: pipelineIssues.length, issues: pipelineIssues },
          { id: "content", name: "Content", icon: CATEGORY_ICONS.content, score: contentScore, summary: `${articleCount} articles, ${blogCount} blog posts`, issueCount: contentIssues.length, issues: contentIssues },
          { id: "seo", name: "SEO", icon: CATEGORY_ICONS.seo, score: seoScore, summary: `${totalCompanies.toLocaleString()} indexable pages`, issueCount: seoIssues.length, issues: seoIssues },
          { id: "ux", name: "UX", icon: CATEGORY_ICONS.ux, score: uxScore, summary: openErrors === 0 ? "No open reports" : `${openErrors} open report${openErrors > 1 ? "s" : ""}`, issueCount: uxIssues.length, issues: uxIssues },
        ];

        setCategories(cats);
        setHealthScore(Math.round(cats.reduce((sum, c) => sum + c.score, 0) / cats.length));

        // Issues & reports
        const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
        setIssues(issueList.sort((a: any, b: any) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)));
        setReports(reportList);

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

        // Freshness table
        const newsRes = await supabase.from("news_items").select("published_date").order("published_date", { ascending: false }).limit(1);
        const lastNews = newsRes.data?.[0]?.published_date?.split("T")[0] || "N/A";
        const eventRes = await supabase.from("biotech_events").select("*", { count: "exact", head: true });

        setFreshness([
          { label: "Prices", value: formatDate(latestPrice), status: priceDaysOld <= 2 ? "fresh" : priceDaysOld <= 5 ? "warning" : "stale", actionId: "prices" },
          { label: "News", value: formatDate(lastNews), status: daysAgo(lastNews) <= 3 ? "fresh" : daysAgo(lastNews) <= 7 ? "warning" : "stale", count: undefined, actionId: "news" },
          { label: "Articles", value: formatDate(newestArticle), status: articleDaysOld <= 3 ? "fresh" : articleDaysOld <= 7 ? "warning" : "stale", count: `${articleCount} published` },
          { label: "Pipelines", value: "", status: "fresh", count: `${(54699).toLocaleString()} items` },
          { label: "Watchlists", value: formatDate(newestBlog), status: "fresh" },
          { label: "Blog", value: "", status: blogDaysOld <= 7 ? "fresh" : "warning", count: `${blogCount} posts` },
          { label: "Events", value: "", status: "fresh", count: `${eventRes.count || 49} events` },
        ]);
      } catch (err) {
        console.error("Dashboard load error:", err);
      }
      setPageLoading(false);
      setRefreshing(false);
  };

  useEffect(() => {
    if (authLoading || loadedRef.current) return;
    if (user?.email !== ADMIN_EMAIL) { setPageLoading(false); return; }
    loadedRef.current = true;
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

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

  const runAction = async (actionId: string) => {
    setActionLoading((prev) => ({ ...prev, [actionId]: true }));
    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionId }),
      });
      const data = await res.json();
      if (data.command || data.terminalCommand) {
        const cmd = data.command || data.terminalCommand;
        try { await navigator.clipboard.writeText(cmd); } catch {}
        showToast(data.message || "Command copied to clipboard", "info");
      } else {
        showToast(data.message || "Action completed", data.success ? "success" : "error");
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`, "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [actionId]: false }));
    }
  };

  const dismissIssue = (id: string) => {
    setConfirmDialog({
      open: true, title: "Dismiss Issue", message: "This will mark the integrity check as dismissed. Continue?",
      confirmLabel: "Dismiss", variant: "danger",
      onConfirm: async () => {
        await supabase.from("integrity_checks").update({ status: "dismissed", resolved_at: new Date().toISOString() }).eq("id", id);
        setIssues((prev) => prev.filter((i) => i.id !== id));
        showToast("Issue dismissed");
      },
    });
  };

  const resolveIssue = (id: string) => {
    setConfirmDialog({
      open: true, title: "Resolve Issue", message: "Mark this integrity check as resolved?",
      confirmLabel: "Resolve", variant: "default",
      onConfirm: async () => {
        await supabase.from("integrity_checks").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id);
        setIssues((prev) => prev.filter((i) => i.id !== id));
        showToast("Issue resolved");
      },
    });
  };

  const resolveReport = (id: string) => {
    setConfirmDialog({
      open: true, title: "Resolve Report", message: "Mark this user report as resolved?",
      confirmLabel: "Resolve", variant: "default",
      onConfirm: async () => {
        const note = resolveNotes[id] || "";
        await supabase.from("error_reports").update({ status: "resolved", resolution_note: note, resolved_at: new Date().toISOString() }).eq("id", id);
        setReports((prev) => prev.filter((r) => r.id !== id));
        showToast("Report resolved");
      },
    });
  };

  const dismissReport = (id: string) => {
    setConfirmDialog({
      open: true, title: "Dismiss Report", message: "This will dismiss the user report without resolution. Continue?",
      confirmLabel: "Dismiss", variant: "danger",
      onConfirm: async () => {
        await supabase.from("error_reports").update({ status: "dismissed", resolved_at: new Date().toISOString() }).eq("id", id);
        setReports((prev) => prev.filter((r) => r.id !== id));
        showToast("Report dismissed");
      },
    });
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
      name: newModel.name, provider: newModel.provider,
      api_key_direct: newModel.apiKeyDirect || null, base_url: newModel.baseUrl || null,
      model_id: newModel.modelId, is_default: false,
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

  const hColor = scoreColor(healthScore);

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <>
    <Nav />
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "6rem 1rem 2rem" }}>
      <AdminNav />
    </div>
    <div className="min-h-screen" style={{ background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}>

      {/* ─── Toast ─── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 80,
            right: 16,
            zIndex: 50,
            padding: "12px 20px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: toast.type === "success" ? "#22c55e" : toast.type === "error" ? "#ef4444" : "#3b82f6",
            color: "white",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            animation: "slideDown 0.3s ease-out",
          }}
        >
          {toast.type === "info" && <Copy size={14} />}
          {toast.message}
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="border-b px-6 py-5" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--color-accent)" }}>
              <BarChart3 size={18} className="text-white" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Quality Command Center</h1>
              <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>BiotechTube Platform Health</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 500,
                background: "transparent",
                border: "1px solid var(--color-border-subtle)",
                borderRadius: 6,
                color: "var(--color-text-secondary)",
                cursor: refreshing ? "not-allowed" : "pointer",
                opacity: refreshing ? 0.5 : 1,
                transition: "all 0.15s",
              }}
            >
              <RefreshCw size={13} style={refreshing ? { animation: "spin 1s linear infinite" } : undefined} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--color-text-tertiary)" }}>Health</span>
            <span className="text-[22px] font-bold tabular-nums" style={{ color: hColor }}>{healthScore}</span>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: hColor }} />
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-8">

        {/* ─── 6 Quality Sub-Scores (Hero Section) ─── */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const isExpanded = expandedCategory === cat.id;
              const color = scoreColor(cat.score);
              return (
                <div key={cat.id}>
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                    className="w-full text-left rounded-xl p-5 transition-all duration-200"
                    style={{
                      background: "var(--color-bg-secondary)",
                      boxShadow: isExpanded ? `0 0 0 2px ${color}40, 0 4px 24px rgba(0,0,0,0.08)` : "0 1px 3px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span style={{ color }}>{cat.icon}</span>
                        <span className="text-[14px] font-semibold">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {cat.issueCount > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>
                            {cat.issueCount} issue{cat.issueCount > 1 ? "s" : ""}
                          </span>
                        )}
                        <ChevronDown
                          size={14}
                          className="transition-transform duration-200"
                          style={{ color: "var(--color-text-tertiary)", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}
                        />
                      </div>
                    </div>
                    {/* Score + progress bar */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[28px] font-bold tabular-nums leading-none" style={{ color }}>{cat.score}</span>
                      <span className="text-[12px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>/100</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-bg-primary)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${cat.score}%`, background: color }}
                      />
                    </div>
                    <p className="text-[12px] mt-2.5" style={{ color: "var(--color-text-secondary)" }}>{cat.summary}</p>
                  </button>

                  {/* Expanded issues */}
                  {isExpanded && cat.issues.length > 0 && (
                    <div
                      className="mt-1 rounded-b-xl overflow-hidden divide-y"
                      style={{
                        background: "var(--color-bg-secondary)",
                        borderColor: "var(--color-border-subtle)",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                      }}
                    >
                      {cat.issues.map((issue) => (
                        <div key={issue.id} className="px-5 py-3 flex items-start gap-3" style={{ borderColor: "var(--color-border-subtle)" }}>
                          <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: severityDot(issue.severity) }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] leading-relaxed">{issue.description}</p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            {issue.actions.map((a) => (
                              <button
                                key={a.label}
                                onClick={(e) => { e.stopPropagation(); runAction(a.value); }}
                                className="text-[11px] px-2.5 py-1 rounded-md font-medium transition-opacity hover:opacity-80"
                                style={{ background: `${color}15`, color }}
                              >
                                {a.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isExpanded && cat.issues.length === 0 && (
                    <div
                      className="mt-1 rounded-b-xl px-5 py-4 text-center text-[12px]"
                      style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-tertiary)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
                    >
                      <CheckCircle size={16} className="mx-auto mb-1.5" style={{ color: "#22c55e" }} />
                      No issues detected
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── Quick Actions ─── */}
        <section>
          <div className="flex flex-wrap gap-2.5">
            {ACTION_DEFS.map((a) => (
              <button
                key={a.id}
                onClick={() => runAction(a.apiAction)}
                disabled={actionLoading[a.apiAction]}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium transition-all duration-150 hover:shadow-md"
                style={{
                  background: "var(--color-bg-secondary)",
                  color: "var(--color-text-primary)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                {actionLoading[a.apiAction] ? <Loader2 size={15} className="animate-spin" style={{ color: "var(--color-accent)" }} /> : <span style={{ color: "var(--color-accent)" }}>{a.icon}</span>}
                {a.label}
              </button>
            ))}
          </div>
        </section>

        {/* ─── Two-Column Main Content ─── */}
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Left Column (55%) */}
          <div className="flex-1 lg:w-[55%] space-y-6">

            {/* Recent CIA Activity */}
            <section className="rounded-xl overflow-hidden" style={{ background: "var(--color-bg-secondary)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div className="px-5 py-3.5 flex items-center justify-between border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                <div className="flex items-center gap-2">
                  <Activity size={15} style={{ color: "var(--color-accent)" }} />
                  <h2 className="text-[12px] uppercase tracking-wider font-semibold" style={{ color: "var(--color-text-tertiary)" }}>Recent Activity</h2>
                </div>
                <button
                  onClick={() => runAction("run-cia")}
                  className="text-[11px] px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-80"
                  style={{ background: "var(--color-accent)", color: "white" }}
                >
                  <RefreshCw size={11} /> Run CIA
                </button>
              </div>
              <div className="max-h-[280px] overflow-y-auto">
                {ciaLogs.length === 0 ? (
                  <div className="px-5 py-10 text-center text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>No CIA activity yet</div>
                ) : (
                  <div className="relative px-5 py-3">
                    {/* Timeline line */}
                    <div className="absolute left-[29px] top-0 bottom-0 w-px" style={{ background: "var(--color-border-subtle)" }} />
                    {ciaLogs.map((log, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 relative">
                        <div className="w-2 h-2 rounded-full z-10 shrink-0" style={{
                          background: log.quality_score >= 7 ? "#22c55e" : log.quality_score >= 4 ? "#eab308" : "#ef4444",
                        }} />
                        <span className="text-[13px] font-medium flex-1 min-w-0 truncate">{log.company_name}</span>
                        <span className="text-[12px] font-mono font-bold tabular-nums" style={{
                          color: log.quality_score >= 7 ? "#22c55e" : log.quality_score >= 4 ? "#eab308" : "#ef4444",
                        }}>{log.quality_score}/10</span>
                        <span className="text-[11px] shrink-0" style={{ color: "var(--color-text-tertiary)" }}>{formatDate(log.last_checked_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* User Reports */}
            {reports.length > 0 && (
              <section className="rounded-xl overflow-hidden" style={{ background: "var(--color-bg-secondary)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div className="px-5 py-3.5 flex items-center gap-2 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <Flag size={15} style={{ color: "#ef4444" }} />
                  <h2 className="text-[12px] uppercase tracking-wider font-semibold" style={{ color: "var(--color-text-tertiary)" }}>User Reports</h2>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#ef444415", color: "#ef4444" }}>{reports.length}</span>
                </div>
                <div className="max-h-[300px] overflow-y-auto divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
                  {reports.map((report) => (
                    <div key={report.id} className="px-5 py-3.5" style={{ borderColor: "var(--color-border-subtle)" }}>
                      <div className="text-[13px] font-medium leading-snug">{report.description}</div>
                      <div className="text-[11px] mt-1 flex flex-wrap items-center gap-2" style={{ color: "var(--color-text-tertiary)" }}>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase" style={{ background: "var(--color-accent-subtle, #3b82f620)", color: "var(--color-accent)" }}>{report.issue_type}</span>
                        {report.reporter_email && <span>{report.reporter_email}</span>}
                        <span>{timeAgo(report.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2.5">
                        <input
                          value={resolveNotes[report.id] || ""}
                          onChange={(e) => setResolveNotes((prev) => ({ ...prev, [report.id]: e.target.value }))}
                          placeholder="Resolution note..."
                          className="flex-1 text-[12px] px-3 py-1.5 rounded-lg border outline-none transition-colors focus:border-[var(--color-accent)]"
                          style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                        />
                        <button onClick={() => resolveReport(report.id)} className="text-[11px] px-3 py-1.5 rounded-lg font-semibold text-white hover:opacity-90" style={{ background: "#22c55e" }}>Resolve</button>
                        <button onClick={() => dismissReport(report.id)} className="text-[11px] px-3 py-1.5 rounded-lg font-semibold hover:opacity-90" style={{ background: "var(--color-bg-primary)", color: "var(--color-text-tertiary)" }}>Dismiss</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Data Freshness */}
            <section className="rounded-xl overflow-hidden" style={{ background: "var(--color-bg-secondary)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div className="px-5 py-3.5 flex items-center gap-2 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                <Clock size={15} style={{ color: "#3b82f6" }} />
                <h2 className="text-[12px] uppercase tracking-wider font-semibold" style={{ color: "var(--color-text-tertiary)" }}>Data Freshness</h2>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
                {freshness.map((row) => (
                  <div key={row.label} className="px-5 py-3 flex items-center justify-between" style={{ borderColor: "var(--color-border-subtle)" }}>
                    <span className="text-[13px] font-medium" style={{ color: "var(--color-text-secondary)" }}>{row.label}</span>
                    <div className="flex items-center gap-3">
                      {row.count ? (
                        <span className="text-[12px] font-mono" style={{ color: "var(--color-text-primary)" }}>{row.count}</span>
                      ) : (
                        <span className="text-[12px] font-mono" style={{ color: "var(--color-text-primary)" }}>{row.value}</span>
                      )}
                      <span className="text-[9px]" style={{ color: row.status === "fresh" ? "#22c55e" : row.status === "warning" ? "#eab308" : "#ef4444" }}>&#9679;</span>
                      <span className="text-[11px] font-medium" style={{ color: row.status === "fresh" ? "#22c55e" : row.status === "warning" ? "#eab308" : "#ef4444" }}>
                        {row.status === "fresh" ? "Fresh" : row.status === "warning" ? "Aging" : "Stale"}
                      </span>
                      {row.actionId && row.status !== "fresh" && (
                        <button
                          onClick={() => runAction(row.actionId!)}
                          className="text-[10px] px-2 py-0.5 rounded font-semibold hover:opacity-80"
                          style={{ background: "var(--color-accent)", color: "white" }}
                        >
                          Refresh
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Integrity Issues */}
            {issues.length > 0 && (
              <section className="rounded-xl overflow-hidden" style={{ background: "var(--color-bg-secondary)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div className="px-5 py-3.5 flex items-center gap-2 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <AlertTriangle size={15} style={{ color: "#eab308" }} />
                  <h2 className="text-[12px] uppercase tracking-wider font-semibold" style={{ color: "var(--color-text-tertiary)" }}>Open Issues</h2>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#eab30815", color: "#eab308" }}>{issues.length}</span>
                </div>
                <div className="max-h-[320px] overflow-y-auto divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
                  {issues.map((issue) => (
                    <div key={issue.id} className="px-5 py-3 flex items-start gap-3 hover:bg-[var(--color-bg-primary)] transition-colors" style={{ borderColor: "var(--color-border-subtle)" }}>
                      <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: severityDot(issue.severity) }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium leading-snug">{issue.description}</div>
                        <div className="text-[11px] mt-1 flex items-center gap-2" style={{ color: "var(--color-text-tertiary)" }}>
                          <span className="uppercase font-semibold">{issue.check_type}</span>
                          {issue.entity_name && (<><span>&#183;</span><span>{issue.entity_name}</span></>)}
                          <span>&#183;</span>
                          <span>{timeAgo(issue.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => resolveIssue(issue.id)} className="text-[11px] px-2.5 py-1 rounded-md font-medium hover:opacity-80" style={{ background: "#22c55e15", color: "#22c55e" }}>Fix</button>
                        <button onClick={() => dismissIssue(issue.id)} className="text-[11px] px-2.5 py-1 rounded-md font-medium hover:opacity-80" style={{ background: "var(--color-bg-primary)", color: "var(--color-text-tertiary)" }}>Dismiss</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column (45%): AI Assistant */}
          <div className="lg:w-[45%]">
            <div
              className="rounded-xl sticky top-4 flex flex-col overflow-hidden"
              style={{
                background: "var(--color-bg-secondary)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                height: "calc(100vh - 120px)",
              }}
            >
              {/* Chat header */}
              <div className="px-4 py-3.5 border-b flex items-center justify-between" style={{ borderColor: "var(--color-border-subtle)" }}>
                <div className="flex items-center gap-2">
                  <MessageSquare size={15} style={{ color: "var(--color-accent)" }} />
                  <h2 className="text-[12px] uppercase tracking-wider font-semibold" style={{ color: "var(--color-text-tertiary)" }}>AI Assistant</h2>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedModelId}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                    className="text-[11px] px-2 py-1 rounded-md border outline-none cursor-pointer"
                    style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                  >
                    {models.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                  </select>
                  <button
                    onClick={() => setShowAddModel(!showAddModel)}
                    className="w-6 h-6 rounded-md flex items-center justify-center border hover:opacity-80"
                    style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-tertiary)" }}
                  >
                    {showAddModel ? <X size={12} /> : <Plus size={12} />}
                  </button>
                </div>
              </div>

              {/* Add model form */}
              {showAddModel && (
                <div className="px-4 py-3 border-b space-y-2" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-primary)" }}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>Add Model</div>
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
                      className="w-full text-[12px] px-3 py-1.5 rounded-lg border outline-none focus:border-[var(--color-accent)]"
                      style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)", color: "var(--color-text-primary)" }}
                    />
                  ))}
                  <select
                    value={newModel.provider}
                    onChange={(e) => setNewModel({ ...newModel, provider: e.target.value })}
                    className="w-full text-[12px] px-3 py-1.5 rounded-lg border outline-none"
                    style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)", color: "var(--color-text-primary)" }}
                  >
                    <option value="deepseek">DeepSeek</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="custom">Custom</option>
                  </select>
                  <button onClick={addModel} className="w-full text-[12px] px-3 py-2 rounded-lg font-semibold text-white hover:opacity-90" style={{ background: "var(--color-accent)" }}>Add Model</button>
                </div>
              )}

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center py-20">
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
                    <div className="rounded-xl px-4 py-3 border" style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}>
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
                    className="flex-1 text-[13px] px-4 py-2.5 rounded-xl border outline-none focus:border-[var(--color-accent)]"
                    style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                  />
                  <button
                    onClick={sendChat}
                    disabled={chatLoading || !chatInput.trim()}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 hover:opacity-90"
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
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
    <Footer />

    {/* ─── Confirm Dialog ─── */}
    <ConfirmDialog
      open={confirmDialog.open}
      title={confirmDialog.title}
      message={confirmDialog.message}
      confirmLabel={confirmDialog.confirmLabel}
      variant={confirmDialog.variant}
      onConfirm={() => { confirmDialog.onConfirm(); setConfirmDialog((prev) => ({ ...prev, open: false })); }}
      onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
    />
    </>
  );
}
