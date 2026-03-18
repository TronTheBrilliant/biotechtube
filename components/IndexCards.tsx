"use client";

import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";

const cardData = [
  {
    label: "GLOBAL BIOTECH INDEX",
    value: "4,207",
    change: "+3.2%",
    up: true,
    data: [40, 42, 38, 44, 46, 43, 48, 50, 47, 52, 55, 53],
  },
  {
    label: "INVESTMENT VOLUME (Q1)",
    value: "$4.2B",
    change: "+8.3%",
    up: true,
    data: [20, 24, 22, 28, 32, 30, 35, 33, 38, 42, 40, 44],
  },
  {
    label: "ACTIVE CLINICAL TRIALS",
    value: "3,841",
    change: "+24",
    up: true,
    data: [100, 105, 108, 106, 112, 115, 118, 120, 122, 125, 128, 130],
  },
  {
    label: "COMPANIES TRACKED",
    value: "14,207",
    change: "+127",
    up: true,
    data: [200, 210, 220, 235, 248, 260, 275, 290, 305, 318, 330, 345],
  },
];

export function IndexCards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 px-5 py-4">
      {cardData.map((card) => (
        <div
          key={card.label}
          className="rounded-md px-3.5 py-3 border"
          style={{
            background: "var(--color-bg-secondary)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <div
            className="text-10 uppercase tracking-[0.4px] mb-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {card.label}
          </div>
          <div
            className="text-[20px] font-medium tracking-tight mb-[3px]"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
          >
            {card.value}
          </div>
          <div className="flex items-center justify-between">
            <span
              className="text-11"
              style={{ color: card.up ? "var(--color-accent)" : "#c0392b" }}
            >
              {card.change}
            </span>
            <div className="w-[60px] h-[28px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={card.data.map((v, i) => ({ v, i }))}
                  margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                >
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="#1a7a5e"
                    strokeWidth={1.5}
                    fill="#1a7a5e"
                    fillOpacity={0.08}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
