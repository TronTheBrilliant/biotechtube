"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { FlaskConical, ChevronRight, Search } from "lucide-react";
import type { PipelineRow } from "@/lib/template-types";

interface Props {
  pipelines: PipelineRow[];
  brandColor: string;
}

const STAGE_ORDER = ["Pre-clinical", "Phase 1", "Phase 1/2", "Phase 2", "Phase 2/3", "Phase 3", "Approved"];

const STAGE_CONFIG: Record<string, { color: string; bg: string; progress: number }> = {
  "Pre-clinical": { color: "#9ca3af", bg: "#f3f4f6", progress: 10 },
  "Phase 1": { color: "#7c3aed", bg: "#f5f3ff", progress: 25 },
  "Phase 1/2": { color: "#6366f1", bg: "#eef2ff", progress: 35 },
  "Phase 2": { color: "#2563eb", bg: "#eff6ff", progress: 50 },
  "Phase 2/3": { color: "#0891b2", bg: "#ecfeff", progress: 65 },
  "Phase 3": { color: "#059669", bg: "#ecfdf5", progress: 80 },
  "Approved": { color: "#16a34a", bg: "#f0fdf4", progress: 100 },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  "Recruiting": { label: "Recruiting", color: "#059669" },
  "Active": { label: "Active", color: "#2563eb" },
  "Completed": { label: "Completed", color: "#6b7280" },
  "Terminated": { label: "Terminated", color: "#dc2626" },
  "Withdrawn": { label: "Withdrawn", color: "#9ca3af" },
};

export function TemplatePipeline({ pipelines, brandColor }: Props) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [expandedDrug, setExpandedDrug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  if (pipelines.length === 0) return null;

  // Group by stage
  const byStage = useMemo(() => {
    const map = new Map<string, PipelineRow[]>();
    for (const p of pipelines) {
      const stage = STAGE_ORDER.includes(p.stage) ? p.stage : "Pre-clinical";
      if (!map.has(stage)) map.set(stage, []);
      map.get(stage)!.push(p);
    }
    return map;
  }, [pipelines]);

  const stagesWithData = STAGE_ORDER.filter((s) => byStage.has(s));

  // Filtered drugs
  const displayedDrugs = useMemo(() => {
    let drugs: PipelineRow[];
    if (!selectedStage) {
      drugs = pipelines.filter((p) => p.trial_status === "Recruiting" || p.trial_status === "Active");
    } else {
      drugs = byStage.get(selectedStage) || [];
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      drugs = drugs.filter((d) =>
        d.product_name.toLowerCase().includes(q) ||
        (d.indication && d.indication.toLowerCase().includes(q)) ||
        (d.conditions && String(d.conditions).toLowerCase().includes(q))
      );
    }
    return drugs.slice(0, 24);
  }, [selectedStage, pipelines, byStage, searchQuery]);

  // Active trials count
  const activeCount = pipelines.filter((p) => p.trial_status === "Recruiting" || p.trial_status === "Active").length;

  return (
    <section id="pipeline" className="py-20 sm:py-28">
      <div className="max-w-[1200px] mx-auto px-6">
        <SectionLabel color={brandColor}>Pipeline</SectionLabel>
        <h2 className="mt-3" style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 300, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
          Drug Development Pipeline
        </h2>
        <p className="mt-3" style={{ fontSize: 16, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          {pipelines.length} programs across {stagesWithData.length} stages. {activeCount} actively recruiting.
        </p>

        {/* Search */}
        <div className="relative mt-8">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-tertiary)" }} />
          <input
            type="text"
            placeholder="Search drugs, indications, conditions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg outline-none transition-colors"
            style={{
              fontSize: 13,
              background: "var(--color-bg-secondary)",
              border: "0.5px solid var(--color-border-subtle)",
              color: "var(--color-text-primary)",
            }}
          />
        </div>

        {/* Stage progress bar — visual overview (hidden on very small screens) */}
        <div className="mt-10 hidden sm:flex gap-1 h-10 rounded-xl overflow-hidden" style={{ background: "var(--color-bg-secondary)" }}>
          {stagesWithData.map((stage) => {
            const count = byStage.get(stage)!.length;
            const pct = (count / pipelines.length) * 100;
            const config = STAGE_CONFIG[stage];
            const isSelected = selectedStage === stage;

            return (
              <button
                key={stage}
                onClick={() => setSelectedStage(selectedStage === stage ? null : stage)}
                className="relative flex items-center justify-center transition-all"
                style={{
                  width: `${Math.max(pct, 5)}%`,
                  background: isSelected ? config.color : `${config.color}20`,
                  cursor: "pointer",
                  border: "none",
                }}
                title={`${stage}: ${count} programs`}
              >
                <span
                  className="text-[10px] font-medium truncate px-1"
                  style={{ color: isSelected ? "white" : config.color }}
                >
                  {pct > 8 ? `${stage} (${count})` : count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Stage filter pills — scrollable on mobile */}
        <div className="flex gap-2 mt-6 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedStage(null)}
            className="px-3 py-1.5 rounded-full transition-all shrink-0"
            style={{
              fontSize: 12,
              fontWeight: !selectedStage ? 500 : 400,
              color: !selectedStage ? "white" : "var(--color-text-secondary)",
              background: !selectedStage ? brandColor : "var(--color-bg-secondary)",
              border: "0.5px solid var(--color-border-subtle)",
            }}
          >
            Active ({activeCount})
          </button>
          {stagesWithData.map((stage) => {
            const count = byStage.get(stage)!.length;
            const config = STAGE_CONFIG[stage];
            const isSelected = selectedStage === stage;
            return (
              <button
                key={stage}
                onClick={() => setSelectedStage(isSelected ? null : stage)}
                className="px-3 py-1.5 rounded-full transition-all shrink-0"
                style={{
                  fontSize: 12,
                  fontWeight: isSelected ? 500 : 400,
                  color: isSelected ? "white" : config.color,
                  background: isSelected ? config.color : config.bg,
                  border: `0.5px solid ${isSelected ? config.color : "transparent"}`,
                }}
              >
                {stage} ({count})
              </button>
            );
          })}
        </div>

        {/* Drug cards */}
        <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-8">
          {displayedDrugs.map((drug) => {
            const config = STAGE_CONFIG[drug.stage] || STAGE_CONFIG["Pre-clinical"];
            const status = STATUS_LABELS[drug.trial_status || ""] || { label: drug.trial_status || "Unknown", color: "#6b7280" };
            const isExpanded = expandedDrug === drug.id;

            return (
              <div
                key={drug.id}
                className="rounded-xl transition-all cursor-pointer hover:scale-[1.01]"
                style={{
                  background: "var(--color-bg-primary)",
                  border: `0.5px solid ${isExpanded ? config.color : "var(--color-border-subtle)"}`,
                  boxShadow: isExpanded ? `0 4px 20px ${config.color}15` : "0 1px 3px rgba(0,0,0,0.04)",
                  transition: "all 0.2s ease",
                }}
                onClick={() => setExpandedDrug(isExpanded ? null : drug.id)}
              >
                <div className="p-4">
                  {/* Progress bar */}
                  <div className="h-1 rounded-full mb-3" style={{ background: "var(--color-bg-secondary)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${config.progress}%`, background: config.color }}
                    />
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4
                        className="font-medium truncate"
                        style={{ fontSize: 14, color: "var(--color-text-primary)" }}
                      >
                        {drug.product_name}
                      </h4>
                      {drug.indication && (
                        <p className="mt-0.5 truncate" style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                          {drug.indication}
                        </p>
                      )}
                    </div>
                    <ChevronRight
                      size={14}
                      className="shrink-0 mt-0.5 transition-transform"
                      style={{
                        color: "var(--color-text-tertiary)",
                        transform: isExpanded ? "rotate(90deg)" : "none",
                      }}
                    />
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 mt-3">
                    <span
                      className="px-2 py-0.5 rounded-full"
                      style={{ fontSize: 10, fontWeight: 500, background: config.bg, color: config.color }}
                    >
                      {drug.stage}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full"
                      style={{ fontSize: 10, fontWeight: 500, color: status.color, background: `${status.color}10` }}
                    >
                      {status.label}
                    </span>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 pt-3" style={{ borderTop: "0.5px solid var(--color-border-subtle)" }}>
                      {drug.conditions && drug.conditions.length > 0 && (
                        <div className="mb-2">
                          <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Conditions</span>
                          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                            {Array.isArray(drug.conditions) ? drug.conditions.join(", ") : drug.conditions}
                          </p>
                        </div>
                      )}
                      {drug.start_date && (
                        <div className="mb-2">
                          <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Started</span>
                          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                            {new Date(drug.start_date).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                          </p>
                        </div>
                      )}
                      {drug.nct_id && (
                        <a
                          href={`https://clinicaltrials.gov/study/${drug.nct_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 transition-opacity hover:opacity-70"
                          style={{ fontSize: 11, color: brandColor, fontWeight: 500 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          View on ClinicalTrials.gov
                          <ChevronRight size={12} />
                        </a>
                      )}
                      {drug.slug && (
                        <Link
                          href={`/product/${drug.slug}`}
                          className="inline-flex items-center gap-1 mt-2 ml-4 transition-opacity hover:opacity-70"
                          style={{ fontSize: 11, color: brandColor, fontWeight: 500 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Full Details
                          <ChevronRight size={12} />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Show more button */}
        {!selectedStage && displayedDrugs.length < pipelines.length && (
          <button
            onClick={() => setSelectedStage(null)}
            className="mt-6 px-5 py-2.5 rounded-lg transition-opacity hover:opacity-80 mx-auto block"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "white",
              background: brandColor,
            }}
          >
            View All {pipelines.length} Programs
          </button>
        )}
      </div>
    </section>
  );
}

function SectionLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <FlaskConical size={14} style={{ color }} />
      <span style={{ fontSize: 11, fontWeight: 500, color, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {children}
      </span>
    </div>
  );
}
