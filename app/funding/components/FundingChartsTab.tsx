"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  ReferenceLine,
  Cell,
} from "recharts";
import { FundingInteractiveChart } from "@/components/charts/FundingInteractiveChart";

import type {
  FundingAnnualRow,
  FundingQuarterlyRow,
  FundingMonthlyRow,
  FundingRoundRow,
} from "@/lib/funding-queries";
import type {
  FundingByRoundType,
  FundingBySector,
  FundingByCountry,
  DealVelocityWeek,
} from "@/lib/funding-intelligence-queries";

/* ── helpers ─────────────────────────────────────────────────────────── */

function formatAmount(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(0)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd}`;
}

const ROUND_COLORS: Record<string, string> = {
  Seed: "#16a34a",
  "Series A": "#2563eb",
  "Series B": "#7c3aed",
  "Series C": "#d97706",
  "Series D": "#dc2626",
  IPO: "#059669",
  Grant: "#0891b2",
  Venture: "#6366f1",
  Other: "#94a3b8",
};

const COUNTRY_FLAGS: Record<string, string> = {
  "United States": "\u{1F1FA}\u{1F1F8}",
  "United Kingdom": "\u{1F1EC}\u{1F1E7}",
  China: "\u{1F1E8}\u{1F1F3}",
  Germany: "\u{1F1E9}\u{1F1EA}",
  France: "\u{1F1EB}\u{1F1F7}",
  Japan: "\u{1F1EF}\u{1F1F5}",
  Canada: "\u{1F1E8}\u{1F1E6}",
  Switzerland: "\u{1F1E8}\u{1F1ED}",
  Australia: "\u{1F1E6}\u{1F1FA}",
  Israel: "\u{1F1EE}\u{1F1F1}",
  India: "\u{1F1EE}\u{1F1F3}",
  "South Korea": "\u{1F1F0}\u{1F1F7}",
  Denmark: "\u{1F1E9}\u{1F1F0}",
  Sweden: "\u{1F1F8}\u{1F1EA}",
  Netherlands: "\u{1F1F3}\u{1F1F1}",
  Belgium: "\u{1F1E7}\u{1F1EA}",
  Ireland: "\u{1F1EE}\u{1F1EA}",
  Italy: "\u{1F1EE}\u{1F1F9}",
  Spain: "\u{1F1EA}\u{1F1F8}",
  Norway: "\u{1F1F3}\u{1F1F4}",
  Finland: "\u{1F1EB}\u{1F1EE}",
  Taiwan: "\u{1F1F9}\u{1F1FC}",
  Singapore: "\u{1F1F8}\u{1F1EC}",
  Brazil: "\u{1F1E7}\u{1F1F7}",
  Austria: "\u{1F1E6}\u{1F1F9}",
};

/* ── card wrapper ────────────────────────────────────────────────────── */

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg overflow-hidden ${className ?? ""}`}
      style={{
        background: "var(--color-bg-secondary)",
        border: "0.5px solid var(--color-border-subtle)",
      }}
    >
      <div
        className="px-4 py-3"
        style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}
      >
        <h3
          className="text-10 uppercase tracking-[0.5px] font-medium"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {title}
        </h3>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="text-center py-8 text-13"
      style={{ color: "var(--color-text-tertiary)" }}
    >
      No data available
    </div>
  );
}

/* ── props ────────────────────────────────────────────────────────────── */

interface Props {
  annualData: FundingAnnualRow[];
  quarterlyData: FundingQuarterlyRow[];
  monthlyData: FundingMonthlyRow[];
  byRoundType: FundingByRoundType[];
  bySector: FundingBySector[];
  byCountry: FundingByCountry[];
  dealVelocity: DealVelocityWeek[];
  rounds: FundingRoundRow[];
}

/* ── component ────────────────────────────────────────────────────────── */

export default function FundingChartsTab({
  annualData,
  quarterlyData,
  monthlyData,
  byRoundType,
  bySector,
  byCountry,
  dealVelocity,
  rounds,
}: Props) {
  /* ── Round Type stacked data ─────────────────────────────────────── */

  const { stackedData, roundTypes } = useMemo(() => {
    const yearMap = new Map<number, Record<string, number>>();
    const typesSet = new Set<string>();

    for (const r of byRoundType) {
      typesSet.add(r.roundType);
      const row = yearMap.get(r.year) ?? { year: r.year };
      row[r.roundType] = r.total;
      yearMap.set(r.year, row);
    }

    const years = Array.from(yearMap.keys()).sort((a, b) => a - b);
    return {
      stackedData: years.map((y) => yearMap.get(y)!),
      roundTypes: Array.from(typesSet),
    };
  }, [byRoundType]);

  /* ── Scatter data ────────────────────────────────────────────────── */

  const scatterData = useMemo(() => {
    return rounds
      .slice(0, 500)
      .filter((r) => r.amount_usd > 0)
      .map((r) => ({
        x: new Date(r.announced_date).getTime(),
        y: r.amount_usd,
        company_name: r.company_name,
        round_type: r.round_type ?? "Other",
        date: r.announced_date,
      }));
  }, [rounds]);

  /* ── Deal Velocity average ───────────────────────────────────────── */

  const avgDealCount = useMemo(() => {
    if (dealVelocity.length === 0) return 0;
    const sum = dealVelocity.reduce((s, w) => s + w.dealCount, 0);
    return Math.round(sum / dealVelocity.length);
  }, [dealVelocity]);

  /* ── Sector data with labels ─────────────────────────────────────── */

  const sectorData = useMemo(
    () =>
      bySector.slice(0, 15).map((s) => ({
        ...s,
        label: s.sector.length > 22 ? s.sector.slice(0, 20) + "\u2026" : s.sector,
      })),
    [bySector]
  );

  /* ── Country data with flags ─────────────────────────────────────── */

  const countryData = useMemo(
    () =>
      byCountry.slice(0, 15).map((c) => ({
        ...c,
        label: `${COUNTRY_FLAGS[c.country] ?? "\u{1F30D}"} ${c.country}`,
      })),
    [byCountry]
  );

  /* ── Velocity formatted ──────────────────────────────────────────── */

  const velocityData = useMemo(
    () =>
      dealVelocity.map((w) => ({
        ...w,
        weekLabel: new Date(w.weekStart).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      })),
    [dealVelocity]
  );

  /* ── render ──────────────────────────────────────────────────────── */

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Funding Volume — full width */}
      <ChartCard title="Funding Volume" className="lg:col-span-2">
        {annualData.length === 0 &&
        quarterlyData.length === 0 &&
        monthlyData.length === 0 ? (
          <EmptyState />
        ) : (
          <FundingInteractiveChart
            annualData={annualData}
            quarterlyData={quarterlyData}
            monthlyData={monthlyData}
            height={400}
          />
        )}
      </ChartCard>

      {/* 2. Round Type Breakdown — stacked bar */}
      <ChartCard title="Round Type Breakdown">
        {stackedData.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stackedData}>
              <XAxis
                dataKey="year"
                tick={{ fontSize: 11, fontWeight: 400 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={formatAmount}
                tick={{ fontSize: 11, fontWeight: 400 }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: number, name: string) => [formatAmount(value), name]) as any}
                contentStyle={{
                  background: "var(--color-bg-secondary)",
                  border: "0.5px solid var(--color-border-subtle)",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 400,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, fontWeight: 400 }}
              />
              {roundTypes.map((rt) => (
                <Bar
                  key={rt}
                  dataKey={rt}
                  stackId="a"
                  fill={ROUND_COLORS[rt] ?? ROUND_COLORS.Other}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* 3. Sector Funding — horizontal bar */}
      <ChartCard title="Sector Funding">
        {sectorData.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sectorData} layout="vertical">
              <XAxis
                type="number"
                tickFormatter={formatAmount}
                tick={{ fontSize: 11, fontWeight: 400 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={120}
                tick={{ fontSize: 11, fontWeight: 400 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: number) => [formatAmount(value), "Total"]) as any}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                labelFormatter={((label: string) => label) as any}
                contentStyle={{
                  background: "var(--color-bg-secondary)",
                  border: "0.5px solid var(--color-border-subtle)",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 400,
                }}
              />
              <Bar dataKey="total" fill="#059669" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* 4. Geographic Distribution — horizontal bar */}
      <ChartCard title="Geographic Distribution">
        {countryData.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={countryData} layout="vertical">
              <XAxis
                type="number"
                tickFormatter={formatAmount}
                tick={{ fontSize: 11, fontWeight: 400 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={140}
                tick={{ fontSize: 11, fontWeight: 400 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: number) => [formatAmount(value), "Total"]) as any}
                contentStyle={{
                  background: "var(--color-bg-secondary)",
                  border: "0.5px solid var(--color-border-subtle)",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 400,
                }}
              />
              <Bar dataKey="total" fill="#059669" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* 5. Deal Size Distribution — scatter */}
      <ChartCard title="Deal Size Distribution">
        {scatterData.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <XAxis
                dataKey="x"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(ts: number) =>
                  new Date(ts).toLocaleDateString("en-US", {
                    month: "short",
                    year: "2-digit",
                  })
                }
                tick={{ fontSize: 11, fontWeight: 400 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="y"
                type="number"
                tickFormatter={formatAmount}
                tick={{ fontSize: 11, fontWeight: 400 }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={({ payload }: any) => {
                  if (!payload || payload.length === 0) return null;
                  const d = payload[0].payload;
                  return (
                    <div
                      className="rounded-md px-3 py-2"
                      style={{
                        background: "var(--color-bg-secondary)",
                        border: "0.5px solid var(--color-border-subtle)",
                        fontSize: 12,
                        fontWeight: 400,
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>{d.company_name}</div>
                      <div>{formatAmount(d.y)}</div>
                      <div style={{ color: "var(--color-text-tertiary)" }}>
                        {new Date(d.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  );
                }}
              />
              <Scatter data={scatterData}>
                {scatterData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      ROUND_COLORS[entry.round_type] ?? ROUND_COLORS.Other
                    }
                    fillOpacity={0.7}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* 6. Deal Velocity — line chart */}
      <ChartCard title="Deal Velocity">
        {velocityData.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={velocityData}>
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 11, fontWeight: 400 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fontWeight: 400 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: number) => [value, "Deals"]) as any}
                contentStyle={{
                  background: "var(--color-bg-secondary)",
                  border: "0.5px solid var(--color-border-subtle)",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 400,
                }}
              />
              <ReferenceLine
                y={avgDealCount}
                stroke="var(--color-text-tertiary)"
                strokeDasharray="4 4"
                label={{
                  value: `Avg: ${avgDealCount}`,
                  position: "right",
                  fontSize: 11,
                  fontWeight: 400,
                  fill: "var(--color-text-tertiary)",
                }}
              />
              <Line
                type="monotone"
                dataKey="dealCount"
                stroke="#059669"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#059669" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
