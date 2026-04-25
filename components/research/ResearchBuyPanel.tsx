// biotechtube/components/research/ResearchBuyPanel.tsx
"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import type { Angle, Tier } from "@/lib/reports/types";

interface Props {
  companySlug: string;
  companyName: string;
}

const ANGLES: { id: Angle; label: string; help: string }[] = [
  { id: "general",    label: "General",       help: "Balanced, default" },
  { id: "long",       label: "Long-only PM",  help: "Multi-year thesis, asymmetric upside" },
  { id: "short",      label: "Short seller",  help: "Failure modes, valuation gap" },
  { id: "vc",         label: "VC partner",    help: "Team, exits, dilution" },
  { id: "bd",         label: "BD",            help: "Partnership angles, deal comparables" },
  { id: "scientist",  label: "Scientist",     help: "MoA, trial design, biomarkers" },
];

export function ResearchBuyPanel({ companySlug, companyName }: Props) {
  const [angle, setAngle] = useState<Angle>("general");
  const [busyTier, setBusyTier] = useState<Tier | null>(null);

  async function buy(tier: Tier) {
    setBusyTier(tier);
    try {
      const res = await fetch(`/api/research/${companySlug}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, angle }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? "Checkout failed");
    } catch (e) {
      alert("Checkout error: " + (e as Error).message);
    } finally {
      setBusyTier(null);
    }
  }

  return (
    <div className="rounded-xl border p-5" style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border-subtle)" }}>
      <div className="text-[11px] font-semibold uppercase mb-3" style={{ color: "var(--color-accent)" }}>
        Get the full memo
      </div>

      <div className="mb-4">
        <div className="text-[12px] font-medium mb-2">Pick your angle</div>
        <div className="grid grid-cols-2 gap-1.5">
          {ANGLES.map((a) => (
            <button
              key={a.id}
              onClick={() => setAngle(a.id)}
              className="text-left px-2 py-1.5 rounded text-[11px] border"
              style={{
                background: angle === a.id ? "var(--color-accent)" : "transparent",
                color: angle === a.id ? "white" : "var(--color-text-primary)",
                borderColor: angle === a.id ? "var(--color-accent)" : "var(--color-border-subtle)",
              }}
              title={a.help}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <TierBlock title="⭐ Living" price="$299" features={["All sections (PDF)", "30-day live dashboard", "AI chat agent", "Day-14 refresh", "Audio briefing", "Event alerts (opt-in)"]} recommended busy={busyTier === "living"} onClick={() => buy("living")} />
      <TierBlock title="Snapshot" price="$99" features={["All sections (PDF)", "Snapshot at moment of purchase"]} busy={busyTier === "snapshot"} onClick={() => buy("snapshot")} />
      <TierBlock title="Institutional" price="$2,999/yr" features={["Any 50 reports", "All living tier", "Team seats"]} cta="Talk to sales" href="mailto:research@biotechtube.io?subject=Institutional+access" />

      <p className="text-[10px] mt-3" style={{ color: "var(--color-text-tertiary)" }}>
        AI-generated from public sources. Not investment advice.
      </p>
    </div>
  );
}

function TierBlock(props: { title: string; price: string; features: string[]; recommended?: boolean; busy?: boolean; onClick?: () => void; cta?: string; href?: string }) {
  const button = props.href ? (
    <a href={props.href} className="block w-full mt-2 py-2 rounded text-[13px] font-medium text-center text-white" style={{ background: "var(--color-text-primary)" }}>
      {props.cta ?? "Buy"}
    </a>
  ) : (
    <button
      disabled={props.busy}
      onClick={props.onClick}
      className="w-full mt-2 py-2 rounded text-[13px] font-medium text-white flex items-center justify-center gap-2"
      style={{ background: props.recommended ? "var(--color-accent)" : "var(--color-text-primary)", opacity: props.busy ? 0.6 : 1 }}
    >
      {props.busy ? <Loader2 size={14} className="animate-spin" /> : null}
      {props.cta ?? "Buy"}
    </button>
  );
  return (
    <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
      <div className="flex items-baseline justify-between">
        <div className="text-[13px] font-semibold">{props.title}</div>
        <div className="text-[15px] font-bold">{props.price}</div>
      </div>
      <ul className="mt-1.5 space-y-1">
        {props.features.map((f, i) => (
          <li key={i} className="text-[11px] flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
            <Check size={11} /> {f}
          </li>
        ))}
      </ul>
      {button}
    </div>
  );
}
