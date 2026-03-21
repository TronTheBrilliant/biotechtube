"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";

function formatCount(n: number): string {
  return n.toLocaleString();
}

export function IndexCards() {
  const [companyCount, setCompanyCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setCompanyCount(d.totalCompanies))
      .catch(() => {});
  }, []);

  const cardData = [
    {
      label: "📊 GLOBAL BIOTECH INDEX",
      value: "4,207",
      change: "+3.2%",
      up: true,
      href: "/markets",
      data: [40, 42, 38, 44, 46, 43, 48, 50, 47, 52, 55, 53],
    },
    {
      label: "💰 INVESTMENT VOLUME (YTD)",
      value: "$4.2B",
      change: "+8.3%",
      up: true,
      href: "/funding",
      data: [20, 24, 22, 28, 32, 30, 35, 33, 38, 42, 40, 44],
    },
    {
      label: "🧪 ACTIVE CLINICAL TRIALS",
      value: "3,841",
      change: "+24",
      up: true,
      href: "/pipeline",
      data: [100, 105, 108, 106, 112, 115, 118, 120, 122, 125, 128, 130],
    },
    {
      label: "🏢 COMPANIES TRACKED",
      value: companyCount !== null ? formatCount(companyCount) : "...",
      change: companyCount !== null ? `+${formatCount(companyCount)}` : "",
      up: true,
      href: "/companies",
      data: [200, 210, 220, 235, 248, 260, 275, 290, 305, 318, 330, 345],
    },
  ];

  return (
    <div className="flex md:grid md:grid-cols-4 gap-2.5 px-5 py-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      {cardData.map((card) => (
        <Link
          key={card.label}
          href={card.href}
          className="rounded-md px-3.5 py-3 border min-w-[160px] md:min-w-0 min-h-[160px] flex-shrink-0 md:flex-shrink transition-all duration-150 hover:border-[var(--color-border-medium)] hover:shadow-sm"
          style={{
            background: "var(--color-bg-secondary)",
            borderColor: "var(--color-border-subtle)",
            borderLeft: card.up ? "3px solid #1a7a5e" : "3px solid #c0392b",
          }}
        >
          <div
            className="text-12 uppercase tracking-[0.4px] mb-1 whitespace-nowrap"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {card.label}
          </div>
          <div
            className="text-[32px] font-medium tracking-tight mb-[3px]"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
          >
            {card.value}
          </div>
          <div className="flex items-center justify-between">
            <span
              className="text-13 font-medium"
              style={{ color: card.up ? "var(--color-accent)" : "#c0392b" }}
            >
              {card.change}
            </span>
            <div className="w-[80px] h-[48px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={card.data.map((v, i) => ({ v, i }))}
                  margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                >
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="#1a7a5e"
                    strokeWidth={2}
                    fill="#1a7a5e"
                    fillOpacity={0.12}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
