import Link from "next/link";
import { formatMarketCap, formatPercent, pctColor, capPercent } from "@/lib/market-utils";
import { getSectorEmoji } from "@/lib/sector-emojis";

interface Sector {
  slug: string;
  name: string;
  shortName: string | null;
  combinedMarketCap: number | null;
  change1d: number | null;
  change7d: number | null;
  companyCount: number | null;
}

export default function TopSectors({ sectors }: { sectors: Sector[] }) {
  return (
    <div>
      {sectors.slice(0, 8).map((s, i) => (
        <Link
          key={s.slug}
          href={`/sectors/${s.slug}`}
          className="px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--color-bg-secondary)] no-underline"
          style={
            i < 7 && i < sectors.length - 1
              ? { borderBottom: "0.5px solid var(--color-border-subtle)" }
              : undefined
          }
        >
          {/* Rank */}
          <span
            className="text-center font-medium"
            style={{
              fontSize: 12,
              width: 20,
              color: "var(--color-text-tertiary)",
            }}
          >
            {i + 1}
          </span>

          {/* Sector Name */}
          <span
            className="font-medium"
            style={{ fontSize: 13, color: "var(--color-text-primary)" }}
          >
            {getSectorEmoji(s.name)} {s.shortName || s.name}
          </span>

          {/* Spacer */}
          <span className="flex-1" />

          {/* 1D Change */}
          <span
            className="font-medium"
            style={{ fontSize: 12, color: pctColor(capPercent(s.change1d, "1d")) }}
          >
            {formatPercent(capPercent(s.change1d, "1d"))}
          </span>

          {/* Market Cap */}
          <span
            className="font-medium text-right"
            style={{
              fontSize: 13,
              color: "var(--color-text-primary)",
              minWidth: 56,
            }}
          >
            {s.combinedMarketCap != null
              ? formatMarketCap(s.combinedMarketCap)
              : "—"}
          </span>
        </Link>
      ))}
    </div>
  );
}
