import { formatMarketCap } from "@/lib/market-utils";

interface TickerBarProps {
  snapshot?: {
    snapshot_date: string;
    total_market_cap: number;
  } | null;
}

function formatSnapshotDate(iso: string): string {
  // Display in concise UTC form so the data freshness is unambiguous.
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function TickerBar({ snapshot }: TickerBarProps) {
  if (!snapshot) return null;

  return (
    <div
      className="hidden md:flex items-center h-[28px] px-5 gap-5 text-[11px]"
      style={{
        background: "var(--color-bg-secondary)",
        borderBottom: "0.5px solid var(--color-border-subtle)",
        letterSpacing: "0.2px",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="live-dot" />
        <span
          className="font-semibold uppercase"
          style={{ color: "var(--color-text-secondary)", letterSpacing: "0.6px" }}
        >
          Live
        </span>
      </div>
      <span style={{ color: "var(--color-text-tertiary)" }}>
        As of {formatSnapshotDate(snapshot.snapshot_date)}
      </span>
      <span style={{ color: "var(--color-text-tertiary)" }}>·</span>
      <span style={{ color: "var(--color-text-secondary)" }}>
        Total market cap{" "}
        <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
          {formatMarketCap(snapshot.total_market_cap)}
        </span>
      </span>
    </div>
  );
}
