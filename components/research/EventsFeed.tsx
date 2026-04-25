// biotechtube/components/research/EventsFeed.tsx
"use client";
import { Activity, FileText, DollarSign, Pill } from "lucide-react";

const ICON: Record<string, any> = {
  news: FileText, funding: DollarSign, trial_status: Pill, sec_filing: FileText,
};

export function EventsFeed({ events }: { events: any[] }) {
  if (events.length === 0) {
    return <p className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
      No material events detected since the report was generated. We check every 6 hours.
    </p>;
  }
  return (
    <div>
      <h2 className="text-[18px] font-semibold mb-3 flex items-center gap-2">
        <Activity size={16} /> Events Feed
      </h2>
      <ul className="space-y-3">
        {events.map((e) => {
          const Icon = ICON[e.event_type] ?? Activity;
          return (
            <li key={e.id} className="flex gap-3 text-[13px]">
              <Icon size={14} className="mt-0.5" style={{ color: e.is_material ? "var(--color-accent)" : "var(--color-text-tertiary)" }} />
              <div className="flex-1">
                <div className="font-medium">
                  {e.is_material && <span className="text-[10px] mr-1.5 px-1.5 py-0.5 rounded" style={{ background: "var(--color-accent)", color: "white" }}>MATERIAL</span>}
                  {e.event_summary}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                  {new Date(e.detected_at).toLocaleString()}{e.source_url ? ` · ${e.source_url}` : ""}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
