const stages = ["Pre-clinical", "Phase 1", "Phase 2", "Phase 3", "Approved"];

function stageToPercent(stage: string): number {
  const map: Record<string, number> = {
    "Pre-clinical": 10,
    "Phase 1": 30,
    "Phase 1/2": 40,
    "Phase 2": 55,
    "Phase 3": 75,
    Approved: 100,
  };
  return map[stage] || 10;
}

interface PipelineBarProps {
  name: string;
  indication: string;
  stage: string;
  isLead?: boolean;
  nextCatalyst?: string;
}

export function PipelineBar({
  name,
  indication,
  stage,
  isLead = false,
  nextCatalyst,
}: PipelineBarProps) {
  const percent = stageToPercent(stage);
  const activeIndex = stages.indexOf(stage.replace("Phase 1/2", "Phase 1"));

  return (
    <div className="mb-3.5">
      <div className="flex items-center justify-between mb-[2px]">
        <span
          className="text-12 font-medium"
          style={{ color: "var(--color-text-primary)" }}
        >
          {name}
        </span>
        {nextCatalyst && (
          <span
            className="text-10 px-2 py-[3px] rounded-sm"
            style={{ background: "#fef3e2", color: "#b45309", border: "0.5px solid #fcd34d" }}
          >
            {nextCatalyst}
          </span>
        )}
      </div>
      <div className="text-11 mb-2" style={{ color: "var(--color-text-secondary)" }}>
        {indication}
      </div>

      {/* Track */}
      <div
        className="relative h-2 rounded-sm border overflow-visible"
        style={{
          background: "var(--color-bg-secondary)",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        {/* Fill */}
        <div
          className="h-full rounded-sm"
          style={{
            width: `${percent}%`,
            background: "linear-gradient(90deg, #0a3d2e, #1a7a5e)",
            opacity: isLead ? 1 : 0.7,
          }}
        />
        {/* Active dot */}
        <div
          className="absolute top-1/2"
          style={{
            left: `${percent}%`,
            transform: "translate(-50%, -50%)",
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: percent > 10 ? "#1a7a5e" : "var(--color-text-tertiary)",
            border: "2px solid var(--color-bg-primary)",
            zIndex: 2,
          }}
        />
      </div>

      {/* Stage labels */}
      <div className="flex mt-1">
        {stages.map((s, i) => (
          <div key={s} className="flex-1 text-center">
            <span
              className="text-[9px]"
              style={{
                color:
                  i === activeIndex || s === stage
                    ? "var(--color-accent)"
                    : "var(--color-text-tertiary)",
                fontWeight: i === activeIndex || s === stage ? 500 : 400,
              }}
            >
              {s.replace("Pre-clinical", "Pre")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
