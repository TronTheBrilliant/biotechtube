import Link from "next/link";

interface FundingRound {
  companyName: string;
  companySlug: string;
  type: string;
  amount: number;
  currency: string;
  leadInvestor: string;
  daysAgo: number;
}

interface FundingRadarProps {
  rounds: FundingRound[];
}

const ROUND_COLORS: Record<string, string> = {
  Seed: "#e8f5f0",
  "Series A": "#dbeafe",
  "Series B": "#ede9fe",
  "Series C": "#fef3c7",
  "Series D": "#fce7f3",
  IPO: "#dcfce7",
};

function formatDaysAgo(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatAmount(amount: number, currency: string): string {
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "\u20AC" : `${currency} `;
  if (amount >= 1_000_000_000) {
    return `${symbol}${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `${symbol}${(amount / 1_000).toFixed(0)}K`;
  }
  return `${symbol}${amount}`;
}

export function FundingRadar({ rounds }: FundingRadarProps) {
  return (
    <div>
      {rounds.map((round, i) => (
        <Link
          key={`${round.companySlug}-${i}`}
          href={`/company/${round.companySlug}`}
          className="px-4 py-2.5 flex items-center gap-3 transition-colors duration-100 hover:bg-[var(--color-bg-secondary)]"
          style={
            i < rounds.length - 1
              ? { borderBottom: "0.5px solid var(--color-border-subtle)" }
              : undefined
          }
        >
          {/* Company name */}
          <span
            className="text-13 font-medium truncate min-w-0"
            style={{ color: "var(--color-text-primary)" }}
          >
            {round.companyName}
          </span>

          {/* Round type badge */}
          <span
            className="text-10 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
            style={{
              background: ROUND_COLORS[round.type] ?? "#f3f4f6",
              color: "#1a1a1a",
            }}
          >
            {round.type}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Amount */}
          <span
            className="text-13 font-medium flex-shrink-0"
            style={{ color: "var(--color-text-primary)" }}
          >
            {formatAmount(round.amount, round.currency)}
          </span>

          {/* Time ago */}
          <span
            className="text-11 flex-shrink-0"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {formatDaysAgo(round.daysAgo)}
          </span>
        </Link>
      ))}
    </div>
  );
}
