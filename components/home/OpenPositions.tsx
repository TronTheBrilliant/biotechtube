import Link from "next/link";

export default function OpenPositions() {
  return (
    <div className="px-4 py-6 flex flex-col items-center text-center gap-2">
      <span style={{ fontSize: 24 }}>💼</span>

      <span
        className="font-medium"
        style={{ fontSize: 14, color: "var(--color-text-secondary)" }}
      >
        Biotech job board launching soon
      </span>

      <span
        style={{
          fontSize: 12,
          color: "var(--color-text-tertiary)",
          lineHeight: 1.5,
        }}
      >
        Track open positions across 700+ biotech companies.
      </span>

      <Link
        href="/signup"
        className="no-underline font-medium"
        style={{
          fontSize: 12,
          color: "var(--color-accent)",
          marginTop: 4,
        }}
      >
        Notify me when it launches →
      </Link>
    </div>
  );
}
