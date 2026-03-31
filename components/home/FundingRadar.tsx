interface FundingRound {
  companyName: string;
  roundType: string;
  amountUsd: number;
  announcedDate: string;
  leadInvestor: string | null;
  country: string | null;
}

interface FundingRadarProps {
  rounds: FundingRound[];
}

const ROUND_COLORS: Record<string, string> = {
  Seed: "#ecfdf5",
  "Pre-Seed": "#ecfdf5",
  "Series A": "#dbeafe",
  "Series B": "#ede9fe",
  "Series C": "#fef3c7",
  "Series D": "#fce7f3",
  "Series E": "#fce7f3",
  IPO: "#dcfce7",
  Grant: "#f0fdf4",
  Venture: "#f3f4f6",
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatAmount(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount}`;
}

export function FundingRadar({ rounds }: FundingRadarProps) {
  return (
    <div>
      {rounds.map((round, i) => (
        <div
          key={`${round.companyName}-${i}`}
          className="px-4 py-2.5 flex items-center gap-3"
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
              background: ROUND_COLORS[round.roundType] ?? "#f3f4f6",
              color: "#1a1a1a",
            }}
          >
            {round.roundType}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Lead investor */}
          {round.leadInvestor && round.leadInvestor !== "Undisclosed" && (
            <span
              className="text-11 truncate flex-shrink-0 max-w-[120px]"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {round.leadInvestor}
            </span>
          )}

          {/* Amount */}
          <span
            className="text-13 font-medium flex-shrink-0"
            style={{ color: "var(--color-text-primary)" }}
          >
            {formatAmount(round.amountUsd)}
          </span>

          {/* Time ago */}
          <span
            className="text-11 flex-shrink-0"
            style={{ color: "var(--color-text-tertiary)", minWidth: 42 }}
          >
            {formatRelativeDate(round.announcedDate)}
          </span>
        </div>
      ))}
    </div>
  );
}
