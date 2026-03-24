"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { PipelineWatchButton } from "@/components/PipelineWatchButton";

interface PipelineRow {
  id: string;
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

interface Props {
  stats: PipelineStats;
  rows: PipelineRow[];
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

const STATUSES = ["All", "Recruiting", "Active", "Completed", "Terminated"];

const ITEMS_PER_PAGE = 50;

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

function getStatusBadgeStyle(status: string | null): React.CSSProperties {
  switch (status) {
    case "Recruiting":
      return { background: "#dbeafe", color: "#1e40af" };
    case "Active":
      return { background: "#d1fae5", color: "#065f46" };
    case "Completed":
      return { background: "#f3f4f6", color: "#374151" };
    case "Terminated":
      return { background: "#fee2e2", color: "#991b1b" };
    case "Withdrawn":
      return { background: "#fef3c7", color: "#92400e" };
    default:
      return { background: "#f3f4f6", color: "#6b7280" };
  }
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function PipelinesPageClient({ stats, rows }: Props) {
  const [stageFilter, setStageFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = rows;
    if (stageFilter !== "All") {
      result = result.filter((r) => r.stage === stageFilter);
    }
    if (statusFilter !== "All") {
      result = result.filter((r) => r.trial_status === statusFilter);
    }
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
  const paged = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const handleStageChange = (v: string) => {
    setStageFilter(v);
    setPage(1);
  };
  const handleStatusChange = (v: string) => {
    setStatusFilter(v);
    setPage(1);
  };
  const handleSearchChange = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
      {/* Header */}
      <h1
        className="text-[32px] md:text-[48px] font-bold tracking-tight"
        style={{
          color: "var(--color-text-primary)",
          letterSpacing: "-1px",
          lineHeight: 1.1,
        }}
      >
        Drug Pipeline Tracker
      </h1>
      <p
        className="text-[15px] md:text-[17px] mt-2 max-w-[640px]"
        style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}
      >
        {formatNumber(stats.total)} drugs and therapies in development across{" "}
        {formatNumber(stats.companies)} companies
      </p>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        <StatCard label="Total Products" value={formatNumber(stats.total)} />
        <StatCard label="Phase 3" value={formatNumber(stats.phase3)} />
        <StatCard label="Approved" value={formatNumber(stats.approved)} />
        <StatCard label="Recruiting" value={formatNumber(stats.recruiting)} />
      </div>

      {/* Filters — sticky on scroll */}
      <div
        className="sticky top-0 z-10 py-4 -mx-4 px-4 md:-mx-6 md:px-6"
        style={{ background: "var(--color-bg-primary)" }}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={stageFilter}
            onChange={(e) => handleStageChange(e.target.value)}
            className="h-[42px] px-4 pr-10 rounded-lg text-[13px] outline-none"
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

          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="h-[42px] px-4 pr-10 rounded-lg text-[13px] outline-none"
            style={{
              background: "var(--color-bg-secondary)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border-subtle)",
            }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All Statuses" : s}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search product, indication, or company..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
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
        <span
          className="text-[13px]"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          Showing {filtered.length > 0 ? (safePage - 1) * ITEMS_PER_PAGE + 1 : 0}
          &ndash;
          {Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} of{" "}
          {formatNumber(filtered.length)} results
          {stageFilter === "All" &&
            statusFilter === "All" &&
            !search.trim() && (
              <span>
                {" "}
                (top 5,000 programs &mdash; use filters to narrow results)
              </span>
            )}
        </span>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <table className="w-full text-left">
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <th
                  className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  Product
                </th>
                <th
                  className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider hidden sm:table-cell"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  Company
                </th>
                <th
                  className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider hidden md:table-cell"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  Indication
                </th>
                <th
                  className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  Stage
                </th>
                <th
                  className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider hidden lg:table-cell"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  Status
                </th>
                <th
                  className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider hidden lg:table-cell"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  NCT ID
                </th>
                <th
                  className="px-3 py-3 text-[12px] font-semibold uppercase tracking-wider w-[50px]"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  <span className="sr-only">Watch</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((row) => (
                <tr
                  key={row.id}
                  className="group transition-colors duration-100 hover:bg-[var(--color-bg-primary)]"
                  style={{
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  {/* Product + Company (mobile) */}
                  <td className="px-4 py-3">
                    <span
                      className="text-[14px] font-semibold block"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {row.product_name || "Unnamed"}
                    </span>
                    {/* Show company on mobile under product name */}
                    <span
                      className="text-[12px] sm:hidden block mt-0.5"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {row.company_slug ? (
                        <Link
                          href={`/company/${row.company_slug}`}
                          style={{ color: "var(--color-accent)" }}
                        >
                          {row.company_name}
                        </Link>
                      ) : (
                        row.company_name
                      )}
                    </span>
                  </td>

                  {/* Company with logo */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {row.company_slug ? (
                      <Link
                        href={`/company/${row.company_slug}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <CompanyAvatar
                          name={row.company_name}
                          logoUrl={row.company_logo_url ?? undefined}
                          website={row.company_website ?? undefined}
                          size={24}
                        />
                        <span
                          className="text-[13px] truncate max-w-[140px]"
                          style={{ color: "var(--color-accent)" }}
                        >
                          {row.company_name}
                        </span>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CompanyAvatar
                          name={row.company_name}
                          size={24}
                        />
                        <span
                          className="text-[13px] truncate max-w-[140px]"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {row.company_name}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Indication */}
                  <td className="px-4 py-3 hidden md:table-cell max-w-[200px]">
                    <span
                      className="text-[13px] line-clamp-2"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {row.indication || "\u2014"}
                    </span>
                  </td>

                  {/* Stage Badge */}
                  <td className="px-4 py-3">
                    {row.stage ? (
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-[12px] font-medium whitespace-nowrap"
                        style={getStageBadgeStyle(row.stage)}
                      >
                        {row.stage}
                      </span>
                    ) : (
                      <span
                        className="text-[13px]"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        &mdash;
                      </span>
                    )}
                  </td>

                  {/* Trial Status Badge */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {row.trial_status ? (
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-[12px] font-medium whitespace-nowrap"
                        style={getStatusBadgeStyle(row.trial_status)}
                      >
                        {row.trial_status}
                      </span>
                    ) : (
                      <span
                        className="text-[13px]"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        &mdash;
                      </span>
                    )}
                  </td>

                  {/* NCT ID */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {row.nct_id ? (
                      <a
                        href={`https://clinicaltrials.gov/study/${row.nct_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] hover:underline"
                        style={{ color: "var(--color-accent)" }}
                      >
                        {row.nct_id}
                      </a>
                    ) : (
                      <span
                        className="text-[13px]"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        &mdash;
                      </span>
                    )}
                  </td>

                  {/* Watch */}
                  <td className="px-3 py-3 text-center">
                    <PipelineWatchButton pipelineId={row.id} size={14} />
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-[14px]"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
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
            style={{
              background: "var(--color-bg-secondary)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border)",
            }}
          >
            Previous
          </button>

          {getPageNumbers(safePage, totalPages).map((p, i) =>
            p === "..." ? (
              <span
                key={`ellipsis-${i}`}
                className="text-[13px] px-1"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p as number)}
                className="h-[34px] w-[34px] rounded-lg text-[13px] font-medium"
                style={{
                  background:
                    safePage === p
                      ? "var(--color-accent)"
                      : "var(--color-bg-secondary)",
                  color:
                    safePage === p ? "#fff" : "var(--color-text-primary)",
                  border:
                    safePage === p
                      ? "none"
                      : "1px solid var(--color-border)",
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
            style={{
              background: "var(--color-bg-secondary)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border)",
            }}
          >
            Next
          </button>
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div
        className="text-[12px] font-medium uppercase tracking-wider"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        {label}
      </div>
      <div
        className="text-[22px] font-bold mt-0.5"
        style={{ color: "var(--color-text-primary)" }}
      >
        {value}
      </div>
    </div>
  );
}

function getPageNumbers(
  current: number,
  total: number
): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
