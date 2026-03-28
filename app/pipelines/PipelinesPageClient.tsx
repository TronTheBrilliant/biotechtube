"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { PipelineWatchButton } from "@/components/PipelineWatchButton";
import { ChevronDown, ChevronUp, Calendar, ListChecks, Search } from "lucide-react";

// ── Types ──

interface PipelineRow {
  id: string;
  slug: string | null;
  company_id: string;
  company_name: string;
  product_name: string;
  indication: string | null;
  stage: string | null;
  nct_id: string | null;
  trial_status: string | null;
  conditions: string[] | null;
  start_date: string | null;
  completion_date: string | null;
  company_slug: string | null;
  company_logo_url: string | null;
  company_website: string | null;
}

interface PipelineStats {
  total: number;
  phase3: number;
  recruiting: number;
  approved: number;
  companies: number;
}

interface SponsoredPipeline {
  id: string;
  product_name: string;
  company_name: string | null;
  company_slug: string | null;
  plan: string;
}

interface FeaturedPipeline {
  id: string;
  pipeline_id: string;
  rank: number;
  featured_month: string;
  reason: string | null;
  product_name: string;
  company_name: string;
  company_id: string;
  indication: string | null;
  stage: string | null;
  trial_status: string | null;
  slug: string | null;
  company_slug: string | null;
  company_logo_url: string | null;
  company_website: string | null;
}

interface CuratedWatchlistItem {
  id: string;
  watchlist_id: string;
  pipeline_id: string;
  rank: number | null;
  reason: string | null;
  product_name: string;
  company_name: string;
  company_id: string;
  indication: string | null;
  stage: string | null;
  slug: string | null;
  company_slug: string | null;
  company_logo_url: string | null;
  company_website: string | null;
}

interface CuratedWatchlist {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  category: string;
  items: CuratedWatchlistItem[];
}

interface FDACalendarEntry {
  id: string;
  drug_name: string;
  company_name: string | null;
  company_id: string | null;
  pipeline_id: string | null;
  decision_date: string;
  decision_type: string | null;
  indication: string | null;
  status: string | null;
  slug: string | null;
  company_slug: string | null;
  company_logo_url: string | null;
}

interface Props {
  stats: PipelineStats;
  rows: PipelineRow[];
  sponsored?: SponsoredPipeline[];
  featured?: FeaturedPipeline[];
  watchlists?: CuratedWatchlist[];
  fdaCalendar?: { upcoming: FDACalendarEntry[]; recent: FDACalendarEntry[] };
}

// ── Constants ──

const STAGES = ["All", "Pre-clinical", "Phase 1", "Phase 1/2", "Phase 2", "Phase 2/3", "Phase 3", "Approved"];
const STATUSES = ["All", "Recruiting", "Active", "Completed", "Terminated"];
const ITEMS_PER_PAGE = 50;

type TabId = "curated" | "fda" | "browse";

// ── Helpers ──

function getStageBadgeStyle(stage: string | null): React.CSSProperties {
  switch (stage) {
    case "Pre-clinical": return { background: "#f3f4f6", color: "#4b5563" };
    case "Phase 1": return { background: "#eff6ff", color: "#1d4ed8" };
    case "Phase 1/2": return { background: "#eff6ff", color: "#2563eb" };
    case "Phase 2": return { background: "#faf5ff", color: "#7c3aed" };
    case "Phase 2/3": return { background: "#faf5ff", color: "#7c3aed" };
    case "Phase 3": return { background: "#f0fdf4", color: "#15803d" };
    case "Approved": return { background: "#d1fae5", color: "#065f46" };
    default: return { background: "#f3f4f6", color: "#6b7280" };
  }
}

function getStatusBadgeStyle(status: string | null): React.CSSProperties {
  switch (status) {
    case "Recruiting": return { background: "#dbeafe", color: "#1e40af" };
    case "Active": return { background: "#d1fae5", color: "#065f46" };
    case "Completed": return { background: "#f3f4f6", color: "#374151" };
    case "Terminated": return { background: "#fee2e2", color: "#991b1b" };
    case "Withdrawn": return { background: "#fef3c7", color: "#92400e" };
    default: return { background: "#f3f4f6", color: "#6b7280" };
  }
}

function getDecisionTypeBadgeStyle(type: string | null): React.CSSProperties {
  switch (type?.toUpperCase()) {
    case "PDUFA": return { background: "#eff6ff", color: "#1d4ed8" };
    case "ADCOM": return { background: "#faf5ff", color: "#7c3aed" };
    case "APPROVAL": return { background: "#f0fdf4", color: "#15803d" };
    case "CRL": return { background: "#fee2e2", color: "#991b1b" };
    default: return { background: "#f3f4f6", color: "#6b7280" };
  }
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function getMonthYear(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ── Main Component ──

export function PipelinesPageClient({
  stats,
  rows,
  sponsored = [],
  featured = [],
  watchlists = [],
  fdaCalendar,
}: Props) {
  const hasWatchlists = watchlists.length > 0;
  const hasFDA = fdaCalendar && (fdaCalendar.upcoming.length > 0 || fdaCalendar.recent.length > 0);

  const defaultTab: TabId = hasWatchlists ? "curated" : hasFDA ? "fda" : "browse";
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

  // Browse All state
  const [stageFilter, setStageFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Curated lists state - track expanded sections
  const sizeWatchlists = watchlists.filter((w) => w.category === "size");
  const sectorWatchlists = watchlists.filter((w) => w.category === "sector");
  const orderedWatchlists = [...sizeWatchlists, ...sectorWatchlists];
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(orderedWatchlists.length > 0 ? [orderedWatchlists[0].id] : [])
  );

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Browse All filtering
  const filtered = useMemo(() => {
    let result = rows;
    if (stageFilter !== "All") result = result.filter((r) => r.stage === stageFilter);
    if (statusFilter !== "All") result = result.filter((r) => r.trial_status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.product_name?.toLowerCase().includes(q) ||
          r.indication?.toLowerCase().includes(q) ||
          r.conditions?.some((c) => c.toLowerCase().includes(q)) ||
          r.company_name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, stageFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  // FDA Calendar grouping by month
  const upcomingByMonth = useMemo(() => {
    if (!fdaCalendar) return new Map<string, FDACalendarEntry[]>();
    const grouped = new Map<string, FDACalendarEntry[]>();
    for (const entry of fdaCalendar.upcoming) {
      const key = getMonthYear(entry.decision_date);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(entry);
    }
    return grouped;
  }, [fdaCalendar]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "curated", label: "Curated Lists", icon: <ListChecks size={15} /> },
    { id: "fda", label: "FDA Calendar", icon: <Calendar size={15} /> },
    { id: "browse", label: "Browse All", icon: <Search size={15} /> },
  ];

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
      {/* Header */}
      <h1
        className="text-[32px] md:text-[48px] font-bold tracking-tight"
        style={{ color: "var(--color-text-primary)", letterSpacing: "-1px", lineHeight: 1.1 }}
      >
        Drug Pipeline Intelligence
      </h1>
      <p
        className="text-[15px] md:text-[17px] mt-2 max-w-[640px]"
        style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}
      >
        Track {formatNumber(stats.total)} drugs across {formatNumber(stats.companies)} companies
      </p>

      {/* Tab Pills */}
      <div
        className="flex items-center gap-1 mt-5 p-1 rounded-xl inline-flex"
        style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border-subtle)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 flex items-center gap-1.5"
            style={{
              background: activeTab === tab.id ? "var(--color-accent)" : "transparent",
              color: activeTab === tab.id ? "#fff" : "var(--color-text-secondary)",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB 1: CURATED LISTS ═══ */}
      {activeTab === "curated" && (
        <div className="mt-6 space-y-3">
          {orderedWatchlists.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[14px]" style={{ color: "var(--color-text-tertiary)" }}>
                Curated watchlists are being prepared. Check back soon.
              </p>
            </div>
          ) : (
            <>
              {/* Size-based header */}
              {sizeWatchlists.length > 0 && (
                <div className="mb-1">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>
                    By Market Cap
                  </h2>
                </div>
              )}

              {sizeWatchlists.map((wl) => (
                <WatchlistSection
                  key={wl.id}
                  watchlist={wl}
                  isExpanded={expandedSections.has(wl.id)}
                  onToggle={() => toggleSection(wl.id)}
                />
              ))}

              {/* Sector header */}
              {sectorWatchlists.length > 0 && (
                <div className="mb-1 mt-6">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>
                    By Therapeutic Area
                  </h2>
                </div>
              )}

              {sectorWatchlists.map((wl) => (
                <WatchlistSection
                  key={wl.id}
                  watchlist={wl}
                  isExpanded={expandedSections.has(wl.id)}
                  onToggle={() => toggleSection(wl.id)}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* ═══ TAB 2: FDA CALENDAR ═══ */}
      {activeTab === "fda" && (
        <div className="mt-6">
          {!hasFDA ? (
            <div className="text-center py-12">
              <div className="text-[32px] mb-2">
                <Calendar size={32} style={{ color: "var(--color-text-tertiary)", margin: "0 auto" }} />
              </div>
              <p className="text-[14px]" style={{ color: "var(--color-text-tertiary)" }}>
                FDA calendar data is being populated. Check back soon for upcoming PDUFA dates and advisory committee meetings.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Upcoming decisions */}
              {fdaCalendar!.upcoming.length > 0 && (
                <div>
                  <h2 className="text-[14px] font-bold mb-4" style={{ color: "var(--color-text-primary)" }}>
                    Upcoming FDA Decisions
                  </h2>
                  <div className="space-y-6">
                    {[...upcomingByMonth.entries()].map(([monthLabel, entries]) => (
                      <div key={monthLabel}>
                        <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-tertiary)" }}>
                          {monthLabel}
                        </h3>
                        <div className="relative pl-6 space-y-0">
                          {/* Timeline line */}
                          <div
                            className="absolute left-[7px] top-2 bottom-2 w-[2px]"
                            style={{ background: "var(--color-border-subtle)" }}
                          />
                          {entries.map((entry) => {
                            const days = daysUntil(entry.decision_date);
                            return (
                              <div
                                key={entry.id}
                                className="relative rounded-xl p-4 mb-3 transition-all hover:shadow-sm"
                                style={{
                                  background: "var(--color-bg-secondary)",
                                  border: "1px solid var(--color-border-subtle)",
                                }}
                              >
                                {/* Timeline dot */}
                                <div
                                  className="absolute -left-[19px] top-5 w-3 h-3 rounded-full border-2"
                                  style={{
                                    background: days <= 7 ? "#ef4444" : days <= 30 ? "#f59e0b" : "var(--color-accent)",
                                    borderColor: "var(--color-bg-primary)",
                                  }}
                                />
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <span className="text-[13px] font-bold" style={{ color: "var(--color-text-primary)" }}>
                                        {formatDateShort(entry.decision_date)}
                                      </span>
                                      <span
                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                                        style={{
                                          background: days <= 7 ? "rgba(239,68,68,0.1)" : "rgba(99,102,241,0.08)",
                                          color: days <= 7 ? "#ef4444" : "var(--color-accent)",
                                        }}
                                      >
                                        {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`}
                                      </span>
                                      {entry.decision_type && (
                                        <span
                                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase"
                                          style={getDecisionTypeBadgeStyle(entry.decision_type)}
                                        >
                                          {entry.decision_type}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {entry.slug ? (
                                        <Link
                                          href={`/product/${entry.slug}`}
                                          className="text-[16px] font-bold hover:underline"
                                          style={{ color: "var(--color-text-primary)" }}
                                        >
                                          {entry.drug_name}
                                        </Link>
                                      ) : (
                                        <span className="text-[16px] font-bold" style={{ color: "var(--color-text-primary)" }}>
                                          {entry.drug_name}
                                        </span>
                                      )}
                                      {entry.company_name && (
                                        <>
                                          <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>by</span>
                                          {entry.company_slug ? (
                                            <Link
                                              href={`/company/${entry.company_slug}`}
                                              className="text-[13px] font-medium hover:underline inline-flex items-center gap-1"
                                              style={{ color: "var(--color-accent)" }}
                                            >
                                              {entry.company_logo_url && (
                                                <CompanyAvatar
                                                  name={entry.company_name}
                                                  logoUrl={entry.company_logo_url}
                                                  size={16}
                                                />
                                              )}
                                              {entry.company_name}
                                            </Link>
                                          ) : (
                                            <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                                              {entry.company_name}
                                            </span>
                                          )}
                                        </>
                                      )}
                                    </div>
                                    {entry.indication && (
                                      <p className="text-[12px] mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                                        {entry.indication}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent decisions */}
              {fdaCalendar!.recent.length > 0 && (
                <div>
                  <h2 className="text-[14px] font-bold mb-3 mt-8" style={{ color: "var(--color-text-primary)" }}>
                    Recent Decisions (Last 30 Days)
                  </h2>
                  <div className="space-y-2">
                    {fdaCalendar!.recent.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-lg p-3 flex items-center gap-3 flex-wrap"
                        style={{
                          background: "var(--color-bg-secondary)",
                          border: "1px solid var(--color-border-subtle)",
                        }}
                      >
                        <span className="text-[12px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                          {formatDateShort(entry.decision_date)}
                        </span>
                        {entry.slug ? (
                          <Link href={`/product/${entry.slug}`} className="text-[14px] font-semibold hover:underline" style={{ color: "var(--color-text-primary)" }}>
                            {entry.drug_name}
                          </Link>
                        ) : (
                          <span className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>{entry.drug_name}</span>
                        )}
                        {entry.company_name && (
                          <span className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
                            {entry.company_name}
                          </span>
                        )}
                        {entry.status && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                            style={{
                              background: entry.status.toLowerCase().includes("approved") ? "#d1fae5" : entry.status.toLowerCase().includes("reject") || entry.status.toLowerCase().includes("crl") ? "#fee2e2" : "#f3f4f6",
                              color: entry.status.toLowerCase().includes("approved") ? "#065f46" : entry.status.toLowerCase().includes("reject") || entry.status.toLowerCase().includes("crl") ? "#991b1b" : "#6b7280",
                            }}
                          >
                            {entry.status}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 3: BROWSE ALL ═══ */}
      {activeTab === "browse" && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <StatCard label="Total Products" value={formatNumber(stats.total)} />
            <StatCard label="Phase 3" value={formatNumber(stats.phase3)} />
            <StatCard label="Approved" value={formatNumber(stats.approved)} />
            <StatCard label="Recruiting" value={formatNumber(stats.recruiting)} />
          </div>

          {/* Sponsored */}
          {sponsored.length > 0 && (
            <div className="mt-5 mb-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {sponsored.map((sp) => (
                  <Link
                    key={sp.id}
                    href={sp.company_slug ? `/company/${sp.company_slug}` : "#"}
                    className="rounded-lg p-4 transition-colors duration-150 hover:opacity-90"
                    style={{
                      background: sp.plan === "premium"
                        ? "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.08))"
                        : "var(--color-bg-primary)",
                      border: sp.plan === "premium"
                        ? "1px solid rgba(99,102,241,0.2)"
                        : "1px solid var(--color-border-subtle)",
                    }}
                  >
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}
                    >
                      Sponsored
                    </span>
                    <h4 className="text-[14px] font-semibold mt-1.5" style={{ color: "var(--color-text-primary)" }}>
                      {sp.product_name}
                    </h4>
                    {sp.company_name && (
                      <p className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>{sp.company_name}</p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div
            className="sticky top-0 z-10 py-4 -mx-4 px-4 md:-mx-6 md:px-6"
            style={{ background: "var(--color-bg-primary)" }}
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={stageFilter}
                onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
                className="h-[42px] px-4 pr-10 rounded-lg text-[13px] outline-none"
                style={{
                  background: "var(--color-bg-secondary)",
                  color: "var(--color-text-primary)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s === "All" ? "All Stages" : s}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="h-[42px] px-4 pr-10 rounded-lg text-[13px] outline-none"
                style={{
                  background: "var(--color-bg-secondary)",
                  color: "var(--color-text-primary)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Search product, indication, or company..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="h-[42px] px-4 rounded-lg text-[13px] outline-none flex-1 min-w-[200px]"
                style={{
                  background: "var(--color-bg-secondary)",
                  color: "var(--color-text-primary)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              />
            </div>
          </div>

          {/* Results info */}
          <div className="flex items-center justify-between mt-1 mb-2">
            <span className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
              Showing {filtered.length > 0 ? (safePage - 1) * ITEMS_PER_PAGE + 1 : 0}
              &ndash;{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} of {formatNumber(filtered.length)} results
              {stageFilter === "All" && statusFilter === "All" && !search.trim() && (
                <span> (top 5,000 programs &mdash; use filters to narrow results)</span>
              )}
            </span>
          </div>

          {/* Table */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}
          >
            <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>Product</th>
                    <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: "var(--color-text-tertiary)" }}>Company</th>
                    <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: "var(--color-text-tertiary)" }}>Indication</th>
                    <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>Stage</th>
                    <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: "var(--color-text-tertiary)" }}>Status</th>
                    <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: "var(--color-text-tertiary)" }}>NCT ID</th>
                    <th className="px-3 py-3 text-[12px] font-semibold uppercase tracking-wider w-[50px]" style={{ color: "var(--color-text-tertiary)" }}>
                      <span className="sr-only">Watch</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row) => (
                    <tr
                      key={row.id}
                      className="group transition-colors duration-100 hover:bg-[var(--color-bg-primary)]"
                      style={{ borderBottom: "1px solid var(--color-border)" }}
                    >
                      <td className="px-4 py-3">
                        {row.slug ? (
                          <Link href={`/product/${row.slug}?ref=pipelines`} className="text-[14px] font-semibold block hover:underline" style={{ color: "var(--color-text-primary)" }}>
                            {row.product_name || "Unnamed"}
                          </Link>
                        ) : (
                          <span className="text-[14px] font-semibold block" style={{ color: "var(--color-text-primary)" }}>{row.product_name || "Unnamed"}</span>
                        )}
                        <span className="text-[12px] sm:hidden block mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                          {row.company_slug ? (
                            <Link href={`/company/${row.company_slug}`} style={{ color: "var(--color-accent)" }}>{row.company_name}</Link>
                          ) : row.company_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {row.company_slug ? (
                          <Link href={`/company/${row.company_slug}`} className="flex items-center gap-2 hover:underline">
                            <CompanyAvatar name={row.company_name} logoUrl={row.company_logo_url ?? undefined} website={row.company_website ?? undefined} size={24} />
                            <span className="text-[13px] truncate max-w-[140px]" style={{ color: "var(--color-accent)" }}>{row.company_name}</span>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-2">
                            <CompanyAvatar name={row.company_name} size={24} />
                            <span className="text-[13px] truncate max-w-[140px]" style={{ color: "var(--color-text-primary)" }}>{row.company_name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell max-w-[200px]">
                        <span className="text-[13px] line-clamp-2" style={{ color: "var(--color-text-secondary)" }}>{row.indication || "\u2014"}</span>
                      </td>
                      <td className="px-4 py-3">
                        {row.stage ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[12px] font-medium whitespace-nowrap" style={getStageBadgeStyle(row.stage)}>{row.stage}</span>
                        ) : (
                          <span className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>&mdash;</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {row.trial_status ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[12px] font-medium whitespace-nowrap" style={getStatusBadgeStyle(row.trial_status)}>{row.trial_status}</span>
                        ) : (
                          <span className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>&mdash;</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {row.nct_id ? (
                          <a href={`https://clinicaltrials.gov/study/${row.nct_id}`} target="_blank" rel="noopener noreferrer" className="text-[13px] hover:underline" style={{ color: "var(--color-accent)" }}>
                            {row.nct_id}
                          </a>
                        ) : (
                          <span className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>&mdash;</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <PipelineWatchButton pipelineId={row.id} size={14} />
                      </td>
                    </tr>
                  ))}
                  {paged.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-[14px]" style={{ color: "var(--color-text-tertiary)" }}>
                        No products match your filters. Try broadening your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="h-[34px] px-3 rounded-lg text-[13px] font-medium disabled:opacity-40"
                style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}
              >
                Previous
              </button>
              {getPageNumbers(safePage, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="text-[13px] px-1" style={{ color: "var(--color-text-tertiary)" }}>...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className="h-[34px] w-[34px] rounded-lg text-[13px] font-medium"
                    style={{
                      background: safePage === p ? "var(--color-accent)" : "var(--color-bg-secondary)",
                      color: safePage === p ? "#fff" : "var(--color-text-primary)",
                      border: safePage === p ? "none" : "1px solid var(--color-border)",
                    }}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="h-[34px] px-3 rounded-lg text-[13px] font-medium disabled:opacity-40"
                style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <div className="h-8" />
    </div>
  );
}

// ── Sub-Components ──

function WatchlistSection({
  watchlist,
  isExpanded,
  onToggle,
}: {
  watchlist: CuratedWatchlist;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      {/* Header - clickable */}
      <button
        onClick={onToggle}
        className="w-full px-4 md:px-5 py-4 flex items-center gap-3 text-left hover:bg-[var(--color-bg-primary)] transition-colors"
      >
        {watchlist.icon && (
          <span className="text-[20px] flex-shrink-0">{watchlist.icon}</span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[16px] md:text-[18px] font-bold" style={{ color: "var(--color-text-primary)" }}>
              {watchlist.name}
            </h3>
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: "rgba(99,102,241,0.08)", color: "var(--color-accent)" }}
            >
              {watchlist.items.length} programs
            </span>
          </div>
          {watchlist.description && (
            <p className="text-[13px] mt-0.5 line-clamp-1" style={{ color: "var(--color-text-tertiary)" }}>
              {watchlist.description}
            </p>
          )}
        </div>
        <div className="flex-shrink-0" style={{ color: "var(--color-text-tertiary)" }}>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* Items */}
      {isExpanded && watchlist.items.length > 0 && (
        <div style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
          {watchlist.items.map((item, i) => (
            <div
              key={item.id}
              className="px-4 md:px-5 py-3 flex items-start gap-3 hover:bg-[var(--color-bg-primary)] transition-colors"
              style={
                i < watchlist.items.length - 1
                  ? { borderBottom: "1px solid var(--color-border-subtle)" }
                  : undefined
              }
            >
              {/* Rank */}
              <div
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold mt-0.5"
                style={{
                  background: (item.rank || i + 1) <= 3 ? "var(--color-accent)" : "var(--color-bg-tertiary)",
                  color: (item.rank || i + 1) <= 3 ? "#fff" : "var(--color-text-secondary)",
                }}
              >
                {item.rank || i + 1}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.slug ? (
                    <Link
                      href={`/product/${item.slug}`}
                      className="text-[14px] md:text-[15px] font-bold hover:underline"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {item.product_name}
                    </Link>
                  ) : (
                    <span className="text-[14px] md:text-[15px] font-bold" style={{ color: "var(--color-text-primary)" }}>
                      {item.product_name}
                    </span>
                  )}
                  {item.stage && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={getStageBadgeStyle(item.stage)}
                    >
                      {item.stage}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {item.company_slug ? (
                    <Link
                      href={`/company/${item.company_slug}`}
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      <CompanyAvatar
                        name={item.company_name}
                        logoUrl={item.company_logo_url ?? undefined}
                        website={item.company_website ?? undefined}
                        size={16}
                      />
                      <span className="text-[12px] font-medium" style={{ color: "var(--color-accent)" }}>
                        {item.company_name}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
                      {item.company_name}
                    </span>
                  )}
                  {item.indication && (
                    <>
                      <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>&middot;</span>
                      <span className="text-[12px] line-clamp-1" style={{ color: "var(--color-text-tertiary)" }}>
                        {item.indication}
                      </span>
                    </>
                  )}
                </div>

                {item.reason && (
                  <p className="text-[12px] mt-1 line-clamp-1 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    {item.reason}
                  </p>
                )}
              </div>

              {/* Watch button */}
              <div className="flex-shrink-0 mt-0.5">
                <PipelineWatchButton pipelineId={item.pipeline_id} size={13} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}
    >
      <div className="text-[12px] font-medium uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>
        {label}
      </div>
      <div className="text-[22px] font-bold mt-0.5" style={{ color: "var(--color-text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
