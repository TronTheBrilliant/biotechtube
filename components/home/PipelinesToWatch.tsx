"use client";

import Link from "next/link";

interface PipelineItem {
  product_name: string;
  indication: string;
  stage: string;
  company_name: string;
  company_slug: string;
  slug: string;
  hype_score: number;
}

interface Props {
  pipelines: PipelineItem[];
}

const STAGE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "Phase 3": { bg: "rgba(22,163,74,0.08)", text: "#16a34a", dot: "#16a34a" },
  "Phase 2": { bg: "rgba(59,130,246,0.08)", text: "#3b82f6", dot: "#3b82f6" },
  "Phase 1": { bg: "rgba(234,179,8,0.08)", text: "#ca8a04", dot: "#ca8a04" },
  "Approved": { bg: "rgba(168,85,247,0.08)", text: "#9333ea", dot: "#9333ea" },
};

export default function PipelinesToWatch({ pipelines }: Props) {
  if (!pipelines || pipelines.length === 0) return null;

  return (
    <div>
      <p
        className="px-4 py-2 text-12 leading-relaxed"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        Pipeline programs attracting attention right now — from late-stage clinical trials to newly approved therapies. Follow them to track progress.
      </p>
      {pipelines.map((p, i) => {
        const colors = STAGE_COLORS[p.stage] || STAGE_COLORS["Phase 3"];
        return (
          <Link
            key={p.slug}
            href={`/product/${p.slug}`}
            className="px-4 py-2.5 flex items-center gap-3 transition-colors duration-100 hover:bg-[var(--color-bg-secondary)]"
            style={
              i < pipelines.length - 1
                ? { borderBottom: "0.5px solid var(--color-border-subtle)" }
                : undefined
            }
          >
            <span
              className="text-12 font-medium w-5 text-center flex-shrink-0"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="text-13 font-medium truncate"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {p.product_name}
                </span>
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 inline-flex items-center gap-1"
                  style={{ background: colors.bg, color: colors.text }}
                >
                  <span className="w-1 h-1 rounded-full" style={{ background: colors.dot }} />
                  {p.stage}
                </span>
              </div>
              <div className="text-11 truncate" style={{ color: "var(--color-text-tertiary)" }}>
                {p.indication}
                {p.company_name && (
                  <> · <span style={{ color: "var(--color-text-secondary)" }}>{p.company_name}</span></>
                )}
              </div>
            </div>
            {p.hype_score > 0 && (
              <span
                className="text-11 font-semibold flex-shrink-0 tabular-nums"
                style={{ color: "var(--color-accent)" }}
              >
                {p.hype_score}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
