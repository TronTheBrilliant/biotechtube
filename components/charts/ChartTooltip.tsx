"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type {
  IChartApi,
  MouseEventParams,
  Time,
  ISeriesApi,
  SeriesType,
} from "lightweight-charts";

interface TooltipData {
  date: string;
  values: { label: string; value: string; color?: string }[];
}

interface Props {
  chart: IChartApi | null;
  formatData: (
    time: Time,
    seriesData: Map<ISeriesApi<SeriesType>, unknown>
  ) => TooltipData | null;
}

export function ChartTooltip({ chart, formatData }: Props) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<TooltipData | null>(null);

  const handleCrosshairMove = useCallback(
    (param: MouseEventParams<Time>) => {
      if (
        !tooltipRef.current ||
        !param.time ||
        !param.point ||
        param.point.x < 0 ||
        param.point.y < 0
      ) {
        setVisible(false);
        return;
      }

      const seriesData = new Map<ISeriesApi<SeriesType>, unknown>();
      if (param.seriesData) {
        param.seriesData.forEach((val, key) => seriesData.set(key, val));
      }

      const formatted = formatData(param.time, seriesData);
      if (!formatted) {
        setVisible(false);
        return;
      }

      setData(formatted);
      setVisible(true);

      // Position tooltip
      const el = tooltipRef.current;
      const container = el.parentElement;
      if (!container) return;
      const cw = container.clientWidth;
      const tw = el.clientWidth;
      let left = param.point.x + 16;
      if (left + tw > cw - 10) left = param.point.x - tw - 16;
      if (left < 4) left = 4;
      el.style.left = `${left}px`;
      el.style.top = `${Math.max(4, param.point.y - 30)}px`;
    },
    [formatData]
  );

  useEffect(() => {
    if (!chart) return;
    chart.subscribeCrosshairMove(handleCrosshairMove);
    return () => chart.unsubscribeCrosshairMove(handleCrosshairMove);
  }, [chart, handleCrosshairMove]);

  if (!visible || !data) return null;

  return (
    <div
      ref={tooltipRef}
      className="absolute z-50 pointer-events-none"
      style={{
        background: "var(--color-bg-primary)",
        border: "0.5px solid var(--color-border-subtle)",
        borderRadius: 6,
        padding: "6px 10px",
        fontSize: 11,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        whiteSpace: "nowrap",
      }}
    >
      <div
        style={{
          color: "var(--color-text-tertiary)",
          marginBottom: 2,
          fontSize: 10,
        }}
      >
        {data.date}
      </div>
      {data.values.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            style={{ color: "var(--color-text-secondary)", fontSize: 10 }}
          >
            {v.label}
          </span>
          <span
            style={{
              color: v.color || "var(--color-text-primary)",
              fontWeight: 500,
            }}
          >
            {v.value}
          </span>
        </div>
      ))}
    </div>
  );
}
