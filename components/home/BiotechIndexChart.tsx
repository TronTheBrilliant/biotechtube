"use client";

import { useState, useMemo, useCallback } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { TvAreaChart } from "@/components/charts/TvAreaChart";
import { formatMarketCap } from "@/lib/market-utils";

interface IndexPoint {
  snapshot_date: string;
  total_market_cap: number;
}

interface Props {
  data: IndexPoint[];
}

const timescales = ["1Y", "3Y", "5Y", "Max"] as const;
type Timescale = (typeof timescales)[number];

const timescaleDays: Record<Timescale, number> = {
  "1Y": 365,
  "3Y": 1095,
  "5Y": 1825,
  Max: 20000,
};

export default function BiotechIndexChart({ data }: Props) {
  const [timescale, setTimescale] = useState<Timescale>("Max");

  const handleTimescaleChange = useCallback(
    (ts: Timescale) => {
      if (ts === timescale) return;
      setTimescale(ts);
    },
    [timescale]
  );

  const chartData = useMemo(() => {
    const days = timescaleDays[timescale];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return data.filter((row) => row.snapshot_date >= cutoffStr);
  }, [timescale, data]);

  const chartPoints = useMemo(() => {
    const totalPoints = chartData.length;
    const maxPoints = 500;
    const step =
      totalPoints > maxPoints ? Math.ceil(totalPoints / maxPoints) : 1;
    const points: { time: string; value: number }[] = [];
    for (let i = 0; i < totalPoints; i += step) {
      const row = chartData[i];
      points.push({ time: row.snapshot_date, value: row.total_market_cap });
    }
    if (totalPoints > 0) {
      const last = chartData[totalPoints - 1];
      if (
        points.length === 0 ||
        points[points.length - 1].time !== last.snapshot_date
      ) {
        points.push({
          time: last.snapshot_date,
          value: last.total_market_cap,
        });
      }
    }
    return points;
  }, [chartData]);

  const currentMarketCap =
    chartPoints.length > 0 ? chartPoints[chartPoints.length - 1].value : 0;
  const startMarketCap =
    chartPoints.length > 0 ? chartPoints[0].value : 0;
  const periodChange = currentMarketCap - startMarketCap;
  const periodChangePct =
    startMarketCap > 0 ? (periodChange / startMarketCap) * 100 : 0;
  const isPositive = periodChange >= 0;

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span
            className="text-[26px] font-bold tracking-tight"
            style={{
              color: "var(--color-text-primary)",
              letterSpacing: "-0.5px",
            }}
          >
            {formatMarketCap(currentMarketCap)}
          </span>
          <span
            className="flex items-center gap-0.5 text-13 font-medium"
            style={{
              color: isPositive ? "var(--color-accent)" : "#c0392b",
            }}
          >
            {isPositive ? (
              <ArrowUpRight size={16} />
            ) : (
              <ArrowDownRight size={16} />
            )}
            {isPositive ? "+" : ""}
            {periodChangePct.toFixed(1)}%
          </span>
          <span
            className="text-11"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {timescale}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {timescales.map((ts) => (
            <button
              key={ts}
              onClick={() => handleTimescaleChange(ts)}
              className="text-10 font-medium px-2.5 py-1 rounded transition-all duration-150"
              style={{
                background:
                  timescale === ts ? "var(--color-accent)" : "transparent",
                color:
                  timescale === ts ? "white" : "var(--color-text-tertiary)",
              }}
            >
              {ts}
            </button>
          ))}
        </div>
      </div>
      {/* Chart */}
      <TvAreaChart
        data={chartPoints}
        height={480}
        isPositive={isPositive}
        formatValue={(v) => formatMarketCap(v)}
        tooltipTitle="Market Cap"
      />
    </div>
  );
}
