"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { SimilarCompanies } from "@/components/SimilarCompanies";
import { Company, CompanyReport, FundingRound } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";
import {
  Calendar, ExternalLink, TrendingUp, Users,
  FlaskConical, Activity, BarChart3, ArrowUpRight,
  ArrowDownRight, Globe, Mail, Phone, MapPin, Building2,
  Target, ShieldAlert, Swords, Sparkles, BookOpen, Beaker,
  ChevronRight, ChevronDown, Award, Zap, CircleDot, FileText, Shield,
  ScrollText, TestTubes, Pill, ShieldCheck, Newspaper, Hash, DollarSign
} from "lucide-react";
import { TvStockChart } from "@/components/charts/TvStockChart";
import { TvAreaChart } from "@/components/charts/TvAreaChart";
import { WatchlistButton } from "@/components/WatchlistButton";
import { createBrowserClient } from "@/lib/supabase";
import { PipelineWatchButton } from "@/components/PipelineWatchButton";

/* ─── Types for enriched data ─── */
interface PipelineRow {
  id: string;
  slug: string | null;
  product_name: string;
  indication: string;
  stage: string;
  nct_id: string | null;
  trial_status: string | null;
  conditions: string | null;
  start_date: string | null;
  completion_date: string | null;
}

interface DbFundingRound {
  id: string;
  round_type: string;
  amount_usd: number | null;
  lead_investor: string | null;
  announced_date: string | null;
  source_name: string | null;
}

interface FdaApproval {
  id: string;
  drug_name: string;
  active_ingredient: string | null;
  application_number: string | null;
  application_type: string | null;
  approval_date: string | null;
  dosage_form: string | null;
  route: string | null;
}

interface PublicationRow {
  id: string;
  pmid: string | null;
  title: string;
  journal: string | null;
  publication_date: string | null;
  authors: string | null;
}

interface PatentRow {
  id: string;
  patent_number: string | null;
  title: string;
  filing_date: string | null;
  grant_date: string | null;
  abstract: string | null;
}

interface PricePoint {
  date: string;
  close: number;
  adj_close: number | null;
  volume: number | null;
  market_cap_usd: number | null;
}

/* ─── Tab config ─── */
type Tab = "Overview" | "Pipeline" | "Funding" | "FDA" | "Publications" | "Patents" | "Report";

/* ─── Stock timescales ─── */
const priceTimescales = ["1M", "3M", "6M", "1Y", "3Y", "5Y", "Max"] as const;
type PriceTimescale = (typeof priceTimescales)[number];

/* ─── Date formatter ─── */
function fmtDate(d: string | null | undefined): string {
  if (!d) return "\u2014";
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

/* ─── Stage ordering for pipeline sort ─── */
const stageOrder: Record<string, number> = {
  "Approved": 0,
  "Phase 3": 1,
  "Phase 2/3": 2,
  "Phase 2": 3,
  "Phase 1/2": 4,
  "Phase 1": 5,
  "Pre-clinical": 6,
  "Preclinical": 6,
  "Discovery": 7,
};

/* ─── Stage badge colors (dark-mode safe) ─── */
const stageColors: Record<string, { bg: string; text: string; border: string; darkBg: string; darkText: string; darkBorder: string }> = {
  "Approved":    { bg: "#fef9c3", text: "#854d0e", border: "#fbbf24", darkBg: "rgba(251,191,36,0.15)", darkText: "#fbbf24", darkBorder: "rgba(251,191,36,0.3)" },
  "Phase 3":     { bg: "#dcfce7", text: "#166534", border: "#86efac", darkBg: "rgba(34,197,94,0.15)", darkText: "#4ade80", darkBorder: "rgba(34,197,94,0.3)" },
  "Phase 2/3":   { bg: "#dcfce7", text: "#166534", border: "#86efac", darkBg: "rgba(34,197,94,0.15)", darkText: "#4ade80", darkBorder: "rgba(34,197,94,0.3)" },
  "Phase 2":     { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd", darkBg: "rgba(59,130,246,0.15)", darkText: "#60a5fa", darkBorder: "rgba(59,130,246,0.3)" },
  "Phase 1/2":   { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd", darkBg: "rgba(59,130,246,0.15)", darkText: "#60a5fa", darkBorder: "rgba(59,130,246,0.3)" },
  "Phase 1":     { bg: "#fef3c7", text: "#92400e", border: "#fcd34d", darkBg: "rgba(252,211,77,0.15)", darkText: "#fcd34d", darkBorder: "rgba(252,211,77,0.3)" },
  "Pre-clinical": { bg: "var(--color-bg-tertiary)", text: "var(--color-text-secondary)", border: "var(--color-border-medium)", darkBg: "var(--color-bg-tertiary)", darkText: "var(--color-text-secondary)", darkBorder: "var(--color-border-medium)" },
  "Preclinical":  { bg: "var(--color-bg-tertiary)", text: "var(--color-text-secondary)", border: "var(--color-border-medium)", darkBg: "var(--color-bg-tertiary)", darkText: "var(--color-text-secondary)", darkBorder: "var(--color-border-medium)" },
  "Discovery":    { bg: "var(--color-bg-tertiary)", text: "var(--color-text-secondary)", border: "var(--color-border-medium)", darkBg: "var(--color-bg-tertiary)", darkText: "var(--color-text-secondary)", darkBorder: "var(--color-border-medium)" },
};

/* ─── Round type badge colors ─── */
const roundColors: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  "Seed":     { bg: "#fff7ed", text: "#c2410c", darkBg: "rgba(234,88,12,0.15)", darkText: "#fb923c" },
  "Series A": { bg: "#f3e8ff", text: "#7c3aed", darkBg: "rgba(139,92,246,0.15)", darkText: "#a78bfa" },
  "Series B": { bg: "#dbeafe", text: "#1d4ed8", darkBg: "rgba(59,130,246,0.15)", darkText: "#60a5fa" },
  "Series C": { bg: "#dcfce7", text: "#166534", darkBg: "rgba(34,197,94,0.15)", darkText: "#4ade80" },
  "Series D": { bg: "#fce7f3", text: "#be185d", darkBg: "rgba(236,72,153,0.15)", darkText: "#f472b6" },
  "IPO":      { bg: "#dcfce7", text: "#166534", darkBg: "rgba(34,197,94,0.15)", darkText: "#4ade80" },
  "Grant":    { bg: "#fff7ed", text: "#c2410c", darkBg: "rgba(234,88,12,0.15)", darkText: "#fb923c" },
};

/* ─── useDarkMode hook ─── */
function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/* ─── Section Card (polished) ─── */
function SectionCard({ icon, title, children, accent = false, count, className = "" }: {
  icon: React.ReactNode; title: string; children: React.ReactNode; accent?: boolean; count?: number; className?: string;
}) {
  return (
    <div
      className={`rounded-xl border overflow-hidden mb-6 transition-shadow duration-200 hover:shadow-sm ${className}`}
      style={{
        borderColor: accent ? "var(--color-accent)" : "var(--color-border-subtle)",
        borderWidth: accent ? "1.5px" : "1px",
        background: "var(--color-bg-primary)",
      }}
    >
      <div
        className="flex items-center gap-2.5 px-5 py-3 border-b"
        style={{
          background: accent ? "var(--color-accent-subtle)" : "var(--color-bg-secondary)",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        {icon}
        <h3
          className="text-[11px] uppercase tracking-[0.8px] font-semibold flex-1"
          style={{ color: accent ? "var(--color-accent)" : "var(--color-text-secondary)" }}
        >
          {title}
        </h3>
        {count !== undefined && count > 0 && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-tertiary)" }}
          >
            {count}
          </span>
        )}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

/* ─── Quick Stat Card (dashboard style) ─── */
function QuickStatCard({ label, value, subValue, icon, accent = false }: {
  label: string; value: string; subValue?: string; icon?: React.ReactNode; accent?: boolean;
}) {
  return (
    <div
      className="rounded-xl border px-4 py-3.5 transition-all duration-200 hover:shadow-sm"
      style={{
        background: "var(--color-bg-primary)",
        borderColor: accent ? "var(--color-accent)" : "var(--color-border-subtle)",
        borderWidth: accent ? "1.5px" : "1px",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon && <span style={{ color: "var(--color-text-tertiary)" }}>{icon}</span>}
        <span className="text-[10px] uppercase tracking-[0.6px] font-semibold" style={{ color: "var(--color-text-tertiary)" }}>
          {label}
        </span>
      </div>
      <div className="text-[20px] font-semibold tracking-tight" style={{ color: accent ? "var(--color-accent)" : "var(--color-text-primary)", letterSpacing: "-0.3px" }}>
        {value}
      </div>
      {subValue && (
        <div className="text-[11px] mt-0.5 font-medium" style={{ color: "var(--color-text-tertiary)" }}>
          {subValue}
        </div>
      )}
    </div>
  );
}

/* ─── Stage Badge ─── */
function StageBadge({ stage }: { stage: string }) {
  const isDark = useIsDark();
  const c = stageColors[stage] || stageColors["Discovery"];
  return (
    <span
      className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap inline-flex items-center gap-1"
      style={{
        background: isDark ? c.darkBg : c.bg,
        color: isDark ? c.darkText : c.text,
        borderColor: isDark ? c.darkBorder : c.border,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: isDark ? c.darkText : c.text }} />
      {stage}
    </span>
  );
}

/* ─── Round Badge ─── */
function RoundBadge({ type }: { type: string }) {
  const isDark = useIsDark();
  const c = roundColors[type] || roundColors["Grant"];
  return (
    <span
      className="text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap"
      style={{
        background: isDark ? c.darkBg : c.bg,
        color: isDark ? c.darkText : c.text,
      }}
    >
      {type}
    </span>
  );
}

/* ─── Sidebar Info Row ─── */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 py-2 border-b last:border-0" style={{ borderColor: "var(--color-border-subtle)" }}>
      <span className="flex-shrink-0" style={{ color: "var(--color-text-tertiary)" }}>{icon}</span>
      <span className="text-[12px] flex-1" style={{ color: "var(--color-text-tertiary)" }}>{label}</span>
      <span className="text-[12px] font-medium text-right max-w-[140px] truncate" style={{ color: "var(--color-text-primary)" }}>{value}</span>
    </div>
  );
}

/* ─── Sector type ─── */
interface CompanySector {
  sector_id: string;
  is_primary: boolean;
  confidence: number | null;
  sectors: { id: string; name: string; slug: string } | null;
}

/* ─── Claimed company types ─── */
interface ClaimedTeamMember {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  display_order: number;
}

interface ClaimedNewsItem {
  id: string;
  title: string;
  content: string | null;
  published_at: string;
}

/* ─── Props ─── */
interface CompanyPageProps {
  company: Company;
  companyId: string | null;
  companyFunding: FundingRound[];
  similar: Company[];
  report: CompanyReport | null;
  sectors: CompanySector[];
  pipelines: PipelineRow[];
  dbFundingRounds: DbFundingRound[];
  fdaApprovals: FdaApproval[];
  publications: PublicationRow[];
  patents: PatentRow[];
  priceHistory: PricePoint[];
  isClaimed?: boolean;
  claimPlan?: string | null;
  teamMembers?: ClaimedTeamMember[];
  companyNews?: ClaimedNewsItem[];
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export function CompanyPageClient({
  company,
  companyId,
  companyFunding,
  similar,
  report: initialReport,
  sectors,
  pipelines,
  dbFundingRounds,
  fdaApprovals,
  publications,
  patents,
  priceHistory,
  isClaimed = false,
  claimPlan,
  teamMembers = [],
  companyNews = [],
}: CompanyPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [priceTimescale, setPriceTimescale] = useState<PriceTimescale>("1Y");
  const [showAllPipeline, setShowAllPipeline] = useState(false);
  const [showAllPubs, setShowAllPubs] = useState(false);
  const [showAllPatents, setShowAllPatents] = useState(false);

  // On-demand report generation state
  const [report, setReport] = useState<CompanyReport | null>(initialReport);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Track profile view
  useEffect(() => {
    if (companyId) {
      const supabase = createBrowserClient();
      const source = typeof window !== 'undefined' && document.referrer
        ? (document.referrer.includes('google') ? 'search' :
           document.referrer.includes(window.location.host) ? 'internal' : 'referral')
        : 'direct';
      supabase.from('profile_views').insert({ company_id: companyId, source }).then(() => {});
    }
  }, [companyId]);

  const isPublic = company.type === "Public" && !!company.ticker;

  // Determine visible tabs based on available data
  const tabs = useMemo(() => {
    const visible: Tab[] = ["Overview"];
    if (pipelines.length > 0) visible.push("Pipeline");
    if (dbFundingRounds.length > 0 || companyFunding.length > 0) visible.push("Funding");
    if (fdaApprovals.length > 0) visible.push("FDA");
    if (publications.length > 0) visible.push("Publications");
    if (patents.length > 0) visible.push("Patents");
    visible.push("Report");
    return visible;
  }, [pipelines, dbFundingRounds, companyFunding, fdaApprovals, publications, patents]);

  // Generate report on-demand
  const generateReport = useCallback(async () => {
    if (reportLoading) return;
    setReportLoading(true);
    setReportError(null);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: company.slug }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate report");
      }
      const data = await res.json();
      if (data.report) {
        setReport(data.report as CompanyReport);
      }
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setReportLoading(false);
    }
  }, [reportLoading, company.slug]);

  // Auto-generate report on page load if none exists
  useEffect(() => {
    if (!report?.deep_report && !reportLoading && !reportError) {
      generateReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = useCallback(async (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "Report" && !report?.deep_report && !reportLoading) {
      generateReport();
    }
  }, [report, reportLoading, generateReport]);

  // --- Stock data from Yahoo (existing API) ---
  const [stockData, setStockData] = useState<{ date: string; price: number; volume: number }[]>([]);
  const [stockMeta, setStockMeta] = useState<{ currency: string; marketCap: number | null } | null>(null);
  const [stockLoading, setStockLoading] = useState(false);

  const fetchStockData = useCallback(async () => {
    if (!isPublic || !company.ticker) return;
    setStockLoading(true);
    try {
      const exchange = report?.exchange || "";
      const res = await fetch(`/api/stock?ticker=${encodeURIComponent(company.ticker)}&exchange=${encodeURIComponent(exchange)}&name=${encodeURIComponent(company.name)}&timescale=ALL`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setStockData((data.points || []).map((d: { isoDate?: string; fullDate: string; price: number; volume: number }) => ({
        date: d.isoDate || d.fullDate,
        price: d.price,
        volume: d.volume,
      })));
      setStockMeta({
        currency: data.currency || "USD",
        marketCap: data.marketCap ?? null,
      });
    } catch {
      setStockData([]);
    } finally {
      setStockLoading(false);
    }
  }, [isPublic, company.ticker, company.name, report?.exchange]);

  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

  // --- Price history chart data (from DB) with time filtering ---
  const chartData = useMemo(() => {
    if (priceHistory.length === 0 && stockData.length === 0) return [];

    let source: { time: string; value: number }[];
    if (priceHistory.length > 0) {
      source = priceHistory.map(p => ({ time: p.date, value: p.close }));
    } else {
      source = stockData.map(d => ({ time: d.date, value: d.price }));
    }

    if (priceTimescale === "Max") return source;
    const now = new Date();
    const months: Record<string, number> = { "1M": 1, "3M": 3, "6M": 6, "1Y": 12, "3Y": 36, "5Y": 60 };
    const m = months[priceTimescale] || 0;
    const cutoff = new Date(now.getFullYear(), now.getMonth() - m, now.getDate());
    return source.filter(d => new Date(d.time) >= cutoff);
  }, [priceHistory, stockData, priceTimescale]);

  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
  const firstPrice = chartData.length > 0 ? chartData[0].value : 0;
  const priceChange = currentPrice - firstPrice;
  const priceChangePct = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;
  const currency = stockMeta?.currency || "USD";
  const latestMarketCap = priceHistory.length > 0
    ? priceHistory[priceHistory.length - 1].market_cap_usd
    : stockMeta?.marketCap ?? company.valuation ?? null;

  // --- Pipeline sorted by stage ---
  const sortedPipelines = useMemo(() => {
    return [...pipelines].sort((a, b) => {
      const aOrder = stageOrder[a.stage] ?? 99;
      const bOrder = stageOrder[b.stage] ?? 99;
      return aOrder - bOrder;
    });
  }, [pipelines]);

  const phase3Count = pipelines.filter(p => p.stage === "Phase 3" || p.stage === "Phase 2/3").length;

  // Derive stage dynamically based on actual data
  const derivedStage = useMemo(() => {
    if (fdaApprovals.length > 0) return "Approved";
    if (pipelines.some(p => p.stage === "Phase 3" || p.stage === "Phase 2/3")) return "Phase 3";
    if (pipelines.some(p => p.stage === "Phase 2" || p.stage === "Phase 1/2")) return "Phase 2";
    if (pipelines.some(p => p.stage === "Phase 1")) return "Phase 1";
    return company.stage;
  }, [fdaApprovals, pipelines, company.stage]);

  // --- Total funding raised ---
  const totalFundingRaised = useMemo(() => {
    return dbFundingRounds.reduce((sum, r) => sum + (r.amount_usd || 0), 0);
  }, [dbFundingRounds]);

  // --- Summary text ---
  const summaryText = report?.summary || company.description;

  // Tab icon map
  const tabIcons: Record<Tab, React.ReactNode> = {
    Overview: <BarChart3 size={13} />,
    Pipeline: <FlaskConical size={13} />,
    Funding: <TrendingUp size={13} />,
    FDA: <Shield size={13} />,
    Publications: <FileText size={13} />,
    Patents: <ScrollText size={13} />,
    Report: <Sparkles size={13} />,
  };

  return (
    <div className="page-content min-h-screen" style={{ background: "var(--color-bg-primary)" }}>
      <Nav />

      {/* ═══ HERO HEADER ═══ */}
      <header
        className="border-b"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        {/* Top section with gradient accent line */}
        <div
          className="h-1"
          style={{ background: "linear-gradient(90deg, var(--color-accent), var(--color-accent-light))" }}
        />

        <div className="max-w-[1400px] mx-auto px-6 pt-6 pb-5">
          {/* Company identity row */}
          <div className="flex items-start gap-5">
            <div className="flex-shrink-0">
              <CompanyAvatar name={company.name} logoUrl={company.logoUrl} website={company.website} size={56} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1
                  className="text-[26px] font-bold tracking-tight leading-tight"
                  style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
                >
                  {company.name}
                </h1>
                {isClaimed && (
                  <span
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 text-white"
                    style={{ background: "var(--color-accent)" }}
                    title="Verified company profile"
                  >
                    <ShieldCheck size={10} />
                    Verified
                  </span>
                )}
                {company.ticker && (
                  <span
                    className="text-[12px] font-bold px-2.5 py-1 rounded-md font-mono"
                    style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-secondary)" }}
                  >
                    {company.ticker}
                  </span>
                )}
                <StageBadge stage={derivedStage} />
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                {company.city && company.country && (
                  <span className="text-[13px] flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                    <MapPin size={13} style={{ color: "var(--color-text-tertiary)" }} />
                    {company.city}, {company.country}
                  </span>
                )}
                {company.founded > 0 && (
                  <span className="text-[13px] flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                    <Calendar size={13} style={{ color: "var(--color-text-tertiary)" }} />
                    Founded {company.founded}
                  </span>
                )}
                {(report?.employee_estimate || (company.employees && company.employees !== "0")) && (
                  <span className="text-[13px] flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                    <Users size={13} style={{ color: "var(--color-text-tertiary)" }} />
                    {report?.employee_estimate || company.employees} employees
                  </span>
                )}
                {company.website && (
                  <a
                    href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] flex items-center gap-1.5 transition-opacity hover:opacity-80"
                    style={{ color: "var(--color-accent)" }}
                  >
                    <Globe size={13} />
                    {company.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>

              {/* Description */}
              {summaryText && (
                <p
                  className="text-[13px] mt-3 line-clamp-2 max-w-3xl"
                  style={{ color: "var(--color-text-secondary)", lineHeight: 1.7 }}
                >
                  {summaryText}
                </p>
              )}
            </div>

            {/* Watchlist button - right aligned */}
            <div className="flex-shrink-0 pt-1">
              {companyId && <WatchlistButton companyId={companyId} showLabel />}
            </div>
          </div>

          {/* ─── Quick Stats Cards ─── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <QuickStatCard
              label="Market Cap"
              value={latestMarketCap && latestMarketCap > 0 ? formatCurrency(latestMarketCap) : (isPublic ? "N/A" : "Private")}
              subValue={isPublic && chartData.length > 0 ? `${priceChangePct >= 0 ? "+" : ""}${priceChangePct.toFixed(1)}% period` : undefined}
              icon={<DollarSign size={12} />}
              accent
            />
            <QuickStatCard
              label="Pipeline"
              value={pipelines.length > 0 ? String(pipelines.length) : "\u2014"}
              subValue={phase3Count > 0 ? `${phase3Count} in Phase 3` : (pipelines.length > 0 ? "drug candidates" : undefined)}
              icon={<FlaskConical size={12} />}
            />
            <QuickStatCard
              label="Patents"
              value={patents.length > 0 ? String(patents.length) : "\u2014"}
              subValue={patents.length > 0 ? "granted" : undefined}
              icon={<ScrollText size={12} />}
            />
            <QuickStatCard
              label="Publications"
              value={publications.length > 0 ? String(publications.length) : "\u2014"}
              subValue={publications.length > 0 ? "indexed" : undefined}
              icon={<FileText size={12} />}
            />
          </div>
        </div>
      </header>

      {/* ─── Tab Navigation ─── */}
      <div
        className="sticky top-0 z-20 border-b"
        style={{
          borderColor: "var(--color-border-subtle)",
          background: "var(--color-bg-primary)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          className="max-w-[1400px] mx-auto flex items-center gap-0.5 px-6 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className="text-[13px] py-3 px-3.5 transition-all duration-200 border-b-[2px] whitespace-nowrap flex-shrink-0 flex items-center gap-1.5"
              style={{
                color: activeTab === tab ? "var(--color-accent)" : "var(--color-text-secondary)",
                borderBottomColor: activeTab === tab ? "var(--color-accent)" : "transparent",
                fontWeight: activeTab === tab ? 600 : 400,
              }}
            >
              <span style={{ opacity: activeTab === tab ? 1 : 0.5 }}>{tabIcons[tab]}</span>
              {tab}
              {tab === "Pipeline" && pipelines.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5" style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-tertiary)" }}>
                  {pipelines.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Two Column Layout ─── */}
      <div className="max-w-[1400px] mx-auto flex flex-col lg:grid" style={{ gridTemplateColumns: "1fr 320px" }}>
        {/* ═══ Main Content ═══ */}
        <div className="px-6 py-6 min-w-0 lg:border-r" style={{ borderColor: "var(--color-border-subtle)" }}>

          {/* ════════════ OVERVIEW TAB ════════════ */}
          {activeTab === "Overview" && (
            <>
              {/* Report generating banner */}
              {reportLoading && !report?.deep_report && (
                <div
                  className="mb-6 flex items-center gap-3 px-5 py-3.5 rounded-xl border"
                  style={{ borderColor: "rgba(26,122,94,0.2)", background: "var(--color-accent-subtle)" }}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
                    style={{ borderColor: "var(--color-border-subtle)", borderTopColor: "var(--color-accent)" }}
                  />
                  <p className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
                    Generating AI intelligence report for {company.name}...
                  </p>
                </div>
              )}

              {/* ─── Stock Chart ─── */}
              {isPublic && (chartData.length > 0 || stockLoading) && (
                <SectionCard
                  icon={<Activity size={14} style={{ color: "var(--color-accent)" }} />}
                  title={`${company.ticker} \u00b7 Stock Price`}
                  accent
                >
                  <div className="mb-3">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span
                        className="text-[32px] font-bold tracking-tight"
                        style={{ color: "var(--color-text-primary)", letterSpacing: "-0.8px" }}
                      >
                        {currency} {currentPrice.toFixed(2)}
                      </span>
                      <span
                        className="flex items-center gap-0.5 text-[14px] font-semibold px-2 py-0.5 rounded-md"
                        style={{
                          color: priceChange >= 0 ? "#16a34a" : "#dc2626",
                          background: priceChange >= 0 ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
                        }}
                      >
                        {priceChange >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        {priceChange >= 0 ? "+" : ""}{Math.abs(priceChange).toFixed(2)} ({priceChange >= 0 ? "+" : ""}{priceChangePct.toFixed(2)}%)
                      </span>
                    </div>
                    {/* Timescale buttons */}
                    <div className="flex items-center gap-1 mt-3">
                      {priceTimescales.map((ts) => (
                        <button
                          key={ts}
                          onClick={() => setPriceTimescale(ts)}
                          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-md transition-all duration-150"
                          style={{
                            background: priceTimescale === ts ? "var(--color-accent)" : "var(--color-bg-tertiary)",
                            color: priceTimescale === ts ? "white" : "var(--color-text-tertiary)",
                          }}
                        >
                          {ts}
                        </button>
                      ))}
                    </div>
                  </div>
                  {priceHistory.length > 0 ? (
                    <TvAreaChart
                      data={chartData}
                      height={380}
                      isPositive={priceChange >= 0}
                      formatValue={(v) => `${currency} ${v.toFixed(2)}`}
                      tooltipTitle="Price"
                    />
                  ) : stockData.length > 0 ? (
                    <TvStockChart
                      data={stockData}
                      isPositive={priceChange >= 0}
                      logScale={false}
                      currency={currency}
                      height={380}
                    />
                  ) : null}
                  <p className="text-[10px] mt-3 flex items-center gap-1" style={{ color: "var(--color-text-tertiary)" }}>
                    <span className="live-dot" />
                    {priceHistory.length > 0 ? "Historical price data" : "Data from Yahoo Finance \u00b7 15 min delay"}
                  </p>
                </SectionCard>
              )}

              {/* Private company banner instead of stock chart */}
              {!isPublic && (
                <div
                  className="mb-6 rounded-xl border px-5 py-4 flex items-center gap-4"
                  style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--color-accent-subtle)" }}>
                    <Building2 size={18} style={{ color: "var(--color-accent)" }} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Private Company</p>
                    <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
                      {totalFundingRaised > 0
                        ? `Total funding raised: ${formatCurrency(totalFundingRaised)}`
                        : company.totalRaised > 0
                        ? `Estimated funding: ${formatCurrency(company.totalRaised)}`
                        : "Funding information not available"}
                    </p>
                  </div>
                </div>
              )}

              {/* ─── About Section ─── */}
              {summaryText && (
                <SectionCard
                  icon={<Sparkles size={14} style={{ color: "var(--color-accent)" }} />}
                  title={report?.summary ? "AI Company Overview" : "About"}
                  accent={!!report?.summary}
                >
                  <p
                    className="text-[13.5px]"
                    style={{ color: "var(--color-text-secondary)", lineHeight: 1.8 }}
                  >
                    {summaryText}
                  </p>

                  {/* Therapeutic areas / categories as pills */}
                  {(report?.therapeutic_areas && report.therapeutic_areas.length > 0) || (company.focus && company.focus.length > 0) ? (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
                      {(report?.therapeutic_areas || company.focus || []).map((area) => (
                        <span
                          key={area}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-full border"
                          style={{
                            borderColor: "var(--color-border-subtle)",
                            color: "var(--color-accent)",
                            background: "var(--color-accent-subtle)",
                          }}
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <button
                    onClick={() => handleTabChange("Report")}
                    className="mt-4 flex items-center gap-1.5 text-[12px] font-semibold px-4 py-2 rounded-lg transition-all duration-150 hover:opacity-90"
                    style={{ color: "white", background: "var(--color-accent)" }}
                  >
                    <BookOpen size={13} />
                    {report?.deep_report ? "Read full AI report" : "Generate AI report"}
                    <ChevronRight size={13} />
                  </button>
                </SectionCard>
              )}

              {/* ─── Technology Platform ─── */}
              {report?.technology_platform && (
                <SectionCard icon={<Beaker size={14} style={{ color: "var(--color-accent)" }} />} title="Technology Platform">
                  <p className="text-[13px]" style={{ color: "var(--color-text-secondary)", lineHeight: 1.75 }}>{report.technology_platform}</p>
                </SectionCard>
              )}

              {/* ─── Pipeline Snapshot ─── */}
              {sortedPipelines.length > 0 && (
                <SectionCard
                  icon={<FlaskConical size={14} style={{ color: "var(--color-accent)" }} />}
                  title="Pipeline"
                  count={pipelines.length}
                >
                  <div className="flex items-center gap-4 mb-4 pb-3 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                    <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
                      <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{pipelines.length}</span> drug{pipelines.length !== 1 ? "s" : ""} in pipeline
                    </span>
                    {phase3Count > 0 && (
                      <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
                        <span className="font-semibold" style={{ color: "var(--color-accent)" }}>{phase3Count}</span> in Phase 3
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto -mx-5">
                    <table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "var(--color-bg-tertiary)" }}>
                          <th className="text-left px-5 py-2.5 font-semibold text-[10px] uppercase tracking-[0.6px]" style={{ color: "var(--color-text-secondary)" }}>Drug</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-[10px] uppercase tracking-[0.6px]" style={{ color: "var(--color-text-secondary)" }}>Indication</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-[10px] uppercase tracking-[0.6px]" style={{ color: "var(--color-text-secondary)" }}>Stage</th>
                          <th className="px-2 py-2.5 w-[36px]"><span className="sr-only">Watch</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPipelines.slice(0, 5).map((p) => (
                          <tr
                            key={p.id}
                            className="transition-colors duration-100"
                            style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                          >
                            <td className="px-5 py-2.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
                              {p.slug ? (
                                <Link href={`/product/${p.slug}?ref=company_page`} className="hover:underline" style={{ color: "var(--color-text-primary)" }}>
                                  {p.product_name.length > 60 ? p.product_name.slice(0, 60) + "..." : p.product_name}
                                </Link>
                              ) : (
                                p.product_name.length > 60 ? p.product_name.slice(0, 60) + "..." : p.product_name
                              )}
                            </td>
                            <td className="px-3 py-2.5" style={{ color: "var(--color-text-secondary)" }}>{p.indication}</td>
                            <td className="px-3 py-2.5"><StageBadge stage={p.stage} /></td>
                            <td className="px-2 py-2.5"><PipelineWatchButton pipelineId={p.id} size={13} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {pipelines.length > 5 && (
                    <button
                      onClick={() => handleTabChange("Pipeline")}
                      className="text-[12px] mt-4 flex items-center gap-1 font-semibold transition-opacity hover:opacity-80"
                      style={{ color: "var(--color-accent)" }}
                    >
                      View all {pipelines.length} programs <ChevronRight size={14} />
                    </button>
                  )}
                </SectionCard>
              )}

              {/* ─── Funding Snapshot ─── */}
              {(dbFundingRounds.length > 0 || companyFunding.length > 0) && (
                <SectionCard
                  icon={<TrendingUp size={14} style={{ color: "var(--color-accent)" }} />}
                  title="Funding History"
                  count={dbFundingRounds.length || companyFunding.length}
                >
                  {totalFundingRaised > 0 && (
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                      <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>Total raised:</span>
                      <span className="text-[15px] font-bold" style={{ color: "var(--color-accent)" }}>{formatCurrency(totalFundingRaised)}</span>
                    </div>
                  )}
                  <div className="space-y-2.5">
                    {(dbFundingRounds.length > 0 ? dbFundingRounds : []).slice(0, 4).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors duration-100"
                        style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}
                      >
                        <RoundBadge type={r.round_type} />
                        <span className="text-[13px] font-semibold flex-1" style={{ color: "var(--color-text-primary)" }}>
                          {r.amount_usd ? formatCurrency(r.amount_usd) : "Undisclosed"}
                        </span>
                        {r.lead_investor && (
                          <span className="text-[11px] hidden sm:inline" style={{ color: "var(--color-text-tertiary)" }}>{r.lead_investor}</span>
                        )}
                        <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>{fmtDate(r.announced_date)}</span>
                      </div>
                    ))}
                  </div>
                  {dbFundingRounds.length > 4 && (
                    <button
                      onClick={() => handleTabChange("Funding")}
                      className="text-[12px] mt-4 flex items-center gap-1 font-semibold transition-opacity hover:opacity-80"
                      style={{ color: "var(--color-accent)" }}
                    >
                      View all funding rounds <ChevronRight size={14} />
                    </button>
                  )}
                </SectionCard>
              )}

              {/* ─── FDA Approvals Snapshot ─── */}
              {fdaApprovals.length > 0 && (
                <SectionCard
                  icon={<Shield size={14} style={{ color: "var(--color-accent)" }} />}
                  title="FDA Approved Drugs"
                  count={fdaApprovals.length}
                  accent
                >
                  <div className="space-y-2.5">
                    {fdaApprovals.slice(0, 3).map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg border"
                        style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-accent-subtle)" }}>
                          <Pill size={14} style={{ color: "var(--color-accent)" }} />
                        </div>
                        <span className="text-[13px] font-semibold flex-1" style={{ color: "var(--color-text-primary)" }}>{a.drug_name}</span>
                        {a.application_type && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--color-accent-subtle)", color: "var(--color-accent)" }}>{a.application_type}</span>
                        )}
                        <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>{fmtDate(a.approval_date)}</span>
                      </div>
                    ))}
                  </div>
                  {fdaApprovals.length > 3 && (
                    <button
                      onClick={() => handleTabChange("FDA")}
                      className="text-[12px] mt-4 flex items-center gap-1 font-semibold"
                      style={{ color: "var(--color-accent)" }}
                    >
                      View all {fdaApprovals.length} approvals <ChevronRight size={14} />
                    </button>
                  )}
                </SectionCard>
              )}

              {/* ─── Opportunities & Risks ─── */}
              {(report?.opportunities || report?.risks) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {report?.opportunities && (
                    <SectionCard icon={<Target size={14} style={{ color: "var(--color-accent)" }} />} title="Opportunities" accent className="mb-0">
                      <div className="flex flex-col gap-2.5">
                        {report.opportunities.split(". ").filter(Boolean).map((opp, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <Zap size={12} className="mt-0.5 flex-shrink-0" style={{ color: "var(--color-accent)" }} />
                            <span className="text-[12px]" style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}>{opp.endsWith(".") ? opp : `${opp}.`}</span>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                  {report?.risks && (
                    <SectionCard icon={<ShieldAlert size={14} style={{ color: "#b45309" }} />} title="Risk Factors" className="mb-0">
                      <div className="flex flex-col gap-2.5">
                        {report.risks.split(". ").filter(Boolean).map((risk, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <ShieldAlert size={12} className="mt-0.5 flex-shrink-0" style={{ color: "#b45309" }} />
                            <span className="text-[12px]" style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}>{risk.endsWith(".") ? risk : `${risk}.`}</span>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                </div>
              )}

              {/* ─── Competitive Landscape ─── */}
              {report?.competitive_landscape && (
                <SectionCard icon={<Swords size={14} style={{ color: "var(--color-accent)" }} />} title="Competitive Landscape">
                  <p className="text-[13px]" style={{ color: "var(--color-text-secondary)", lineHeight: 1.75 }}>{report.competitive_landscape}</p>
                </SectionCard>
              )}
            </>
          )}

          {/* ════════════ PIPELINE TAB ════════════ */}
          {activeTab === "Pipeline" && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <FlaskConical size={18} style={{ color: "var(--color-accent)" }} />
                  <h2 className="text-[18px] font-bold" style={{ color: "var(--color-text-primary)" }}>
                    Drug Pipeline
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <QuickStatCard label="Total Programs" value={String(pipelines.length)} icon={<FlaskConical size={12} />} />
                <QuickStatCard label="Phase 3" value={String(phase3Count)} icon={<Beaker size={12} />} accent={phase3Count > 0} />
                <QuickStatCard label="In Clinic" value={String(pipelines.filter(p => p.stage !== "Pre-clinical" && p.stage !== "Preclinical" && p.stage !== "Discovery").length)} icon={<TestTubes size={12} />} />
              </div>

              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--color-border-subtle)" }}>
                <table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--color-bg-tertiary)" }}>
                      <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-[0.6px]" style={{ color: "var(--color-text-secondary)" }}>Product</th>
                      <th className="text-left px-3 py-3 font-semibold text-[10px] uppercase tracking-[0.6px]" style={{ color: "var(--color-text-secondary)" }}>Indication</th>
                      <th className="text-left px-3 py-3 font-semibold text-[10px] uppercase tracking-[0.6px]" style={{ color: "var(--color-text-secondary)" }}>Stage</th>
                      <th className="text-left px-3 py-3 font-semibold text-[10px] uppercase tracking-[0.6px]" style={{ color: "var(--color-text-secondary)" }}>Status</th>
                      <th className="text-left px-3 py-3 font-semibold text-[10px] uppercase tracking-[0.6px]" style={{ color: "var(--color-text-secondary)" }}>NCT ID</th>
                      <th className="px-2 py-3 w-[36px]"><span className="sr-only">Watch</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllPipeline ? sortedPipelines : sortedPipelines.slice(0, 10)).map((p, idx) => (
                      <tr
                        key={p.id}
                        style={{
                          borderBottom: "1px solid var(--color-border-subtle)",
                          background: idx % 2 === 0 ? "transparent" : "var(--color-bg-secondary)",
                        }}
                      >
                        <td className="px-4 py-3 font-medium" style={{ color: "var(--color-text-primary)" }}>
                          {p.slug ? (
                            <Link href={`/product/${p.slug}?ref=company_page`} className="hover:underline" style={{ color: "var(--color-text-primary)" }}>
                              {p.product_name.length > 60 ? p.product_name.slice(0, 60) + "..." : p.product_name}
                            </Link>
                          ) : (
                            p.product_name.length > 60 ? p.product_name.slice(0, 60) + "..." : p.product_name
                          )}
                        </td>
                        <td className="px-3 py-3" style={{ color: "var(--color-text-secondary)" }}>{p.indication}</td>
                        <td className="px-3 py-3"><StageBadge stage={p.stage} /></td>
                        <td className="px-3 py-3" style={{ color: "var(--color-text-secondary)" }}>{p.trial_status || "\u2014"}</td>
                        <td className="px-3 py-3">
                          {p.nct_id ? (
                            <a
                              href={`https://clinicaltrials.gov/study/${p.nct_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 font-mono text-[11px]"
                              style={{ color: "var(--color-accent)" }}
                            >
                              {p.nct_id}
                              <ExternalLink size={10} />
                            </a>
                          ) : "\u2014"}
                        </td>
                        <td className="px-2 py-3"><PipelineWatchButton pipelineId={p.id} size={13} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sortedPipelines.length > 10 && (
                <button
                  onClick={() => setShowAllPipeline(!showAllPipeline)}
                  className="text-[12px] mt-4 flex items-center gap-1 font-semibold"
                  style={{ color: "var(--color-accent)" }}
                >
                  {showAllPipeline ? "Show fewer" : `View all ${sortedPipelines.length} programs`}
                  <ChevronDown size={14} style={{ transform: showAllPipeline ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
                </button>
              )}

              {pipelines.length === 0 && (
                <div className="py-16 text-center rounded-xl border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
                  <FlaskConical size={32} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)", opacity: 0.3 }} />
                  <p className="text-[14px] font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>No pipeline data available</p>
                  <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>Pipeline data will appear here when available.</p>
                </div>
              )}
            </section>
          )}

          {/* ════════════ FUNDING TAB ════════════ */}
          {activeTab === "Funding" && (
            <section>
              <div className="flex items-center gap-2.5 mb-5">
                <TrendingUp size={18} style={{ color: "var(--color-accent)" }} />
                <h2 className="text-[18px] font-bold" style={{ color: "var(--color-text-primary)" }}>
                  Funding History
                </h2>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <QuickStatCard label="Total Raised" value={totalFundingRaised > 0 ? formatCurrency(totalFundingRaised) : formatCurrency(company.totalRaised)} accent icon={<DollarSign size={12} />} />
                <QuickStatCard label="Rounds" value={String(dbFundingRounds.length || companyFunding.length || "\u2014")} icon={<Hash size={12} />} />
                <QuickStatCard label="Last Round" value={dbFundingRounds.length > 0 ? dbFundingRounds[0].round_type : (companyFunding.length > 0 ? companyFunding[0].type : "\u2014")} icon={<ArrowUpRight size={12} />} />
              </div>

              {dbFundingRounds.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--color-bg-tertiary)" }}>
                        <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-[0.6px]" style={{ color: "var(--color-text-secondary)" }}>Date</th>
                        <th className="text-left px-3 py-3 font-semibold text-[10px] uppercase tracking-[0.6px]" style={{ color: "var(--color-text-secondary)" }}>Round</th>
                        <th className="text-left px-3 py-3 font-semibold text-[10px] uppercase tracking-[0.6px]" style={{ color: "var(--color-text-secondary)" }}>Amount</th>
                        <th className="text-left px-3 py-3 font-semibold text-[10px] uppercase tracking-[0.6px]" style={{ color: "var(--color-text-secondary)" }}>Lead Investor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbFundingRounds.map((r, idx) => (
                        <tr
                          key={r.id}
                          style={{
                            borderBottom: "1px solid var(--color-border-subtle)",
                            background: idx % 2 === 0 ? "transparent" : "var(--color-bg-secondary)",
                          }}
                        >
                          <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>{fmtDate(r.announced_date)}</td>
                          <td className="px-3 py-3"><RoundBadge type={r.round_type} /></td>
                          <td className="px-3 py-3 font-semibold" style={{ color: "var(--color-text-primary)" }}>
                            {r.amount_usd ? formatCurrency(r.amount_usd) : "Undisclosed"}
                          </td>
                          <td className="px-3 py-3" style={{ color: "var(--color-text-secondary)" }}>{r.lead_investor || "\u2014"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 text-center rounded-xl border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
                  <TrendingUp size={32} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)", opacity: 0.3 }} />
                  <p className="text-[14px] font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>No detailed funding records</p>
                  <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
                    Total raised: {formatCurrency(company.totalRaised)} {company.isEstimated && "(estimated)"}
                  </p>
                </div>
              )}

              {/* Investors */}
              {report?.investors && report.investors.length > 0 && (
                <div className="mt-6">
                  <SectionCard icon={<Award size={14} style={{ color: "var(--color-accent)" }} />} title="Known Investors">
                    <div className="flex flex-wrap gap-2">
                      {report.investors.map((inv) => (
                        <span key={inv} className="text-[12px] px-3 py-1.5 rounded-lg border font-medium" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)", background: "var(--color-bg-secondary)" }}>
                          {inv}
                        </span>
                      ))}
                    </div>
                  </SectionCard>
                </div>
              )}
            </section>
          )}

          {/* ════════════ FDA TAB ════════════ */}
          {activeTab === "FDA" && (
            <section>
              <div className="flex items-center gap-2.5 mb-5">
                <Shield size={18} style={{ color: "var(--color-accent)" }} />
                <h2 className="text-[18px] font-bold" style={{ color: "var(--color-text-primary)" }}>
                  FDA Approved Drugs
                </h2>
              </div>

              <div className="mb-6">
                <QuickStatCard label="Total Approvals" value={String(fdaApprovals.length)} icon={<Shield size={12} />} accent />
              </div>

              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--color-border-subtle)" }}>
                <table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--color-bg-tertiary)" }}>
                      <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-[0.6px]" style={{ color: "var(--color-text-secondary)" }}>Drug Name</th>
                      <th className="text-left px-3 py-3 font-semibold text-[10px] uppercase tracking-[0.6px]" style={{ color: "var(--color-text-secondary)" }}>Active Ingredient</th>
                      <th className="text-left px-3 py-3 font-semibold text-[10px] uppercase tracking-[0.6px]" style={{ color: "var(--color-text-secondary)" }}>Approval Date</th>
                      <th className="text-left px-3 py-3 font-semibold text-[10px] uppercase tracking-[0.6px]" style={{ color: "var(--color-text-secondary)" }}>Type</th>
                      <th className="text-left px-3 py-3 font-semibold text-[10px] uppercase tracking-[0.6px]" style={{ color: "var(--color-text-secondary)" }}>Dosage Form</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fdaApprovals.map((a, idx) => (
                      <tr
                        key={a.id}
                        style={{
                          borderBottom: "1px solid var(--color-border-subtle)",
                          background: idx % 2 === 0 ? "transparent" : "var(--color-bg-secondary)",
                        }}
                      >
                        <td className="px-4 py-3 font-semibold" style={{ color: "var(--color-text-primary)" }}>{a.drug_name}</td>
                        <td className="px-3 py-3" style={{ color: "var(--color-text-secondary)" }}>{a.active_ingredient || "\u2014"}</td>
                        <td className="px-3 py-3" style={{ color: "var(--color-text-secondary)" }}>{fmtDate(a.approval_date)}</td>
                        <td className="px-3 py-3">
                          {a.application_type ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--color-accent-subtle)", color: "var(--color-accent)" }}>{a.application_type}</span>
                          ) : "\u2014"}
                        </td>
                        <td className="px-3 py-3" style={{ color: "var(--color-text-secondary)" }}>{a.dosage_form || "\u2014"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ════════════ PUBLICATIONS TAB ════════════ */}
          {activeTab === "Publications" && (
            <section>
              <div className="flex items-center gap-2.5 mb-5">
                <FileText size={18} style={{ color: "var(--color-accent)" }} />
                <h2 className="text-[18px] font-bold" style={{ color: "var(--color-text-primary)" }}>
                  Publications
                </h2>
                <span className="text-[12px] font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-tertiary)" }}>
                  {publications.length}
                </span>
              </div>

              <div className="space-y-3">
                {(showAllPubs ? publications : publications.slice(0, 5)).map((pub) => (
                  <div
                    key={pub.id}
                    className="p-4 rounded-xl border transition-shadow duration-200 hover:shadow-sm"
                    style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-primary)" }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: "var(--color-accent-subtle)" }}
                      >
                        <FileText size={14} style={{ color: "var(--color-accent)" }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        {pub.pmid ? (
                          <a
                            href={`https://pubmed.ncbi.nlm.nih.gov/${pub.pmid}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] font-semibold hover:underline block"
                            style={{ color: "var(--color-text-primary)", lineHeight: 1.5 }}
                          >
                            {pub.title}
                            <ExternalLink size={10} className="inline ml-1.5" style={{ verticalAlign: "middle", color: "var(--color-accent)" }} />
                          </a>
                        ) : (
                          <p className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)", lineHeight: 1.5 }}>{pub.title}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {pub.journal && (
                            <span className="text-[11px] font-medium" style={{ color: "var(--color-accent)" }}>{pub.journal}</span>
                          )}
                          {pub.publication_date && (
                            <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>{fmtDate(pub.publication_date)}</span>
                          )}
                        </div>
                        {pub.authors && (
                          <p className="text-[11px] mt-1 line-clamp-1" style={{ color: "var(--color-text-tertiary)" }}>{pub.authors}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {publications.length > 5 && (
                <button
                  onClick={() => setShowAllPubs(!showAllPubs)}
                  className="text-[12px] mt-4 flex items-center gap-1 font-semibold"
                  style={{ color: "var(--color-accent)" }}
                >
                  {showAllPubs ? "Show fewer" : `View all ${publications.length} publications`}
                  <ChevronDown size={14} style={{ transform: showAllPubs ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
                </button>
              )}
            </section>
          )}

          {/* ════════════ PATENTS TAB ════════════ */}
          {activeTab === "Patents" && (
            <section>
              <div className="flex items-center gap-2.5 mb-5">
                <ScrollText size={18} style={{ color: "var(--color-accent)" }} />
                <h2 className="text-[18px] font-bold" style={{ color: "var(--color-text-primary)" }}>
                  Patents
                </h2>
                <span className="text-[12px] font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-tertiary)" }}>
                  {patents.length}
                </span>
              </div>

              <div className="space-y-3">
                {(showAllPatents ? patents : patents.slice(0, 5)).map((pat) => (
                  <div
                    key={pat.id}
                    className="p-4 rounded-xl border transition-shadow duration-200 hover:shadow-sm"
                    style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-primary)" }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: "var(--color-accent-subtle)" }}
                      >
                        <ScrollText size={14} style={{ color: "var(--color-accent)" }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)", lineHeight: 1.5 }}>{pat.title}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {pat.patent_number && (
                            <a
                              href={`https://patents.google.com/patent/${pat.patent_number}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] flex items-center gap-1 font-mono font-medium"
                              style={{ color: "var(--color-accent)" }}
                            >
                              {pat.patent_number}
                              <ExternalLink size={9} />
                            </a>
                          )}
                          {pat.grant_date && (
                            <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>Granted: {fmtDate(pat.grant_date)}</span>
                          )}
                          {pat.filing_date && (
                            <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>Filed: {fmtDate(pat.filing_date)}</span>
                          )}
                        </div>
                        {pat.abstract && (
                          <p className="text-[11px] mt-2 line-clamp-2" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{pat.abstract}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {patents.length > 5 && (
                <button
                  onClick={() => setShowAllPatents(!showAllPatents)}
                  className="text-[12px] mt-4 flex items-center gap-1 font-semibold"
                  style={{ color: "var(--color-accent)" }}
                >
                  {showAllPatents ? "Show fewer" : `View all ${patents.length} patents`}
                  <ChevronDown size={14} style={{ transform: showAllPatents ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
                </button>
              )}
            </section>
          )}

          {/* ════════════ REPORT TAB ════════════ */}
          {activeTab === "Report" && (
            <section>
              <div className="flex items-center gap-2.5 mb-2">
                <Sparkles size={18} style={{ color: "var(--color-accent)" }} />
                <h2 className="text-[18px] font-bold" style={{ color: "var(--color-text-primary)" }}>
                  AI Deep Analysis
                </h2>
              </div>

              {reportLoading && (
                <div className="mt-8 flex flex-col items-center justify-center py-20">
                  <div className="relative mb-6">
                    <div className="w-14 h-14 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: "var(--color-border-subtle)", borderTopColor: "var(--color-accent)" }} />
                    <Sparkles size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ color: "var(--color-accent)" }} />
                  </div>
                  <h3 className="text-[16px] font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>Generating Intelligence Report</h3>
                  <p className="text-[13px] max-w-[360px] text-center" style={{ color: "var(--color-text-tertiary)" }}>
                    Analyzing {company.name}&apos;s website, public filings, and clinical data.
                  </p>
                </div>
              )}

              {reportError && !reportLoading && (
                <div className="mt-6 p-5 rounded-xl border" style={{ borderColor: "rgba(192,57,43,0.3)", background: "rgba(192,57,43,0.05)" }}>
                  <p className="text-[14px] font-semibold mb-1" style={{ color: "#c0392b" }}>Report generation failed</p>
                  <p className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>{reportError}</p>
                  <button
                    onClick={() => handleTabChange("Report")}
                    className="mt-3 text-[12px] font-semibold px-4 py-2 rounded-lg"
                    style={{ color: "var(--color-accent)", background: "var(--color-accent-subtle)" }}
                  >
                    Try again
                  </button>
                </div>
              )}

              {!reportLoading && !reportError && report?.deep_report && (
                <>
                  <p className="text-[11px] mb-6" style={{ color: "var(--color-text-tertiary)" }}>
                    Generated from public data sources &middot; Last updated {report.analyzed_at ? new Date(report.analyzed_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "recently"}
                  </p>
                  <div className="rounded-xl border p-6" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
                    <div className="prose prose-sm max-w-none" style={{ color: "var(--color-text-secondary)" }}>
                      {report.deep_report.split("\n").map((line, i) => {
                        if (line.startsWith("# ")) return <h2 key={i} className="text-[20px] font-bold mt-6 mb-3" style={{ color: "var(--color-text-primary)" }}>{line.replace("# ", "")}</h2>;
                        if (line.startsWith("## ")) return <h3 key={i} className="text-[16px] font-bold mt-5 mb-2" style={{ color: "var(--color-text-primary)" }}>{line.replace("## ", "")}</h3>;
                        if (line.startsWith("### ")) return <h4 key={i} className="text-[14px] font-semibold mt-4 mb-1.5" style={{ color: "var(--color-text-primary)" }}>{line.replace("### ", "")}</h4>;
                        if (line.startsWith("- ")) return (
                          <div key={i} className="flex items-start gap-2.5 mb-2 ml-1">
                            <CircleDot size={8} className="mt-1.5 flex-shrink-0" style={{ color: "var(--color-accent)" }} />
                            <span className="text-[13px]" style={{ lineHeight: 1.7 }}>{line.replace("- ", "").replace(/\*\*(.+?)\*\*/g, "$1")}</span>
                          </div>
                        );
                        if (!line.trim()) return <div key={i} className="h-3" />;
                        return <p key={i} className="text-[13px] mb-2.5" style={{ lineHeight: 1.75 }}>{line.replace(/\*\*(.+?)\*\*/g, "$1")}</p>;
                      })}
                    </div>
                  </div>
                </>
              )}

              {!reportLoading && !reportError && !report?.deep_report && (
                <div className="mt-8 flex flex-col items-center justify-center py-16">
                  <Sparkles size={32} className="mb-4" style={{ color: "var(--color-text-tertiary)", opacity: 0.4 }} />
                  <p className="text-[14px] mb-4 font-medium" style={{ color: "var(--color-text-secondary)" }}>No AI report available yet for {company.name}</p>
                  <button
                    onClick={() => handleTabChange("Report")}
                    className="text-[13px] font-semibold px-5 py-2.5 rounded-lg"
                    style={{ color: "#fff", background: "var(--color-accent)" }}
                  >
                    Generate Report
                  </button>
                </div>
              )}
            </section>
          )}

          {/* ═══ Team Members (from claimed profile) ═══ */}
          {teamMembers.length > 0 && activeTab === "Overview" && (
            <SectionCard icon={<Users size={14} style={{ color: "var(--color-accent)" }} />} title="Leadership Team" count={teamMembers.length}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-start gap-3 p-3.5 rounded-xl border transition-shadow duration-200 hover:shadow-sm"
                    style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 overflow-hidden"
                      style={{ background: "var(--color-accent-subtle)", color: "var(--color-accent)" }}
                    >
                      {member.photo_url ? (
                        <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        member.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>{member.name}</span>
                        {member.linkedin_url && (
                          <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[10px] shrink-0 font-medium" style={{ color: "var(--color-accent)" }}>
                            LinkedIn
                          </a>
                        )}
                      </div>
                      {member.title && (
                        <p className="text-[11px] truncate" style={{ color: "var(--color-text-secondary)" }}>{member.title}</p>
                      )}
                      {member.bio && (
                        <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: "var(--color-text-tertiary)", lineHeight: 1.5 }}>{member.bio}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ═══ Company News (from claimed profile) ═══ */}
          {companyNews.length > 0 && activeTab === "Overview" && (
            <SectionCard icon={<Newspaper size={14} style={{ color: "var(--color-accent)" }} />} title="Company News" count={companyNews.length}>
              <div className="flex flex-col gap-3">
                {companyNews.slice(0, 5).map((item) => (
                  <div key={item.id} className="pb-3 border-b last:border-0 last:pb-0" style={{ borderColor: "var(--color-border-subtle)" }}>
                    <h4 className="text-[13px] font-semibold mb-0.5" style={{ color: "var(--color-text-primary)" }}>{item.title}</h4>
                    <span className="text-[10px] mb-1.5 block" style={{ color: "var(--color-text-tertiary)" }}>
                      {new Date(item.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    {item.content && (
                      <p className="text-[12px] line-clamp-2" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{item.content}</p>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* ═══ Sidebar ═══ */}
        <aside className="w-full lg:w-[320px] border-t lg:border-t-0" style={{ borderColor: "var(--color-border-subtle)" }}>
          <div className="lg:sticky lg:top-[49px]">
            {/* Company Info Card */}
            <div className="px-5 py-5 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
              <h3
                className="text-[10px] uppercase tracking-[0.8px] font-bold mb-3"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                Company Info
              </h3>
              <div className="flex flex-col">
                {[
                  { icon: <Building2 size={13} />, label: "Type", value: report?.business_model || company.type || null },
                  { icon: <Calendar size={13} />, label: "Founded", value: (report?.founded || (company.founded > 0 ? company.founded : null)) ? String(report?.founded || company.founded) : null },
                  { icon: <Users size={13} />, label: "Employees", value: report?.employee_estimate || (company.employees && company.employees !== "0" ? company.employees : null) },
                  { icon: <MapPin size={13} />, label: "Location", value: [report?.headquarters_city || company.city, report?.headquarters_country || company.country].filter(Boolean).join(", ") || null },
                  { icon: <Activity size={13} />, label: "Stage", value: derivedStage },
                  { icon: <Globe size={13} />, label: "Revenue", value: report?.revenue_status || null },
                ].filter((item) => item.value).map((item) => (
                  <InfoRow key={item.label} icon={item.icon} label={item.label} value={item.value!} />
                ))}
              </div>
            </div>

            {/* Trading Info */}
            {isPublic && report?.exchange && (
              <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                <h3 className="text-[10px] uppercase tracking-[0.8px] font-bold mb-3" style={{ color: "var(--color-text-tertiary)" }}>Trading</h3>
                <div className="flex flex-col">
                  <InfoRow icon={<Hash size={13} />} label="Ticker" value={<span className="font-mono font-bold" style={{ color: "var(--color-accent)" }}>{company.ticker}</span>} />
                  <InfoRow icon={<Activity size={13} />} label="Exchange" value={report.exchange} />
                  <InfoRow icon={<DollarSign size={13} />} label="Currency" value={currency} />
                </div>
              </div>
            )}

            {/* Contact */}
            {(report?.contact_email || report?.contact_phone || company.website) && (
              <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                <h3 className="text-[10px] uppercase tracking-[0.8px] font-bold mb-3" style={{ color: "var(--color-text-tertiary)" }}>Contact</h3>
                <div className="flex flex-col gap-2.5">
                  {company.website && (
                    <a
                      href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] flex items-center gap-2 transition-opacity hover:opacity-80"
                      style={{ color: "var(--color-accent)" }}
                    >
                      <Globe size={13} />
                      {company.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                      <ExternalLink size={10} />
                    </a>
                  )}
                  {report?.contact_email && (
                    <a href={`mailto:${report.contact_email}`} className="text-[12px] flex items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
                      <Mail size={13} />
                      {report.contact_email}
                    </a>
                  )}
                  {report?.contact_phone && (
                    <span className="text-[12px] flex items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
                      <Phone size={13} />
                      {report.contact_phone}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Therapeutic Areas */}
            {report?.therapeutic_areas && report.therapeutic_areas.length > 0 && (
              <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                <h3 className="text-[10px] uppercase tracking-[0.8px] font-bold mb-3" style={{ color: "var(--color-text-tertiary)" }}>Therapeutic Areas</h3>
                <div className="flex flex-wrap gap-1.5">
                  {report.therapeutic_areas.map((area) => (
                    <span
                      key={area}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full border"
                      style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-accent)", background: "var(--color-accent-subtle)" }}
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sectors */}
            {sectors.length > 0 && (
              <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                <h3 className="text-[10px] uppercase tracking-[0.8px] font-bold mb-3" style={{ color: "var(--color-text-tertiary)" }}>Sectors</h3>
                <div className="flex flex-wrap gap-1.5">
                  {sectors.map((s) => {
                    if (!s.sectors) return null;
                    const { name, slug } = s.sectors;
                    return (
                      <Link
                        key={s.sector_id}
                        href={`/sectors/${slug}`}
                        className="text-[11px] px-2.5 py-1 rounded-full font-semibold transition-opacity duration-150 hover:opacity-80"
                        style={s.is_primary ? { background: "var(--color-accent)", color: "#fff" } : { background: "var(--color-bg-tertiary)", color: "var(--color-text-secondary)" }}
                      >
                        {name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Partners */}
            {report?.partners && report.partners.length > 0 && (
              <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                <h3 className="text-[10px] uppercase tracking-[0.8px] font-bold mb-3" style={{ color: "var(--color-text-tertiary)" }}>Partners</h3>
                <div className="flex flex-wrap gap-1.5">
                  {report.partners.map((p) => (
                    <span key={p} className="text-[11px] px-2.5 py-1 rounded-full border font-medium" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)" }}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Similar Companies */}
            {similar.length > 0 && <SimilarCompanies companies={similar} />}

            {/* Claim CTA */}
            <div className="px-5 py-5">
              {isClaimed ? (
                <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-accent)", background: "var(--color-accent-subtle)" }}>
                  <div className="flex items-center gap-1.5 text-[13px] font-bold mb-1" style={{ color: "var(--color-accent)" }}>
                    <ShieldCheck size={14} />
                    Verified Profile
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                    This company profile is managed by a verified representative.
                  </p>
                </div>
              ) : (
                <div
                  className="rounded-xl border p-5"
                  style={{ borderColor: "var(--color-accent)", background: "var(--color-accent-subtle)" }}
                >
                  <div className="text-[14px] font-bold mb-1.5" style={{ color: "var(--color-text-primary)" }}>Is this your company?</div>
                  <p className="text-[12px] mb-4" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                    Claim your profile to update information, add pipeline data, and connect with investors.
                  </p>
                  <Link
                    href={`/claim/${company.slug}`}
                    className="inline-flex items-center gap-1.5 text-[12px] font-bold px-5 py-2.5 rounded-lg text-white transition-opacity hover:opacity-90"
                    style={{ background: "var(--color-accent)" }}
                  >
                    Claim profile
                    <ChevronRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <Footer />
    </div>
  );
}
