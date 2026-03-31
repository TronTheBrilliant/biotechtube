"use client";
import { useRef, useEffect, useCallback, useState } from "react";
import {
  LineSeries,
  type Time,
  type ISeriesApi,
  type SeriesType,
} from "lightweight-charts";
import { useTvChart } from "./useTvChart";
import { ChartTooltip } from "./ChartTooltip";

interface Series {
  name: string;
  color: string;
  data: { time: string; value: number }[];
}

interface Props {
  series: Series[];
  height?: number;
  formatValue?: (value: number) => string;
  className?: string;
}

export function TvMultiLineChart({
  series,
  height = 380,
  formatValue = (v) => v.toLocaleString(),
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const seriesRefs = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const chart = useTvChart(containerRef, {
    rightPriceScale: {
      borderVisible: false,
      scaleMargins: { top: 0.1, bottom: 0.05 },
    },
  });

  // Toggle series visibility
  const toggleSeries = useCallback(
    (name: string) => {
      setHiddenSeries((prev) => {
        const next = new Set(prev);
        if (next.has(name)) {
          next.delete(name);
        } else {
          next.add(name);
        }
        return next;
      });
    },
    []
  );

  // Apply visibility when hiddenSeries changes
  useEffect(() => {
    seriesRefs.current.forEach((lineSeries, name) => {
      const isHidden = hiddenSeries.has(name);
      lineSeries.applyOptions({
        visible: !isHidden,
      });
    });
  }, [hiddenSeries]);

  // Create and update series
  useEffect(() => {
    if (!chart || series.length === 0) return;

    // Remove old series that are no longer present
    const currentNames = new Set(series.map((s) => s.name));
    seriesRefs.current.forEach((s, name) => {
      if (!currentNames.has(name)) {
        chart.removeSeries(s);
        seriesRefs.current.delete(name);
      }
    });

    // Add or update each series
    series.forEach((s) => {
      let lineSeries = seriesRefs.current.get(s.name);
      if (!lineSeries) {
        lineSeries = chart.addSeries(LineSeries, {
          color: s.color,
          lineWidth: 2,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 3,
          crosshairMarkerBorderColor: s.color,
          crosshairMarkerBackgroundColor: "white",
          lastValueVisible: false,
          priceLineVisible: false,
          visible: !hiddenSeries.has(s.name),
          priceFormat: {
            type: "custom",
            formatter: (price: number) => formatValue(price),
          },
        });
        seriesRefs.current.set(s.name, lineSeries);
      }

      const tvData = s.data
        .filter((d) => d.value != null && isFinite(d.value))
        .map((d) => ({ time: d.time as Time, value: d.value }));
      if (tvData.length > 0) lineSeries.setData(tvData);
    });

    if (containerRef.current) {
      chart.applyOptions({ width: containerRef.current.clientWidth });
    }
    chart.timeScale().fitContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, chart, formatValue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      seriesRefs.current.clear();
    };
  }, []);

  // Tooltip
  const formatTooltipData = useCallback(
    (time: Time, seriesData: Map<ISeriesApi<SeriesType>, unknown>) => {
      const d = new Date(time as string);
      const dateStr = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const values: { label: string; value: string; color?: string }[] = [];
      seriesData.forEach((val, seriesApi) => {
        if (val && typeof val === "object" && "value" in val) {
          let name = "";
          let color = "";
          seriesRefs.current.forEach((ref, n) => {
            if (ref === seriesApi) {
              name = n;
              const s = series.find((x) => x.name === n);
              color = s?.color || "";
            }
          });
          if (name && !hiddenSeries.has(name)) {
            values.push({
              label: name,
              value: formatValue((val as { value: number }).value),
              color,
            });
          }
        }
      });

      if (values.length === 0) return null;
      return { date: dateStr, values };
    },
    [series, formatValue, hiddenSeries]
  );

  return (
    <div className={`relative ${className || ""}`}>
      {/* Interactive Legend */}
      <div className="flex flex-wrap gap-2 mb-2 px-1">
        {series.map((s) => {
          const isHidden = hiddenSeries.has(s.name);
          return (
            <button
              key={s.name}
              onClick={() => toggleSeries(s.name)}
              className="flex items-center gap-1.5 px-1.5 py-0.5 rounded transition-opacity"
              style={{
                opacity: isHidden ? 0.35 : 1,
                cursor: "pointer",
                background: "none",
                border: "none",
              }}
              title={isHidden ? `Show ${s.name}` : `Hide ${s.name}`}
            >
              <div
                className="rounded-full transition-all"
                style={{
                  width: 8,
                  height: 8,
                  backgroundColor: s.color,
                  ...(isHidden
                    ? { outline: `1.5px solid ${s.color}`, backgroundColor: "transparent" }
                    : {}),
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: isHidden
                    ? "var(--color-text-tertiary)"
                    : "var(--color-text-secondary)",
                  textDecoration: isHidden ? "line-through" : "none",
                }}
              >
                {s.name}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ height, overflow: "hidden" }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%", minWidth: 0 }} />
        <ChartTooltip chart={chart} formatData={formatTooltipData} />
      </div>
    </div>
  );
}
