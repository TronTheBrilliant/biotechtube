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

// ── CPI data (US Bureau of Labor Statistics, annual average CPI-U) ──
// Base year 2024 = 100 (normalized). All amounts adjusted to 2024 dollars.
const CPI: Record<number, number> = {
  1990: 130.7, 1991: 136.2, 1992: 140.3, 1993: 144.5, 1994: 148.2,
  1995: 152.4, 1996: 156.9, 1997: 160.5, 1998: 163.0, 1999: 166.6,
  2000: 172.2, 2001: 177.1, 2002: 179.9, 2003: 184.0, 2004: 188.9,
  2005: 195.3, 2006: 201.6, 2007: 207.3, 2008: 215.3, 2009: 214.5,
  2010: 218.1, 2011: 224.9, 2012: 229.6, 2013: 233.0, 2014: 236.7,
  2015: 237.0, 2016: 240.0, 2017: 245.1, 2018: 251.1, 2019: 255.7,
  2020: 258.8, 2021: 270.9, 2022: 292.7, 2023: 304.7, 2024: 313.0,
  2025: 318.0, 2026: 323.0, // estimated
};
const CPI_BASE = CPI[2024]; // normalize to 2024 dollars

function inflationMultiplier(year: number): number {
  const cpi = CPI[year] || CPI[Math.min(Math.max(year, 1990), 2026)];
  return CPI_BASE / cpi;
}

// ── Types ─────────────────────────────────────────────────────────────

type TimeValue = { time: string; value: number };
type Timeframe = "Monthly" | "Quarterly" | "Annual";
const TIMEFRAMES: Timeframe[] = ["Monthly", "Quarterly", "Annual"];

const GREEN = "#059669";
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
  const [inflationAdj, setInflationAdj] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  // Transform server data to chart format
  const datasets: Record<Timeframe, TimeValue[]> = useMemo(() => {
    const adj = inflationAdj;

    const monthly: TimeValue[] = monthlyRaw.map((d) => {
      const mult = adj ? inflationMultiplier(d.year) : 1;
      return {
        time: `${d.year}-${String(d.month).padStart(2, "0")}-01`,
        value: Math.round((d.total / 1_000_000) * mult),
      };
    });

    const quarterly: TimeValue[] = quarterlyRaw.map((d) => {
      const mult = adj ? inflationMultiplier(d.year) : 1;
      const month = { 1: "02", 2: "05", 3: "08", 4: "11" }[d.quarter] || "06";
      return {
        time: `${d.year}-${month}-15`,
        value: Math.round((d.total / 1_000_000) * mult),
      };
    });

    const annual: TimeValue[] = annualRaw.map((d) => {
      const mult = adj ? inflationMultiplier(d.year) : 1;
      return {
        time: `${d.year}-06-01`,
        value: (d.total / 1_000_000_000) * mult,
      };
    });

    return { Monthly: monthly, Quarterly: quarterly, Annual: annual };
  }, [annualRaw, quarterlyRaw, monthlyRaw, inflationAdj]);

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

  // Update data when timeframe or inflation toggle changes
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
          const label = inflationAdj
            ? `${timeframe} Funding (2024 $)`
            : `${timeframe} Funding`;
          result = {
            date: dateStr,
            values: [{ label, value: formatValue(timeframe, v) }],
          };
        }
      });
      return result;
    },
    [timeframe, inflationAdj]
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
        <div className="flex gap-1 items-center">
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
          <span
            style={{
              width: 1,
              height: 16,
              background: "var(--color-border-subtle)",
              margin: "0 4px",
            }}
          />
          <button
            onClick={() => setInflationAdj(!inflationAdj)}
            style={{
              ...btnBase,
              background: inflationAdj
                ? "var(--color-accent)"
                : "var(--color-bg-secondary)",
              color: inflationAdj ? "#fff" : "var(--color-text-secondary)",
              borderColor: inflationAdj
                ? "var(--color-accent)"
                : "var(--color-border-medium)",
              fontSize: 10,
            }}
            title="Adjust all amounts to 2024 dollars using CPI inflation data"
          >
            {inflationAdj ? "2024 $" : "Inflation adj."}
          </button>
        </div>
        <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>
          {data.length} {periodLabel(timeframe)} · {totalLabel(timeframe, data)} total
          {inflationAdj && " (2024 $)"}
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
