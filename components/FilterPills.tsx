"use client";

import { useState } from "react";

const filters = [
  "All",
  "Oncology",
  "Immunotherapy",
  "Gene Therapy",
  "Diagnostics",
  "Drug Delivery",
  "Radiopharmaceuticals",
  "Cell Therapy",
  "AI / Digital",
];

export function FilterPills() {
  const [active, setActive] = useState("All");

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap py-2" style={{ scrollbarWidth: "none" }}>
      {filters.map((f) => (
        <button
          key={f}
          onClick={() => setActive(f)}
          className="text-11 font-medium px-3 py-[5px] rounded-full border transition-all duration-150"
          style={
            active === f
              ? {
                  background: "var(--color-accent)",
                  color: "white",
                  borderColor: "var(--color-accent)",
                }
              : {
                  background: "transparent",
                  color: "var(--color-text-secondary)",
                  borderColor: "var(--color-border-medium)",
                }
          }
        >
          {f}
        </button>
      ))}
    </div>
  );
}
