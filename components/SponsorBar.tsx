export function SponsorBar() {
  const sponsors = ["Investinor", "Nordic Biotech Fund", "Oslo Cancer Cluster"];

  return (
    <div
      className="h-[36px] flex items-center px-5 gap-3 border-t border-b overflow-x-auto"
      style={{ background: "var(--color-bg-tertiary)", scrollbarWidth: "none" }}
    >
      <span
        className="text-10 whitespace-nowrap"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        Sponsors
      </span>
      <div className="flex items-center gap-2">
        {sponsors.map((s) => (
          <span
            key={s}
            className="text-11 font-medium px-2.5 py-1 rounded-[5px] border whitespace-nowrap"
            style={{
              color: "var(--color-text-secondary)",
              background: "var(--color-bg-primary)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            {s}
          </span>
        ))}
      </div>
      <span
        className="text-10 whitespace-nowrap ml-auto cursor-pointer"
        style={{ color: "var(--color-accent)" }}
      >
        Become a sponsor →
      </span>
    </div>
  );
}
