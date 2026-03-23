"use client";
import { useRef, useEffect, useCallback } from "react";
import {
  AreaSeries,
  type Time,
  type ISeriesApi,
  type SeriesType,
} from "lightweight-charts";
import { useTvChart } from "./useTvChart";
import { ChartTooltip } from "./ChartTooltip";

interface DataPoint {
  time: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  height?: number;
  isPositive?: boolean;
  formatValue?: (value: number) => string;
  tooltipTitle?: string;
  className?: string;
}

const GREEN = "#1a7a5e";
const RED = "#c0392b";

export function TvAreaChart({
  data,
  height = 380,
  isPositive = true,
  formatValue = (v) => `$${v.toLocaleString()}`,
  tooltipTitle = "Value",
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  const chart = useTvChart(containerRef, {
    rightPriceScale: {
      borderVisible: false,
      scaleMargins: { top: 0.1, bottom: 0.02 },
    },
  });

  // Create series once
  useEffect(() => {
    if (!chart || seriesRef.current) return;
    const color = isPositive ? GREEN : RED;
    const series = chart.addSeries(AreaSeries, {
      lineColor: color,
      lineWidth: 2,
      topColor: `${color}22`,
      bottomColor: `${color}04`,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: color,
      crosshairMarkerBackgroundColor: "white",
      lastValueVisible: false,
      priceLineVisible: false,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => formatValue(price),
      },
    });
    seriesRef.current = series;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart]);

  // Update series color when isPositive changes
  useEffect(() => {
    if (!seriesRef.current) return;
    const color = isPositive ? GREEN : RED;
    seriesRef.current.applyOptions({
      lineColor: color,
      topColor: `${color}22`,
      bottomColor: `${color}04`,
      crosshairMarkerBorderColor: color,
    });
  }, [isPositive]);

  // Update data
  useEffect(() => {
    if (!seriesRef.current || !chart || data.length === 0) return;
    const tvData = data.map((d) => ({
      time: d.time as Time,
      value: d.value,
    }));
    seriesRef.current.setData(tvData);
    // Force relayout to recalculate price scale width for new data range
    if (containerRef.current) {
      chart.applyOptions({ width: containerRef.current.clientWidth });
    }
    chart.timeScale().fitContent();
  }, [data, chart]);

  // Tooltip formatter
  const formatTooltipData = useCallback(
    (time: Time, seriesData: Map<ISeriesApi<SeriesType>, unknown>) => {
      const d = new Date(time as string);
      const dateStr = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      let result: {
        date: string;
        values: { label: string; value: string; color?: string }[];
      } | null = null;
      seriesData.forEach((val) => {
        if (!result && val && typeof val === "object" && "value" in val) {
          result = {
            date: dateStr,
            values: [
              {
                label: tooltipTitle,
                value: formatValue(
                  (val as { value: number }).value
                ),
              },
            ],
          };
        }
      });
      return result;
    },
    [tooltipTitle, formatValue]
  );

  return (
    <div className={`relative ${className || ""}`} style={{ height }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <ChartTooltip chart={chart} formatData={formatTooltipData} />
    </div>
  );
}
