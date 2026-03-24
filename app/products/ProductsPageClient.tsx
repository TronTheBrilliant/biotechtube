"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { ArrowUp, ArrowDown, Minus, Search } from "lucide-react";

interface ProductScoreRow {
  id: string;
  pipeline_id: string;
  product_name: string;
  company_id: string | null;
  hype_score: number;
  clinical_score: number;
  activity_score: number;
  company_score: number;
  novelty_score: number;
  community_score: number;
  trending_direction: string;
  last_calculated: string;
  indication: string | null;
  stage: string | null;
  trial_status: string | null;
  company_name: string | null;
  company_slug: string | null;
  company_logo_url: string | null;
  company_website: string | null;
}

interface Props {
  rows: ProductScoreRow[];
}

const STAGES = [
  "All",
  "Pre-clinical",
  "Phase 1",
  "Phase 1/2",
  "Phase 2",
  "Phase 2/3",
  "Phase 3",
  "Approved",
];

const SCORE_RANGES = [
  { label: "All Scores", min: 0, max: 100 },
  { label: "Hot (80-100)", min: 80, max: 100 },
  { label: "Rising (60-79)", min: 60, max: 79 },
  { label: "Active (40-59)", min: 40, max: 59 },
  { label: "Quiet (0-39)", min: 0, max: 39 },
];

const ITEMS_PER_PAGE = 50;

function getHypeLabel(score: number): { label: string; emoji: string; color: string; bgColor: string; gradient: string } {
  if (score >= 80) return { label: "Hot", emoji: "\uD83D\uDD25", color: "#dc2626", bgColor: "rgba(220,38,38,0.1)", gradient: "linear-gradient(90deg, #ef4444, #f97316)" };
  if (score >= 60) return { label: "Rising", emoji: "\uD83D\uDCC8", color: "#16a34a", bgColor: "rgba(22,163,74,0.1)", gradient: "linear-gradient(90deg, #22c55e, #16a34a)" };
  if (score >= 40) return { label: "Active", emoji: "\u26A1", color: "#2563eb", bgColor: "rgba(37,99,235,0.1)", gradient: "linear-gradient(90deg, #3b82f6, #2563eb)" };
  return { label: "Quiet", emoji: "\uD83D\uDCA4", color: "#9ca3af", bgColor: "rgba(156,163,175,0.1)", gradient: "linear-gradient(90deg, #d1d5db, #9ca3af)" };
}

function getStageBadgeStyle(stage: string | null): React.CSSProperties {
  switch (stage) {
    case "Pre-clinical":
      return { background: "#f3f4f6", color: "#4b5563" };
    case "Phase 1":
      return { background: "#eff6ff", color: "#1d4ed8" };
    case "Phase 1/2":
      return { background: "#eff6ff", color: "#2563eb" };
    case "Phase 2":
      return { background: "#faf5ff", color: "#7c3aed" };
    case "Phase 2/3":
      return { background: "#faf5ff", color: "#7c3aed" };
    case "Phase 3":
      return { background: "#f0fdf4", color: "#15803d" };
    case "Approved":
      return { background: "#d1fae5", color: "#065f46" };
    default:
      return { background: "#f3f4f6", color: "#6b7280" };
  }
}

function TrendingArrow({ direction }: { direction: string }) {
  if (direction === "up")
    return <ArrowUp size={14} style={{ color: "#16a34a" }} />;
  if (direction === "down")
    return <ArrowDown size={14} style={{ color: "#dc2626" }} />;
  return <Minus size={14} style={{ color: "#9ca3af" }} />;
}

function HypeBar({ score }: { score: number }) {
  const { gradient, color } = getHypeLabel(score);
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 rounded-full flex-shrink-0"
        style={{
          width: 60,
          background: "var(--color-bg-tertiary)",
          overflow: "hidden",
        }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${score}%`,
            background: gradient,
          }}
        />
      </div>
      <span
        className="text-13 font-bold tabular-nums"
        style={{ color, minWidth: 24 }}
      >
        {score}
      </span>
    </div>
  );
}

export function ProductsPageClient({ rows }: Props) {
  const [stageFilter, setStageFilter] = useState("All");
  const [scoreRange, setScoreRange] = useState(0); // index into SCORE_RANGES
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = rows;
    if (stageFilter !== "All") {
      result = result.filter((r) => r.stage === stageFilter);
    }
    const range = SCORE_RANGES[scoreRange];
    if (range.min > 0 || range.max < 100) {
      result = result.filter(
        (r) => r.hype_score >= range.min && r.hype_score <= range.max
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.product_name.toLowerCase().includes(q) ||
          (r.company_name && r.company_name.toLowerCase().includes(q)) ||
          (r.indication && r.indication.toLowerCase().includes(q))
      );
    }
    return result;
  }, [rows, stageFilter, scoreRange, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Stats
  const hotCount = rows.filter((r) => r.hype_score >= 80).length;
  const risingCount = rows.filter(
    (r) => r.hype_score >= 60 && r.hype_score < 80
  ).length;
  const activeCount = rows.filter(
    (r) => r.hype_score >= 40 && r.hype_score < 60
  ).length;

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-[28px] md:text-[36px] font-bold tracking-tight"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
        >
          Biotech Product Rankings
        </h1>
        <p
          className="text-[14px] md:text-[16px] mt-1"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Discover the most promising drugs, therapies, and health technologies
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div
          className="rounded-lg p-3"
          style={{
            background: "var(--color-bg-primary)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <div
            className="text-11 font-semibold uppercase tracking-wider mb-1"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Total Ranked
          </div>
          <div
            className="text-[22px] font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {rows.length.toLocaleString()}
          </div>
        </div>
        <div
          className="rounded-lg p-3"
          style={{
            background: "rgba(220,38,38,0.05)",
            border: "1px solid rgba(220,38,38,0.15)",
          }}
        >
          <div
            className="text-11 font-semibold uppercase tracking-wider mb-1"
            style={{ color: "#dc2626" }}
          >
            {"\uD83D\uDD25"} Hot Products
          </div>
          <div className="text-[22px] font-bold" style={{ color: "#dc2626" }}>
            {hotCount.toLocaleString()}
          </div>
        </div>
        <div
          className="rounded-lg p-3"
          style={{
            background: "rgba(22,163,74,0.05)",
            border: "1px solid rgba(22,163,74,0.15)",
          }}
        >
          <div
            className="text-11 font-semibold uppercase tracking-wider mb-1"
            style={{ color: "#16a34a" }}
          >
            {"\uD83D\uDCC8"} Rising
          </div>
          <div className="text-[22px] font-bold" style={{ color: "#16a34a" }}>
            {risingCount.toLocaleString()}
          </div>
        </div>
        <div
          className="rounded-lg p-3"
          style={{
            background: "rgba(37,99,235,0.05)",
            border: "1px solid rgba(37,99,235,0.15)",
          }}
        >
          <div
            className="text-11 font-semibold uppercase tracking-wider mb-1"
            style={{ color: "#2563eb" }}
          >
            {"\u26A1"} Active
          </div>
          <div className="text-[22px] font-bold" style={{ color: "#2563eb" }}>
            {activeCount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div
        className="rounded-lg p-4 mb-4"
        style={{
          background: "var(--color-bg-primary)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--color-text-tertiary)" }}
            />
            <input
              type="text"
              placeholder="Search product, company, or indication..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 rounded-md text-13 outline-none"
              style={{
                background: "var(--color-bg-secondary)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            />
          </div>

          {/* Stage filter */}
          <select
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-md text-13 outline-none cursor-pointer"
            style={{
              background: "var(--color-bg-secondary)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border-subtle)",
            }}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All Stages" : s}
              </option>
            ))}
          </select>

          {/* Score range filter */}
          <select
            value={scoreRange}
            onChange={(e) => {
              setScoreRange(Number(e.target.value));
              setPage(1);
            }}
            className="px-3 py-2 rounded-md text-13 outline-none cursor-pointer"
            style={{
              background: "var(--color-bg-secondary)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border-subtle)",
            }}
          >
            {SCORE_RANGES.map((r, i) => (
              <option key={i} value={i}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-12"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {filtered.length.toLocaleString()} products
        </span>
        <span
          className="text-11"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          Page {page} of {totalPages || 1}
        </span>
      </div>

      {/* Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: "var(--color-bg-primary)",
          boxShadow:
            "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px var(--color-border-subtle)",
        }}
      >
        {/* Table header */}
        <div
          className="hidden md:grid items-center px-4 py-2.5"
          style={{
            gridTemplateColumns: "48px 1fr 180px 100px 160px 40px",
            borderBottom: "1px solid var(--color-border-subtle)",
            background: "var(--color-bg-secondary)",
          }}
        >
          <span
            className="text-11 font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            #
          </span>
          <span
            className="text-11 font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Product
          </span>
          <span
            className="text-11 font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Company
          </span>
          <span
            className="text-11 font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Stage
          </span>
          <span
            className="text-11 font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Hype Score
          </span>
          <span
            className="text-11 font-semibold uppercase tracking-wider text-center"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {"\u2191\u2193"}
          </span>
        </div>

        {/* Rows */}
        {paged.length === 0 && (
          <div
            className="px-4 py-12 text-center text-14"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            No products found matching your filters.
          </div>
        )}

        {paged.map((row, i) => {
          const rank = (page - 1) * ITEMS_PER_PAGE + i + 1;
          const hype = getHypeLabel(row.hype_score);

          return (
            <div
              key={row.id}
              className="group transition-colors duration-100 hover:bg-[var(--color-bg-secondary)]"
              style={{
                borderBottom:
                  i < paged.length - 1
                    ? "0.5px solid var(--color-border-subtle)"
                    : undefined,
              }}
            >
              {/* Desktop row */}
              <div
                className="hidden md:grid items-center px-4 py-3"
                style={{
                  gridTemplateColumns: "48px 1fr 180px 100px 160px 40px",
                }}
              >
                {/* Rank */}
                <span
                  className="text-13 font-bold tabular-nums"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  {rank}
                </span>

                {/* Product */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px]">{hype.emoji}</span>
                    <Link
                      href={
                        row.company_slug
                          ? `/company/${row.company_slug}`
                          : "#"
                      }
                      className="text-13 font-semibold truncate hover:underline"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {row.product_name}
                    </Link>
                  </div>
                  {row.indication && (
                    <p
                      className="text-11 truncate mt-0.5"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      {row.indication}
                    </p>
                  )}
                </div>

                {/* Company */}
                <div className="flex items-center gap-2 min-w-0">
                  {row.company_slug && (
                    <CompanyAvatar
                      name={row.company_name || ""}
                      logoUrl={row.company_logo_url}
                      website={row.company_website}
                      size={22}
                    />
                  )}
                  <Link
                    href={
                      row.company_slug
                        ? `/company/${row.company_slug}`
                        : "#"
                    }
                    className="text-12 truncate hover:underline"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {row.company_name || "—"}
                  </Link>
                </div>

                {/* Stage badge */}
                <div>
                  {row.stage && (
                    <span
                      className="text-10 px-2 py-0.5 rounded-full font-semibold"
                      style={getStageBadgeStyle(row.stage)}
                    >
                      {row.stage}
                    </span>
                  )}
                </div>

                {/* Hype Score */}
                <HypeBar score={row.hype_score} />

                {/* Trending */}
                <div className="flex justify-center">
                  <TrendingArrow direction={row.trending_direction} />
                </div>
              </div>

              {/* Mobile row */}
              <div className="md:hidden px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className="text-12 font-bold tabular-nums"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        #{rank}
                      </span>
                      <span className="text-[11px]">{hype.emoji}</span>
                      <Link
                        href={
                          row.company_slug
                            ? `/company/${row.company_slug}`
                            : "#"
                        }
                        className="text-13 font-semibold truncate hover:underline"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {row.product_name}
                      </Link>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {row.company_name && (
                        <span
                          className="text-11"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {row.company_name}
                        </span>
                      )}
                      {row.stage && (
                        <span
                          className="text-9 px-1.5 py-0.5 rounded-full font-semibold"
                          style={getStageBadgeStyle(row.stage)}
                        >
                          {row.stage}
                        </span>
                      )}
                    </div>
                    {row.indication && (
                      <p
                        className="text-10 truncate mt-0.5"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        {row.indication}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <HypeBar score={row.hype_score} />
                    <TrendingArrow direction={row.trending_direction} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-md text-12 font-medium transition-colors"
            style={{
              background: page === 1 ? "var(--color-bg-secondary)" : "var(--color-bg-primary)",
              color: page === 1 ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
              border: "1px solid var(--color-border-subtle)",
              cursor: page === 1 ? "not-allowed" : "pointer",
              opacity: page === 1 ? 0.5 : 1,
            }}
          >
            Previous
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 7) {
              pageNum = i + 1;
            } else if (page <= 4) {
              pageNum = i + 1;
            } else if (page >= totalPages - 3) {
              pageNum = totalPages - 6 + i;
            } else {
              pageNum = page - 3 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className="w-8 h-8 rounded-md text-12 font-medium transition-colors"
                style={{
                  background:
                    page === pageNum
                      ? "var(--color-accent)"
                      : "var(--color-bg-primary)",
                  color: page === pageNum ? "white" : "var(--color-text-primary)",
                  border:
                    page === pageNum
                      ? "none"
                      : "1px solid var(--color-border-subtle)",
                }}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-md text-12 font-medium transition-colors"
            style={{
              background: page === totalPages ? "var(--color-bg-secondary)" : "var(--color-bg-primary)",
              color: page === totalPages ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
              border: "1px solid var(--color-border-subtle)",
              cursor: page === totalPages ? "not-allowed" : "pointer",
              opacity: page === totalPages ? 0.5 : 1,
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Score legend */}
      <div
        className="mt-8 rounded-lg p-4"
        style={{
          background: "var(--color-bg-primary)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        <h3
          className="text-12 font-bold uppercase tracking-wider mb-3"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          How Hype Scores Work
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <span
              className="text-11 font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626" }}
            >
              80-100
            </span>
            <span
              className="text-12"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {"\uD83D\uDD25"} Hot
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-11 font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a" }}
            >
              60-79
            </span>
            <span
              className="text-12"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {"\uD83D\uDCC8"} Rising
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-11 font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(37,99,235,0.1)", color: "#2563eb" }}
            >
              40-59
            </span>
            <span
              className="text-12"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {"\u26A1"} Active
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-11 font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(156,163,175,0.1)", color: "#9ca3af" }}
            >
              0-39
            </span>
            <span
              className="text-12"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {"\uD83D\uDCA4"} Quiet
            </span>
          </div>
        </div>
        <p
          className="text-11 mt-3"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          Scores are calculated from clinical stage, trial activity, company
          strength, and product novelty. Updated periodically.
        </p>
      </div>
    </div>
  );
}
