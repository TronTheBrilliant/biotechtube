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

// ── Types ─────────────────────────────────────────────────────────────

type TimeValue = { time: string; value: number };
type Timeframe = "Monthly" | "Quarterly" | "Annual";
const TIMEFRAMES: Timeframe[] = ["Monthly", "Quarterly", "Annual"];

const GREEN = "#1a7a5e";
const COLORS: Record<Timeframe, string> = {
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
  return tf === "Annual" ? "years" : tf === "Quarterly" ? "quarters" : "months";
}

function totalLabel(tf: Timeframe, data: TimeValue[]): string {
  const sum = data.reduce((s, d) => s + d.value, 0);
  if (tf === "Annual") return `$${sum.toFixed(0)}B`;
  if (sum >= 1000) return `$${(sum / 1000).toFixed(1)}B`;
  return `$${sum.toFixed(0)}M`;
}

// ── Props (data from server) ──────────────────────────────────────────

interface AnnualRow {
  year: number;
  rounds: number;
  total: number;
}
interface QuarterlyRow {
  year: number;
  quarter: number;
  rounds: number;
  total: number;
}
interface MonthlyRow {
  year: number;
  month: number;
  rounds: number;
  total: number;
}

interface Props {
  annualData: AnnualRow[];
  quarterlyData: QuarterlyRow[];
  monthlyData: MonthlyRow[];
  height?: number;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────

export function FundingInteractiveChart({
  annualData: annualRaw,
  quarterlyData: quarterlyRaw,
  monthlyData: monthlyRaw,
  height = 350,
  className,
}: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>("Quarterly");
  const containerRef = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  // Transform server data to chart format
  const datasets: Record<Timeframe, TimeValue[]> = useMemo(() => {
    const monthly: TimeValue[] = monthlyRaw.map((d) => ({
      time: `${d.year}-${String(d.month).padStart(2, "0")}-01`,
      value: Math.round(d.total / 1_000_000), // USD -> $M
    }));

    const quarterly: TimeValue[] = quarterlyRaw.map((d) => {
      const month = { 1: "02", 2: "05", 3: "08", 4: "11" }[d.quarter] || "06";
      return {
        time: `${d.year}-${month}-15`,
        value: Math.round(d.total / 1_000_000), // USD -> $M
      };
    });

    const annual: TimeValue[] = annualRaw.map((d) => ({
      time: `${d.year}-06-01`,
      value: d.total / 1_000_000_000, // USD -> $B
    }));

    return { Monthly: monthly, Quarterly: quarterly, Annual: annual };
  }, [annualRaw, quarterlyRaw, monthlyRaw]);

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
      priceFormatter: (price: number) => formatValue(timeframe, price),
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
      } else {
        dateStr = d.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        });
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
