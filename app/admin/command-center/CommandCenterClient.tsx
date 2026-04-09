"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import {
  Play, History, Loader2, X, Zap, FileText, Clock, Rss, Building2,
  ChevronDown, ChevronRight, Newspaper, RefreshCw, DollarSign, CheckCircle2,
  XCircle, AlertCircle, BarChart3, TrendingUp as TrendingUpIcon, TrendingDown, Globe, Search,
  Lightbulb, ArrowRight, Calendar,
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
  // Business metrics
  articlesThisMonth: number;
  articlesLastMonth: number;
  monthOverMonthGrowth: number;
  typeBreakdownThisMonth: Record<string, number>;
  sponsoredCount: number;
  estimatedMonthlyCost: number;
  costPerArticle: number;
  totalArticlesAllTime: number;
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

interface TerminalLine {
  time: string;
  text: string;
  type: "info" | "success" | "error" | "warning" | "dim" | "separator";
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

interface ContentSuggestion {
  type: 'uncovered_funding' | 'trending_topic' | 'stale_content' | 'uncovered_company';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
  data?: any;
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

// Content Calendar: which article types run on which days
// Day indices: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const SCHEDULE_MAP: Record<number, string[]> = {
  0: ["weekly_roundup"], // Sunday
  1: ["breaking_news", "funding_deal", "clinical_trial", "market_analysis"],
  2: ["breaking_news", "funding_deal", "clinical_trial", "market_analysis"],
  3: ["breaking_news", "funding_deal", "clinical_trial", "market_analysis", "company_deep_dive"],
  4: ["breaking_news", "funding_deal", "clinical_trial", "market_analysis"],
  5: ["breaking_news", "funding_deal", "clinical_trial", "market_analysis", "science_essay"],
  6: [],
};

// Quality score color helper
function qualityScoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#ea580c";
  return "#dc2626";
}

// ASCII bar for terminal
function qualityBar(score: number, width: number = 10): string {
  const filled = Math.round((score / 100) * width);
  const half = (score / 100) * width - filled >= 0.5 ? 1 : 0;
  return "\u2588".repeat(filled) + (half ? "\u258C" : "") + " ".repeat(Math.max(0, width - filled - half));
}

interface QualityScoreData {
  overall: number;
  readability: number;
  sourceCoverage: number;
  wordCount: number;
  breakdown: {
    sourceCount: number;
    bannedPhrasesFound: string[];
  };
}

interface CalendarArticle {
  id: string;
  type: string;
  headline: string;
  created_at: string;
}

// ── Client-side quality score calculation ──

const BANNED_PHRASES_CLIENT = [
  "in conclusion", "it is worth noting", "it should be noted", "at the end of the day",
  "only time will tell", "remains to be seen", "game changer", "game-changer",
  "paradigm shift", "synergy", "revolutionary", "groundbreaking", "cutting-edge",
  "unprecedented", "delve", "delving", "tapestry", "moreover", "furthermore",
];

function extractTextFromBody(body: any): string {
  if (!body) return "";
  if (typeof body === "string") return body;
  let text = "";
  function walk(node: any) {
    if (!node) return;
    if (node.type === "text" && node.text) text += node.text + " ";
    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) walk(child);
    }
  }
  walk(body);
  return text.trim();
}

function calculateClientQualityScore(article: { body: any; sources: any[] }): QualityScoreData {
  const text = extractTextFromBody(article.body);
  const words = text.split(/\s+/).filter((w: string) => w.length > 0);
  const wordCount = words.length;
  const sentences = text.split(/[.!?]+/).map((s: string) => s.trim()).filter((s: string) => s.length > 5);
  const avgSentenceLength = sentences.length > 0
    ? sentences.reduce((sum: number, s: string) => sum + s.split(/\s+/).length, 0) / sentences.length
    : 0;

  // Readability
  let readability: number;
  if (avgSentenceLength >= 15 && avgSentenceLength <= 25) readability = 100;
  else if (avgSentenceLength < 15) readability = Math.max(0, 100 - (15 - avgSentenceLength) * 5);
  else readability = Math.max(0, 100 - (avgSentenceLength - 25) * 8);

  // Source coverage
  const sourceCount = article.sources?.length || 0;
  const sourceCoverage = Math.min(sourceCount * 25, 100);

  // Word count score
  let wordCountScore: number;
  if (wordCount >= 300 && wordCount <= 500) wordCountScore = 100;
  else if (wordCount < 200) wordCountScore = Math.round((wordCount / 200) * 60);
  else if (wordCount < 300) wordCountScore = Math.round(60 + ((wordCount - 200) / 100) * 40);
  else if (wordCount <= 800) wordCountScore = 100;
  else wordCountScore = Math.max(50, Math.round(100 - (wordCount - 800) * 0.1));

  // Forward-looking
  const forwardPatterns = [/\bexpect\b/gi, /\blikely\b/gi, /\bcould\b/gi, /\bpotential\b/gi, /\bforecast\b/gi, /\boutlook\b/gi];
  let insightCount = 0;
  for (const p of forwardPatterns) { const m = text.match(p); if (m) insightCount += m.length; }
  const insightScore = Math.min(Math.round((insightCount / 3) * 100), 100);

  // Banned phrases
  const lower = text.toLowerCase();
  const bannedFound = BANNED_PHRASES_CLIENT.filter((p) => lower.includes(p));
  const bannedScore = bannedFound.length === 0 ? 100 : 0;

  const overall = Math.round(
    readability * 0.25 + sourceCoverage * 0.25 + wordCountScore * 0.2 + insightScore * 0.15 + bannedScore * 0.15
  );

  return {
    overall,
    readability: Math.round(readability),
    sourceCoverage,
    wordCount,
    breakdown: { sourceCount, bannedPhrasesFound: bannedFound },
  };
}

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

  // Progress feed (kept for runAllAgents compatibility)
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const progressTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Terminal feed
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [isTerminalRunning, setIsTerminalRunning] = useState(false);
  const terminalIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard shortcuts
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Recent articles
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([]);

  // Quality scores for recent articles (keyed by article id)
  const [qualityScores, setQualityScores] = useState<Record<string, QualityScoreData>>({});

  // Calendar articles (last 14 days)
  const [calendarArticles, setCalendarArticles] = useState<CalendarArticle[]>([]);

  // Content suggestions
  const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Activity section collapsed
  const [activityCollapsed, setActivityCollapsed] = useState(false);

  // EventSource ref for SSE streaming
  const eventSourceRef = useRef<EventSource | null>(null);

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
      const res = await fetch("/api/admin/articles?limit=5&includeBody=true");
      const data = await res.json();
      const articles = (data.articles || []).slice(0, 5);
      setRecentArticles(articles);

      // Calculate quality scores for each article
      const scores: Record<string, QualityScoreData> = {};
      for (const article of articles) {
        if (article.body && article.sources) {
          scores[article.id] = calculateClientQualityScore(article);
        }
      }
      setQualityScores(scores);
    } catch (err) {
      console.error("Failed to fetch recent articles:", err);
    }
  }, []);

  const fetchCalendarArticles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/articles?limit=50");
      const data = await res.json();
      const articles = (data.articles || []).map((a: any) => ({
        id: a.id,
        type: a.type,
        headline: a.headline,
        created_at: a.created_at,
      }));
      setCalendarArticles(articles);
    } catch (err) {
      console.error("Failed to fetch calendar articles:", err);
    }
  }, []);

  const fetchSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    try {
      const res = await fetch("/api/admin/suggestions");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
    }
    setSuggestionsLoading(false);
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
    fetchCalendarArticles();
    fetchSuggestions();
  }, [authLoading, user, fetchStatus, fetchStats, fetchRecentArticles, fetchCalendarArticles, fetchSuggestions]);

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
      if (terminalIntervalRef.current) clearInterval(terminalIntervalRef.current);
    };
  }, []);

  // ── Keyboard Shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or a dialog is open
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (confirmRunAll || showShortcuts || historyAgent) {
        if (e.key === "Escape") {
          setConfirmRunAll(false);
          setShowShortcuts(false);
          setHistoryAgent(null);
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case "g":
          if (!isTerminalRunning) triggerCron("Generate Articles", "/api/cron/generate-news");
          break;
        case "s":
          if (!isTerminalRunning) triggerCron("Scrape News", "/api/cron/scrape-funding");
          break;
        case "p":
          if (!isTerminalRunning) triggerCron("Update Prices", "/api/cron/update-prices");
          break;
        case "a":
          setConfirmRunAll(true);
          break;
        case "escape":
          // Clear terminal if not running
          if (!isTerminalRunning && terminalLines.length > 0) {
            setTerminalLines([]);
          }
          break;
        case "?":
          e.preventDefault();
          setShowShortcuts(true);
          break;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirmRunAll, showShortcuts, historyAgent, isTerminalRunning, terminalLines.length]);

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

  // ── Terminal Helpers ──

  const nowTimestamp = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  };

  const addTerminalLine = useCallback((text: string, type: TerminalLine["type"] = "info") => {
    setTerminalLines((prev) => [...prev, { time: nowTimestamp(), text, type }]);
  }, []);

  const addTerminalLineDelayed = useCallback(
    (text: string, type: TerminalLine["type"], delayMs: number) =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          addTerminalLine(text, type);
          resolve();
        }, delayMs);
      }),
    [addTerminalLine]
  );

  const formatElapsedCompact = (s: number) => {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  // ── SSE Streaming for Article Generation ──

  const triggerGenerateStream = useCallback(() => {
    if (isTerminalRunning) return;
    setIsTerminalRunning(true);

    // Track generated articles for quality report
    const generatedArticles: Array<{ headline: string; type: string; confidence: string; body: any; sources: any[] }> = [];

    const es = new EventSource("/api/admin/generate-stream");
    eventSourceRef.current = es;

    es.addEventListener("log", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        addTerminalLine(data.text, data.type || "info");
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener("article", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        generatedArticles.push({
          headline: data.headline,
          type: data.type,
          confidence: data.confidence,
          body: data.body,
          sources: data.sources || [],
        });
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener("done", (e: MessageEvent) => {
      // Quality report in terminal
      if (generatedArticles.length > 0) {
        addTerminalLine("", "dim");
        addTerminalLine("\u2550\u2550\u2550 Quality Report \u2550\u2550\u2550", "separator");
        let totalScore = 0;
        for (let i = 0; i < generatedArticles.length; i++) {
          const art = generatedArticles[i];
          const score = calculateClientQualityScore({ body: art.body, sources: art.sources });
          totalScore += score.overall;
          const bar = qualityBar(score.overall);
          addTerminalLine(
            `Article ${i + 1}: ${score.overall}/100 ${bar}  (readability: ${score.readability}, sources: ${score.breakdown.sourceCount}, ${score.wordCount} words)`,
            score.overall >= 80 ? "success" : score.overall >= 60 ? "warning" : "error"
          );
        }
        const avg = Math.round(totalScore / generatedArticles.length);
        addTerminalLine(`Average quality: ${avg}/100`, avg >= 80 ? "success" : avg >= 60 ? "warning" : "error");
        addTerminalLine("\u2550".repeat(40), "separator");
      }

      es.close();
      eventSourceRef.current = null;
      setIsTerminalRunning(false);

      // Refresh data
      fetchStats();
      fetchRecentArticles();
      fetchCalendarArticles();
      fetchStatus();
    });

    es.onerror = () => {
      // EventSource error - could be connection loss or stream end
      if (eventSourceRef.current) {
        addTerminalLine("Connection closed", "dim");
        es.close();
        eventSourceRef.current = null;
        setIsTerminalRunning(false);
        fetchStats();
        fetchRecentArticles();
        fetchCalendarArticles();
        fetchStatus();
      }
    };
  }, [isTerminalRunning, addTerminalLine, fetchStats, fetchRecentArticles, fetchCalendarArticles, fetchStatus]);

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // ── Cron Trigger (with terminal output — for non-generate jobs) ──

  const triggerCron = async (label: string, cronPath: string) => {
    if (isTerminalRunning) return;

    // Use SSE streaming for article generation
    const isGenerateNews = cronPath.includes("generate-news");
    if (isGenerateNews) {
      triggerGenerateStream();
      return;
    }

    const startTime = Date.now();
    setIsTerminalRunning(true);

    const jobVerb = cronPath.includes("scrape")
      ? "news scrape"
      : cronPath.includes("prices")
        ? "price update"
        : label.toLowerCase();

    addTerminalLine(`Starting ${jobVerb}...`, "info");

    const fetchLabel = cronPath.includes("scrape")
      ? "\u25CF Fetching RSS feeds..."
      : cronPath.includes("prices")
        ? "\u25CF Fetching market data..."
        : "\u25CF Processing...";
    await addTerminalLineDelayed(fetchLabel, "info", 600);

    let processingCount = 0;
    const processingMessages = ["\u25CF Processing...", "\u25CF Fetching data...", "\u25CF Updating records..."];

    const progressInterval = setInterval(() => {
      const msg = processingMessages[processingCount % processingMessages.length];
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      addTerminalLine(`${msg} (${formatElapsedCompact(elapsed)} elapsed)`, "dim");
      processingCount++;
    }, 5000);
    terminalIntervalRef.current = progressInterval;

    try {
      const res = await fetch("/api/admin/trigger-cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: cronPath }),
      });
      const data: CronResponse = await res.json();

      clearInterval(progressInterval);
      terminalIntervalRef.current = null;

      const elapsed = data.elapsed_seconds ?? Math.round((Date.now() - startTime) / 1000);

      if (data.error) {
        await addTerminalLineDelayed(`\u2717 Error: ${data.error}`, "error", 100);
      } else {
        const msg = data.message || data.summary || "Completed successfully";
        const parts: string[] = [msg];
        if (data.inserted !== undefined) parts.push(`${data.inserted} items processed`);
        if (data.updated !== undefined) parts.push(`${data.updated} updated`);
        await addTerminalLineDelayed(`\u2713 Complete: ${parts.join(" \u00B7 ")} in ${formatElapsedCompact(elapsed)}`, "success", 100);
      }

      fetchStats();
      fetchRecentArticles();
      fetchCalendarArticles();
      fetchStatus();
    } catch (err: any) {
      clearInterval(progressInterval);
      terminalIntervalRef.current = null;
      addTerminalLine(`\u2717 Error: ${err.message}`, "error");
    }

    setIsTerminalRunning(false);
  };

  // ── Render Helpers ──

  const isAnyCronRunning = isTerminalRunning || progressEntries.some((e) => e.status === "running");

  if (authLoading || loading) {
    return (
      <>
        <style>{`@keyframes skeletonPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        <Nav />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "6rem 1rem 2rem" }}>
          <AdminNav />
          {/* Skeleton header */}
          <div style={{ height: 22, width: 180, background: "var(--color-bg-secondary)", borderRadius: 4, marginBottom: 8, animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
          <div style={{ height: 12, width: 260, background: "var(--color-bg-secondary)", borderRadius: 4, marginBottom: 24, animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
          {/* Skeleton stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ background: "var(--color-bg-primary)", border: "1px solid var(--color-border-subtle)", borderRadius: 10, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--color-bg-secondary)", animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
                  <div style={{ height: 12, width: 80, background: "var(--color-bg-secondary)", borderRadius: 4, animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
                </div>
                <div style={{ height: 28, width: 60, background: "var(--color-bg-secondary)", borderRadius: 4, animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
              </div>
            ))}
          </div>
          {/* Skeleton action cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 28 }}>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} style={{ background: "var(--color-bg-primary)", border: "1px solid var(--color-border-subtle)", borderRadius: 10, padding: 20 }}>
                <div style={{ height: 14, width: 140, background: "var(--color-bg-secondary)", borderRadius: 4, marginBottom: 8, animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
                <div style={{ height: 10, width: "80%", background: "var(--color-bg-secondary)", borderRadius: 4, animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
              </div>
            ))}
          </div>
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
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: "var(--color-text-primary)" }}>
              Mission Control
            </h1>
            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: "4px 0 0" }}>
              System Health {overallHealth}% &middot; {agents.length} agents &middot; {agents.filter(a => a.latest_run).length} have run
            </p>
          </div>
          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', monospace" }}>
            Press ? for shortcuts
          </span>
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
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
            Quick Actions
          </h2>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            Trigger jobs manually. Press ? for keyboard shortcuts.
          </p>
        </div>
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
            shortcutKey="G"
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
            shortcutKey="S"
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
            shortcutKey="P"
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
            shortcutKey="A"
          />
        </div>

        {/* ── Terminal Feed ── */}
        <div style={{ marginBottom: 28 }}>
          <TerminalFeed
            lines={terminalLines}
            isRunning={isTerminalRunning}
            onClear={() => setTerminalLines([])}
          />
        </div>

        {/* ── Business Metrics ── */}
        {stats && (
          <BusinessMetrics
            articlesThisMonth={stats.articlesThisMonth ?? 0}
            articlesLastMonth={stats.articlesLastMonth ?? 0}
            monthOverMonthGrowth={stats.monthOverMonthGrowth ?? 0}
            estimatedMonthlyCost={stats.estimatedMonthlyCost ?? 0}
            costPerArticle={stats.costPerArticle ?? 0.03}
            totalArticlesAllTime={stats.totalArticlesAllTime ?? stats.totalArticles ?? 0}
            typeBreakdownThisMonth={stats.typeBreakdownThisMonth ?? {}}
            sponsoredCount={stats.sponsoredCount ?? 0}
            companiesTotal={stats.companiesTotal ?? 0}
          />
        )}

        {/* ── Content Calendar ── */}
        <ContentCalendar articles={calendarArticles} />

        {/* ── Content Opportunities ── */}
        <ContentOpportunities
          suggestions={suggestions}
          loading={suggestionsLoading}
          onRefresh={fetchSuggestions}
        />

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
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0, color: "var(--color-text-primary)" }}>
                  Recent Articles
                </h2>
                <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '2px 0 0' }}>
                  Latest articles from the news engine. Click to edit.
                </p>
              </div>
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

                    {/* Quality score bar */}
                    {qualityScores[article.id] && (
                      <span
                        title={`Quality: ${qualityScores[article.id].overall}/100 | Readability: ${qualityScores[article.id].readability} | Sources: ${qualityScores[article.id].breakdown.sourceCount} | Words: ${qualityScores[article.id].wordCount}${qualityScores[article.id].breakdown.bannedPhrasesFound.length > 0 ? " | Banned: " + qualityScores[article.id].breakdown.bannedPhrasesFound.join(", ") : ""}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          flexShrink: 0,
                        }}
                      >
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: qualityScoreColor(qualityScores[article.id].overall),
                        }}>
                          {qualityScores[article.id].overall}
                        </span>
                        <span style={{
                          display: "inline-block",
                          width: 32,
                          height: 4,
                          borderRadius: 2,
                          background: "var(--color-border-subtle)",
                          overflow: "hidden",
                        }}>
                          <span style={{
                            display: "block",
                            width: `${qualityScores[article.id].overall}%`,
                            height: "100%",
                            background: qualityScoreColor(qualityScores[article.id].overall),
                            borderRadius: 2,
                          }} />
                        </span>
                      </span>
                    )}

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
            <div>
              <span>Agent Activity</span>
              <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: 400, marginLeft: 8 }}>
                {agents.length} agents &middot; System Health {overallHealth}%
              </span>
              <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 400, margin: '2px 0 0' }}>
                Data quality agents run automatically. Click to see details.
              </p>
            </div>
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

      {/* Keyboard Shortcuts Help Overlay */}
      {showShortcuts && (
        <>
          <div
            onClick={() => setShowShortcuts(false)}
            style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 2000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#0a0a0a",
                border: "1px solid #333",
                borderRadius: 12,
                padding: "28px 36px",
                fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', monospace",
                color: "#e2e8f0",
                minWidth: 320,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 20, color: "#4ade80" }}>
                Keyboard Shortcuts
              </div>
              {[
                ["G", "Generate Articles"],
                ["S", "Scrape News"],
                ["P", "Update Prices"],
                ["A", "Run All Agents"],
                ["?", "Show this help"],
                ["Esc", "Close / Dismiss"],
              ].map(([key, desc]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10 }}>
                  <span style={{
                    display: "inline-block",
                    minWidth: 32,
                    textAlign: "center",
                    padding: "3px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    background: "#1a1a1a",
                    border: "1px solid #333",
                    color: "#fbbf24",
                  }}>
                    {key}
                  </span>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>{desc}</span>
                </div>
              ))}
              <div style={{ marginTop: 16, textAlign: "right" }}>
                <button
                  onClick={() => setShowShortcuts(false)}
                  style={{
                    background: "none",
                    border: "1px solid #333",
                    borderRadius: 6,
                    padding: "6px 16px",
                    color: "#64748b",
                    fontSize: 12,
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', monospace",
                    cursor: "pointer",
                  }}
                >
                  Close (Esc)
                </button>
              </div>
            </div>
          </div>
        </>
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
      borderLeft: `2px solid ${accentColor}`,
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
        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.03em" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1 }}>
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
  shortcutKey,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  buttonIcon: React.ReactNode;
  accentColor: string;
  disabled: boolean;
  onClick: () => void;
  shortcutKey?: string;
}) {
  return (
    <div style={{
      position: "relative",
      background: "var(--color-bg-primary)",
      border: "1px solid var(--color-border-subtle)",
      borderRadius: 10,
      padding: 20,
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}>
      {shortcutKey && (
        <span style={{
          position: "absolute",
          top: 8,
          right: 8,
          padding: "2px 6px",
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 600,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', monospace",
          background: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border-subtle)",
          color: "var(--color-text-tertiary)",
          lineHeight: "16px",
        }}>
          {shortcutKey}
        </span>
      )}
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

function TerminalFeed({
  lines,
  isRunning,
  onClear,
}: {
  lines: TerminalLine[];
  isRunning: boolean;
  onClear: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new lines appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines.length]);

  const typeColors: Record<TerminalLine["type"], string> = {
    info: "#e2e8f0",
    success: "#4ade80",
    error: "#f87171",
    warning: "#fbbf24",
    dim: "#64748b",
    separator: "#4ade80",
  };

  return (
    <div style={{
      background: "#0a0a0a",
      border: "1px solid #1a1a1a",
      borderRadius: 10,
      overflow: "hidden",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', monospace",
    }}>
      {/* Title bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 14px",
        borderBottom: "1px solid #1a1a1a",
        background: "#111",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: isRunning ? "#4ade80" : "#64748b",
            boxShadow: isRunning ? "0 0 6px #4ade8060" : "none",
            transition: "all 0.3s",
          }} />
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
            biotechtube@admin:~$
          </span>
        </div>
        {!isRunning && lines.length > 0 && (
          <button
            onClick={onClear}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              padding: "2px 4px",
              fontSize: 12,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', monospace",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Log area */}
      <div
        ref={scrollRef}
        style={{
          maxHeight: 350,
          overflowY: "auto",
          padding: "12px 14px",
          fontSize: 12,
          lineHeight: 1.7,
        }}
      >
        {lines.length === 0 && !isRunning && (
          <div>
            <div style={{ color: "#64748b", marginBottom: 4 }}>
              Ready. Press G to generate articles, S to scrape news, P to update prices.
            </div>
            <div style={{ color: "#64748b" }}>
              Type ? for all shortcuts.
            </div>
            <span style={{
              display: "inline-block",
              width: 8,
              height: 14,
              background: "#64748b",
              marginTop: 4,
              verticalAlign: "middle",
              animation: "terminalBlink 1s step-end infinite",
            }} />
          </div>
        )}
        {lines.map((line, i) => (
          <div key={i} style={{ display: "flex", gap: 8, minHeight: line.text === "" ? 12 : undefined }}>
            <span style={{ color: "#64748b", flexShrink: 0, userSelect: "none" }}>
              [{line.time}]
            </span>
            <span style={{ color: typeColors[line.type] || "#e2e8f0" }}>
              {line.text}
            </span>
          </div>
        ))}
        {/* Blinking cursor when running */}
        {isRunning && (
          <span style={{
            display: "inline-block",
            width: 8,
            height: 14,
            background: "#4ade80",
            marginLeft: lines.length > 0 ? 0 : 0,
            verticalAlign: "middle",
            animation: "terminalBlink 1s step-end infinite",
          }} />
        )}
      </div>

      <style>{`
        @keyframes terminalBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function BusinessMetrics({
  articlesThisMonth,
  articlesLastMonth,
  monthOverMonthGrowth,
  estimatedMonthlyCost,
  costPerArticle,
  totalArticlesAllTime,
  typeBreakdownThisMonth,
  sponsoredCount,
  companiesTotal,
}: {
  articlesThisMonth: number;
  articlesLastMonth: number;
  monthOverMonthGrowth: number;
  estimatedMonthlyCost: number;
  costPerArticle: number;
  totalArticlesAllTime: number;
  typeBreakdownThisMonth: Record<string, number>;
  sponsoredCount: number;
  companiesTotal: number;
}) {
  const growthPositive = monthOverMonthGrowth >= 0;
  const maxTypeCount = Math.max(...Object.values(typeBreakdownThisMonth), 1);
  const sortedTypes = Object.entries(typeBreakdownThisMonth).sort(([, a], [, b]) => b - a);

  return (
    <div style={{
      background: "var(--color-bg-primary)",
      border: "1px solid var(--color-border-subtle)",
      borderRadius: 10,
      padding: 20,
      marginBottom: 28,
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
          <BarChart3 size={16} style={{ color: "var(--color-text-tertiary)" }} />
          Business Metrics
        </h2>
        <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '2px 0 0' }}>
          Monthly article output and estimated costs at $0.03/article.
        </p>
      </div>

      {/* Metric cards row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {/* This Month */}
        <div style={{ border: "1px solid var(--color-border-subtle)", borderRadius: 8, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 6, fontWeight: 500 }}>This Month</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1 }}>{articlesThisMonth}</div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>last month: {articlesLastMonth}</div>
        </div>

        {/* MoM Growth */}
        <div style={{ border: "1px solid var(--color-border-subtle)", borderRadius: 8, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 6, fontWeight: 500 }}>MoM Growth</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: growthPositive ? "#22c55e" : "#ef4444", lineHeight: 1, display: "flex", alignItems: "center", gap: 4 }}>
            {growthPositive ? "+" : ""}{monthOverMonthGrowth}%
            {growthPositive ? <TrendingUpIcon size={18} style={{ color: "#22c55e" }} /> : <TrendingDown size={18} style={{ color: "#ef4444" }} />}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>vs last month</div>
        </div>

        {/* Monthly Cost */}
        <div style={{ border: "1px solid var(--color-border-subtle)", borderRadius: 8, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 6, fontWeight: 500 }}>Monthly Cost</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1 }}>${estimatedMonthlyCost.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>${costPerArticle.toFixed(2)}/article</div>
        </div>

        {/* SEO Pages */}
        <div style={{ border: "1px solid var(--color-border-subtle)", borderRadius: 8, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 6, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
            <Globe size={12} /> SEO Pages
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1 }}>{totalArticlesAllTime}</div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>indexed pages</div>
        </div>
      </div>

      {/* Type Breakdown bar chart */}
      {sortedTypes.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 10 }}>Type Breakdown</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sortedTypes.map(([type, count]) => {
              const cfg = TYPE_CONFIG[type];
              const barColor = cfg?.color || "#6b7280";
              const label = cfg?.label || type.replace(/_/g, " ");
              const widthPct = Math.max((count / maxTypeCount) * 100, 4);
              return (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary)", width: 90, textAlign: "right", flexShrink: 0 }}>{label}</span>
                  <div style={{ flex: 1, height: 18, background: "var(--color-bg-secondary)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${widthPct}%`, background: barColor, borderRadius: 4, transition: "width 0.3s ease", opacity: 0.8 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", width: 32, textAlign: "right", flexShrink: 0 }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Potential Revenue callout */}
      <div style={{ background: "var(--color-bg-secondary)", borderRadius: 8, padding: "14px 16px", border: "1px dashed var(--color-border-subtle)" }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4 }}>Potential Revenue</div>
        <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{companiesTotal.toLocaleString()}+ companies x Sponsored profiles</div>
        <div style={{ fontSize: 12, color: sponsoredCount > 0 ? "#22c55e" : "var(--color-text-tertiary)", marginTop: 4 }}>
          {sponsoredCount > 0 ? `${sponsoredCount} sponsored article${sponsoredCount !== 1 ? "s" : ""} active` : "0 sponsored (start selling!)"}
        </div>
      </div>
    </div>
  );
}

// ── Content Calendar ──

function ContentCalendar({ articles }: { articles: CalendarArticle[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build 7-day week starting from Monday
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }

  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Group articles by date string
  const articlesByDate: Record<string, CalendarArticle[]> = {};
  for (const article of articles) {
    const dateKey = article.created_at.slice(0, 10);
    if (!articlesByDate[dateKey]) articlesByDate[dateKey] = [];
    articlesByDate[dateKey].push(article);
  }

  // Check if a date is the 1st or 15th (for innovation spotlight)
  const isBimonthly = (d: Date) => d.getDate() === 1 || d.getDate() === 15;

  return (
    <div style={{
      background: "var(--color-bg-primary)",
      border: "1px solid var(--color-border-subtle)",
      borderRadius: 10,
      padding: 20,
      marginBottom: 28,
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={16} style={{ color: "var(--color-text-tertiary)" }} />
          <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0, color: "var(--color-text-primary)" }}>
            Content Calendar
          </h2>
          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Week of {monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '2px 0 0' }}>
          Scheduled article types by day of week. Dots show what was generated.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {days.map((day, i) => {
          const dateKey = day.toISOString().slice(0, 10);
          const isToday = dateKey === today.toISOString().slice(0, 10);
          const isFuture = day > today;
          const dow = day.getDay();
          const scheduledTypes = [...(SCHEDULE_MAP[dow] || [])];
          if (isBimonthly(day)) scheduledTypes.push("innovation_spotlight");
          const dayArticles = articlesByDate[dateKey] || [];

          return (
            <div
              key={dateKey}
              style={{
                background: isToday ? "var(--color-bg-secondary)" : "transparent",
                border: isToday ? "1px solid var(--color-accent)" : "1px solid var(--color-border-subtle)",
                borderRadius: 8,
                padding: "10px 8px",
                minHeight: 90,
                opacity: isFuture ? 0.6 : 1,
              }}
            >
              {/* Day header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: isToday ? "var(--color-accent)" : "var(--color-text-tertiary)",
                }}>
                  {DAY_NAMES[i]}
                </span>
                <span style={{
                  fontSize: 13,
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                }}>
                  {day.getDate()}
                </span>
              </div>

              {/* Scheduled types (pills) */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 6 }}>
                {scheduledTypes.map((type) => {
                  const generated = dayArticles.some((a) => a.type === type);
                  const cfg = TYPE_CONFIG[type];
                  return (
                    <span
                      key={type}
                      title={`${cfg?.label || type}${generated ? " (generated)" : isFuture ? " (scheduled)" : " (missed)"}`}
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: generated ? (cfg?.color || "#6b7280") : "transparent",
                        border: `1.5px solid ${cfg?.color || "#6b7280"}`,
                        opacity: generated ? 1 : 0.35,
                      }}
                    />
                  );
                })}
              </div>

              {/* Article count */}
              {dayArticles.length > 0 && (
                <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                  {dayArticles.length} article{dayArticles.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--color-border-subtle)" }}>
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: cfg.color,
            }} />
            <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentOpportunities({
  suggestions,
  loading,
  onRefresh,
}: {
  suggestions: ContentSuggestion[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const priorityConfig = {
    high: { color: "#ef4444", dot: "\u{1F534}", bg: "#ef444410", border: "#ef444430" },
    medium: { color: "#eab308", dot: "\u{1F7E1}", bg: "#eab30810", border: "#eab30830" },
    low: { color: "#22c55e", dot: "\u{1F7E2}", bg: "#22c55e10", border: "#22c55e30" },
  };

  const typeIcons: Record<string, React.ReactNode> = {
    uncovered_funding: <DollarSign size={14} />,
    trending_topic: <TrendingUpIcon size={14} />,
    stale_content: <Clock size={14} />,
    uncovered_company: <Building2 size={14} />,
  };

  return (
    <div style={{
      background: "var(--color-bg-primary)",
      border: "1px solid var(--color-border-subtle)",
      borderRadius: 10,
      padding: 20,
      marginBottom: 28,
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <Lightbulb size={16} style={{ color: "#eab308" }} />
            Content Opportunities
          </h2>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '2px 0 0' }}>
            AI-detected gaps in coverage. Click actions to fill them.
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            background: "transparent",
            border: "1px solid var(--color-border-subtle)",
            borderRadius: 5,
            color: "var(--color-text-tertiary)",
            fontSize: 11,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Refresh
        </button>
      </div>

      {loading && suggestions.length === 0 ? (
        <div style={{ textAlign: "center", padding: 30, color: "var(--color-text-tertiary)", fontSize: 12 }}>
          <Loader2 size={20} className="animate-spin" style={{ display: "inline-block", marginBottom: 8 }} />
          <div>Analyzing content gaps...</div>
        </div>
      ) : suggestions.length === 0 ? (
        <div style={{ textAlign: "center", padding: 30, color: "var(--color-text-tertiary)", fontSize: 13 }}>
          No opportunities — you are on top of everything!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {suggestions.map((s, i) => {
            const cfg = priorityConfig[s.priority];
            return (
              <div
                key={i}
                style={{
                  padding: "14px 16px",
                  borderRadius: 8,
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "start", gap: 10 }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: `${cfg.color}20`,
                    color: cfg.color,
                    flexShrink: 0,
                    marginTop: 1,
                  }}>
                    {typeIcons[s.type] || <Lightbulb size={14} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        color: cfg.color,
                      }}>
                        {s.priority}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
                        {s.title}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                      {s.description}
                    </div>
                  </div>
                  {s.action && (
                    <button
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "6px 12px",
                        background: "var(--color-text-primary)",
                        border: "none",
                        borderRadius: 5,
                        color: "var(--color-bg-primary)",
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {s.action}
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
