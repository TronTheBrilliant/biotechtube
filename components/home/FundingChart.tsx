"use client";

import { useRef, useEffect, useState } from "react";
import { HistogramSeries, type Time, type ISeriesApi } from "lightweight-charts";
import { useTvChart } from "@/components/charts/useTvChart";
import fundingNarrative from "@/data/funding-narrative.json";
import { ChevronDown, ChevronUp } from "lucide-react";

const GREEN = "#1a7a5e";

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
  const [expandedEra, setExpandedEra] = useState<string | null>(null);

  const annualData = data || [];
  const totalB = annualData.reduce((s, d) => s + d.amount, 0) / 1000;

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
    <div>
      {/* Subtitle */}
      <p
        className="text-12 mb-2"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        Global biotech funding by year · Total: ${totalB.toFixed(1)}B ·{" "}
        {annualData.reduce((s, d) => s + d.deals, 0).toLocaleString()} rounds
      </p>

      {/* Histogram chart */}
      <div ref={containerRef} style={{ width: "100%", height: 250 }} />

      {/* Era narrative cards — expandable */}
      <div
        className="flex gap-3 mt-4 pb-2 overflow-x-auto md:flex-wrap md:overflow-x-visible"
        style={{ scrollbarWidth: "thin" }}
      >
        {fundingNarrative.map((era) => {
          const isExpanded = expandedEra === era.era;
          return (
            <button
              key={era.era}
              onClick={() => setExpandedEra(isExpanded ? null : era.era)}
              className="flex-shrink-0 rounded-lg px-3 py-2.5 text-left transition-all duration-200 hover:shadow-sm"
              style={{
                width: isExpanded ? 300 : 220,
                background: isExpanded ? "var(--color-bg-secondary)" : "var(--color-bg-tertiary)",
                border: isExpanded
                  ? "1px solid var(--color-accent)"
                  : "0.5px solid var(--color-border-subtle)",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-10 font-medium uppercase tracking-[0.5px]"
                  style={{ color: isExpanded ? "var(--color-accent)" : "var(--color-text-tertiary)" }}
                >
                  {era.era}
                </span>
                {isExpanded ? (
                  <ChevronUp size={12} style={{ color: "var(--color-accent)" }} />
                ) : (
                  <ChevronDown size={12} style={{ color: "var(--color-text-tertiary)" }} />
                )}
              </div>
              <div
                className="text-12 font-semibold mb-1"
                style={{ color: "var(--color-text-primary)" }}
              >
                {era.title}
              </div>
              <div
                className="text-11 leading-[1.5]"
                style={{
                  color: "var(--color-text-secondary)",
                  ...(isExpanded
                    ? {}
                    : {
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical" as const,
                        overflow: "hidden",
                      }),
                }}
              >
                {era.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
