export function TickerBar() {
  const items = [
    { label: "Listed Companies", value: "14,207", change: "+12", up: true },
    { label: "Total Investment (YTD)", value: "$4.2B", change: "+8.3%", up: true },
    { label: "Active Trials", value: "3,841", change: "+24", up: true },
    { label: "Avg. Valuation", value: "$182M", change: "-2.1%", up: false },
    { label: "IPOs (YTD)", value: "17", change: "+3", up: true },
    { label: "Nordic Funding (YTD)", value: "$340M", change: "+14.6%", up: true },
  ];

  return (
    <div
      className="h-[30px] flex items-center px-5 border-b overflow-x-auto whitespace-nowrap"
      style={{
        background: "var(--color-bg-tertiary)",
        scrollbarWidth: "none",
      }}
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <div className="live-dot" />
          <span
            className="text-11 font-medium"
            style={{ color: "var(--color-text-primary)" }}
          >
            Live
          </span>
        </div>
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="text-11" style={{ color: "var(--color-text-secondary)" }}>
              {item.label}
            </span>
            <span
              className="text-11 font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              {item.value}
            </span>
            <span
              className="text-10"
              style={{ color: item.up ? "var(--color-accent)" : "#c0392b" }}
            >
              {item.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
