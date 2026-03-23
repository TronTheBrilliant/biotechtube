"use client";

import { useState } from "react";
import { TvAreaChart } from "@/components/charts/TvAreaChart";

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
  const chartData = data.map((d, i) => ({
    time: `2025-${String(i + 1).padStart(2, "0")}-01`,
    value: d.value,
  }));

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
      <TvAreaChart
        data={chartData}
        height={160}
        isPositive={true}
        formatValue={(v) => `$${Math.round(v)}M`}
        tooltipTitle="Investment"
      />
    </div>
  );
}
