"use client";
import type { PipelineRow } from "@/lib/template-types";

interface Props {
  pipelines: PipelineRow[];
}

const STAGE_ORDER = ["Pre-clinical", "Phase 1", "Phase 1/2", "Phase 2", "Phase 2/3", "Phase 3", "Approved"];

export function TemplatePipeline({ pipelines }: Props) {
  if (pipelines.length === 0) return null;

  // Group by stage
  const byStage = new Map<string, PipelineRow[]>();
  for (const p of pipelines) {
    const stage = STAGE_ORDER.includes(p.stage) ? p.stage : "Pre-clinical";
    if (!byStage.has(stage)) byStage.set(stage, []);
    byStage.get(stage)!.push(p);
  }

  return (
    <section id="pipeline" className="py-20 sm:py-28">
      <div className="max-w-[1200px] mx-auto px-6">
        <SectionLabel>Pipeline</SectionLabel>
        <h2 className="mt-3" style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 300, color: "var(--t-text)", letterSpacing: "-0.01em" }}>
          Drug Development Pipeline
        </h2>
        <p className="mt-4 max-w-xl" style={{ fontSize: 16, color: "var(--t-text-secondary)", lineHeight: 1.7 }}>
          {pipelines.length} program{pipelines.length !== 1 ? "s" : ""} across {byStage.size} development stages.
        </p>

        {/* Stage columns */}
        <div className="mt-12 grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(byStage.size, 4)}, 1fr)` }}>
          {STAGE_ORDER.filter((s) => byStage.has(s)).map((stage) => {
            const drugs = byStage.get(stage)!;
            return (
              <div key={stage}>
                <div
                  className="px-4 py-3 rounded-t-lg"
                  style={{
                    background: "var(--t-brand-subtle)",
                    borderBottom: `2px solid var(--t-brand)`,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--t-brand)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {stage}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--t-text-tertiary)", marginTop: 2 }}>
                    {drugs.length} program{drugs.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <div
                  className="rounded-b-lg"
                  style={{ border: "0.5px solid var(--t-border)", borderTop: "none" }}
                >
                  {drugs.slice(0, 8).map((drug, i) => (
                    <div
                      key={drug.id}
                      className="px-4 py-3"
                      style={{
                        borderBottom: i < drugs.length - 1 ? "0.5px solid var(--t-border)" : "none",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t-text)" }}>
                        {drug.product_name}
                      </div>
                      {drug.indication && (
                        <div style={{ fontSize: 11, color: "var(--t-text-tertiary)", marginTop: 2 }}>
                          {drug.indication}
                        </div>
                      )}
                    </div>
                  ))}
                  {drugs.length > 8 && (
                    <div className="px-4 py-2" style={{ fontSize: 11, color: "var(--t-text-tertiary)" }}>
                      +{drugs.length - 8} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 500, color: "var(--t-brand)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
      {children}
    </div>
  );
}
