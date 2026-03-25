interface Investor {
  name: string;
  dealCount: number;
  totalInvested: number | null; // in USD
}

function formatAmount(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(0)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount}`;
}

export default function TopInvestors({ investors }: { investors: Investor[] }) {
  return (
    <div>
      {investors.slice(0, 5).map((inv, i) => (
        <div
          key={inv.name}
          className="px-4 py-2.5 flex items-center gap-3"
          style={
            i < 4 && i < investors.length - 1
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

          {/* Investor name */}
          <span
            className="font-medium truncate min-w-0"
            style={{ fontSize: 13, color: "var(--color-text-primary)" }}
          >
            {inv.name}
          </span>

          {/* Spacer */}
          <span className="flex-1" />

          {/* Deal count */}
          <span className="flex-shrink-0" style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
            {inv.dealCount} {inv.dealCount === 1 ? "deal" : "deals"}
          </span>

          {/* Total invested */}
          <span
            className="font-medium text-right flex-shrink-0"
            style={{ fontSize: 13, color: "var(--color-text-primary)", minWidth: 70 }}
          >
            {inv.totalInvested ? formatAmount(inv.totalInvested) : "-"}
          </span>
        </div>
      ))}
    </div>
  );
}
