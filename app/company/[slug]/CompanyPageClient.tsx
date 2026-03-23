"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CompanyProfileHero } from "@/components/CompanyProfile";
import { PipelineBar } from "@/components/PipelineBar";
import { FundingTimeline } from "@/components/FundingTimeline";
import { SimilarCompanies } from "@/components/SimilarCompanies";
import { Company, CompanyReport, FundingRound } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";
import {
  Calendar, ExternalLink, TrendingUp, Users,
  FlaskConical, Newspaper, Activity, BarChart3, ArrowUpRight,
  ArrowDownRight, Globe, Mail, Phone, MapPin, Building2,
  Target, ShieldAlert, Swords, Sparkles, BookOpen, Beaker,
  ChevronRight, Award, Zap, CircleDot
} from "lucide-react";
import { TvStockChart } from "@/components/charts/TvStockChart";
import { FundingBarChart } from "@/components/charts/FundingBarChart";

/* ─── Tab config ─── */
const allTabs = ["Overview", "Pipeline", "Report", "Funding", "Team", "News"] as const;
type Tab = (typeof allTabs)[number];

const tabIcons: Record<Tab, string> = {
  Overview: "📋",
  Pipeline: "🧬",
  Report: "📊",
  Funding: "💰",
  Team: "👥",
  News: "📰",
};

/* ─── Stock timescales ─── */
const stockTimescales = ["1W", "1M", "3M", "6M", "1Y", "ALL"] as const;
type Timescale = (typeof stockTimescales)[number];

/* ─── Volume formatter ─── */
function formatVol(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(0) + "K";
  return v.toString();
}

/* ─── Stock data point type ─── */
interface StockPoint {
  date: string;
  fullDate: string;
  isoDate?: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

interface StockMeta {
  currency: string;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  marketCap: number | null;
}

/* ─── Markdown renderer (simple) ─── */
function MarkdownBlock({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeader: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="rounded-lg overflow-x-auto text-[11px] leading-relaxed my-3 p-4"
            style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-secondary)", fontFamily: "monospace" }}
          >
            {codeLines.join("\n")}
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Tables
    if (line.includes("|") && line.trim().startsWith("|")) {
      const cells = line.split("|").filter(Boolean).map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) continue; // separator
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
        tableRows = [];
      } else {
        tableRows.push(cells);
      }
      // Check if next line is NOT a table
      if (i + 1 >= lines.length || !lines[i + 1].trim().startsWith("|")) {
        elements.push(
          <div key={`table-${i}`} className="overflow-x-auto my-4 rounded-lg border" style={{ borderColor: "var(--color-border-subtle)" }}>
            <table className="w-full text-12" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--color-bg-tertiary)" }}>
                  {tableHeader.map((h, hi) => (
                    <th key={hi} className="text-left px-3 py-2 font-medium text-11 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border-subtle)" }}>
                      {h.replace(/\*\*/g, "")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, ri) => (
                  <tr key={ri} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-12" style={{ color: "var(--color-text-secondary)" }}>
                        {cell.replace(/\*\*/g, "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        inTable = false;
        tableHeader = [];
        tableRows = [];
      }
      continue;
    }

    // Headers
    if (line.startsWith("# ")) {
      elements.push(
        <h2 key={i} className="text-[20px] font-semibold mt-6 mb-3 tracking-tight" style={{ color: "var(--color-text-primary)", letterSpacing: "-0.3px" }}>
          {line.replace("# ", "")}
        </h2>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="text-[16px] font-semibold mt-5 mb-2 flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
          <div className="w-1 h-4 rounded-full" style={{ background: "var(--color-accent)" }} />
          {line.replace("## ", "")}
        </h3>
      );
      continue;
    }
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="text-14 font-medium mt-4 mb-2" style={{ color: "var(--color-text-primary)" }}>
          {line.replace("### ", "")}
        </h4>
      );
      continue;
    }

    // Bullet points
    if (line.startsWith("- **")) {
      const match = line.match(/^- \*\*(.+?)\*\*:?\s*(.*)/);
      if (match) {
        elements.push(
          <div key={i} className="flex items-start gap-2 mb-2 ml-1">
            <ChevronRight size={12} className="mt-1 flex-shrink-0" style={{ color: "var(--color-accent)" }} />
            <span className="text-13" style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}>
              <strong style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{match[1]}</strong>
              {match[2] ? `: ${match[2]}` : ""}
            </span>
          </div>
        );
        continue;
      }
    }
    if (line.startsWith("- ")) {
      elements.push(
        <div key={i} className="flex items-start gap-2 mb-1.5 ml-1">
          <CircleDot size={8} className="mt-1.5 flex-shrink-0" style={{ color: "var(--color-accent)" }} />
          <span className="text-13" style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}>
            {line.replace("- ", "").replace(/\*\*(.+?)\*\*/g, "$1")}
          </span>
        </div>
      );
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    // Regular text
    elements.push(
      <p key={i} className="text-13 mb-2" style={{ color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
        {line.replace(/\*\*(.+?)\*\*/g, "$1")}
      </p>
    );
  }

  return <div>{elements}</div>;
}

/* ─── Section Card ─── */
function SectionCard({ icon, title, children, accent = false }: { icon: React.ReactNode; title: string; children: React.ReactNode; accent?: boolean }) {
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
          className="text-12 uppercase tracking-[0.5px] font-semibold"
          style={{ color: accent ? "var(--color-accent)" : "var(--color-text-secondary)" }}
        >
          {title}
        </h3>
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
  companyFunding: FundingRound[];
  similar: Company[];
  report: CompanyReport | null;
  sectors: CompanySector[];
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export function CompanyPageClient({ company, companyFunding, similar, report: initialReport, sectors }: CompanyPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [stockTimescale, setStockTimescale] = useState<Timescale>("ALL");
  const [logScale, setLogScale] = useState(false);

  // On-demand report generation state
  const [report, setReport] = useState<CompanyReport | null>(initialReport);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);



  const isPublic = company.type === "Public" && !!company.ticker;

  // Always show Report tab — generate on-demand if needed
  const tabs = useMemo(() => {
    return allTabs.filter(() => true);
  }, []);

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

  // Trigger on-demand report generation when Report tab is clicked
  const handleTabChange = useCallback(async (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "Report" && !report?.deep_report && !reportLoading) {
      generateReport();
    }
  }, [report, reportLoading, generateReport]);

  // Stock data — fetched from Yahoo Finance via our API
  const [stockData, setStockData] = useState<StockPoint[]>([]);
  const [stockMeta, setStockMeta] = useState<StockMeta | null>(null);
  const [stockLoading, setStockLoading] = useState(false);

  const fetchStockData = useCallback(async (ts: Timescale) => {
    if (!isPublic || !company.ticker) return;
    setStockLoading(true);
    try {
      const exchange = report?.exchange || "";
      const res = await fetch(`/api/stock?ticker=${encodeURIComponent(company.ticker)}&exchange=${encodeURIComponent(exchange)}&name=${encodeURIComponent(company.name)}&timescale=${ts}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setStockData(data.points || []);
      setStockMeta({
        currency: data.currency || "NOK",
        fiftyTwoWeekHigh: data.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekLow: data.fiftyTwoWeekLow ?? null,
        marketCap: data.marketCap ?? null,
      });
    } catch {
      setStockData([]);
    } finally {
      setStockLoading(false);
    }
  }, [isPublic, company.ticker, report?.exchange]);

  useEffect(() => {
    fetchStockData(stockTimescale);
  }, [stockTimescale, fetchStockData]);

  const currency = stockMeta?.currency || "USD";
  const currentPrice = stockData.length > 0 ? stockData[stockData.length - 1].price : 0;
  const firstPrice = stockData.length > 0 ? stockData[0].price : 0;
  const priceChange = currentPrice - firstPrice;
  const priceChangePct = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;
  const lastPoint = stockData.length > 0 ? stockData[stockData.length - 1] : null;
  const high52w = stockMeta?.fiftyTwoWeekHigh ?? (stockData.length > 0 ? Math.max(...stockData.map((d) => d.high)) : 0);
  const low52w = stockMeta?.fiftyTwoWeekLow ?? (stockData.length > 0 ? Math.min(...stockData.map((d) => d.low)) : 0);
  const avgVolume = stockData.length > 0 ? stockData.reduce((s, d) => s + d.volume, 0) / stockData.length : 0;

  // Pipeline — use report data if available, otherwise empty
  const pipeline = useMemo(() => {
    if (report?.pipeline_programs && report.pipeline_programs.length > 0) {
      return report.pipeline_programs.map((p, i) => ({
        name: p.name,
        indication: p.indication,
        stage: p.phase,
        isLead: i === 0,
        status: p.status,
        nctId: p.trial_id,
      }));
    }
    return [];
  }, [report]);

  // Team — use report key_people if available
  const team = useMemo(() => {
    if (report?.key_people && report.key_people.length > 0) {
      return report.key_people.map((p) => ({
        name: p.name,
        role: p.role,
        email: p.email,
        initials: p.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
      }));
    }
    return [];
  }, [report]);

  // Summary text — prefer report summary
  const summaryText = report?.summary || company.description;

  // Funding chart data
  const fundingChartData = useMemo(() => {
    return companyFunding.slice().reverse().map((r) => ({
      label: r.type,
      amount: +(r.amount / 1_000_000).toFixed(1),
      date: r.date,
    }));
  }, [companyFunding]);

  return (
    <div className="page-content min-h-screen" style={{ background: "var(--color-bg-primary)" }}>
      <Nav />

      <CompanyProfileHero company={company} reportSummary={report?.summary} />

      {/* ─── Tab Bar ─── */}
      <div
        className="flex items-center gap-1 px-5 border-b overflow-x-auto"
        style={{ borderColor: "var(--color-border-subtle)", scrollbarWidth: "none" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className="text-13 py-2.5 px-2 transition-all duration-200 border-b-[2px] whitespace-nowrap flex-shrink-0 rounded-t-md"
            style={{
              color: activeTab === tab ? "var(--color-accent)" : "var(--color-text-secondary)",
              borderBottomColor: activeTab === tab ? "var(--color-accent)" : "transparent",
              fontWeight: activeTab === tab ? 600 : 400,
              background: activeTab === tab ? "rgba(26,122,94,0.04)" : "transparent",
            }}
          >
            {tabIcons[tab]} {tab}
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

              {/* Stock Chart */}
              {isPublic && (stockData.length > 0 || stockLoading) && (
                <SectionCard
                  icon={<Activity size={14} style={{ color: "var(--color-accent)" }} />}
                  title={`${company.ticker} · Stock Price`}
                >
                  <div className="mb-2">
                    {/* Row 1: Price + change */}
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[28px] font-medium tracking-tight" style={{ color: "var(--color-text-primary)", letterSpacing: "-0.6px" }}>
                        {currency} {currentPrice.toFixed(2)}
                      </span>
                      <span className="flex items-center gap-0.5 text-13 font-medium" style={{ color: priceChange >= 0 ? "var(--color-accent)" : "#c0392b" }}>
                        {priceChange >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                        {priceChange >= 0 ? "+" : ""}{Math.abs(priceChange).toFixed(2)} ({priceChange >= 0 ? "+" : ""}{priceChangePct.toFixed(2)}%)
                      </span>
                    </div>
                    {/* Row 2: Timescale buttons + LOG toggle */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-0.5">
                        {stockTimescales.map((ts) => (
                          <button
                            key={ts}
                            onClick={() => setStockTimescale(ts)}
                            className="text-[10px] font-medium px-1.5 py-1 rounded transition-all duration-150"
                            style={{
                              background: stockTimescale === ts ? "var(--color-accent)" : "transparent",
                              color: stockTimescale === ts ? "white" : "var(--color-text-tertiary)",
                            }}
                          >
                            {ts}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setLogScale((p) => !p)}
                        className="text-[10px] font-medium px-2 py-1 rounded border transition-all duration-150"
                        style={{
                          background: logScale ? "var(--color-accent)" : "transparent",
                          color: logScale ? "white" : "var(--color-text-tertiary)",
                          borderColor: logScale ? "var(--color-accent)" : "var(--color-border-subtle)",
                        }}
                        title={logScale ? "Switch to linear scale" : "Switch to logarithmic scale"}
                      >
                        LOG
                      </button>
                    </div>
                  </div>
                  {lastPoint && (
                    <div className="flex items-center gap-3 mb-3 text-10" style={{ color: "var(--color-text-tertiary)" }}>
                      <span>O: {lastPoint.open.toFixed(2)}</span>
                      <span>H: {lastPoint.high.toFixed(2)}</span>
                      <span>L: {lastPoint.low.toFixed(2)}</span>
                      <span>C: {lastPoint.price.toFixed(2)}</span>
                      <span>Vol: {formatVol(lastPoint.volume)}</span>
                    </div>
                  )}
                  <TvStockChart
                    data={stockData.map(d => ({ date: d.isoDate || d.fullDate, price: d.price, volume: d.volume }))}
                    isPositive={priceChange >= 0}
                    logScale={logScale}
                    currency={currency || "USD"}
                    height={380}
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    <StatCard label="52-Week High" value={`${currency} ${high52w.toFixed(2)}`} />
                    <StatCard label="52-Week Low" value={`${currency} ${low52w.toFixed(2)}`} />
                    <StatCard label="Avg Volume" value={formatVol(avgVolume)} />
                    <StatCard label="Market Cap" value={stockMeta?.marketCap ? formatCurrency(stockMeta.marketCap, currency) : (company.valuation ? formatCurrency(company.valuation) : "—")} accent />
                  </div>
                  <p className="text-[10px] mt-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Data from Yahoo Finance · 15 min delay
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
                    {report?.deep_report ? "Read full AI report →" : "Generate AI report →"}
                  </button>
                </SectionCard>
              )}

              {/* Technology Platform */}
              {report?.technology_platform && (
                <SectionCard
                  icon={<Beaker size={14} style={{ color: "var(--color-accent)" }} />}
                  title="Technology Platform"
                >
                  <p className="text-13" style={{ color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
                    {report.technology_platform}
                  </p>
                </SectionCard>
              )}

              {/* Key Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {pipeline.length > 0 && (
                  <StatCard label="Programs" value={String(pipeline.length)} icon={<FlaskConical size={10} style={{ color: "var(--color-text-tertiary)" }} />} />
                )}
                {(report?.employee_estimate || (company.employees && company.employees !== "0")) && (
                  <StatCard label="Team Size" value={report?.employee_estimate || company.employees} icon={<Users size={10} style={{ color: "var(--color-text-tertiary)" }} />} />
                )}
                {(report?.founded || company.founded > 0) && (
                  <StatCard label="Founded" value={String(report?.founded || company.founded)} icon={<Calendar size={10} style={{ color: "var(--color-text-tertiary)" }} />} />
                )}
                {company.totalRaised > 0 && (
                  <StatCard label="Total Raised" value={formatCurrency(company.totalRaised)} icon={<TrendingUp size={10} style={{ color: "var(--color-text-tertiary)" }} />} accent />
                )}
              </div>

              {/* Opportunity & Risks */}
              {(report?.opportunities || report?.risks) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  {report.opportunities && (
                    <SectionCard
                      icon={<Target size={14} style={{ color: "var(--color-accent)" }} />}
                      title="Opportunities"
                      accent
                    >
                      <div className="flex flex-col gap-2">
                        {report.opportunities.split(". ").filter(Boolean).map((opp, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Zap size={11} className="mt-1 flex-shrink-0" style={{ color: "var(--color-accent)" }} />
                            <span className="text-12" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                              {opp.endsWith(".") ? opp : `${opp}.`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                  {report.risks && (
                    <SectionCard
                      icon={<ShieldAlert size={14} style={{ color: "#b45309" }} />}
                      title="Risk Factors"
                    >
                      <div className="flex flex-col gap-2">
                        {report.risks.split(". ").filter(Boolean).map((risk, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <ShieldAlert size={11} className="mt-1 flex-shrink-0" style={{ color: "#b45309" }} />
                            <span className="text-12" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                              {risk.endsWith(".") ? risk : `${risk}.`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                </div>
              )}

              {/* Pipeline Snapshot */}
              {pipeline.length > 0 && (
                <SectionCard
                  icon={<FlaskConical size={14} style={{ color: "var(--color-accent)" }} />}
                  title="Pipeline Snapshot"
                >
                  {pipeline.slice(0, 3).map((p) => (
                    <PipelineBar
                      key={p.name + p.indication}
                      name={p.name}
                      indication={p.indication}
                      stage={p.stage}
                      isLead={p.isLead}
                    />
                  ))}
                  {pipeline.length > 3 && (
                    <button
                      onClick={() => handleTabChange("Pipeline")}
                      className="text-12 mt-2 flex items-center gap-1"
                      style={{ color: "var(--color-accent)" }}
                    >
                      View all {pipeline.length} programs →
                    </button>
                  )}
                </SectionCard>
              )}

              {/* Funding Chart */}
              {fundingChartData.length > 0 && (
                <SectionCard
                  icon={<BarChart3 size={14} style={{ color: "var(--color-accent)" }} />}
                  title="Funding Rounds"
                >
                  <FundingBarChart
                    data={fundingChartData}
                    height={180}
                  />
                  <button
                    onClick={() => handleTabChange("Funding")}
                    className="text-12 mt-3 flex items-center gap-1"
                    style={{ color: "var(--color-accent)" }}
                  >
                    View funding details →
                  </button>
                </SectionCard>
              )}

              {/* Competitive Landscape */}
              {report?.competitive_landscape && (
                <SectionCard
                  icon={<Swords size={14} style={{ color: "var(--color-accent)" }} />}
                  title="Competitive Landscape"
                >
                  <p className="text-13" style={{ color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
                    {report.competitive_landscape}
                  </p>
                </SectionCard>
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

              {/* Summary row */}
              {pipeline.length > 0 && (
                <div className="flex items-center gap-4 mb-5 pb-4 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <StatCard label="Programs" value={String(pipeline.length)} icon={<FlaskConical size={10} style={{ color: "var(--color-text-tertiary)" }} />} />
                  <StatCard label="In Clinic" value={String(pipeline.filter((p) => p.stage !== "Pre-clinical").length)} icon={<Beaker size={10} style={{ color: "var(--color-text-tertiary)" }} />} />
                </div>
              )}

              {pipeline.map((p) => (
                <div key={p.name + p.indication} className="mb-5 pb-5 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <PipelineBar name={p.name} indication={p.indication} stage={p.stage} isLead={p.isLead} />
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {p.status && (
                      <div className="rounded-md px-3 py-2 border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
                        <div className="text-10 uppercase tracking-[0.3px] mb-0.5" style={{ color: "var(--color-text-tertiary)" }}>Status</div>
                        <div className="text-12 font-medium" style={{ color: "var(--color-text-primary)" }}>{p.status}</div>
                      </div>
                    )}
                    {p.nctId && (
                      <div className="rounded-md px-3 py-2 border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
                        <div className="text-10 uppercase tracking-[0.3px] mb-0.5" style={{ color: "var(--color-text-tertiary)" }}>Trial ID</div>
                        <a
                          href={`https://clinicaltrials.gov/study/${p.nctId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-12 font-medium flex items-center gap-1"
                          style={{ color: "var(--color-accent)" }}
                        >
                          {p.nctId}
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {pipeline.length === 0 && (
                <div className="py-10 text-center rounded-xl border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
                  <FlaskConical size={28} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)", opacity: 0.4 }} />
                  <p className="text-14 font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>No pipeline data available</p>
                  <p className="text-12" style={{ color: "var(--color-text-tertiary)" }}>
                    <Link href={`/claim/${company.slug}`} style={{ color: "var(--color-accent)" }}>Claim this profile</Link> to add pipeline information.
                  </p>
                </div>
              )}
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

              {/* Loading state — generating report */}
              {reportLoading && (
                <div className="mt-6 flex flex-col items-center justify-center py-16">
                  <div className="relative mb-5">
                    <div
                      className="w-12 h-12 rounded-full border-[3px] border-t-transparent animate-spin"
                      style={{ borderColor: "var(--color-border-subtle)", borderTopColor: "var(--color-accent)" }}
                    />
                    <Sparkles
                      size={18}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                      style={{ color: "var(--color-accent)" }}
                    />
                  </div>
                  <h3 className="text-[15px] font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
                    Generating Intelligence Report
                  </h3>
                  <p className="text-12 max-w-[320px] text-center" style={{ color: "var(--color-text-tertiary)" }}>
                    Analyzing {company.name}&apos;s website, public filings, and clinical data. This typically takes 10-20 seconds.
                  </p>
                </div>
              )}

              {/* Error state */}
              {reportError && !reportLoading && (
                <div className="mt-4 p-4 rounded-lg border" style={{ borderColor: "rgba(192,57,43,0.3)", background: "rgba(192,57,43,0.05)" }}>
                  <p className="text-13 font-medium mb-1" style={{ color: "#c0392b" }}>
                    Report generation failed
                  </p>
                  <p className="text-12" style={{ color: "var(--color-text-secondary)" }}>
                    {reportError}
                  </p>
                  <button
                    onClick={() => handleTabChange("Report")}
                    className="mt-3 text-12 font-medium px-3 py-1.5 rounded-md"
                    style={{ color: "var(--color-accent)", background: "rgba(26,122,94,0.08)" }}
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Report content */}
              {!reportLoading && !reportError && report?.deep_report && (
                <>
                  <p className="text-11 mb-5" style={{ color: "var(--color-text-tertiary)" }}>
                    Generated from public data sources · Last updated {report.analyzed_at ? new Date(report.analyzed_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "recently"}
                  </p>

                  <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
                    <MarkdownBlock content={report.deep_report} />
                  </div>

                  {report.pages_scraped && report.pages_scraped.length > 0 && (
                    <div className="mt-4 px-4 py-3 rounded-lg" style={{ background: "var(--color-bg-tertiary)" }}>
                      <div className="text-10 uppercase tracking-[0.3px] font-medium mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                        Sources ({report.pages_scraped.length} pages analyzed)
                      </div>
                      <div className="flex flex-col gap-1">
                        {report.pages_scraped.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-11 flex items-center gap-1 truncate"
                            style={{ color: "var(--color-accent)" }}
                          >
                            <Globe size={10} className="flex-shrink-0" />
                            {url.replace(/https?:\/\/(www\.)?/, "")}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* No report and not loading — shouldn't normally show since we auto-trigger */}
              {!reportLoading && !reportError && !report?.deep_report && (
                <div className="mt-6 flex flex-col items-center justify-center py-12">
                  <Sparkles size={28} className="mb-3" style={{ color: "var(--color-text-tertiary)" }} />
                  <p className="text-13 mb-3" style={{ color: "var(--color-text-secondary)" }}>
                    No AI report available yet for {company.name}
                  </p>
                  <button
                    onClick={() => handleTabChange("Report")}
                    className="text-13 font-medium px-4 py-2 rounded-lg transition-colors"
                    style={{ color: "#fff", background: "var(--color-accent)" }}
                  >
                    Generate Report
                  </button>
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
                <StatCard label="Total Raised" value={formatCurrency(report?.total_raised_estimate || company.totalRaised)} accent />
                <StatCard label="Rounds" value={String(companyFunding.length || (report?.funding_mentions?.length || "—"))} />
                <StatCard label="Last Round" value={companyFunding.length > 0 ? companyFunding[0].type : "—"} />
              </div>

              {companyFunding.length > 0 ? (
                <FundingTimeline rounds={companyFunding} totalRaised={company.totalRaised} />
              ) : report?.funding_mentions && report.funding_mentions.length > 0 ? (
                <div className="space-y-3">
                  {report.funding_mentions.map((mention, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(26,122,94,0.1)" }}>
                        <TrendingUp size={14} style={{ color: "var(--color-accent)" }} />
                      </div>
                      <p className="text-13" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{mention}</p>
                    </div>
                  ))}
                  <p className="text-11 mt-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Funding data sourced from AI analysis of public records.
                  </p>
                </div>
              ) : (
                <div className="py-10 text-center rounded-xl border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
                  <TrendingUp size={28} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)", opacity: 0.4 }} />
                  <p className="text-14 font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>No public funding records</p>
                  <p className="text-12" style={{ color: "var(--color-text-tertiary)" }}>
                    Total raised: {formatCurrency(company.totalRaised)} {company.isEstimated && "(estimated)"}
                  </p>
                </div>
              )}

              {/* Investors */}
              {report?.investors && report.investors.length > 0 && (
                <div className="mt-5">
                  <SectionCard
                    icon={<Award size={14} style={{ color: "var(--color-accent)" }} />}
                    title="Known Investors"
                  >
                    <div className="flex flex-wrap gap-2">
                      {report.investors.map((inv) => (
                        <span
                          key={inv}
                          className="text-12 px-2.5 py-1 rounded-md border"
                          style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)", background: "var(--color-bg-secondary)" }}
                        >
                          {inv}
                        </span>
                      ))}
                    </div>
                  </SectionCard>
                </div>
              )}

              <div
                className="mt-5 rounded-xl border p-4"
                style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}
              >
                <div className="text-13 font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>Interested in investing?</div>
                <p className="text-12 mb-3" style={{ color: "var(--color-text-secondary)" }}>
                  Express your interest and we&apos;ll connect you when they&apos;re raising.
                </p>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1 text-12 font-medium px-4 py-2 rounded-lg text-white"
                  style={{ background: "var(--color-accent)" }}
                >
                  Express interest
                  <ArrowUpRight size={13} />
                </Link>
              </div>
            </section>
          )}

          {/* ════════════ TEAM TAB ════════════ */}
          {activeTab === "Team" && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Users size={16} style={{ color: "var(--color-accent)" }} />
                <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Leadership Team — {company.name}
                </h2>
              </div>

              {team.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {team.map((member) => (
                    <div
                      key={member.name}
                      className="flex items-start gap-3 p-4 rounded-xl border transition-colors"
                      style={{ borderColor: "var(--color-border-subtle)" }}
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #1a7a5e 0%, #0a3d2e 100%)" }}
                      >
                        <span className="text-12 font-semibold text-white">{member.initials}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-14 font-medium" style={{ color: "var(--color-text-primary)" }}>
                          {member.name}
                        </div>
                        <div className="text-12 mb-1" style={{ color: "var(--color-accent)" }}>
                          {member.role}
                        </div>
                        {member.email && (
                          <a
                            href={`mailto:${member.email}`}
                            className="text-11 flex items-center gap-1"
                            style={{ color: "var(--color-text-tertiary)" }}
                          >
                            <Mail size={10} />
                            {member.email}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center rounded-xl border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
                  <Users size={28} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)", opacity: 0.4 }} />
                  <p className="text-14 font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>No team data available</p>
                  <p className="text-12" style={{ color: "var(--color-text-tertiary)" }}>
                    <Link href={`/claim/${company.slug}`} style={{ color: "var(--color-accent)" }}>Claim this profile</Link> to add team information.
                  </p>
                </div>
              )}

              <div className="mt-4 p-3 rounded-lg" style={{ background: "var(--color-bg-secondary)" }}>
                <p className="text-11" style={{ color: "var(--color-text-tertiary)" }}>
                  Team data sourced from public records and company websites.{" "}
                  <Link href={`/claim/${company.slug}`} style={{ color: "var(--color-accent)" }}>
                    Claim this profile
                  </Link>{" "}
                  to update team information.
                </p>
              </div>
            </section>
          )}

          {/* ════════════ NEWS TAB ════════════ */}
          {activeTab === "News" && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Newspaper size={16} style={{ color: "var(--color-accent)" }} />
                <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  News — {company.name}
                </h2>
              </div>

              <div className="py-10 text-center rounded-xl border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
                <Newspaper size={28} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)", opacity: 0.4 }} />
                <p className="text-14 font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>News monitoring coming soon</p>
                <p className="text-12" style={{ color: "var(--color-text-tertiary)" }}>
                  Our AI news engine is being built. <Link href="/news" style={{ color: "var(--color-accent)" }}>Learn more</Link>
                </p>
              </div>
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
                { icon: <Activity size={12} />, label: "Stage", value: report?.stage || company.stage },
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
              <h3 className="text-11 uppercase tracking-[0.5px] font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>
                Trading
              </h3>
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
              <h3 className="text-11 uppercase tracking-[0.5px] font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>
                Contact
              </h3>
              <div className="flex flex-col gap-2">
                {company.website && (
                  <a
                    href={`https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-12 flex items-center gap-1.5 transition-colors"
                    style={{ color: "var(--color-accent)" }}
                  >
                    <Globe size={12} />
                    {company.website}
                  </a>
                )}
                {report?.contact_email && (
                  <a
                    href={`mailto:${report.contact_email}`}
                    className="text-12 flex items-center gap-1.5"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
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
              <h3 className="text-11 uppercase tracking-[0.5px] font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>
                Therapeutic Areas
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {report.therapeutic_areas.map((area) => (
                  <span
                    key={area}
                    className="text-11 px-2 py-1 rounded-md border"
                    style={{
                      borderColor: "var(--color-border-subtle)",
                      color: "var(--color-accent)",
                      background: "rgba(26,122,94,0.05)",
                    }}
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sectors */}
          {sectors.length > 0 && (
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
              <h3 className="text-11 uppercase tracking-[0.5px] font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>
                Sectors
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {sectors.map((s) => {
                  if (!s.sectors) return null;
                  const { name, slug } = s.sectors;
                  return (
                    <Link
                      key={s.sector_id}
                      href={`/sectors/${slug}`}
                      className="text-10 px-2 py-0.5 rounded-full font-medium transition-opacity duration-150"
                      style={
                        s.is_primary
                          ? { background: "var(--color-accent)", color: "#fff" }
                          : { background: "var(--color-bg-tertiary)", color: "var(--color-text-secondary)" }
                      }
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
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
              <h3 className="text-11 uppercase tracking-[0.5px] font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>
                Partners
              </h3>
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
            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: "var(--color-accent)",
                background: "rgba(26,122,94,0.04)",
                borderWidth: "1px",
              }}
            >
              <div className="text-13 font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
                Is this your company?
              </div>
              <p className="text-11 mb-3" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                Claim your profile to update information, add pipeline data, and connect with investors.
              </p>
              <Link
                href={`/claim/${company.slug}`}
                className="inline-flex items-center gap-1 text-12 font-medium px-4 py-2 rounded-lg text-white"
                style={{ background: "var(--color-accent)" }}
              >
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
