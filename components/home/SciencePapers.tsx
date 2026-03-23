export default function SciencePapers() {
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
            className="text-center font-medium"
            style={{
              fontSize: 12,
              width: 20,
              color: "var(--color-text-tertiary)",
            }}
          >
            {i + 1}
          </span>
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            Top science papers ranking coming soon
          </span>
        </div>
      ))}

      <div className="px-4 py-3">
        <p
          style={{
            fontSize: 12,
            color: "var(--color-text-tertiary)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          We&apos;re curating the most impactful biotech research papers of all time.
        </p>
      </div>
    </div>
  );
}
