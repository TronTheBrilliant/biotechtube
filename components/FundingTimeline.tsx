import { FundingRound } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";

interface FundingTimelineProps {
  rounds: FundingRound[];
  totalRaised: number;
}

export function FundingTimeline({ rounds, totalRaised }: FundingTimelineProps) {
  return (
    <div>
      {rounds.map((round, i) => {
        const isRecent = i === 0;
        return (
          <div key={i} className="flex gap-3 mb-3.5">
            {/* Dot + Line */}
            <div className="flex flex-col items-center">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{
                  background: isRecent
                    ? "var(--color-accent)"
                    : "var(--color-border-medium)",
                }}
              />
              {i < rounds.length - 1 && (
                <div
                  className="flex-1 mt-1 mb-1"
                  style={{
                    width: 1,
                    minHeight: 20,
                    background: "var(--color-border-subtle)",
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 -mt-[2px]">
              <div className="flex justify-between items-center mb-[2px]">
                <span
                  className="text-12 font-medium"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {round.type}
                </span>
                <span
                  className="text-13 font-medium"
                  style={{ color: "var(--color-accent)" }}
                >
                  {formatCurrency(round.amount, round.currency)}
                </span>
              </div>
              <div
                className="text-11 mb-[2px]"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {round.leadInvestor && <>Led by {round.leadInvestor}</>}
              </div>
              <div className="text-10" style={{ color: "var(--color-text-tertiary)" }}>
                {new Date(round.date).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
        );
      })}

      {/* Total Raised Bar */}
      <div
        className="flex justify-between items-center px-3 py-2.5 rounded border mt-2"
        style={{
          background: "var(--color-bg-secondary)",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        <span className="text-11" style={{ color: "var(--color-text-secondary)" }}>
          Total Raised
        </span>
        <span
          className="text-14 font-medium"
          style={{ color: "var(--color-text-primary)" }}
        >
          {formatCurrency(totalRaised)}
        </span>
      </div>
    </div>
  );
}
