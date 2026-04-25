// biotechtube/app/research/[slug]/ResearchPreviewClient.tsx
"use client";

import { ResearchBuyPanel } from "@/components/research/ResearchBuyPanel";
import { SectionLockOverlay } from "@/components/research/SectionLockOverlay";
import { ConvictionScoreBar } from "@/components/research/ConvictionScoreBar";

interface Props {
  company: { id: string; name: string; slug: string; ticker: string | null; website: string | null };
  preview: { executive_summary: string; conviction_score: number; catalysts: any[]; generated_at: string } | null;
}

export function ResearchPreviewClient({ company, preview }: Props) {
  const lockedSections = [
    "Pipeline Analysis",
    "Competitive Landscape",
    "Catalyst Calendar (full 12-month)",
    "Bull Case",
    "Bear Case",
    "Counterfactual Scenarios",
    "Valuation Notes",
    "SEC Filing Highlights",
    "Insider Activity",
    "Literature Watch",
    "Patent Landscape",
    "Mechanism Cluster Map",
    "Audio Briefing (5 min)",
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
      <div>
        <header className="mb-8">
          <div className="text-[12px] font-medium mb-2" style={{ color: "var(--color-accent)" }}>
            EQUITY RESEARCH MEMO
          </div>
          <h1 className="text-[36px] font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {company.name}{company.ticker ? ` (${company.ticker})` : ""}
          </h1>
          <p className="text-[14px] mt-2" style={{ color: "var(--color-text-secondary)" }}>
            Generated {preview?.generated_at ? new Date(preview.generated_at).toLocaleDateString() : "recently"}
          </p>
        </header>

        {preview && (
          <>
            <section className="mb-8">
              <h2 className="text-[18px] font-semibold mb-3">Executive Summary</h2>
              <ConvictionScoreBar score={preview.conviction_score} />
              <p className="text-[14px] leading-[1.7] mt-3 whitespace-pre-wrap" style={{ color: "var(--color-text-primary)" }}>
                {preview.executive_summary}
              </p>
            </section>

            {preview.catalysts?.length > 0 && (
              <section className="mb-8">
                <h2 className="text-[18px] font-semibold mb-3">Upcoming Catalysts (preview)</h2>
                <ul className="space-y-3">
                  {preview.catalysts.map((c, i) => (
                    <li key={i} className="flex items-baseline gap-3">
                      <span className="text-[12px] font-mono px-2 py-0.5 rounded" style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)" }}>
                        {c.expected_window ?? "TBD"}
                      </span>
                      <span className="text-[14px] flex-1">{c.title}</span>
                      <span className="text-[12px] font-medium" style={{ color: "var(--color-accent)" }}>
                        {c.p_success}% success
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        <SectionLockOverlay sectionTitles={lockedSections} />
      </div>

      <aside className="lg:sticky lg:top-6 self-start">
        <ResearchBuyPanel companySlug={company.slug} companyName={company.name} />
      </aside>
    </div>
  );
}
