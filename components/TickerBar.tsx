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

/**
 * Compact "live status" pill, designed to sit inside the hero section
 * directly under the descriptor — centered horizontally, no full-width
 * strip chrome. Hairline border, transparent fill so it doesn't fight
 * tonal layering in either light or dark mode.
 */
export function TickerBar({ snapshot }: TickerBarProps) {
  if (!snapshot) return null;

  return (
    <div
      className="hidden md:inline-flex items-center justify-center gap-3 mt-5 px-3 py-1.5 rounded-md text-[11px]"
      style={{
        background: "var(--color-bg-primary)",
        border: "0.5px solid var(--color-border-medium)",
        letterSpacing: "0.2px",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span className="flex items-center gap-1.5">
        <span className="live-dot" />
        <span
          className="font-semibold uppercase"
          style={{ color: "var(--color-text-secondary)", letterSpacing: "0.6px" }}
        >
          Live
        </span>
      </span>
      <span style={{ color: "var(--color-border-medium)" }}>|</span>
      <span style={{ color: "var(--color-text-tertiary)" }}>
        As of {formatSnapshotDate(snapshot.snapshot_date)}
      </span>
      <span style={{ color: "var(--color-border-medium)" }}>|</span>
      <span style={{ color: "var(--color-text-secondary)" }}>
        Total market cap{" "}
        <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
          {formatMarketCap(snapshot.total_market_cap)}
        </span>
      </span>
    </div>
  );
}
