"use client";
import { useEffect, useRef, useState } from "react";
import {
  createChart,
  type IChartApi,
  ColorType,
  type DeepPartial,
  type ChartOptions,
} from "lightweight-charts";

export function useTvChart(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options?: DeepPartial<ChartOptions>
): IChartApi | null {
  const [chart, setChart] = useState<IChartApi | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const initializedRef = useRef(false);

  // Lazy-load: only create the chart when the container scrolls into view
  useEffect(() => {
    if (!containerRef.current) return;
    if (initializedRef.current) return;

    const el = containerRef.current;

    // Use IntersectionObserver to defer chart creation
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          observer.disconnect();
          initializedRef.current = true;
          initChart(el);
        }
      },
      { rootMargin: "200px" } // start loading 200px before visible
    );
    observer.observe(el);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initChart(el: HTMLDivElement) {
    const style = getComputedStyle(document.documentElement);

    const bgColor =
      style.getPropertyValue("--color-bg-secondary").trim() || "#f7f7f6";
    const textColor =
      style.getPropertyValue("--color-text-tertiary").trim() || "#9e9e96";
    const borderColor =
      style.getPropertyValue("--color-border-subtle").trim() ||
      "rgba(0,0,0,0.08)";

    const c = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight || 380,
      layout: {
        background: { type: ColorType.Solid, color: bgColor },
        textColor,
        fontFamily: "'Geist', -apple-system, sans-serif",
        fontSize: 10,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: borderColor, style: 2 }, // 2 = dashed
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.05 },
        ticksVisible: false,
      },
      localization: {
        priceFormatter: (price: number) => {
          const abs = Math.abs(price);
          if (abs >= 1e12) return `$${(price / 1e12).toFixed(1)}T`;
          if (abs >= 1e9) return `$${(price / 1e9).toFixed(1)}B`;
          if (abs >= 1e6) return `$${(price / 1e6).toFixed(1)}M`;
          if (abs >= 1e3) return `$${(price / 1e3).toFixed(0)}K`;
          return price.toFixed(2);
        },
      },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: {
        vertLine: {
          labelVisible: false,
          color: borderColor,
          width: 1,
          style: 3,
        },
        horzLine: {
          labelVisible: false,
          color: borderColor,
          width: 1,
          style: 3,
        },
      },
      handleScroll: { mouseWheel: false, pressedMouseMove: false },
      handleScale: false,
      ...options,
    });

    // ResizeObserver
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        c.applyOptions({ width, height });
      }
    });
    ro.observe(el);
    roRef.current = ro;

    chartRef.current = c;
    setChart(c);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      roRef.current?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, []);

  // Theme sync - watch for class changes on <html>
  useEffect(() => {
    if (!chartRef.current) return;
    const observer = new MutationObserver(() => {
      const style = getComputedStyle(document.documentElement);
      chartRef.current?.applyOptions({
        layout: {
          background: {
            type: ColorType.Solid,
            color:
              style.getPropertyValue("--color-bg-secondary").trim() ||
              "#f7f7f6",
          },
          textColor:
            style.getPropertyValue("--color-text-tertiary").trim() ||
            "#9e9e96",
        },
        grid: {
          horzLines: {
            color:
              style.getPropertyValue("--color-border-subtle").trim() ||
              "rgba(0,0,0,0.08)",
          },
        },
      });
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [chart]);

  return chart;
}
