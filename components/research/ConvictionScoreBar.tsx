// biotechtube/components/research/ConvictionScoreBar.tsx
export function ConvictionScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
        <span>Conviction (model self-assessment)</span>
        <span className="font-mono">{pct}/100</span>
      </div>
      <div className="h-1.5 rounded mt-1" style={{ background: "var(--color-border-subtle)" }}>
        <div className="h-1.5 rounded" style={{ width: `${pct}%`, background: "var(--color-accent)" }} />
      </div>
    </div>
  );
}
