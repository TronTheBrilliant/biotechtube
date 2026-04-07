"use client";

import { useRef, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
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
  const [showTimeline, setShowTimeline] = useState(false);

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
      <div className="px-2">
        <div ref={containerRef} style={{ width: "100%", height: 250 }} />
      </div>

      {/* Insight line */}
      <p
        className="text-11 mt-4 mb-3 leading-relaxed"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        Biotech funding has grown 40x since the 1990s, driven by breakthroughs
        in genomics, immunotherapy, and mRNA technology.
      </p>

      {/* Toggle for era timeline */}
      <button
        onClick={() => setShowTimeline(!showTimeline)}
        className="flex items-center gap-1.5 text-11 font-medium mb-3 transition-opacity hover:opacity-70"
        style={{ color: "var(--color-text-tertiary)", background: "none", border: "none", cursor: "pointer" }}
      >
        {showTimeline ? "Hide" : "Show"} funding timeline
        <ChevronDown size={13} style={{ transform: showTimeline ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {/* Era cards — collapsible, closed by default */}
      {showTimeline && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3">
          {fundingNarrative.map((era) => {
            return (
              <div
                key={era.era}
                className="rounded-lg p-3 text-left"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "0.5px solid var(--color-border-subtle)",
                }}
              >
                <span
                  className="inline-block text-10 font-semibold px-2 py-0.5 rounded-full mb-1.5"
                  style={{
                    background: "var(--color-bg-tertiary)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {era.era}
                </span>
                <div
                  className="text-13 font-semibold mb-1 leading-snug"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {era.title}
                </div>
                <div
                  className="text-12 leading-relaxed"
                  style={{
                    color: "var(--color-text-secondary)",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {era.description}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
