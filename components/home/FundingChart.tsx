"use client";

import { useRef, useEffect } from "react";
import { HistogramSeries, type Time, type ISeriesApi } from "lightweight-charts";
import { useTvChart } from "@/components/charts/useTvChart";
import fundingAnnual from "@/data/funding-annual.json";
import fundingNarrative from "@/data/funding-narrative.json";

const GREEN = "#1a7a5e";

const totalB = fundingAnnual.reduce((s, d) => s + d.amount, 0) / 1000;

const chartData = fundingAnnual.map((d) => ({
  time: `${d.year}-06-01` as string,
  value: d.amount / 1000, // convert M -> B
  color: `${GREEN}cc`,
}));

export default function FundingChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const chart = useTvChart(containerRef, {
    rightPriceScale: {
      borderVisible: false,
      scaleMargins: { top: 0.08, bottom: 0.02 },
    },
    localization: {
      priceFormatter: (price: number) => `$${price.toFixed(1)}B`,
    },
  });

  useEffect(() => {
    if (!chart || seriesRef.current) return;
    const series = chart.addSeries(HistogramSeries, {
      color: `${GREEN}cc`,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => `$${price.toFixed(1)}B`,
      },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    series.setData(
      chartData.map((d) => ({ time: d.time as Time, value: d.value, color: d.color }))
    );
    seriesRef.current = series;
    chart.timeScale().fitContent();
  }, [chart]);

  return (
    <div>
      {/* Subtitle */}
      <p
        className="text-12 mb-2"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        Global biotech VC funding 1990–2026 · Total: ${totalB.toFixed(1)}B
      </p>

      {/* Histogram chart */}
      <div ref={containerRef} style={{ width: "100%", height: 250 }} />

      {/* Era narrative cards */}
      <div
        className="flex gap-3 mt-4 pb-2 overflow-x-auto md:flex-wrap md:overflow-x-visible"
        style={{ scrollbarWidth: "thin" }}
      >
        {fundingNarrative.map((era) => (
          <div
            key={era.era}
            className="flex-shrink-0 rounded-lg px-3 py-2.5"
            style={{
              width: 220,
              background: "var(--color-bg-tertiary)",
              border: "0.5px solid var(--color-border-subtle)",
            }}
          >
            <div
              className="text-10 font-medium uppercase tracking-[0.5px] mb-1"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {era.era}
            </div>
            <div
              className="text-12 font-medium mb-1"
              style={{ color: "var(--color-text-primary)" }}
            >
              {era.title}
            </div>
            <div
              className="text-11 leading-[1.4]"
              style={{
                color: "var(--color-text-secondary)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {era.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
