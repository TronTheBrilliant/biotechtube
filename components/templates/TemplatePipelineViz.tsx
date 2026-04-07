"use client";
import { useState, useMemo } from "react";
import { FlaskConical, ChevronRight, ExternalLink } from "lucide-react";
import type { PipelineRow } from "@/lib/template-types";
import { useScrollReveal } from "@/lib/hooks";

interface Props {
  pipelines: PipelineRow[];
  therapeuticAreas: string[];
  brandColor: string;
}

const STAGE_POSITIONS: Record<string, number> = {
  "Pre-clinical": 5,
  "Phase 1": 18,
  "Phase 1/2": 30,
  "Phase 2": 44,
  "Phase 2/3": 58,
  "Phase 3": 74,
  Approved: 92,
};

const STAGE_COLORS: Record<string, string> = {
  "Pre-clinical": "#9ca3af",
  "Phase 1": "#7c3aed",
  "Phase 1/2": "#6366f1",
  "Phase 2": "#2563eb",
  "Phase 2/3": "#0891b2",
  "Phase 3": "#059669",
  Approved: "#16a34a",
};

const AREA_KEYWORDS: Record<string, string[]> = {
  "Infectious Diseases": ["covid", "rsv", "influenza", "flu", "virus", "vaccine", "cmv", "ebv", "hiv", "infection", "respiratory", "lyme", "norovirus", "mpox", "zika"],
  "Oncology": ["cancer", "tumor", "melanoma", "carcinoma", "lymphoma", "leukemia", "nsclc", "oncology", "neoplasm", "sarcoma"],
  "Rare Diseases": ["rare", "orphan", "propionic", "methylmalonic", "glycogen", "phenylketonuria", "cystic fibrosis", "pa ", "mma"],
  "Autoimmune": ["autoimmune", "lupus", "rheumatoid", "multiple sclerosis", "ms ", "crohn", "psoriasis", "immune"],
  "Cardiovascular": ["heart", "cardiac", "cardiovascular", "myocardial", "atherosclerosis"],
  "Other": [],
};

function classifyDrug(drug: PipelineRow, areas: string[]): string {
  const text = `${drug.indication || ""} ${(drug.conditions || "").toString()}`.toLowerCase();

  // Try report therapeutic areas first
  for (const area of areas) {
    const keywords = AREA_KEYWORDS[area];
    if (keywords && keywords.some((kw) => text.includes(kw))) return area;
  }

  // Fallback keyword matching
  for (const [area, keywords] of Object.entries(AREA_KEYWORDS)) {
    if (area === "Other") continue;
    if (keywords.some((kw) => text.includes(kw))) return area;
  }

  return "Other";
}

interface TrackData {
  area: string;
  drugs: (PipelineRow & { stagePos: number; color: string })[];
}

export function TemplatePipelineViz({ pipelines, therapeuticAreas, brandColor }: Props) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const { ref: vizRef, isVisible } = useScrollReveal(0.05);

  // Classify and group into tracks
  const tracks = useMemo((): TrackData[] => {
    const grouped = new Map<string, PipelineRow[]>();

    for (const drug of pipelines) {
      // Only show active/recruiting drugs in the visualization
      if (drug.trial_status === "Terminated" || drug.trial_status === "Withdrawn") continue;

      const area = classifyDrug(drug, therapeuticAreas);
      if (!grouped.has(area)) grouped.set(area, []);
      grouped.get(area)!.push(drug);
    }

    return Array.from(grouped.entries())
      .map(([area, drugs]) => ({
        area,
        drugs: drugs.map((d) => ({
          ...d,
          stagePos: STAGE_POSITIONS[d.stage] || 5,
          color: STAGE_COLORS[d.stage] || "#9ca3af",
        })),
      }))
      .sort((a, b) => b.drugs.length - a.drugs.length)
      .slice(0, 6); // Max 6 tracks
  }, [pipelines, therapeuticAreas]);

  if (pipelines.length === 0) return null;

  // Stats
  const activeCount = pipelines.filter((p) => p.trial_status === "Recruiting" || p.trial_status === "Active").length;
  const stageStats = Object.entries(STAGE_POSITIONS).map(([stage]) => ({
    stage,
    count: pipelines.filter((p) => p.stage === stage).length,
  })).filter((s) => s.count > 0);

  const selectedDrug = selectedNode ? pipelines.find((p) => p.id === selectedNode) : null;

  return (
    <section className="py-20 sm:py-28" style={{ background: "var(--color-bg-secondary)" }}>
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="flex items-center gap-2">
          <FlaskConical size={14} style={{ color: brandColor }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: brandColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Pipeline Map
          </span>
        </div>
        <h2 className="mt-3" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300, color: "var(--color-text-primary)", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
          Development Pipeline
        </h2>

        {/* Summary stats */}
        <div className="flex flex-wrap gap-6 mt-6">
          <div>
            <span style={{ fontSize: 28, fontWeight: 300, color: "var(--color-text-primary)" }}>{pipelines.length}</span>
            <span className="ml-2" style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>programs</span>
          </div>
          <div>
            <span style={{ fontSize: 28, fontWeight: 300, color: "#059669" }}>{activeCount}</span>
            <span className="ml-2" style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>active</span>
          </div>
          {stageStats.slice(0, 5).map((s) => (
            <div key={s.stage} className="hidden sm:block">
              <span style={{ fontSize: 16, fontWeight: 400, color: STAGE_COLORS[s.stage] || "var(--color-text-primary)" }}>{s.count}</span>
              <span className="ml-1.5" style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{s.stage}</span>
            </div>
          ))}
        </div>

        {/* Subway map visualization */}
        <div ref={vizRef} className="mt-10 overflow-x-auto no-scrollbar pb-4">
          <div style={{ minWidth: 700 }}>
            {/* Stage headers */}
            <div className="flex mb-2" style={{ paddingLeft: 140 }}>
              {Object.entries(STAGE_POSITIONS).map(([stage, pos]) => (
                <div
                  key={stage}
                  className="absolute"
                  style={{
                    left: `calc(${pos}% + 70px)`,
                    fontSize: 9,
                    color: "var(--color-text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    transform: "translateX(-50%)",
                  }}
                >
                  {stage}
                </div>
              ))}
            </div>

            {/* Tracks */}
            <div className="flex flex-col gap-3 mt-8 relative">
              {tracks.map((track, trackIdx) => (
                <div
                  key={track.area}
                  className="flex items-center gap-0"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? "translateX(0)" : "translateX(-20px)",
                    transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${trackIdx * 0.1}s`,
                  }}
                >
                  {/* Area label */}
                  <div
                    className="shrink-0 text-right pr-4"
                    style={{
                      width: 140,
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {track.area}
                    <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 1 }}>
                      {track.drugs.length} program{track.drugs.length !== 1 ? "s" : ""}
                    </div>
                  </div>

                  {/* Track line + nodes */}
                  <div className="flex-1 relative" style={{ height: 40 }}>
                    {/* Background line */}
                    <div
                      className="absolute top-1/2 left-0 right-0 -translate-y-1/2"
                      style={{ height: 2, background: "var(--color-border-subtle)", borderRadius: 1 }}
                    />

                    {/* Drug nodes */}
                    {track.drugs.map((drug, nodeIdx) => {
                      // Handle overlapping nodes at same stage
                      const sameStage = track.drugs.filter((d) => d.stagePos === drug.stagePos);
                      const offsetIdx = sameStage.indexOf(drug);
                      const yOffset = sameStage.length > 1 ? (offsetIdx - (sameStage.length - 1) / 2) * 14 : 0;

                      return (
                        <button
                          key={drug.id}
                          onClick={() => setSelectedNode(selectedNode === drug.id ? null : drug.id)}
                          className="absolute top-1/2 -translate-y-1/2 transition-all hover:scale-150 focus:outline-none"
                          style={{
                            left: `${drug.stagePos}%`,
                            transform: `translateX(-50%) translateY(calc(-50% + ${yOffset}px))`,
                            width: selectedNode === drug.id ? 16 : 12,
                            height: selectedNode === drug.id ? 16 : 12,
                            borderRadius: "50%",
                            background: drug.color,
                            border: selectedNode === drug.id ? "2px solid var(--color-bg-primary)" : "none",
                            boxShadow: selectedNode === drug.id ? `0 0 0 3px ${drug.color}` : `0 1px 3px ${drug.color}40`,
                            cursor: "pointer",
                            zIndex: selectedNode === drug.id ? 20 : 10,
                            opacity: isVisible ? 1 : 0,
                            transition: `all 0.3s ease ${(trackIdx * 0.1 + nodeIdx * 0.02)}s`,
                          }}
                          title={drug.product_name}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Stage position markers */}
            <div className="relative mt-2" style={{ height: 20, marginLeft: 140 }}>
              {Object.entries(STAGE_POSITIONS).map(([stage, pos]) => (
                <div
                  key={stage}
                  className="absolute bottom-0"
                  style={{
                    left: `${pos}%`,
                    transform: "translateX(-50%)",
                    width: 1,
                    height: 8,
                    background: "var(--color-border-medium)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Mobile hint */}
        <div className="sm:hidden text-center mt-2">
          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Scroll to explore the pipeline →</span>
        </div>

        {/* Selected drug detail card */}
        {selectedDrug && (
          <div
            className="mt-6 p-5 rounded-xl transition-all"
            style={{
              background: "var(--color-bg-primary)",
              border: `0.5px solid ${STAGE_COLORS[selectedDrug.stage] || "var(--color-border-subtle)"}`,
              boxShadow: `0 4px 20px ${STAGE_COLORS[selectedDrug.stage] || brandColor}10`,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 style={{ fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)" }}>
                  {selectedDrug.product_name}
                </h4>
                {selectedDrug.indication && (
                  <p className="mt-1" style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
                    {selectedDrug.indication}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <span
                    className="px-2.5 py-0.5 rounded-full"
                    style={{ fontSize: 11, fontWeight: 500, color: STAGE_COLORS[selectedDrug.stage], background: `${STAGE_COLORS[selectedDrug.stage]}12` }}
                  >
                    {selectedDrug.stage}
                  </span>
                  {selectedDrug.trial_status && (
                    <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                      {selectedDrug.trial_status}
                    </span>
                  )}
                </div>
                {selectedDrug.conditions && (
                  <div className="mt-3">
                    <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Conditions</span>
                    <p className="mt-1" style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                      {Array.isArray(selectedDrug.conditions) ? selectedDrug.conditions.join(", ") : String(selectedDrug.conditions)}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {selectedDrug.nct_id && (
                  <a
                    href={`https://clinicaltrials.gov/study/${selectedDrug.nct_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                    style={{ fontSize: 12, color: "white", background: brandColor }}
                  >
                    ClinicalTrials.gov <ExternalLink size={11} />
                  </a>
                )}
                <button
                  onClick={() => setSelectedNode(null)}
                  className="px-3 py-1.5 rounded-lg"
                  style={{ fontSize: 12, color: "var(--color-text-tertiary)", background: "var(--color-bg-secondary)" }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
