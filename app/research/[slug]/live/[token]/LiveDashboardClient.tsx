// biotechtube/app/research/[slug]/live/[token]/LiveDashboardClient.tsx
"use client";

import { useState } from "react";
import { Download, Headphones } from "lucide-react";
import { ResearchChat } from "@/components/research/ResearchChat";
import { EventsFeed } from "@/components/research/EventsFeed";
import { ConvictionScoreBar } from "@/components/research/ConvictionScoreBar";

const TABS = [
  "Overview", "Pipeline", "Competitive", "Catalysts", "Bull/Bear",
  "Counterfactuals", "SEC", "Insiders", "Literature", "Patents", "Mechanism", "Events",
] as const;
type Tab = typeof TABS[number];

export function LiveDashboardClient({ purchase, report, company, events, token }: {
  purchase: any; report: any; company: any; events: any[]; token: string;
}) {
  const [tab, setTab] = useState<Tab>("Overview");
  const content = report.content_jsonb;
  const angle = purchase.angle ?? "general";
  const angleVariant = content.angles?.[angle] ?? content.angles?.general;
  const expiresIn = Math.max(0, Math.round((new Date(purchase.live_access_expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 mb-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
          <div>
            <h1 className="text-[22px] font-bold">{company.name}{company.ticker ? ` (${company.ticker})` : ""}</h1>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
              Live access · expires in {expiresIn} days · last refreshed {new Date(report.refreshed_at).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            <a href={`/api/research/download/${purchase.id}`} className="px-3 py-1.5 rounded text-[12px] font-medium text-white flex items-center gap-1.5" style={{ background: "var(--color-accent)" }}>
              <Download size={13} /> PDF
            </a>
            <a href={`/api/research/audio/${purchase.id}`} className="px-3 py-1.5 rounded text-[12px] font-medium border flex items-center gap-1.5" style={{ borderColor: "var(--color-border-subtle)" }}>
              <Headphones size={13} /> Audio
            </a>
          </div>
        </div>

        <nav className="flex gap-1 mb-5 overflow-x-auto" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-2 text-[12px] font-medium whitespace-nowrap"
              style={{
                color: tab === t ? "var(--color-accent)" : "var(--color-text-secondary)",
                borderBottom: tab === t ? "2px solid var(--color-accent)" : "2px solid transparent",
              }}
            >
              {t}
            </button>
          ))}
        </nav>

        <TabContent tab={tab} content={content} angleVariant={angleVariant} events={events} report={report} />
      </div>

      <aside className="lg:sticky lg:top-6 self-start">
        <ResearchChat purchaseId={purchase.id} companyName={company.name} />
      </aside>
    </div>
  );
}

function TabContent({ tab, content, angleVariant, events, report }: any) {
  switch (tab) {
    case "Overview":         return <SectionDisplay s={angleVariant?.executive_summary} />;
    case "Pipeline":         return <SectionDisplay s={content.pipeline_analysis} />;
    case "Competitive":      return <SectionDisplay s={content.competitive_landscape} />;
    case "Catalysts":        return <CatalystsTab catalogs={content.catalyst_calendar} quant={content.quant_signals?.catalysts} />;
    case "Bull/Bear":
      return (
        <div>
          <SectionDisplay s={angleVariant?.bull_case} />
          <div className="mt-6"><SectionDisplay s={angleVariant?.bear_case} /></div>
        </div>
      );
    case "Counterfactuals":  return <CounterfactualsTab cfs={content.counterfactuals} />;
    case "SEC":              return <SectionDisplay s={content.sec_highlights} />;
    case "Insiders":         return <SectionDisplay s={content.insider_activity} />;
    case "Literature":       return <SectionDisplay s={content.literature_watch} />;
    case "Patents":          return <SectionDisplay s={content.patent_landscape} />;
    case "Mechanism":
      return <div dangerouslySetInnerHTML={{ __html: report.mechanism_svg ?? "<p>No mechanism map available.</p>" }} />;
    case "Events":           return <EventsFeed events={events} />;
  }
}

function SectionDisplay({ s }: { s: any }) {
  if (!s) return <p>Section not generated.</p>;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[18px] font-semibold">{s.heading}</h2>
        <span className="text-[10px] uppercase font-mono" style={{ color: "var(--color-text-tertiary)" }}>
          {s.confidence} confidence
        </span>
      </div>
      <ConvictionScoreBar score={s.conviction_score ?? 50} />
      <p className="text-[14px] leading-[1.7] mt-3 whitespace-pre-wrap">{s.body}</p>
      {s.claims?.some((c: any) => c.unverified) && (
        <p className="text-[11px] mt-3 px-2 py-1 rounded inline-block" style={{ background: "rgba(234,179,8,0.1)", color: "#a16207" }}>
          ⚠ Some claims in this section could not be verified by the fact-check pass and are flagged.
        </p>
      )}
    </div>
  );
}

function CatalystsTab({ catalogs, quant }: any) {
  const entries = (catalogs?.entries ?? quant ?? []) as any[];
  return (
    <div>
      <h2 className="text-[18px] font-semibold mb-3">Catalyst Calendar (next 12 months)</h2>
      <table className="w-full text-[13px]">
        <thead style={{ color: "var(--color-text-tertiary)" }}>
          <tr><th className="text-left py-2">Date</th><th className="text-left">Title</th><th className="text-right">P(success)</th></tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i} className="border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
              <td className="py-2 font-mono text-[12px]">{e.expected_date ?? e.expected_window ?? "TBD"}</td>
              <td>{e.title} {e.rationale ? <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>· {e.rationale}</span> : null}</td>
              <td className="text-right font-medium">{e.p_success}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CounterfactualsTab({ cfs }: { cfs: any[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-[18px] font-semibold">Counterfactual Scenarios</h2>
      {cfs?.map((cf, i) => (
        <div key={i} className="p-4 rounded border" style={{ borderColor: "var(--color-border-subtle)" }}>
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-medium">{cf.scenario}</div>
            <div className="text-[11px] px-2 py-0.5 rounded font-mono" style={{ background: "var(--color-bg-secondary)" }}>
              {cf.probability}%
            </div>
          </div>
          <p className="text-[12px] mt-1" style={{ color: "var(--color-text-secondary)" }}>{cf.thesis_impact}</p>
        </div>
      ))}
    </div>
  );
}
