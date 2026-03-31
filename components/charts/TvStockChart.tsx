"use client";
import { useRef, useEffect, useCallback } from "react";
import { AreaSeries, HistogramSeries, Time, PriceScaleMode } from "lightweight-charts";
import { useTvChart } from "./useTvChart";
import { ChartTooltip } from "./ChartTooltip";
import { formatMarketCap } from "@/lib/market-utils";

interface StockPoint {
  date: string;
  price: number;
  volume: number;
}

interface Props {
  data: StockPoint[];
  isPositive: boolean;
  logScale: boolean;
  currency: string;
  height?: number;
}

const GREEN = "#059669";
const RED = "#c0392b";

export function TvStockChart({ data, isPositive, logScale, currency, height = 380 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priceSeriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const volumeSeriesRef = useRef<any>(null);

  const chart = useTvChart(containerRef, {
    rightPriceScale: {
      scaleMargins: { top: 0.05, bottom: 0.25 },
      mode: logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
    },
    localization: {
      priceFormatter: (price: number) => {
        if (price >= 1e6) return `$${(price / 1e6).toFixed(1)}M`;
        if (price >= 1e4) return `$${(price / 1e3).toFixed(0)}K`;
        if (price >= 1e3) return `$${price.toFixed(0)}`;
        return `$${price.toFixed(2)}`;
      },
    },
  });

  // Create series once
  useEffect(() => {
    if (!chart || priceSeriesRef.current) return;

    const color = isPositive ? GREEN : RED;

    const priceSeries = chart.addSeries(AreaSeries, {
      lineColor: color,
      lineWidth: 2,
      topColor: `${color}22`,
      bottomColor: `${color}04`,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    priceSeriesRef.current = priceSeries;
    volumeSeriesRef.current = volumeSeries;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart]);

  // Update color
  useEffect(() => {
    if (!priceSeriesRef.current) return;
    const color = isPositive ? GREEN : RED;
    priceSeriesRef.current.applyOptions({
      lineColor: color,
      topColor: `${color}22`,
      bottomColor: `${color}04`,
    });
  }, [isPositive]);

  // Update log scale
  useEffect(() => {
    if (!chart) return;
    chart.priceScale("right").applyOptions({
      mode: logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
    });
  }, [logScale, chart]);

  // Update data
  useEffect(() => {
    if (!priceSeriesRef.current || !volumeSeriesRef.current || !chart || data.length === 0) return;

    const color = isPositive ? GREEN : RED;

    // Deduplicate by date (keep last entry) and sort ascending
    const dateMap = new Map<string, StockPoint>();
    data.forEach(d => { if (d.date && d.price != null) dateMap.set(d.date, d); });
    const sorted: StockPoint[] = [];
    dateMap.forEach((v) => sorted.push(v));
    sorted.sort((a, b) => a.date.localeCompare(b.date));

    priceSeriesRef.current.setData(
      sorted.map(d => ({ time: d.date as Time, value: d.price }))
    );

    volumeSeriesRef.current.setData(
      sorted.map(d => ({ time: d.date as Time, value: d.volume, color: `${color}33` }))
    );

    chart.timeScale().fitContent();
  }, [data, chart, isPositive]);

  // Tooltip
  const formatTooltipData = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (time: Time, seriesData: Map<any, any>) => {
      const d = new Date(time as string);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const values: { label: string; value: string; color?: string }[] = [];

      seriesData.forEach((val, series) => {
        if (series === priceSeriesRef.current && val && "value" in val) {
          values.push({ label: "Price", value: `${currency} ${val.value.toFixed(2)}` });
        }
        if (series === volumeSeriesRef.current && val && "value" in val) {
          values.push({ label: "Volume", value: formatMarketCap(val.value).replace("$", "") });
        }
      });

      return values.length > 0 ? { date: dateStr, values } : null;
    },
    [currency]
  );

  return (
    <div className="relative" style={{ height }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <ChartTooltip chart={chart} formatData={formatTooltipData} />
    </div>
  );
}
