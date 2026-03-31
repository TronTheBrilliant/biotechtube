import { TeamMember } from "@/lib/types";

interface TeamGridProps {
  members: TeamMember[];
}

export function TeamGrid({ members }: TeamGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {members.map((member) => (
        <div
          key={member.name}
          className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-md border"
          style={{
            background: "var(--color-bg-secondary)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#064e3b" }}
          >
            <span className="text-10 font-medium" style={{ color: "#34d399" }}>
              {member.initials}
            </span>
          </div>
          <div>
            <div
              className="text-12 font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              {member.name}
            </div>
            <div className="text-11" style={{ color: "var(--color-text-secondary)" }}>
              {member.role}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
