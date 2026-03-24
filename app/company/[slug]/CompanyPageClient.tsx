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
  ChevronRight, Award, Zap, CircleDot, FileText, Shield,
  ScrollText, TestTubes, Pill
} from "lucide-react";
import { TvStockChart } from "@/components/charts/TvStockChart";
import { TvAreaChart } from "@/components/charts/TvAreaChart";
import { WatchlistButton } from "@/components/WatchlistButton";

/* ─── Types for enriched data ─── */
interface PipelineRow {
  id: string;
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
  if (!d) return "—";
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

/* ─── Stage badge colors ─── */
const stageColors: Record<string, { bg: string; text: string; border: string }> = {
  "Approved": { bg: "#e8f5f0", text: "#0a3d2e", border: "#5DCAA5" },
  "Phase 3": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 2/3": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 2": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 1/2": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Phase 1": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Pre-clinical": { bg: "var(--color-bg-secondary)", text: "var(--color-text-secondary)", border: "var(--color-border-medium)" },
  "Preclinical": { bg: "var(--color-bg-secondary)", text: "var(--color-text-secondary)", border: "var(--color-border-medium)" },
  "Discovery": { bg: "var(--color-bg-secondary)", text: "var(--color-text-secondary)", border: "var(--color-border-medium)" },
};

/* ─── Round type badge colors ─── */
const roundColors: Record<string, { bg: string; text: string }> = {
  "Seed": { bg: "#fef3e2", text: "#b45309" },
  "Series A": { bg: "#eff6ff", text: "#1d4ed8" },
  "Series B": { bg: "#f5f3ff", text: "#5b21b6" },
  "Series C": { bg: "#e8f5f0", text: "#0a3d2e" },
  "Series D": { bg: "#fff0f0", text: "#a32d2d" },
  "IPO": { bg: "#e8f5f0", text: "#0a3d2e" },
  "Grant": { bg: "var(--color-bg-secondary)", text: "var(--color-text-secondary)" },
};

/* ─── Section Card ─── */
function SectionCard({ icon, title, children, accent = false, count }: {
  icon: React.ReactNode; title: string; children: React.ReactNode; accent?: boolean; count?: number;
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden mb-5"
      style={{
        borderColor: accent ? "var(--color-accent)" : "var(--color-border-subtle)",
        borderWidth: accent ? "1.5px" : "1px",
      }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b"
        style={{
          background: accent ? "rgba(26,122,94,0.06)" : "var(--color-bg-secondary)",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        {icon}
        <h3
          className="text-12 uppercase tracking-[0.5px] font-semibold flex-1"
          style={{ color: accent ? "var(--color-accent)" : "var(--color-text-secondary)" }}
        >
          {title}
        </h3>
        {count !== undefined && count > 0 && (
          <span className="text-10 font-medium px-1.5 py-0.5 rounded-full" style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-tertiary)" }}>
            {count}
          </span>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({ label, value, icon, accent = false }: { label: string; value: string; icon?: React.ReactNode; accent?: boolean }) {
  return (
    <div
      className="rounded-lg border px-3 py-2.5"
      style={{
        background: "var(--color-bg-secondary)",
        borderColor: "var(--color-border-subtle)",
      }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.3px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>
          {label}
        </span>
      </div>
      <div className="text-[18px] font-medium" style={{ color: accent ? "var(--color-accent)" : "var(--color-text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

/* ─── Stage Badge ─── */
function StageBadge({ stage }: { stage: string }) {
  const colors = stageColors[stage] || { bg: "var(--color-bg-secondary)", text: "var(--color-text-secondary)", border: "var(--color-border-medium)" };
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap"
      style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}
    >
      {stage}
    </span>
  );
}

/* ─── Round Badge ─── */
function RoundBadge({ type }: { type: string }) {
  const colors = roundColors[type] || { bg: "var(--color-bg-secondary)", text: "var(--color-text-secondary)" };
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: colors.bg, color: colors.text }}
    >
      {type}
    </span>
  );
}

/* ─── Sector type ─── */
interface CompanySector {
  sector_id: string;
  is_primary: boolean;
  confidence: number | null;
  sectors: { id: string; name: string; slug: string } | null;
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
}: CompanyPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [priceTimescale, setPriceTimescale] = useState<PriceTimescale>("Max");
  const [showAllPipeline, setShowAllPipeline] = useState(false);

  // On-demand report generation state
  const [report, setReport] = useState<CompanyReport | null>(initialReport);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

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

    // Prefer DB price history, fall back to stock API
    let source: { time: string; value: number }[];
    if (priceHistory.length > 0) {
      source = priceHistory.map(p => ({ time: p.date, value: p.close }));
    } else {
      source = stockData.map(d => ({ time: d.date, value: d.price }));
    }

    // Filter by timescale
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

  return (
    <div className="page-content min-h-screen" style={{ background: "var(--color-bg-primary)" }}>
      <Nav />

      {/* ═══ HEADER ═══ */}
      <header className="px-5 pt-5 pb-4 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
        <div className="flex items-start gap-4">
          <CompanyAvatar name={company.name} logoUrl={company.logoUrl} website={company.website} size={56} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: "var(--color-text-primary)", letterSpacing: "-0.3px" }}>
                {company.name}
              </h1>
              {company.ticker && (
                <span className="text-12 font-medium px-2 py-0.5 rounded-md" style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-secondary)" }}>
                  {company.ticker}
                </span>
              )}
              <StageBadge stage={derivedStage} />
              {companyId && <WatchlistButton companyId={companyId} showLabel />}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {company.city && company.country && (
                <span className="text-12 flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
                  <MapPin size={11} />
                  {company.city}, {company.country}
                </span>
              )}
              {company.founded > 0 && (
                <span className="text-12 flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
                  <Calendar size={11} />
                  Founded {company.founded}
                </span>
              )}
              {company.website && (
                <a
                  href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-12 flex items-center gap-1"
                  style={{ color: "var(--color-accent)" }}
                >
                  <Globe size={11} />
                  {company.website.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              )}
            </div>
            {summaryText && (
              <p className="text-13 mt-2 line-clamp-2" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                {summaryText}
              </p>
            )}
          </div>
        </div>

        {/* Key stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {latestMarketCap && latestMarketCap > 0 && (
            <StatCard label="Market Cap" value={formatCurrency(latestMarketCap)} icon={<BarChart3 size={10} style={{ color: "var(--color-text-tertiary)" }} />} accent />
          )}
          {company.founded > 0 && (
            <StatCard label="Founded" value={String(company.founded)} icon={<Calendar size={10} style={{ color: "var(--color-text-tertiary)" }} />} />
          )}
          {(report?.employee_estimate || (company.employees && company.employees !== "0")) && (
            <StatCard label="Employees" value={report?.employee_estimate || company.employees} icon={<Users size={10} style={{ color: "var(--color-text-tertiary)" }} />} />
          )}
          {company.focus && company.focus.length > 0 && (
            <div className="rounded-lg border px-3 py-2.5" style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border-subtle)" }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Target size={10} style={{ color: "var(--color-text-tertiary)" }} />
                <span className="text-[10px] uppercase tracking-[0.3px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>Focus</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {company.focus.slice(0, 3).map(f => (
                  <span key={f} className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(26,122,94,0.08)", color: "var(--color-accent)" }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ─── Tab Bar ─── */}
      <div
        className="flex items-center gap-1 px-5 border-b overflow-x-auto"
        style={{ borderColor: "var(--color-border-subtle)", scrollbarWidth: "none" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className="text-13 py-2.5 px-2.5 transition-all duration-200 border-b-[2px] whitespace-nowrap flex-shrink-0 rounded-t-md"
            style={{
              color: activeTab === tab ? "var(--color-accent)" : "var(--color-text-secondary)",
              borderBottomColor: activeTab === tab ? "var(--color-accent)" : "transparent",
              fontWeight: activeTab === tab ? 600 : 400,
              background: activeTab === tab ? "rgba(26,122,94,0.04)" : "transparent",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ─── Two Column Layout ─── */}
      <div
        className="flex flex-col lg:grid"
        style={{ gridTemplateColumns: "1fr 280px" }}
      >
        {/* ═══ Main Content ═══ */}
        <div
          className="px-5 py-5 min-w-0 lg:border-r"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >

          {/* ════════════ OVERVIEW TAB ════════════ */}
          {activeTab === "Overview" && (
            <>
              {/* Report generating banner */}
              {reportLoading && !report?.deep_report && (
                <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg border" style={{ borderColor: "rgba(26,122,94,0.2)", background: "rgba(26,122,94,0.04)" }}>
                  <div
                    className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
                    style={{ borderColor: "var(--color-border-subtle)", borderTopColor: "var(--color-accent)" }}
                  />
                  <p className="text-12" style={{ color: "var(--color-text-secondary)" }}>
                    Generating AI intelligence report for {company.name}...
                  </p>
                </div>
              )}

              {/* Stock Chart (DB price history or Yahoo data) */}
              {isPublic && (chartData.length > 0 || stockLoading) && (
                <SectionCard
                  icon={<Activity size={14} style={{ color: "var(--color-accent)" }} />}
                  title={`${company.ticker} · Stock Price`}
                >
                  <div className="mb-2">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[28px] font-medium tracking-tight" style={{ color: "var(--color-text-primary)", letterSpacing: "-0.6px" }}>
                        {currency} {currentPrice.toFixed(2)}
                      </span>
                      <span className="flex items-center gap-0.5 text-13 font-medium" style={{ color: priceChange >= 0 ? "var(--color-accent)" : "#c0392b" }}>
                        {priceChange >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                        {priceChange >= 0 ? "+" : ""}{Math.abs(priceChange).toFixed(2)} ({priceChange >= 0 ? "+" : ""}{priceChangePct.toFixed(2)}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 mt-2">
                      {priceTimescales.map((ts) => (
                        <button
                          key={ts}
                          onClick={() => setPriceTimescale(ts)}
                          className="text-[10px] font-medium px-1.5 py-1 rounded transition-all duration-150"
                          style={{
                            background: priceTimescale === ts ? "var(--color-accent)" : "transparent",
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
                  <p className="text-[10px] mt-2" style={{ color: "var(--color-text-tertiary)" }}>
                    {priceHistory.length > 0 ? "Historical price data" : "Data from Yahoo Finance · 15 min delay"}
                  </p>
                </SectionCard>
              )}

              {/* AI Summary */}
              {summaryText && (
                <SectionCard
                  icon={<Sparkles size={14} style={{ color: "var(--color-accent)" }} />}
                  title={report?.summary ? "AI Company Overview" : "About"}
                  accent={!!report?.summary}
                >
                  <p className="text-[13.5px]" style={{ color: "var(--color-text-secondary)", lineHeight: 1.75 }}>
                    {summaryText}
                  </p>
                  <button
                    onClick={() => handleTabChange("Report")}
                    className="mt-3 flex items-center gap-1.5 text-12 font-medium px-3 py-1.5 rounded-md transition-colors"
                    style={{ color: "var(--color-accent)", background: "rgba(26,122,94,0.06)" }}
                  >
                    <BookOpen size={13} />
                    {report?.deep_report ? "Read full AI report" : "Generate AI report"}
                  </button>
                </SectionCard>
              )}

              {/* Technology Platform */}
              {report?.technology_platform && (
                <SectionCard icon={<Beaker size={14} style={{ color: "var(--color-accent)" }} />} title="Technology Platform">
                  <p className="text-13" style={{ color: "var(--color-text-secondary)", lineHeight: 1.7 }}>{report.technology_platform}</p>
                </SectionCard>
              )}

              {/* Pipeline Snapshot */}
              {sortedPipelines.length > 0 && (
                <SectionCard
                  icon={<FlaskConical size={14} style={{ color: "var(--color-accent)" }} />}
                  title="Pipeline Snapshot"
                  count={pipelines.length}
                >
                  <p className="text-12 mb-3" style={{ color: "var(--color-text-tertiary)" }}>
                    {pipelines.length} drug{pipelines.length !== 1 ? "s" : ""} in pipeline{phase3Count > 0 ? `, ${phase3Count} in Phase 3` : ""}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-12" style={{ borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "var(--color-bg-tertiary)" }}>
                          <th className="text-left px-3 py-2 font-medium text-11 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Drug</th>
                          <th className="text-left px-3 py-2 font-medium text-11 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Indication</th>
                          <th className="text-left px-3 py-2 font-medium text-11 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Stage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPipelines.slice(0, 5).map((p) => (
                          <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                            <td className="px-3 py-2 font-medium" style={{ color: "var(--color-text-primary)" }} title={p.product_name}>{p.product_name.length > 80 ? p.product_name.slice(0, 80) + "..." : p.product_name}</td>
                            <td className="px-3 py-2" style={{ color: "var(--color-text-secondary)" }}>{p.indication}</td>
                            <td className="px-3 py-2"><StageBadge stage={p.stage} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {pipelines.length > 5 && (
                    <button onClick={() => handleTabChange("Pipeline")} className="text-12 mt-3 flex items-center gap-1" style={{ color: "var(--color-accent)" }}>
                      View all {pipelines.length} programs <ChevronRight size={13} />
                    </button>
                  )}
                </SectionCard>
              )}

              {/* Funding Snapshot */}
              {(dbFundingRounds.length > 0 || companyFunding.length > 0) && (
                <SectionCard
                  icon={<TrendingUp size={14} style={{ color: "var(--color-accent)" }} />}
                  title="Funding History"
                  count={dbFundingRounds.length || companyFunding.length}
                >
                  {totalFundingRaised > 0 && (
                    <p className="text-12 mb-3" style={{ color: "var(--color-text-tertiary)" }}>
                      Total raised: <span style={{ color: "var(--color-accent)", fontWeight: 600 }}>{formatCurrency(totalFundingRaised)}</span>
                    </p>
                  )}
                  <div className="space-y-2">
                    {(dbFundingRounds.length > 0 ? dbFundingRounds : []).slice(0, 4).map((r) => (
                      <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border" style={{ borderColor: "var(--color-border-subtle)" }}>
                        <RoundBadge type={r.round_type} />
                        <span className="text-12 font-medium flex-1" style={{ color: "var(--color-text-primary)" }}>
                          {r.amount_usd ? formatCurrency(r.amount_usd) : "Undisclosed"}
                        </span>
                        {r.lead_investor && (
                          <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>{r.lead_investor}</span>
                        )}
                        <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>{fmtDate(r.announced_date)}</span>
                      </div>
                    ))}
                  </div>
                  {dbFundingRounds.length > 4 && (
                    <button onClick={() => handleTabChange("Funding")} className="text-12 mt-3 flex items-center gap-1" style={{ color: "var(--color-accent)" }}>
                      View all funding rounds <ChevronRight size={13} />
                    </button>
                  )}
                </SectionCard>
              )}

              {/* FDA Approvals Snapshot */}
              {fdaApprovals.length > 0 && (
                <SectionCard
                  icon={<Shield size={14} style={{ color: "var(--color-accent)" }} />}
                  title="FDA Approved Drugs"
                  count={fdaApprovals.length}
                >
                  <div className="space-y-2">
                    {fdaApprovals.slice(0, 3).map((a) => (
                      <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border" style={{ borderColor: "var(--color-border-subtle)" }}>
                        <Pill size={12} style={{ color: "var(--color-accent)" }} />
                        <span className="text-12 font-medium flex-1" style={{ color: "var(--color-text-primary)" }}>{a.drug_name}</span>
                        {a.application_type && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: "#e8f5f0", color: "#0a3d2e" }}>{a.application_type}</span>
                        )}
                        <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>{fmtDate(a.approval_date)}</span>
                      </div>
                    ))}
                  </div>
                  {fdaApprovals.length > 3 && (
                    <button onClick={() => handleTabChange("FDA")} className="text-12 mt-3 flex items-center gap-1" style={{ color: "var(--color-accent)" }}>
                      View all {fdaApprovals.length} approvals <ChevronRight size={13} />
                    </button>
                  )}
                </SectionCard>
              )}

              {/* Opportunity & Risks */}
              {(report?.opportunities || report?.risks) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  {report.opportunities && (
                    <SectionCard icon={<Target size={14} style={{ color: "var(--color-accent)" }} />} title="Opportunities" accent>
                      <div className="flex flex-col gap-2">
                        {report.opportunities.split(". ").filter(Boolean).map((opp, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Zap size={11} className="mt-1 flex-shrink-0" style={{ color: "var(--color-accent)" }} />
                            <span className="text-12" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{opp.endsWith(".") ? opp : `${opp}.`}</span>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                  {report.risks && (
                    <SectionCard icon={<ShieldAlert size={14} style={{ color: "#b45309" }} />} title="Risk Factors">
                      <div className="flex flex-col gap-2">
                        {report.risks.split(". ").filter(Boolean).map((risk, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <ShieldAlert size={11} className="mt-1 flex-shrink-0" style={{ color: "#b45309" }} />
                            <span className="text-12" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{risk.endsWith(".") ? risk : `${risk}.`}</span>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                </div>
              )}

              {/* Competitive Landscape */}
              {report?.competitive_landscape && (
                <SectionCard icon={<Swords size={14} style={{ color: "var(--color-accent)" }} />} title="Competitive Landscape">
                  <p className="text-13" style={{ color: "var(--color-text-secondary)", lineHeight: 1.7 }}>{report.competitive_landscape}</p>
                </SectionCard>
              )}

              {/* Quick stats row: publications + patents */}
              {(publications.length > 0 || patents.length > 0) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {publications.length > 0 && (
                    <StatCard label="Publications" value={String(publications.length)} icon={<FileText size={10} style={{ color: "var(--color-text-tertiary)" }} />} />
                  )}
                  {patents.length > 0 && (
                    <StatCard label="Patents" value={String(patents.length)} icon={<ScrollText size={10} style={{ color: "var(--color-text-tertiary)" }} />} />
                  )}
                  {pipelines.length > 0 && (
                    <StatCard label="Pipeline" value={String(pipelines.length)} icon={<TestTubes size={10} style={{ color: "var(--color-text-tertiary)" }} />} />
                  )}
                  {fdaApprovals.length > 0 && (
                    <StatCard label="FDA Approvals" value={String(fdaApprovals.length)} icon={<Shield size={10} style={{ color: "var(--color-text-tertiary)" }} />} />
                  )}
                </div>
              )}
            </>
          )}

          {/* ════════════ PIPELINE TAB ════════════ */}
          {activeTab === "Pipeline" && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical size={16} style={{ color: "var(--color-accent)" }} />
                <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Drug Pipeline — {company.name}
                </h2>
              </div>

              <div className="flex items-center gap-4 mb-5 pb-4 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                <StatCard label="Total Programs" value={String(pipelines.length)} icon={<FlaskConical size={10} style={{ color: "var(--color-text-tertiary)" }} />} />
                <StatCard label="Phase 3" value={String(phase3Count)} icon={<Beaker size={10} style={{ color: "var(--color-text-tertiary)" }} />} />
                <StatCard label="In Clinic" value={String(pipelines.filter(p => p.stage !== "Pre-clinical" && p.stage !== "Preclinical" && p.stage !== "Discovery").length)} icon={<TestTubes size={10} style={{ color: "var(--color-text-tertiary)" }} />} />
              </div>

              <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--color-border-subtle)" }}>
                <table className="w-full text-12" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--color-bg-tertiary)" }}>
                      <th className="text-left px-3 py-2.5 font-medium text-11 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Product</th>
                      <th className="text-left px-3 py-2.5 font-medium text-11 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Indication</th>
                      <th className="text-left px-3 py-2.5 font-medium text-11 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Stage</th>
                      <th className="text-left px-3 py-2.5 font-medium text-11 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Status</th>
                      <th className="text-left px-3 py-2.5 font-medium text-11 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>NCT ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllPipeline ? sortedPipelines : sortedPipelines.slice(0, 15)).map((p) => (
                      <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                        <td className="px-3 py-2.5 font-medium" style={{ color: "var(--color-text-primary)" }} title={p.product_name}>{p.product_name.length > 80 ? p.product_name.slice(0, 80) + "..." : p.product_name}</td>
                        <td className="px-3 py-2.5" style={{ color: "var(--color-text-secondary)" }}>{p.indication}</td>
                        <td className="px-3 py-2.5"><StageBadge stage={p.stage} /></td>
                        <td className="px-3 py-2.5" style={{ color: "var(--color-text-secondary)" }}>{p.trial_status || "—"}</td>
                        <td className="px-3 py-2.5">
                          {p.nct_id ? (
                            <a
                              href={`https://clinicaltrials.gov/study/${p.nct_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1"
                              style={{ color: "var(--color-accent)" }}
                            >
                              {p.nct_id}
                              <ExternalLink size={10} />
                            </a>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sortedPipelines.length > 15 && (
                <button
                  onClick={() => setShowAllPipeline(!showAllPipeline)}
                  className="text-12 mt-3 flex items-center gap-1 font-medium"
                  style={{ color: "var(--color-accent)" }}
                >
                  {showAllPipeline ? "Show fewer" : `View all ${sortedPipelines.length} programs`} <ChevronRight size={13} style={{ transform: showAllPipeline ? "rotate(90deg)" : undefined }} />
                </button>
              )}

              {pipelines.length === 0 && (
                <div className="py-10 text-center rounded-xl border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
                  <FlaskConical size={28} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)", opacity: 0.4 }} />
                  <p className="text-14 font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>No pipeline data available</p>
                </div>
              )}
            </section>
          )}

          {/* ════════════ FUNDING TAB ════════════ */}
          {activeTab === "Funding" && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} style={{ color: "var(--color-accent)" }} />
                <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Funding History — {company.name}
                </h2>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                <StatCard label="Total Raised" value={totalFundingRaised > 0 ? formatCurrency(totalFundingRaised) : formatCurrency(company.totalRaised)} accent />
                <StatCard label="Rounds" value={String(dbFundingRounds.length || companyFunding.length || "—")} />
                <StatCard label="Last Round" value={dbFundingRounds.length > 0 ? dbFundingRounds[0].round_type : (companyFunding.length > 0 ? companyFunding[0].type : "—")} />
              </div>

              {dbFundingRounds.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <table className="w-full text-12" style={{ borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--color-bg-tertiary)" }}>
                        <th className="text-left px-3 py-2.5 font-medium text-11 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Date</th>
                        <th className="text-left px-3 py-2.5 font-medium text-11 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Round</th>
                        <th className="text-left px-3 py-2.5 font-medium text-11 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Amount</th>
                        <th className="text-left px-3 py-2.5 font-medium text-11 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Lead Investor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbFundingRounds.map((r) => (
                        <tr key={r.id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                          <td className="px-3 py-2.5" style={{ color: "var(--color-text-secondary)" }}>{fmtDate(r.announced_date)}</td>
                          <td className="px-3 py-2.5"><RoundBadge type={r.round_type} /></td>
                          <td className="px-3 py-2.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
                            {r.amount_usd ? formatCurrency(r.amount_usd) : "Undisclosed"}
                          </td>
                          <td className="px-3 py-2.5" style={{ color: "var(--color-text-secondary)" }}>{r.lead_investor || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center rounded-xl border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
                  <TrendingUp size={28} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)", opacity: 0.4 }} />
                  <p className="text-14 font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>No detailed funding records</p>
                  <p className="text-12" style={{ color: "var(--color-text-tertiary)" }}>
                    Total raised: {formatCurrency(company.totalRaised)} {company.isEstimated && "(estimated)"}
                  </p>
                </div>
              )}

              {/* Investors */}
              {report?.investors && report.investors.length > 0 && (
                <div className="mt-5">
                  <SectionCard icon={<Award size={14} style={{ color: "var(--color-accent)" }} />} title="Known Investors">
                    <div className="flex flex-wrap gap-2">
                      {report.investors.map((inv) => (
                        <span key={inv} className="text-12 px-2.5 py-1 rounded-md border" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)", background: "var(--color-bg-secondary)" }}>
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
              <div className="flex items-center gap-2 mb-4">
                <Shield size={16} style={{ color: "var(--color-accent)" }} />
                <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  FDA Approved Drugs — {company.name}
                </h2>
              </div>

              <div className="flex items-center gap-4 mb-5 pb-4 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                <StatCard label="Total Approvals" value={String(fdaApprovals.length)} icon={<Shield size={10} style={{ color: "var(--color-text-tertiary)" }} />} accent />
              </div>

              <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--color-border-subtle)" }}>
                <table className="w-full text-12" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--color-bg-tertiary)" }}>
                      <th className="text-left px-3 py-2.5 font-medium text-11 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Drug Name</th>
                      <th className="text-left px-3 py-2.5 font-medium text-11 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Active Ingredient</th>
                      <th className="text-left px-3 py-2.5 font-medium text-11 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Approval Date</th>
                      <th className="text-left px-3 py-2.5 font-medium text-11 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Type</th>
                      <th className="text-left px-3 py-2.5 font-medium text-11 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Dosage Form</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fdaApprovals.map((a) => (
                      <tr key={a.id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                        <td className="px-3 py-2.5 font-medium" style={{ color: "var(--color-text-primary)" }}>{a.drug_name}</td>
                        <td className="px-3 py-2.5" style={{ color: "var(--color-text-secondary)" }}>{a.active_ingredient || "—"}</td>
                        <td className="px-3 py-2.5" style={{ color: "var(--color-text-secondary)" }}>{fmtDate(a.approval_date)}</td>
                        <td className="px-3 py-2.5">
                          {a.application_type ? (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: "#e8f5f0", color: "#0a3d2e" }}>{a.application_type}</span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2.5" style={{ color: "var(--color-text-secondary)" }}>{a.dosage_form || "—"}</td>
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
              <div className="flex items-center gap-2 mb-4">
                <FileText size={16} style={{ color: "var(--color-accent)" }} />
                <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Publications — {company.name}
                </h2>
              </div>

              <div className="flex items-center gap-4 mb-5 pb-4 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                <StatCard label="Total Publications" value={String(publications.length)} icon={<FileText size={10} style={{ color: "var(--color-text-tertiary)" }} />} />
              </div>

              <div className="space-y-3">
                {publications.map((pub) => (
                  <div key={pub.id} className="p-3 rounded-lg border" style={{ borderColor: "var(--color-border-subtle)" }}>
                    <div className="flex items-start gap-3">
                      <FileText size={14} className="mt-1 flex-shrink-0" style={{ color: "var(--color-accent)" }} />
                      <div className="min-w-0 flex-1">
                        {pub.pmid ? (
                          <a
                            href={`https://pubmed.ncbi.nlm.nih.gov/${pub.pmid}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-13 font-medium hover:underline block"
                            style={{ color: "var(--color-text-primary)", lineHeight: 1.5 }}
                          >
                            {pub.title}
                            <ExternalLink size={10} className="inline ml-1" style={{ verticalAlign: "middle" }} />
                          </a>
                        ) : (
                          <p className="text-13 font-medium" style={{ color: "var(--color-text-primary)", lineHeight: 1.5 }}>{pub.title}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {pub.journal && (
                            <span className="text-11" style={{ color: "var(--color-accent)" }}>{pub.journal}</span>
                          )}
                          {pub.publication_date && (
                            <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>{fmtDate(pub.publication_date)}</span>
                          )}
                        </div>
                        {pub.authors && (
                          <p className="text-11 mt-1 line-clamp-1" style={{ color: "var(--color-text-tertiary)" }}>{pub.authors}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ════════════ PATENTS TAB ════════════ */}
          {activeTab === "Patents" && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <ScrollText size={16} style={{ color: "var(--color-accent)" }} />
                <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Patents — {company.name}
                </h2>
              </div>

              <div className="flex items-center gap-4 mb-5 pb-4 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                <StatCard label="Total Patents" value={String(patents.length)} icon={<ScrollText size={10} style={{ color: "var(--color-text-tertiary)" }} />} />
              </div>

              <div className="space-y-3">
                {patents.map((pat) => (
                  <div key={pat.id} className="p-3 rounded-lg border" style={{ borderColor: "var(--color-border-subtle)" }}>
                    <div className="flex items-start gap-3">
                      <ScrollText size={14} className="mt-1 flex-shrink-0" style={{ color: "var(--color-accent)" }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-13 font-medium" style={{ color: "var(--color-text-primary)", lineHeight: 1.5 }}>{pat.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {pat.patent_number && (
                            <a
                              href={`https://patents.google.com/patent/${pat.patent_number}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-11 flex items-center gap-1"
                              style={{ color: "var(--color-accent)" }}
                            >
                              {pat.patent_number}
                              <ExternalLink size={9} />
                            </a>
                          )}
                          {pat.grant_date && (
                            <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>Granted: {fmtDate(pat.grant_date)}</span>
                          )}
                          {pat.filing_date && (
                            <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>Filed: {fmtDate(pat.filing_date)}</span>
                          )}
                        </div>
                        {pat.abstract && (
                          <p className="text-11 mt-1.5 line-clamp-2" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{pat.abstract}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ════════════ REPORT TAB ════════════ */}
          {activeTab === "Report" && (
            <section>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} style={{ color: "var(--color-accent)" }} />
                <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  AI Deep Analysis
                </h2>
              </div>

              {reportLoading && (
                <div className="mt-6 flex flex-col items-center justify-center py-16">
                  <div className="relative mb-5">
                    <div className="w-12 h-12 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: "var(--color-border-subtle)", borderTopColor: "var(--color-accent)" }} />
                    <Sparkles size={18} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ color: "var(--color-accent)" }} />
                  </div>
                  <h3 className="text-[15px] font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>Generating Intelligence Report</h3>
                  <p className="text-12 max-w-[320px] text-center" style={{ color: "var(--color-text-tertiary)" }}>
                    Analyzing {company.name}&apos;s website, public filings, and clinical data.
                  </p>
                </div>
              )}

              {reportError && !reportLoading && (
                <div className="mt-4 p-4 rounded-lg border" style={{ borderColor: "rgba(192,57,43,0.3)", background: "rgba(192,57,43,0.05)" }}>
                  <p className="text-13 font-medium mb-1" style={{ color: "#c0392b" }}>Report generation failed</p>
                  <p className="text-12" style={{ color: "var(--color-text-secondary)" }}>{reportError}</p>
                  <button onClick={() => handleTabChange("Report")} className="mt-3 text-12 font-medium px-3 py-1.5 rounded-md" style={{ color: "var(--color-accent)", background: "rgba(26,122,94,0.08)" }}>
                    Try again
                  </button>
                </div>
              )}

              {!reportLoading && !reportError && report?.deep_report && (
                <>
                  <p className="text-11 mb-5" style={{ color: "var(--color-text-tertiary)" }}>
                    Generated from public data sources · Last updated {report.analyzed_at ? new Date(report.analyzed_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "recently"}
                  </p>
                  <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
                    <div className="prose prose-sm max-w-none" style={{ color: "var(--color-text-secondary)" }}>
                      {report.deep_report.split("\n").map((line, i) => {
                        if (line.startsWith("# ")) return <h2 key={i} className="text-[18px] font-semibold mt-5 mb-2" style={{ color: "var(--color-text-primary)" }}>{line.replace("# ", "")}</h2>;
                        if (line.startsWith("## ")) return <h3 key={i} className="text-[15px] font-semibold mt-4 mb-2" style={{ color: "var(--color-text-primary)" }}>{line.replace("## ", "")}</h3>;
                        if (line.startsWith("### ")) return <h4 key={i} className="text-14 font-medium mt-3 mb-1" style={{ color: "var(--color-text-primary)" }}>{line.replace("### ", "")}</h4>;
                        if (line.startsWith("- ")) return (
                          <div key={i} className="flex items-start gap-2 mb-1.5 ml-1">
                            <CircleDot size={8} className="mt-1.5 flex-shrink-0" style={{ color: "var(--color-accent)" }} />
                            <span className="text-13" style={{ lineHeight: 1.65 }}>{line.replace("- ", "").replace(/\*\*(.+?)\*\*/g, "$1")}</span>
                          </div>
                        );
                        if (!line.trim()) return <div key={i} className="h-2" />;
                        return <p key={i} className="text-13 mb-2" style={{ lineHeight: 1.7 }}>{line.replace(/\*\*(.+?)\*\*/g, "$1")}</p>;
                      })}
                    </div>
                  </div>
                </>
              )}

              {!reportLoading && !reportError && !report?.deep_report && (
                <div className="mt-6 flex flex-col items-center justify-center py-12">
                  <Sparkles size={28} className="mb-3" style={{ color: "var(--color-text-tertiary)" }} />
                  <p className="text-13 mb-3" style={{ color: "var(--color-text-secondary)" }}>No AI report available yet for {company.name}</p>
                  <button onClick={() => handleTabChange("Report")} className="text-13 font-medium px-4 py-2 rounded-lg" style={{ color: "#fff", background: "var(--color-accent)" }}>
                    Generate Report
                  </button>
                </div>
              )}
            </section>
          )}
        </div>

        {/* ═══ Sidebar ═══ */}
        <div className="w-full lg:w-[280px] border-t lg:border-t-0" style={{ borderColor: "var(--color-border-subtle)" }}>
          {/* Company Info Card */}
          <div className="px-4 py-4 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
            <h3 className="text-11 uppercase tracking-[0.5px] font-semibold mb-3" style={{ color: "var(--color-text-secondary)" }}>
              Company Info
            </h3>
            <div className="flex flex-col gap-2.5">
              {[
                { icon: <Building2 size={12} />, label: "Type", value: report?.business_model || company.type || null },
                { icon: <Calendar size={12} />, label: "Founded", value: (report?.founded || (company.founded > 0 ? company.founded : null)) ? String(report?.founded || company.founded) : null },
                { icon: <Users size={12} />, label: "Employees", value: report?.employee_estimate || (company.employees && company.employees !== "0" ? company.employees : null) },
                { icon: <MapPin size={12} />, label: "Location", value: [report?.headquarters_city || company.city, report?.headquarters_country || company.country].filter(Boolean).join(", ") || null },
                { icon: <Activity size={12} />, label: "Stage", value: derivedStage },
                { icon: <Globe size={12} />, label: "Revenue", value: report?.revenue_status || null },
              ].filter((item) => item.value).map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span style={{ color: "var(--color-text-tertiary)" }}>{item.icon}</span>
                  <span className="text-12 flex-1" style={{ color: "var(--color-text-tertiary)" }}>{item.label}</span>
                  <span className="text-12 font-medium text-right" style={{ color: "var(--color-text-primary)" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stock Info */}
          {isPublic && report?.exchange && (
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
              <h3 className="text-11 uppercase tracking-[0.5px] font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>Trading</h3>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>Ticker</span>
                  <span className="text-12 font-medium" style={{ color: "var(--color-accent)" }}>{company.ticker}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>Exchange</span>
                  <span className="text-12 font-medium" style={{ color: "var(--color-text-primary)" }}>{report.exchange}</span>
                </div>
              </div>
            </div>
          )}

          {/* Contact */}
          {(report?.contact_email || report?.contact_phone || company.website) && (
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
              <h3 className="text-11 uppercase tracking-[0.5px] font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>Contact</h3>
              <div className="flex flex-col gap-2">
                {company.website && (
                  <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="text-12 flex items-center gap-1.5" style={{ color: "var(--color-accent)" }}>
                    <Globe size={12} />
                    {company.website.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                )}
                {report?.contact_email && (
                  <a href={`mailto:${report.contact_email}`} className="text-12 flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                    <Mail size={12} />
                    {report.contact_email}
                  </a>
                )}
                {report?.contact_phone && (
                  <span className="text-12 flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                    <Phone size={12} />
                    {report.contact_phone}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Therapeutic Areas */}
          {report?.therapeutic_areas && report.therapeutic_areas.length > 0 && (
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
              <h3 className="text-11 uppercase tracking-[0.5px] font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>Therapeutic Areas</h3>
              <div className="flex flex-wrap gap-1.5">
                {report.therapeutic_areas.map((area) => (
                  <span key={area} className="text-11 px-2 py-1 rounded-md border" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-accent)", background: "rgba(26,122,94,0.05)" }}>
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sectors */}
          {sectors.length > 0 && (
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
              <h3 className="text-11 uppercase tracking-[0.5px] font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>Sectors</h3>
              <div className="flex flex-wrap gap-1.5">
                {sectors.map((s) => {
                  if (!s.sectors) return null;
                  const { name, slug } = s.sectors;
                  return (
                    <Link
                      key={s.sector_id}
                      href={`/sectors/${slug}`}
                      className="text-10 px-2 py-0.5 rounded-full font-medium transition-opacity duration-150"
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
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
              <h3 className="text-11 uppercase tracking-[0.5px] font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>Partners</h3>
              <div className="flex flex-wrap gap-1.5">
                {report.partners.map((p) => (
                  <span key={p} className="text-11 px-2 py-1 rounded-md border" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)" }}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Similar Companies */}
          {similar.length > 0 && <SimilarCompanies companies={similar} />}

          {/* Claim CTA */}
          <div className="px-4 py-4">
            <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-accent)", background: "rgba(26,122,94,0.04)" }}>
              <div className="text-13 font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>Is this your company?</div>
              <p className="text-11 mb-3" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                Claim your profile to update information, add pipeline data, and connect with investors.
              </p>
              <Link href={`/claim/${company.slug}`} className="inline-flex items-center gap-1 text-12 font-medium px-4 py-2 rounded-lg text-white" style={{ background: "var(--color-accent)" }}>
                Claim profile
                <ChevronRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
