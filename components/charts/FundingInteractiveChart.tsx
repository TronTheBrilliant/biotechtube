"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  HistogramSeries,
  type Time,
  type ISeriesApi,
  type SeriesType,
} from "lightweight-charts";
import { useTvChart } from "./useTvChart";
import { ChartTooltip } from "./ChartTooltip";

import fundingWeekly from "@/data/funding-weekly.json";
import fundingMonthly from "@/data/funding-monthly.json";
import fundingQuarterly from "@/data/funding-quarterly.json";
import fundingAnnual from "@/data/funding-annual.json";

// ── Data transforms ─────────────────────────────────────────────────

type TimeValue = { time: string; value: number };

const weeklyData: TimeValue[] = fundingWeekly as TimeValue[];
const monthlyData: TimeValue[] = fundingMonthly as TimeValue[];

const quarterToDate = (label: string) => {
  const [q, year] = label.split(" ");
  const month = { Q1: "02", Q2: "05", Q3: "08", Q4: "11" }[q] || "06";
  return `${year}-${month}-15`;
};
const quarterlyData: TimeValue[] = (
  fundingQuarterly as { label: string; amount: number }[]
).map((d) => ({ time: quarterToDate(d.label), value: d.amount }));

const annualData: TimeValue[] = (
  fundingAnnual as { year: number; amount: number }[]
).map((d) => ({ time: `${d.year}-06-01`, value: d.amount / 1000 })); // M -> B

// ── Types ───────────────────────────────────────────────────────────

type Timeframe = "Weekly" | "Monthly" | "Quarterly" | "Annual";
const TIMEFRAMES: Timeframe[] = ["Weekly", "Monthly", "Quarterly", "Annual"];

const GREEN = "#1a7a5e";
const COLORS: Record<Timeframe, string> = {
  Weekly: `${GREEN}aa`,
  Monthly: `${GREEN}bb`,
  Quarterly: `${GREEN}cc`,
  Annual: `${GREEN}cc`,
};

function formatValue(tf: Timeframe, v: number): string {
  if (tf === "Annual") return `$${v.toFixed(1)}B`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}B`;
  return `$${v.toFixed(0)}M`;
}

function periodLabel(tf: Timeframe): string {
  return tf === "Annual" ? "years" : tf === "Quarterly" ? "quarters" : tf === "Monthly" ? "months" : "weeks";
}

function totalLabel(tf: Timeframe, data: TimeValue[]): string {
  const sum = data.reduce((s, d) => s + d.value, 0);
  if (tf === "Annual") return `$${sum.toFixed(0)}B`;
  if (sum >= 1000) return `$${(sum / 1000).toFixed(1)}B`;
  return `$${sum.toFixed(0)}M`;
}

// ── Component ───────────────────────────────────────────────────────

interface Props {
  height?: number;
  className?: string;
}

export function FundingInteractiveChart({ height = 350, className }: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>("Quarterly");
  const containerRef = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const datasets: Record<Timeframe, TimeValue[]> = useMemo(
    () => ({
      Weekly: weeklyData,
      Monthly: monthlyData,
      Quarterly: quarterlyData,
      Annual: annualData,
    }),
    []
  );

  const data = datasets[timeframe];

  const chart = useTvChart(containerRef, {
    handleScroll: {
      mouseWheel: true,
      pressedMouseMove: true,
      horzTouchDrag: true,
    },
    handleScale: {
      mouseWheel: true,
      pinch: true,
      axisPressedMouseMove: true,
    },
    crosshair: {
      vertLine: { labelVisible: true },
      horzLine: { labelVisible: true },
    },
    rightPriceScale: {
      borderVisible: false,
      scaleMargins: { top: 0.08, bottom: 0.02 },
    },
    timeScale: {
      borderVisible: false,
      fixLeftEdge: false,
      fixRightEdge: false,
    },
    localization: {
      priceFormatter: (price: number) =>
        formatValue(timeframe, price),
    },
  });

  // Create series once
  useEffect(() => {
    if (!chart || seriesRef.current) return;
    const series = chart.addSeries(HistogramSeries, {
      color: COLORS[timeframe],
      priceFormat: {
        type: "custom",
        formatter: (price: number) => formatValue(timeframe, price),
      },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    seriesRef.current = series;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart]);

  // Update data when timeframe changes
  useEffect(() => {
    if (!seriesRef.current || !chart) return;
    const color = COLORS[timeframe];
    seriesRef.current.applyOptions({
      color,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => formatValue(timeframe, price),
      },
    });
    seriesRef.current.setData(
      data.map((d) => ({ time: d.time as Time, value: d.value, color }))
    );
    chart.applyOptions({
      localization: {
        priceFormatter: (price: number) => formatValue(timeframe, price),
      },
    });
    chart.timeScale().fitContent();
  }, [data, chart, timeframe]);

  // Tooltip
  const formatTooltipData = useCallback(
    (time: Time, seriesData: Map<ISeriesApi<SeriesType>, unknown>) => {
      const d = new Date(time as string);
      let dateStr: string;
      if (timeframe === "Annual") {
        dateStr = d.getUTCFullYear().toString();
      } else if (timeframe === "Quarterly") {
        const q = Math.ceil((d.getUTCMonth() + 1) / 3);
        dateStr = `Q${q} ${d.getUTCFullYear()}`;
      } else if (timeframe === "Monthly") {
        dateStr = d.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        });
      } else {
        const endOfWeek = new Date(d);
        endOfWeek.setUTCDate(endOfWeek.getUTCDate() + 6);
        dateStr = `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} – ${endOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any = null;
      seriesData.forEach((val) => {
        if (
          !result &&
          val &&
          typeof val === "object" &&
          "value" in (val as Record<string, unknown>)
        ) {
          const v = (val as { value: number }).value;
          result = {
            date: dateStr,
            values: [
              {
                label: `${timeframe} Funding`,
                value: formatValue(timeframe, v),
              },
            ],
          };
        }
      });
      return result;
    },
    [timeframe]
  );

  const btnBase: React.CSSProperties = {
    padding: "4px 10px",
    borderRadius: 5,
    fontSize: 11,
    fontWeight: 500,
    cursor: "pointer",
    border: "0.5px solid var(--color-border-medium)",
    transition: "all 0.15s ease",
  };

  return (
    <div className={className}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                ...btnBase,
                background:
                  timeframe === tf
                    ? "var(--color-accent)"
                    : "var(--color-bg-secondary)",
                color:
                  timeframe === tf ? "#fff" : "var(--color-text-secondary)",
                borderColor:
                  timeframe === tf
                    ? "var(--color-accent)"
                    : "var(--color-border-medium)",
              }}
            >
              {tf}
            </button>
          ))}
        </div>
        <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>
          {data.length} {periodLabel(timeframe)} · {totalLabel(timeframe, data)} total
          {timeframe !== "Annual" && " · Scroll to zoom"}
        </span>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        <ChartTooltip chart={chart} formatData={formatTooltipData} />
      </div>
    </div>
  );
}
