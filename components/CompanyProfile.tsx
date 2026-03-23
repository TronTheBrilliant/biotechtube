import Link from "next/link";
import { ArrowUpRight, Star, Shield } from "lucide-react";
import { Company } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";
import { CompanyAvatar } from "@/components/CompanyAvatar";

const stageColors: Record<string, { bg: string; text: string; border: string }> = {
  Approved: { bg: "#e8f5f0", text: "#0a3d2e", border: "#5DCAA5" },
  "Phase 3": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 2": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 1/2": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Phase 1": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Pre-clinical": { bg: "#f7f7f6", text: "#6b6b65", border: "rgba(0,0,0,0.14)" },
};

const focusColors: Record<string, { bg: string; text: string; border: string }> = {
  Oncology: { bg: "#fff0f0", text: "#a32d2d", border: "#f09595" },
  Immunotherapy: { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  Diagnostics: { bg: "#e8f5f0", text: "#0a3d2e", border: "#5DCAA5" },
  "Drug Delivery": { bg: "#fef3e2", text: "#b45309", border: "#fcd34d" },
  Radiopharmaceuticals: { bg: "#fef3e2", text: "#b45309", border: "#fcd34d" },
  "DNA Vaccine": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  Photochemistry: { bg: "#fef3e2", text: "#b45309", border: "#fcd34d" },
  "Bladder Cancer": { bg: "#fff0f0", text: "#a32d2d", border: "#f09595" },
  "Oncolytic Peptide": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Monoclonal Antibodies": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "AI Diagnostics": { bg: "#e8f5f0", text: "#0a3d2e", border: "#5DCAA5" },
  "TCR Cell Therapy": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
};

const focusEmoji: Record<string, string> = {
  Oncology: "🎯",
  Immunotherapy: "🛡️",
  Diagnostics: "🔬",
  "Drug Delivery": "💉",
  Radiopharmaceuticals: "☢️",
  "DNA Vaccine": "🧬",
  Photochemistry: "🧪",
  "Bladder Cancer": "🎯",
  "Oncolytic Peptide": "🛡️",
  "Monoclonal Antibodies": "🧬",
  "AI Diagnostics": "🤖",
  "TCR Cell Therapy": "🦠",
};

interface CompanyProfileProps {
  company: Company;
  reportSummary?: string | null;
}

export function CompanyProfileHero({ company, reportSummary }: CompanyProfileProps) {
  const sc = stageColors[company.stage] || stageColors["Pre-clinical"];

  return (
    <div className="px-5 py-5 border-b">
      {/* Top row: Avatar + Name */}
      <div className="flex items-start gap-3 mb-3">
        <CompanyAvatar name={company.name} logoUrl={company.logoUrl} website={company.website} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className="text-[28px] md:text-[28px] font-medium tracking-tight"
              style={{ color: "var(--color-text-primary)", letterSpacing: "-0.4px" }}
            >
              {company.name}
            </h1>
            {company.ticker && (
              <span
                className="text-11 font-medium px-1.5 py-[2px] rounded-sm"
                style={{
                  background: "var(--color-bg-secondary)",
                  color: "var(--color-text-secondary)",
                  border: "0.5px solid var(--color-border-subtle)",
                }}
              >
                {company.ticker}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-[2px]">
            <span className="text-14" style={{ color: "var(--color-text-tertiary)" }}>
              {[company.city, company.country].filter(Boolean).join(", ")}
            </span>
            {company.founded > 0 && (
              <span className="text-14" style={{ color: "var(--color-text-tertiary)" }}>
                · Founded {company.founded}
              </span>
            )}
            {company.employees && company.employees !== "0" && (
              <span className="text-14" style={{ color: "var(--color-text-tertiary)" }}>
                · {company.employees} employees
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mb-3">
        <button
          className="flex items-center gap-1 text-11 font-medium px-3 py-1.5 rounded border transition-colors duration-150"
          style={{ borderColor: "var(--color-border-medium)", color: "var(--color-text-secondary)" }}
        >
          <Star size={12} />
          Watchlist
        </button>
        <a
          href={`https://${company.website}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-11 font-medium px-3 py-1.5 rounded text-white"
          style={{ background: "var(--color-accent)" }}
        >
          Website
          <ArrowUpRight size={12} />
        </a>
        <Link
          href={`/claim/${company.slug}`}
          className="flex items-center gap-1 text-11 px-3 py-1.5 rounded border transition-colors duration-150"
          style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-tertiary)" }}
        >
          <Shield size={11} />
          Claim
        </Link>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {company.stage && (
          <span
            className="text-12 px-2 py-[3px] rounded-sm border"
            style={{
              background: sc.bg,
              color: sc.text,
              borderColor: sc.border,
              borderWidth: "0.5px",
            }}
          >
            {company.stage}
          </span>
        )}
        {company.type && (
          <span
            className="text-12 px-2 py-[3px] rounded-sm border"
            style={{
              background: company.type === "Public" ? "#e8f5f0" : "#f7f7f6",
              color: company.type === "Public" ? "#0a3d2e" : "#6b6b65",
              borderColor: company.type === "Public" ? "#5DCAA5" : "rgba(0,0,0,0.14)",
              borderWidth: "0.5px",
            }}
          >
            {company.type}
          </span>
        )}
        {company.focus.map((f) => {
          const fc = focusColors[f] || {
            bg: "var(--color-bg-secondary)",
            text: "var(--color-text-secondary)",
            border: "var(--color-border-subtle)",
          };
          return (
            <span
              key={f}
              className="text-12 px-2 py-[3px] rounded-sm border"
              style={{
                background: fc.bg,
                color: fc.text,
                borderColor: fc.border,
                borderWidth: "0.5px",
                fontWeight: 400,
              }}
            >
              <span className="whitespace-nowrap">{focusEmoji[f] ? `${focusEmoji[f]} ${f}` : f}</span>
            </span>
          );
        })}
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 md:flex md:items-center gap-4 md:gap-6">
        {company.valuation != null && company.valuation > 0 && (
          <div>
            <div
              className="text-12 uppercase tracking-[0.4px]"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Valuation
            </div>
            <div
              className="text-[22px] font-medium"
              style={{
                color: company.isEstimated
                  ? "var(--color-text-tertiary)"
                  : "var(--color-text-primary)",
              }}
            >
              {company.isEstimated && "est. "}
              {formatCurrency(company.valuation)}
            </div>
          </div>
        )}
        {company.totalRaised > 0 && (
          <div>
            <div
              className="text-12 uppercase tracking-[0.4px]"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Total Raised
            </div>
            <div
              className="text-[22px] font-medium"
              style={{ color: "var(--color-accent)" }}
            >
              {formatCurrency(company.totalRaised)}
            </div>
          </div>
        )}
        {company.profileViews != null && company.profileViews > 0 && (
          <div>
            <div
              className="text-12 uppercase tracking-[0.4px]"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Profile Views
            </div>
            <div
              className="text-[22px] font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              {company.profileViews}
            </div>
          </div>
        )}
        {company.trending != null && company.trending > 0 && (
          <div>
            <div
              className="text-12 uppercase tracking-[0.4px]"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Trending Rank
            </div>
            <div
              className="text-[22px] font-medium"
              style={{ color: "var(--color-accent)" }}
            >
              #{company.trending} this week
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 mb-0" style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }} />

      {/* Description */}
      {(company.description || reportSummary) ? (
        <p
          className="text-[15px] mt-3"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}
        >
          {company.description || reportSummary}
        </p>
      ) : (
        <p
          className="text-[15px] mt-3 italic"
          style={{ color: "var(--color-text-tertiary)", lineHeight: 1.65 }}
        >
          No description available yet. <a href={`https://${company.website}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-accent)" }}>Visit website →</a>
        </p>
      )}
    </div>
  );
}
