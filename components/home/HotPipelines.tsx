"use client";

import Link from "next/link";

interface Pipeline {
  product_name: string;
  indication: string | null;
  stage: string;
  company_name: string | null;
  company_id: string | null;
}

interface Props {
  pipelines: Pipeline[];
}

const STAGE_COLORS: Record<string, string> = {
  "Phase 3": "#dbeafe",
  "Phase 2": "#ede9fe",
  "Phase 1": "#e8f5f0",
};

export default function HotPipelines({ pipelines }: Props) {
  return (
    <div>
      {pipelines.map((p, i) => (
        <Link
          key={`${p.product_name}-${i}`}
          href={p.company_id ? `/company/${p.company_id}` : "#"}
          className="px-4 py-2.5 flex items-start gap-3 transition-colors duration-100 hover:bg-[var(--color-bg-secondary)]"
          style={
            i < pipelines.length - 1
              ? { borderBottom: "0.5px solid var(--color-border-subtle)" }
              : undefined
          }
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="text-13 font-medium truncate"
                style={{ color: "var(--color-text-primary)" }}
              >
                {p.product_name}
              </span>
              <span
                className="text-10 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                style={{
                  background: STAGE_COLORS[p.stage] ?? "#f3f4f6",
                  color: "#1a1a1a",
                }}
              >
                {p.stage}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {p.company_name && (
                <span
                  className="text-11 truncate"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {p.company_name}
                </span>
              )}
              {p.company_name && p.indication && (
                <span
                  className="text-11"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  ·
                </span>
              )}
              {p.indication && (
                <span
                  className="text-11 truncate"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  {p.indication}
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
