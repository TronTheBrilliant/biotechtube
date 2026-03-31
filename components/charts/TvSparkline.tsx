"use client";
import { useRef, useEffect } from "react";
import { createChart, AreaSeries, ColorType, Time } from "lightweight-charts";

interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function TvSparkline({ data, width = 80, height = 48, color = "#059669" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "transparent",
      },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: false },
      timeScale: { visible: false },
      crosshair: { mode: 0 },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: color,
      lineWidth: 2,
      topColor: `${color}1F`,
      bottomColor: `${color}05`,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    series.setData(data.map((value, i) => ({ time: (i + 1) as unknown as Time, value })));
    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [data, width, height, color]);

  return <div ref={containerRef} style={{ width, height }} />;
}
