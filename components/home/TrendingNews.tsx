export default function TrendingNews() {
  const rows = [0, 1, 2];

  return (
    <div>
      {rows.map((_, i) => (
        <div
          key={i}
          className="px-4 py-2.5 flex items-center gap-3"
          style={
            i < rows.length - 1
              ? { borderBottom: "0.5px solid var(--color-border-subtle)" }
              : undefined
          }
        >
          <span
            className="rounded-full"
            style={{
              width: 8,
              height: 8,
              minWidth: 8,
              backgroundColor: "var(--color-bg-tertiary)",
            }}
          />
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            Coming soon — AI-curated biotech news
          </span>
        </div>
      ))}

      <div className="px-4 py-3">
        <p
          className="italic"
          style={{
            fontSize: 12,
            color: "var(--color-text-tertiary)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          We&apos;re building an AI-powered news aggregator for biotech. Stay tuned.
        </p>
      </div>
    </div>
  );
}
