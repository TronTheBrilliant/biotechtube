"use client";
import { useState } from "react";

interface FundingPoint {
  label: string;
  amount: number;
}

interface Props {
  data: FundingPoint[];
  height?: number;
}

export function FundingBarChart({ data, height = 180 }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const barHeight = height - 32;

  return (
    <div style={{ height }} className="flex items-end gap-1 px-2 pb-6 pt-2 relative">
      {data.map((d, i) => {
        const barPct = (d.amount / maxAmount) * 100;
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center justify-end relative"
            style={{ height: barHeight }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {hoveredIndex === i && (
              <div
                className="absolute -top-6 z-10 px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap"
                style={{
                  background: "var(--color-bg-primary)",
                  border: "0.5px solid var(--color-border-subtle)",
                  color: "var(--color-text-primary)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                ${d.amount}M
              </div>
            )}
            <div
              className="w-full transition-all duration-150"
              style={{
                height: `${barPct}%`,
                minHeight: 4,
                background: hoveredIndex === i ? "#059669" : "#059669CC",
                borderRadius: "4px 4px 0 0",
              }}
            />
            <span
              className="absolute -bottom-5 text-[9px] font-medium truncate max-w-full text-center"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
