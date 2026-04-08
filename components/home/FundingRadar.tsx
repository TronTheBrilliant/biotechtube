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
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

export function FundingRadar({ rounds }: FundingRadarProps) {
  return (
    <div>
      {rounds.map((round, i) => (
        <div
          key={`${round.companyName}-${i}`}
          className="px-4 py-3"
          style={
            i < rounds.length - 1
              ? { borderBottom: "0.5px solid var(--color-border-subtle)" }
              : undefined
          }
        >
          {/* Row 1: Company name + amount */}
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-13 font-medium truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {round.companyName}
            </span>
            <span
              className="text-14 font-semibold flex-shrink-0"
              style={{ color: "var(--color-text-primary)" }}
            >
              {formatAmount(round.amountUsd)}
            </span>
          </div>

          {/* Row 2: Round type + investor + time */}
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-11"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {round.roundType}
            </span>
            {round.leadInvestor && round.leadInvestor !== "Undisclosed" && (
              <>
                <span style={{ color: "var(--color-border-subtle)" }}>·</span>
                <span
                  className="text-11 truncate"
                  style={{ color: "var(--color-text-tertiary)", maxWidth: 150 }}
                >
                  {round.leadInvestor}
                </span>
              </>
            )}
            <span className="flex-1" />
            <span
              className="text-11 flex-shrink-0"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {formatRelativeDate(round.announcedDate)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
