// biotechtube/components/research/SectionLockOverlay.tsx
"use client";
import { Lock } from "lucide-react";

export function SectionLockOverlay({ sectionTitles }: { sectionTitles: string[] }) {
  return (
    <section className="mt-8 rounded-xl p-6 relative overflow-hidden" style={{ background: "var(--color-bg-secondary)" }}>
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.02)" }} />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Lock size={16} style={{ color: "var(--color-accent)" }} />
          <span className="text-[13px] font-semibold">Locked sections</span>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {sectionTitles.map((t) => (
            <li key={t} className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
              · {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
