"use client";
import { useRef, useEffect, useCallback } from "react";
import { HistogramSeries, Time } from "lightweight-charts";
import { useTvChart } from "./useTvChart";
import { ChartTooltip } from "./ChartTooltip";

interface DataPoint {
  time: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  height?: number;
  color?: string;
  formatValue?: (value: number) => string;
  tooltipTitle?: string;
  className?: string;
}

export function TvHistogramChart({
  data,
  height = 300,
  color = "#1a7a5ecc",
  formatValue = (v) => `$${v.toLocaleString()}`,
  tooltipTitle = "Value",
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<any>(null);

  const chart = useTvChart(containerRef, {
    rightPriceScale: {
      borderVisible: false,
      scaleMargins: { top: 0.05, bottom: 0.02 },
    },
  });

  // Create series once
  useEffect(() => {
    if (!chart || seriesRef.current) return;
    const series = chart.addSeries(HistogramSeries, {
      color,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => formatValue(price),
      },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    seriesRef.current = series;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart]);

  // Update data
  useEffect(() => {
    if (!seriesRef.current || !chart || data.length === 0) return;
    seriesRef.current.setData(
      data.map((d) => ({ time: d.time as Time, value: d.value, color }))
    );
    if (containerRef.current) {
      chart.applyOptions({ width: containerRef.current.clientWidth });
    }
    chart.timeScale().fitContent();
  }, [data, chart, color]);

  // Tooltip
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatTooltipData = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (time: Time, seriesData: Map<any, any>) => {
      const d = new Date(time as string);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any = null;
      seriesData.forEach((val) => {
        if (!result && val && typeof val === "object" && "value" in val) {
          result = {
            date: dateStr,
            values: [{ label: tooltipTitle, value: formatValue(val.value) }],
          };
        }
      });
      return result;
    },
    [tooltipTitle, formatValue]
  );

  return (
    <div className={`relative ${className || ""}`} style={{ height, overflow: "hidden" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%", minWidth: 0 }} />
      <ChartTooltip chart={chart} formatData={formatTooltipData} />
    </div>
  );
}
