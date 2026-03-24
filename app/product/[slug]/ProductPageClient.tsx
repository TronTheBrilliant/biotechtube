"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowUp,
  ArrowDown,
  Minus,
  ExternalLink,
  Eye,
  Users,
  Building2,
  FlaskConical,
  Calendar,
  FileText,
  ChevronRight,
} from "lucide-react";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { PipelineWatchButton } from "@/components/PipelineWatchButton";
import { createBrowserClient } from "@/lib/supabase";

/* ─── Types ─── */

interface Pipeline {
  id: string;
  slug: string;
  product_name: string;
  company_id: string;
  company_name: string;
  indication: string | null;
  stage: string | null;
  nct_id: string | null;
  trial_status: string | null;
  conditions: string[] | null;
  start_date: string | null;
  completion_date: string | null;
}

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  country: string | null;
  type: string | null;
  ticker: string | null;
  description: string | null;
}

interface ProductScore {
  hype_score: number;
  clinical_score: number;
  activity_score: number;
  company_score: number;
  novelty_score: number;
  community_score: number;
  trending_direction: string;
}

interface RelatedTrial {
  id: string;
  slug: string;
  product_name: string;
  indication: string | null;
  stage: string | null;
  nct_id: string | null;
  trial_status: string | null;
  start_date: string | null;
  completion_date: string | null;
}

interface CompetingProduct {
  id: string;
  slug: string;
  product_name: string;
  company_name: string;
  company_id: string;
  indication: string | null;
  stage: string | null;
  hype_score: number;
}

interface CompanyProduct {
  pipeline_id: string;
  product_name: string;
  hype_score: number;
  slug: string | null;
  stage: string | null;
}

interface Props {
  product: Pipeline;
  company: Company | null;
  productScore: ProductScore | null;
  relatedTrials: RelatedTrial[];
  competingProducts: CompetingProduct[];
  viewCount7d: number;
  watchlistCount: number;
  marketCap: number | null;
  companyTopProducts: CompanyProduct[];
}

/* ─── Helpers ─── */

const STAGE_TIMELINE = ["Pre-clinical", "Phase 1", "Phase 2", "Phase 3", "Approved"];

function getStageIndex(stage: string | null): number {
  if (!stage) return -1;
  if (stage === "Phase 1/2") return 1;
  if (stage === "Phase 2/3") return 2;
  return STAGE_TIMELINE.indexOf(stage);
}

function getStageBadgeStyle(stage: string | null): React.CSSProperties {
  switch (stage) {
    case "Pre-clinical":
      return { background: "#f3f4f6", color: "#4b5563" };
    case "Phase 1":
    case "Phase 1/2":
      return { background: "#eff6ff", color: "#1d4ed8" };
    case "Phase 2":
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

function getHypeLabel(score: number) {
  if (score >= 80)
    return { label: "Hot", emoji: "\uD83D\uDD25", color: "#dc2626", bg: "rgba(220,38,38,0.08)", gradient: "linear-gradient(90deg, #ef4444, #f97316)" };
  if (score >= 60)
    return { label: "Rising", emoji: "\uD83D\uDCC8", color: "#16a34a", bg: "rgba(22,163,74,0.08)", gradient: "linear-gradient(90deg, #22c55e, #16a34a)" };
  if (score >= 40)
    return { label: "Active", emoji: "\u26A1", color: "#2563eb", bg: "rgba(37,99,235,0.08)", gradient: "linear-gradient(90deg, #3b82f6, #2563eb)" };
  return { label: "Quiet", emoji: "\uD83D\uDCA4", color: "#9ca3af", bg: "rgba(156,163,175,0.08)", gradient: "linear-gradient(90deg, #d1d5db, #9ca3af)" };
}

function formatDate(d: string | null): string {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMarketCap(mc: number | null): string {
  if (!mc) return "\u2014";
  if (mc >= 1e12) return `$${(mc / 1e12).toFixed(1)}T`;
  if (mc >= 1e9) return `$${(mc / 1e9).toFixed(1)}B`;
  if (mc >= 1e6) return `$${(mc / 1e6).toFixed(0)}M`;
  return `$${mc.toLocaleString()}`;
}

function TrendingBadge({ direction, score }: { direction: string; score: number }) {
  const hype = getHypeLabel(score);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: hype.bg, color: hype.color }}
    >
      {hype.emoji} {hype.label}
      {direction === "up" && <ArrowUp size={11} />}
      {direction === "down" && <ArrowDown size={11} />}
      {direction !== "up" && direction !== "down" && <Minus size={11} />}
    </span>
  );
}

/* ─── Main Component ─── */

export function ProductPageClient({
  product,
  company,
  productScore,
  relatedTrials,
  competingProducts,
  viewCount7d,
  watchlistCount,
  marketCap,
  companyTopProducts,
}: Props) {
  const hypeScore = productScore?.hype_score ?? 0;
  const hype = getHypeLabel(hypeScore);
  const stageIdx = getStageIndex(product.stage);

  // Track view on mount
  useEffect(() => {
    const supabase = createBrowserClient();
    const source =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("ref") || "direct"
        : "direct";

    supabase
      .from("product_views")
      .insert({ pipeline_id: product.id, source })
      .then(() => {});
  }, [product.id]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[12px] mb-4" style={{ color: "var(--color-text-tertiary)" }}>
        <Link href="/products" className="hover:underline" style={{ color: "var(--color-text-tertiary)" }}>
          Products
        </Link>
        <ChevronRight size={12} />
        {company && (
          <>
            <Link
              href={`/company/${company.slug}`}
              className="hover:underline"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {company.name}
            </Link>
            <ChevronRight size={12} />
          </>
        )}
        <span style={{ color: "var(--color-text-secondary)" }}>{product.product_name}</span>
      </nav>

      {/* ─── HEADER ─── */}
      <div
        className="rounded-xl p-5 md:p-6 mb-6"
        style={{
          background: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
          {/* Left: Product info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1
                className="text-[28px] md:text-[36px] font-bold tracking-tight"
                style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px", lineHeight: 1.1 }}
              >
                {product.product_name}
              </h1>
              {product.stage && (
                <span
                  className="px-2.5 py-1 rounded-full text-[12px] font-semibold"
                  style={getStageBadgeStyle(product.stage)}
                >
                  {product.stage}
                </span>
              )}
              {product.trial_status && (
                <span
                  className="px-2.5 py-1 rounded-full text-[12px] font-semibold"
                  style={getStatusBadgeStyle(product.trial_status)}
                >
                  {product.trial_status}
                </span>
              )}
            </div>

            {/* Company row */}
            {company && (
              <Link
                href={`/company/${company.slug}`}
                className="inline-flex items-center gap-2 hover:underline mb-3"
              >
                <CompanyAvatar
                  name={company.name}
                  logoUrl={company.logo_url ?? undefined}
                  website={company.website ?? undefined}
                  size={24}
                />
                <span className="text-[14px] font-medium" style={{ color: "var(--color-accent)" }}>
                  {company.name}
                </span>
                {company.country && (
                  <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
                    {company.country}
                  </span>
                )}
              </Link>
            )}

            {/* Community stats */}
            <div className="flex items-center gap-4 text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
              <span className="inline-flex items-center gap-1">
                <Users size={13} /> {watchlistCount} watching
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye size={13} /> {viewCount7d} views this week
              </span>
              {productScore && (
                <TrendingBadge
                  direction={productScore.trending_direction}
                  score={hypeScore}
                />
              )}
            </div>
          </div>

          {/* Right: Hype Score + Watchlist */}
          <div className="flex items-center gap-4 md:flex-col md:items-end">
            {/* Hype Score ring */}
            <div className="flex flex-col items-center">
              <div
                className="relative flex items-center justify-center rounded-full"
                style={{
                  width: 80,
                  height: 80,
                  background: `conic-gradient(${hype.color} ${hypeScore * 3.6}deg, var(--color-bg-tertiary) 0deg)`,
                }}
              >
                <div
                  className="absolute rounded-full flex items-center justify-center"
                  style={{
                    width: 64,
                    height: 64,
                    background: "var(--color-bg-secondary)",
                  }}
                >
                  <span
                    className="text-[22px] font-bold tabular-nums"
                    style={{ color: hype.color }}
                  >
                    {hypeScore}
                  </span>
                </div>
              </div>
              <span
                className="text-[10px] font-semibold uppercase tracking-wider mt-1"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                Hype Score
              </span>
            </div>

            <PipelineWatchButton pipelineId={product.id} size={18} showLabel />
          </div>
        </div>
      </div>

      {/* ─── STAGE TIMELINE ─── */}
      <div
        className="rounded-xl p-5 mb-6"
        style={{
          background: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        <h2
          className="text-[11px] font-semibold uppercase tracking-wider mb-4"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          Development Stage
        </h2>
        <div className="flex items-center justify-between relative">
          {/* Connecting line */}
          <div
            className="absolute top-[14px] left-[20px] right-[20px] h-[2px]"
            style={{ background: "var(--color-border-medium)" }}
          />
          {/* Progress line */}
          {stageIdx >= 0 && (
            <div
              className="absolute top-[14px] left-[20px] h-[2px]"
              style={{
                background: "var(--color-accent)",
                width: `${(stageIdx / (STAGE_TIMELINE.length - 1)) * (100 - (40 / 1200) * 100)}%`,
                maxWidth: `calc(100% - 40px)`,
              }}
            />
          )}
          {STAGE_TIMELINE.map((stage, i) => {
            const isCurrent = i === stageIdx;
            const isPast = i < stageIdx;
            const isFuture = i > stageIdx;

            return (
              <div key={stage} className="flex flex-col items-center z-10" style={{ flex: 1 }}>
                <div
                  className="flex items-center justify-center rounded-full text-[10px] font-bold"
                  style={{
                    width: 28,
                    height: 28,
                    background: isCurrent
                      ? "var(--color-accent)"
                      : isPast
                      ? "var(--color-accent-light)"
                      : "var(--color-bg-primary)",
                    border: isFuture ? "2px solid var(--color-border-medium)" : "none",
                    color: isCurrent || isPast ? "#fff" : "var(--color-text-tertiary)",
                    boxShadow: isCurrent ? "0 0 0 4px var(--color-accent-subtle)" : "none",
                  }}
                >
                  {isPast ? "\u2713" : i + 1}
                </div>
                <span
                  className="text-[10px] md:text-[11px] font-medium mt-1.5 text-center whitespace-nowrap"
                  style={{
                    color: isCurrent
                      ? "var(--color-accent)"
                      : isPast
                      ? "var(--color-text-secondary)"
                      : "var(--color-text-tertiary)",
                    fontWeight: isCurrent ? 700 : 500,
                  }}
                >
                  {stage}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── MAIN CONTENT GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard
              icon={<FlaskConical size={16} />}
              label="Indication / Disease"
              value={product.indication || "\u2014"}
            />
            <InfoCard
              icon={<FileText size={16} />}
              label="Conditions"
              value={
                product.conditions && product.conditions.length > 0
                  ? product.conditions.join(", ")
                  : "\u2014"
              }
            />
            <InfoCard
              icon={<Calendar size={16} />}
              label="Trial Timeline"
              value={`${formatDate(product.start_date)} \u2192 ${formatDate(product.completion_date)}`}
            />
            <InfoCard
              icon={<ExternalLink size={16} />}
              label="NCT ID"
              value={product.nct_id || "\u2014"}
              href={
                product.nct_id
                  ? `https://clinicaltrials.gov/study/${product.nct_id}`
                  : undefined
              }
            />
          </div>

          {/* About Section */}
          <div
            className="rounded-xl p-5"
            style={{
              background: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border-subtle)",
            }}
          >
            <h2
              className="text-[14px] font-bold mb-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              About {product.product_name}
            </h2>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              {product.product_name} is a{" "}
              {product.stage ? product.stage.toLowerCase() : "clinical"} stage product being
              developed by {product.company_name} for{" "}
              {product.indication || "various indications"}.
              {product.trial_status &&
                ` The current trial status is ${product.trial_status.toLowerCase()}.`}
              {product.nct_id &&
                ` This product is registered under clinical trial identifier ${product.nct_id}.`}
              {product.conditions &&
                product.conditions.length > 0 &&
                ` Target conditions include ${product.conditions.slice(0, 3).join(", ")}.`}
            </p>
          </div>

          {/* Score Breakdown */}
          {productScore && (
            <div
              className="rounded-xl p-5"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <h2
                className="text-[11px] font-semibold uppercase tracking-wider mb-4"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                Hype Score Breakdown
              </h2>
              <div className="space-y-3">
                <ScoreRow label="Clinical" value={productScore.clinical_score} />
                <ScoreRow label="Activity" value={productScore.activity_score} />
                <ScoreRow label="Company" value={productScore.company_score} />
                <ScoreRow label="Novelty" value={productScore.novelty_score} />
                <ScoreRow label="Community" value={productScore.community_score} />
              </div>
            </div>
          )}

          {/* Clinical Trials Section */}
          {relatedTrials.length > 0 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <div className="px-5 pt-5 pb-3">
                <h2
                  className="text-[14px] font-bold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  Clinical Trials ({relatedTrials.length})
                </h2>
              </div>
              <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
                <table className="w-full text-left">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                      <th
                        className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        NCT ID
                      </th>
                      <th
                        className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        Phase
                      </th>
                      <th
                        className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        Status
                      </th>
                      <th
                        className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider hidden md:table-cell"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        Start
                      </th>
                      <th
                        className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider hidden md:table-cell"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        Completion
                      </th>
                      <th
                        className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider hidden lg:table-cell"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        Indication
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedTrials.map((trial) => (
                      <tr
                        key={trial.id}
                        className="hover:bg-[var(--color-bg-primary)] transition-colors"
                        style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                      >
                        <td className="px-5 py-2.5">
                          {trial.nct_id ? (
                            <a
                              href={`https://clinicaltrials.gov/study/${trial.nct_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[13px] font-medium hover:underline"
                              style={{ color: "var(--color-accent)" }}
                            >
                              {trial.nct_id}
                            </a>
                          ) : (
                            <span className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
                              --
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {trial.stage && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                              style={getStageBadgeStyle(trial.stage)}
                            >
                              {trial.stage}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {trial.trial_status && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                              style={getStatusBadgeStyle(trial.trial_status)}
                            >
                              {trial.trial_status}
                            </span>
                          )}
                        </td>
                        <td
                          className="px-4 py-2.5 text-[12px] hidden md:table-cell"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {formatDate(trial.start_date)}
                        </td>
                        <td
                          className="px-4 py-2.5 text-[12px] hidden md:table-cell"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {formatDate(trial.completion_date)}
                        </td>
                        <td
                          className="px-4 py-2.5 text-[12px] hidden lg:table-cell max-w-[200px] truncate"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          {trial.indication || "\u2014"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Competing Products Section */}
          {competingProducts.length > 0 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <div className="px-5 pt-5 pb-3">
                <h2
                  className="text-[14px] font-bold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  Competing Products
                </h2>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                  {competingProducts.length} other product{competingProducts.length !== 1 ? "s" : ""}{" "}
                  targeting{" "}
                  {product.indication
                    ? product.indication.split(/[\s,;]+/).filter((w) => w.length > 3)[0] || product.indication
                    : "similar indications"}
                </p>
              </div>
              <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
                <table className="w-full text-left">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                      <th
                        className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        Product
                      </th>
                      <th
                        className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        Company
                      </th>
                      <th
                        className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        Stage
                      </th>
                      <th
                        className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        Hype Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {competingProducts.map((comp) => (
                      <tr
                        key={comp.id}
                        className="hover:bg-[var(--color-bg-primary)] transition-colors"
                        style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                      >
                        <td className="px-5 py-2.5">
                          <Link
                            href={`/product/${comp.slug}`}
                            className="text-[13px] font-medium hover:underline"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            {comp.product_name}
                          </Link>
                        </td>
                        <td
                          className="px-4 py-2.5 text-[12px]"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {comp.company_name}
                        </td>
                        <td className="px-4 py-2.5">
                          {comp.stage && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                              style={getStageBadgeStyle(comp.stage)}
                            >
                              {comp.stage}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <HypeBar score={comp.hype_score} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar (1/3) */}
        <div className="space-y-6">
          {/* Parent Company Card */}
          {company && (
            <div
              className="rounded-xl p-5"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <CompanyAvatar
                  name={company.name}
                  logoUrl={company.logo_url ?? undefined}
                  website={company.website ?? undefined}
                  size={40}
                />
                <div>
                  <Link
                    href={`/company/${company.slug}`}
                    className="text-[15px] font-bold hover:underline block"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {company.name}
                  </Link>
                  <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                    {company.type && <span>{company.type}</span>}
                    {company.country && (
                      <>
                        <span>&middot;</span>
                        <span>{company.country}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Market Cap */}
              {marketCap && (
                <div
                  className="flex items-center justify-between py-2 mb-2"
                  style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                >
                  <span className="text-[11px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                    Market Cap
                  </span>
                  <span className="text-[13px] font-bold" style={{ color: "var(--color-text-primary)" }}>
                    {formatMarketCap(marketCap)}
                  </span>
                </div>
              )}

              {company.ticker && (
                <div
                  className="flex items-center justify-between py-2 mb-2"
                  style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                >
                  <span className="text-[11px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                    Ticker
                  </span>
                  <span className="text-[13px] font-bold" style={{ color: "var(--color-text-primary)" }}>
                    {company.ticker}
                  </span>
                </div>
              )}

              <Link
                href={`/company/${company.slug}`}
                className="flex items-center gap-1 text-[12px] font-medium mt-3 hover:underline"
                style={{ color: "var(--color-accent)" }}
              >
                <Building2 size={13} />
                View full company profile
                <ChevronRight size={13} />
              </Link>
            </div>
          )}

          {/* Other Products from Company */}
          {companyTopProducts.length > 0 && (
            <div
              className="rounded-xl p-5"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <h3
                className="text-[11px] font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                Other Products from {company?.name || product.company_name}
              </h3>
              <div className="space-y-2">
                {companyTopProducts.map((cp) => (
                  <Link
                    key={cp.pipeline_id}
                    href={cp.slug ? `/product/${cp.slug}` : "#"}
                    className="flex items-center justify-between py-1.5 hover:bg-[var(--color-bg-primary)] -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div className="min-w-0 flex-1 mr-2">
                      <span
                        className="text-[13px] font-medium block truncate"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {cp.product_name}
                      </span>
                      {cp.stage && (
                        <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
                          {cp.stage}
                        </span>
                      )}
                    </div>
                    <HypeBar score={cp.hype_score} />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function InfoCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <span style={{ color: "var(--color-text-tertiary)" }}>{icon}</span>
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {label}
        </span>
      </div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[14px] font-medium hover:underline inline-flex items-center gap-1"
          style={{ color: "var(--color-accent)" }}
        >
          {value}
          <ExternalLink size={12} />
        </a>
      ) : (
        <p
          className="text-[14px] font-medium line-clamp-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          {value}
        </p>
      )}
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-3">
      <span
        className="text-[12px] font-medium w-[70px] shrink-0"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-[6px] rounded-full overflow-hidden"
        style={{ background: "var(--color-bg-tertiary)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: "var(--color-accent)",
          }}
        />
      </div>
      <span
        className="text-[12px] font-bold tabular-nums w-[28px] text-right"
        style={{ color: "var(--color-text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}

function HypeBar({ score }: { score: number }) {
  const { gradient, color } = getHypeLabel(score);
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="h-[5px] rounded-full flex-shrink-0"
        style={{ width: 40, background: "var(--color-bg-tertiary)", overflow: "hidden" }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, background: gradient }}
        />
      </div>
      <span className="text-[11px] font-bold tabular-nums" style={{ color, minWidth: 20 }}>
        {score}
      </span>
    </div>
  );
}
