"use client";

import { useRef, useEffect } from "react";
import { HistogramSeries, type Time, type ISeriesApi } from "lightweight-charts";
import { useTvChart } from "@/components/charts/useTvChart";
import fundingNarrative from "@/data/funding-narrative.json";

const GREEN = "#059669";

const ERA_COLORS: Record<string, string> = {
  "1990-1999": "#6366f1",
  "2000-2007": "#f59e0b",
  "2008-2012": "#ef4444",
  "2013-2019": "#10b981",
  "2020-2026": "#3b82f6",
};

interface AnnualRow {
  year: number;
  amount: number; // in $M
  deals: number;
}

interface Props {
  data?: AnnualRow[];
}

export default function FundingChart({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const annualData = data || [];
  const totalB = annualData.reduce((s, d) => s + d.amount, 0) / 1000;
  const totalRounds = annualData.reduce((s, d) => s + d.deals, 0);

  const chartData = annualData.map((d) => ({
    time: `${d.year}-06-01` as string,
    value: d.amount / 1000, // convert M -> B
    color: `${GREEN}cc`,
  }));

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart]);

  // Update data when props change
  useEffect(() => {
    if (!seriesRef.current || !chart || chartData.length === 0) return;
    seriesRef.current.setData(
      chartData.map((d) => ({ time: d.time as Time, value: d.value, color: d.color }))
    );
    chart.timeScale().fitContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <div className="px-4 md:px-5">
      {/* Subtitle */}
      <p
        className="text-12 mb-3 leading-relaxed"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        Annual VC investment into biotech companies worldwide. Peak funding hit
        $80B+ in 2021 during the post-COVID biotech boom.
        {totalB > 0 && (
          <span style={{ color: "var(--color-text-quaternary)" }}>
            {" "}
            &middot; Total: ${totalB.toFixed(1)}B &middot;{" "}
            {totalRounds.toLocaleString()} rounds
          </span>
        )}
      </p>

      {/* Histogram chart */}
      <div className="px-2" style={{ minWidth: 0, maxWidth: "100%" }}>
        <div ref={containerRef} className="h-[180px] md:h-[250px]" style={{ width: "100%", minWidth: 0 }} />
      </div>

      {/* Insight line */}
      <p
        className="text-11 mt-4 mb-3 leading-relaxed"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        Biotech funding has grown 40x since the 1990s, driven by breakthroughs
        in genomics, immunotherapy, and mRNA technology.
      </p>

      {/* Horizontal scrollable timeline */}
      <div className="relative mt-3 pb-3">
        {/* Timeline track */}
        <div className="flex overflow-x-auto no-scrollbar gap-0 pb-2" style={{ scrollSnapType: "x mandatory" }}>
          {fundingNarrative.map((era, i) => (
            <div
              key={era.era}
              className="flex-shrink-0 relative"
              style={{ width: 200, scrollSnapAlign: "start" }}
            >
              {/* Dot + line */}
              <div className="flex items-center mb-3 px-3">
                <div
                  style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: ERA_COLORS[era.era] || "var(--color-accent)",
                    flexShrink: 0,
                  }}
                />
                {i < fundingNarrative.length - 1 && (
                  <div style={{ height: 1, flex: 1, background: "var(--color-border-subtle)" }} />
                )}
              </div>
              {/* Card content */}
              <div className="px-3">
                <span
                  className="text-10 font-medium"
                  style={{ color: ERA_COLORS[era.era] || "var(--color-text-tertiary)" }}
                >
                  {era.era}
                </span>
                <div
                  className="text-12 font-semibold mt-0.5 leading-snug"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {era.title}
                </div>
                <div
                  className="text-11 mt-1 leading-relaxed"
                  style={{
                    color: "var(--color-text-tertiary)",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {era.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
