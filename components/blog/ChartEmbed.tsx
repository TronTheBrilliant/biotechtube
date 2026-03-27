"use client";

import { useRef, useEffect } from "react";
import { createChart, IChartApi, ISeriesApi } from "lightweight-charts";

interface ChartEmbedProps {
  type: "market-index" | "funding" | "company" | "sector";
  slug?: string;
  title: string;
  data: { time: string; value: number }[];
  height?: number;
}

export function ChartEmbed({ type, title, data, height = 280 }: ChartEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const isDark = document.documentElement.classList.contains("dark");
    const bgColor = isDark ? "#1c1c1c" : "#ffffff";
    const textColor = isDark ? "#9e9e96" : "#6b6b65";
    const lineColor = type === "funding" ? "#f59e0b" : "#1a7a5e";
    const areaTop = type === "funding" ? "rgba(245,158,11,0.15)" : "rgba(26,122,94,0.15)";
    const areaBottom = type === "funding" ? "rgba(245,158,11,0.02)" : "rgba(26,122,94,0.02)";

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: { background: { color: bgColor }, textColor, fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 10 },
      grid: { vertLines: { visible: false }, horzLines: { color: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.05 } },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      handleScroll: false,
      handleScale: false,
      crosshair: { mode: 0 },
    });

    const series = chart.addAreaSeries({
      lineColor,
      topColor: areaTop,
      bottomColor: areaBottom,
      lineWidth: 2,
    });

    series.setData(data as any);
    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [data, height, type]);

  if (data.length === 0) return null;

  return (
    <div
      className="my-6 rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}
    >
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}>
        <span className="text-11 font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
          {title}
        </span>
        <span className="text-10" style={{ color: "var(--color-text-tertiary)" }}>Interactive chart</span>
      </div>
      <div ref={containerRef} style={{ width: "100%", height }} />
      <div className="px-4 py-1.5 text-10" style={{ color: "var(--color-text-tertiary)", borderTop: "0.5px solid var(--color-border-subtle)" }}>
        Source: BiotechTube
      </div>
    </div>
  );
}
