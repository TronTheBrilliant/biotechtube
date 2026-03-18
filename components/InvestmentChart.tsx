"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  ResponsiveContainer,
} from "recharts";

const generateData = (months: number) => {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return Array.from({ length: months }, (_, i) => ({
    name: labels[i % 12],
    value: Math.floor(200 + Math.random() * 300 + i * 15),
  }));
};

const tabs = [
  { label: "1Y", months: 12 },
  { label: "3Y", months: 12 },
  { label: "5Y", months: 12 },
  { label: "All", months: 12 },
];

export function InvestmentChart() {
  const [activeTab, setActiveTab] = useState("1Y");
  const data = generateData(12);

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-10 uppercase tracking-[0.5px] font-medium"
          style={{ color: "var(--color-text-secondary)" }}
        >
          INVESTMENT VOLUME
        </h2>
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              className="text-10 font-medium px-2 py-1 rounded transition-all duration-150"
              style={
                activeTab === tab.label
                  ? { background: "var(--color-accent)", color: "white" }
                  : { color: "var(--color-text-tertiary)" }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "var(--color-text-tertiary)" }}
              axisLine={false}
              tickLine={false}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#1a7a5e"
              strokeWidth={1.5}
              fill="#1a7a5e"
              fillOpacity={0.12}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
