"use client";

import { useState, useMemo } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { TvAreaChart } from "@/components/charts/TvAreaChart";
import { TvHistogramChart } from "@/components/charts/TvHistogramChart";
import { TvMultiLineChart } from "@/components/charts/TvMultiLineChart";
import { ChartCard } from "@/components/charts/ChartCard";
import { formatMarketCap, formatVolume, formatPercent } from "@/lib/market-utils";

/* ─── Color palette for multi-series charts ─── */
const SECTOR_COLORS = [
  "#059669", "#2563eb", "#d97706", "#dc2626",
  "#7c3aed", "#0891b2", "#be185d", "#65a30d",
];

const FUNDING_COLORS: Record<string, string> = {
  Seed: "#65a30d",
  "Series A": "#2563eb",
  "Series B": "#7c3aed",
  "Series C": "#d97706",
  IPO: "#dc2626",
  "Public Offering": "#be185d",
  Grant: "#0891b2",
  PIPE: "#059669",
  Other: "#9ca3af",
};

const PHASE_COLORS: Record<string, string> = {
  "Phase 1": "#7c3aed",
  "Phase 2": "#2563eb",
  "Phase 3": "#059669",
};

/* ─── TOC categories ─── */
const CATEGORIES = [
  { id: "market", label: "Market Overview", charts: ["chart-1", "chart-2", "chart-3", "chart-4"] },
  { id: "funding", label: "Funding & Capital", charts: ["chart-5", "chart-6", "chart-7", "chart-8"] },
  { id: "pipeline", label: "Pipeline & Clinical", charts: ["chart-9", "chart-10", "chart-11", "chart-12"] },
  { id: "sectors", label: "Sector Performance", charts: ["chart-13", "chart-14", "chart-15"] },
  { id: "indicators", label: "BiotechTube Indicators", charts: ["chart-16", "chart-17", "chart-18", "chart-20"] },
];

/* ─── Types ─── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props {
  marketCapHistory: { snapshot_date: string; total_market_cap: number }[];
  sectorDominance: { sectorSeries: { name: string; data: { time: string; value: number }[] }[]; sectorNames: string[] };
  geographicDistribution: { name: string; data: { time: string; value: number }[] }[];
  publicCompaniesCount: { time: string; value: number }[];
  fundingMonthly: { time: string; value: number; rounds: number }[];
  fundingRoundMix: { name: string; data: { time: string; value: number }[] }[];
  ipoActivity: { time: string; value: number; total: number }[];
  averageRoundSize: { average: { time: string; value: number }[]; median: { time: string; value: number }[] };
  clinicalTrialStarts: { name: string; data: { time: string; value: number }[] }[];
  pipelineDistribution: { stage: string; count: number; percent: number }[];
  fdaApprovals: { time: string; value: number }[];
  fdaCalendar: { time: string; value: number }[];
  sectorPerformance: { name: string; marketCap: number; change30d: number | null; change7d: number | null; change1d: number | null }[];
  sectorMarketCapHistory: { name: string; data: { time: string; value: number }[] }[];
  hypeIndex: { time: string; value: number }[];
  pipelineValueRatio: { name: string; phase3Count: number; marketCap: number; ratio: number }[];
  fundingVelocity: { short: { time: string; value: number }[]; long: { time: string; value: number }[] };
  tradingVolume: { time: string; value: number }[];
  exTop50MarketCap: { top50: { time: string; value: number }[]; exTop50: { time: string; value: number }[] };
}

/* ─── Timescale filter ─── */
type Timescale = "1Y" | "3Y" | "5Y" | "Max";
const TIMESCALE_DAYS: Record<Timescale, number> = {
  "1Y": 365, "3Y": 1095, "5Y": 1825, Max: 20000,
};

function filterByTimescale<T extends { time: string }>(data: T[], timescale: Timescale): T[] {
  const days = TIMESCALE_DAYS[timescale];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return data.filter((d) => d.time >= cutoffStr);
}

/* ─── Stage bar colors ─── */
const STAGE_COLORS: Record<string, string> = {
  "Pre-clinical": "#9ca3af",
  "Phase 1": "#7c3aed",
  "Phase 1/2": "#6366f1",
  "Phase 2": "#2563eb",
  "Phase 2/3": "#0891b2",
  "Phase 3": "#059669",
  Approved: "#16a34a",
};

export function ChartsPageClient(props: Props) {
  const [timescale, setTimescale] = useState<Timescale>("Max");

  // ─── Chart 1: Market cap filtered by timescale ───
  const marketCapData = useMemo(
    () =>
      filterByTimescale(
        props.marketCapHistory.map((r) => ({ time: r.snapshot_date, value: r.total_market_cap })),
        timescale
      ),
    [props.marketCapHistory, timescale]
  );
  const isMarketPositive = useMemo(() => {
    if (marketCapData.length < 2) return true;
    return marketCapData[marketCapData.length - 1].value >= marketCapData[0].value;
  }, [marketCapData]);

  // ─── Chart 2: Sector dominance ───
  const sectorDominanceSeries = useMemo(
    () =>
      props.sectorDominance.sectorSeries.map((s, i) => ({
        ...s,
        color: SECTOR_COLORS[i % SECTOR_COLORS.length],
        data: filterByTimescale(s.data, timescale),
      })),
    [props.sectorDominance, timescale]
  );

  // ─── Chart 3: Geographic ───
  const geoSeries = useMemo(
    () =>
      props.geographicDistribution.map((s, i) => ({
        ...s,
        color: SECTOR_COLORS[i % SECTOR_COLORS.length],
        data: filterByTimescale(s.data, timescale),
      })),
    [props.geographicDistribution, timescale]
  );

  // ─── Chart 4: Public companies ───
  const publicCompData = useMemo(
    () => filterByTimescale(props.publicCompaniesCount, timescale),
    [props.publicCompaniesCount, timescale]
  );

  // ─── Chart 14: Sector rotation (cumulative) ───
  const sectorRotationSeries = useMemo(
    () =>
      props.sectorMarketCapHistory.map((s, i) => ({
        name: s.name,
        color: SECTOR_COLORS[i % SECTOR_COLORS.length],
        data: filterByTimescale(s.data, timescale),
      })),
    [props.sectorMarketCapHistory, timescale]
  );

  // ─── Chart 6: Funding round mix ───
  const fundingMixSeries = useMemo(
    () =>
      props.fundingRoundMix.map((s) => ({
        ...s,
        color: FUNDING_COLORS[s.name] || "#9ca3af",
      })),
    [props.fundingRoundMix]
  );

  // ─── Chart 8: Average round size ───
  const roundSizeSeries = useMemo(
    () => [
      { name: "Average", color: "#2563eb", data: props.averageRoundSize.average },
      { name: "Median", color: "#059669", data: props.averageRoundSize.median },
    ],
    [props.averageRoundSize]
  );

  // ─── Chart 9: Clinical trial starts ───
  const trialStartsSeries = useMemo(
    () =>
      props.clinicalTrialStarts.map((s) => ({
        ...s,
        color: PHASE_COLORS[s.name] || "#9ca3af",
      })),
    [props.clinicalTrialStarts]
  );

  // ─── Chart 21: Ex-Top-50 market cap ───
  const exTop50Series = useMemo(
    () => [
      { name: "Top 50", color: "#2563eb", data: props.exTop50MarketCap.top50 },
      { name: "Ex-Top-50 (Small/Mid Cap)", color: "#059669", data: props.exTop50MarketCap.exTop50 },
    ],
    [props.exTop50MarketCap]
  );

  // ─── Chart 18: Funding velocity ───
  const velocitySeries = useMemo(
    () => [
      { name: "90-Day Avg", color: "#dc2626", data: props.fundingVelocity.short },
      { name: "365-Day Avg", color: "#2563eb", data: props.fundingVelocity.long },
    ],
    [props.fundingVelocity]
  );

  // Max bar for pipeline distribution
  const maxPipelineCount = Math.max(...props.pipelineDistribution.map((d) => d.count), 1);

  // Filter out sectors with unrealistic 30d changes (>40% is likely a reclassification artifact)
  const filteredSectorPerformance = useMemo(
    () => props.sectorPerformance.filter((d) => Math.abs(d.change30d || 0) <= 40),
    [props.sectorPerformance]
  );

  // Max bar for sector performance
  const maxSectorPct = Math.max(...filteredSectorPerformance.map((d) => Math.abs(d.change30d || 0)), 1);

  // Max bar for pipeline value ratio
  const maxRatio = Math.max(...props.pipelineValueRatio.map((d) => d.ratio), 1);

  return (
    <div>
    <Nav />
    <main
      className="min-h-screen"
      style={{ background: "var(--color-bg-secondary)" }}
    >
      {/* Hero */}
      <div
        className="border-b"
        style={{
          background: "var(--color-bg-primary)",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-5 pt-16 sm:pt-20 pb-6 sm:pb-8">
          <p
            className="uppercase tracking-wider mb-2"
            style={{ fontSize: 10, color: "var(--color-text-tertiary)", letterSpacing: "0.5px" }}
          >
            Market Intelligence
          </p>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: "var(--color-text-primary)",
              lineHeight: 1.2,
            }}
          >
            Biotech Market Charts
          </h1>
          <p
            className="mt-2 max-w-xl"
            style={{
              fontSize: 15,
              color: "var(--color-text-secondary)",
              lineHeight: 1.5,
            }}
          >
            20 interactive charts tracking market trends, funding cycles,
            pipeline analytics, and proprietary indicators for the global biotech
            industry.
          </p>

          {/* Timescale selector */}
          <div className="flex gap-1 mt-4">
            {(["1Y", "3Y", "5Y", "Max"] as Timescale[]).map((t) => (
              <button
                key={t}
                onClick={() => setTimescale(t)}
                className="px-3 py-1.5 rounded-md transition-colors"
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  background: timescale === t ? "var(--color-accent)" : "var(--color-bg-secondary)",
                  color: timescale === t ? "white" : "var(--color-text-secondary)",
                  border: timescale === t ? "none" : "0.5px solid var(--color-border-subtle)",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-3 sm:px-5 py-6 sm:py-8">
        <div className="flex gap-8">
          {/* TOC Sidebar (desktop) */}
          <nav className="hidden lg:block w-48 shrink-0">
            <div className="sticky top-20">
              <p
                className="uppercase tracking-wider mb-3"
                style={{ fontSize: 9, color: "var(--color-text-tertiary)", letterSpacing: "0.5px" }}
              >
                Categories
              </p>
              {CATEGORIES.map((cat) => (
                <div key={cat.id} className="mb-3">
                  <a
                    href={`#${cat.charts[0]}`}
                    className="block py-1 transition-colors hover:opacity-80"
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {cat.label}
                  </a>
                </div>
              ))}
            </div>
          </nav>

          {/* Chart grid */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            {/* ═══ CATEGORY 1: Market Overview ═══ */}
            <SectionHeader label="Market Overview" />

            {/* Chart 1: Total Market Cap */}
            <ChartCard
              id="chart-1"
              title="Biotech Total Market Cap Index"
              subtitle="Total market capitalization of all tracked public biotech companies"
              methodology="Aggregates the daily market caps of all tracked public biotech companies. Market cap = shares outstanding × adjusted close price from Yahoo Finance. Updated daily. Note: historical data before ~2010 covers fewer companies as data availability decreases going back in time. Recent data (2020+) is the most comprehensive."
            >
              <TvAreaChart
                data={marketCapData}
                height={350}
                isPositive={isMarketPositive}
                formatValue={formatMarketCap}
                tooltipTitle="Total Market Cap"
              />
            </ChartCard>

            {/* Chart 21: Ex-Top-50 Market Cap */}
            <ChartCard
              id="chart-21"
              title="Small & Mid-Cap Biotech Index"
              subtitle="Market cap excluding the top 50 largest companies — the real health of the broader market"
              methodology="Removes the 50 largest biotech companies by market cap (which account for ~77% of total) to reveal the health of the remaining 950+ small and mid-cap companies. When this line rises while the top 50 is flat, it signals broad-based market strength. When it falls while the top 50 rises, mega-caps are masking weakness in the broader biotech sector."
            >
              {exTop50Series[0].data.length > 0 ? (
                <TvMultiLineChart
                  series={exTop50Series}
                  height={350}
                  formatValue={formatMarketCap}
                />
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            {/* Chart 2: Sector Dominance */}
            <ChartCard
              id="chart-2"
              title="Sector Market Cap Weight"
              subtitle="Each sector's weight relative to total biotech market cap"
              methodology="Shows each sector's market cap as a percentage of the total biotech market cap. Since companies can belong to multiple sectors (e.g., Eli Lilly in both Small Molecules and Biologics), percentages overlap and do not sum to 100%. Rising lines indicate sectors gaining proportional weight."
            >
              {sectorDominanceSeries.length > 0 ? (
                <TvMultiLineChart
                  series={sectorDominanceSeries}
                  height={350}
                  formatValue={(v) => `${v.toFixed(1)}%`}
                />
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            {/* Chart 3: Geographic Distribution */}
            <ChartCard
              id="chart-3"
              title="Geographic Market Distribution"
              subtitle="Market cap share by country — where biotech capital concentrates"
              methodology="Shows the percentage of total biotech market cap held by each country. The US dominates, but shifts in geographic distribution signal emerging biotech hubs. Based on company headquarters location."
            >
              {geoSeries.length > 0 ? (
                <TvMultiLineChart
                  series={geoSeries}
                  height={350}
                  formatValue={(v) => `${v.toFixed(1)}%`}
                />
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            {/* Chart 4: Public Companies Count */}
            <ChartCard
              id="chart-4"
              title="Public Biotech Companies Tracked"
              subtitle="Number of publicly listed biotech companies with active stock data"
              methodology="Count of public biotech companies with available Yahoo Finance data. An increasing count signals a healthy IPO market and growing public biotech ecosystem."
            >
              <TvAreaChart
                data={publicCompData}
                height={300}
                isPositive
                formatValue={(v) => v.toLocaleString()}
                tooltipTitle="Companies"
              />
            </ChartCard>

            {/* ═══ CATEGORY 2: Funding & Capital ═══ */}
            <SectionHeader label="Funding & Capital Cycles" />

            {/* Chart 5: Funding Volume */}
            <ChartCard
              id="chart-5"
              title="Biotech Funding Volume"
              subtitle="Total funding raised by biotech companies per month"
              methodology="Sum of all known funding round amounts per month. Includes venture capital, grants, public offerings, and other financing. Shows the boom and bust cycles of biotech capital markets."
            >
              <TvHistogramChart
                data={props.fundingMonthly}
                height={350}
                formatValue={formatMarketCap}
                tooltipTitle="Monthly Funding"
              />
            </ChartCard>

            {/* Chart 6: Funding Round Mix */}
            <ChartCard
              id="chart-6"
              title="Funding Round Type Distribution"
              subtitle="Mix of round types (Seed, Series A-C, IPO, Grant) over time"
              methodology="Shows how funding round types shift over time. In bull markets, later-stage rounds (Series B/C, IPOs) dominate. In cautious markets, early-stage (Seed, Series A) and grants increase as a proportion."
            >
              {fundingMixSeries.length > 0 ? (
                <TvMultiLineChart
                  series={fundingMixSeries}
                  height={350}
                  formatValue={(v) => `${Math.round(v)} rounds`}
                />
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            {/* Chart 7: IPO Activity */}
            <ChartCard
              id="chart-7"
              title="IPO Activity Index"
              subtitle="Number of biotech IPOs and public offerings per quarter"
              methodology="Tracks biotech IPO activity over time. IPO windows open and close — high activity signals bullish investor sentiment, while dry spells indicate risk aversion. A leading indicator for market health."
            >
              <TvHistogramChart
                data={props.ipoActivity}
                height={300}
                color="#dc2626cc"
                formatValue={(v) => `${Math.round(v)} IPOs`}
                tooltipTitle="IPOs"
              />
            </ChartCard>

            {/* Chart 8: Average Round Size */}
            <ChartCard
              id="chart-8"
              title="Average & Median Round Size"
              subtitle="How funding round sizes are trending over time"
              methodology="Average shows the mean round size (skewed by mega-rounds), while the median shows the typical round. When the average diverges upward from the median, a few large deals are driving the numbers. Both rising together signals broad capital availability."
            >
              <TvMultiLineChart
                series={roundSizeSeries}
                height={350}
                formatValue={formatMarketCap}
              />
            </ChartCard>

            {/* ═══ CATEGORY 3: Pipeline & Clinical ═══ */}
            <SectionHeader label="Pipeline & Clinical Intelligence" />

            {/* Chart 9: Clinical Trial Starts */}
            <ChartCard
              id="chart-9"
              title="Clinical Trial Starts by Phase"
              subtitle="New trials initiated per quarter, grouped by clinical phase"
              methodology="Counts new clinical trials with a start date in each quarter, broken down by Phase 1, Phase 2, and Phase 3. More Phase 1 starts today means more Phase 3 readouts in 5-7 years — a leading indicator for the industry's pipeline health."
            >
              {trialStartsSeries.length > 0 ? (
                <TvMultiLineChart
                  series={trialStartsSeries}
                  height={350}
                  formatValue={(v) => `${Math.round(v)} trials`}
                />
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            {/* Chart 10: Pipeline Stage Distribution */}
            <ChartCard
              id="chart-10"
              title="Pipeline Stage Distribution"
              subtitle="Current snapshot — how many drugs at each development stage"
              methodology="Shows the funnel of drug development. Naturally, earlier stages have more candidates as most drugs fail in clinical trials. The ratio of Phase 3 to Phase 1 drugs indicates how mature the current pipeline is."
            >
              <div className="px-2 py-4">
                {props.pipelineDistribution.map((d) => (
                  <div key={d.stage} className="flex items-center gap-3 mb-2.5">
                    <div
                      className="shrink-0 text-right"
                      style={{ width: 72, fontSize: 11, color: "var(--color-text-secondary)" }}
                    >
                      {d.stage}
                    </div>
                    <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: "var(--color-bg-secondary)" }}>
                      <div
                        className="h-full rounded-md flex items-center px-2"
                        style={{
                          width: `${(d.count / maxPipelineCount) * 100}%`,
                          background: STAGE_COLORS[d.stage] || "#9ca3af",
                          minWidth: 40,
                        }}
                      >
                        <span style={{ fontSize: 10, color: "white", fontWeight: 500 }}>
                          {d.count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div
                      className="shrink-0"
                      style={{ width: 45, fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "right" }}
                    >
                      {d.percent.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* Chart 11: FDA Approval Timeline */}
            <ChartCard
              id="chart-11"
              title="FDA Novel Drug Approvals"
              subtitle="New drugs and biologics (NDA + BLA) approved per quarter — excludes generics"
              methodology="Tracks FDA approvals of novel drugs (NDA) and biologics (BLA) over time, excluding generic drug approvals (ANDA). The FDA typically approves 40-60 novel drugs per year. Spikes indicate favorable regulatory cycles, while dips may signal tighter review standards."
            >
              <TvHistogramChart
                data={props.fdaApprovals}
                height={300}
                color="#16a34acc"
                formatValue={(v) => `${Math.round(v)} approvals`}
                tooltipTitle="FDA Approvals"
              />
            </ChartCard>

            {/* Chart 12: FDA Calendar Density */}
            <ChartCard
              id="chart-12"
              title="FDA Decision Calendar Density"
              subtitle="Upcoming FDA decisions per month — where regulatory volatility clusters"
              methodology="Shows the density of upcoming FDA decisions (PDUFA dates, AdCom meetings) per month. Months with many decisions create potential volatility events. Investors watch these clusters closely for sector-wide moves."
            >
              {props.fdaCalendar.length > 0 ? (
                <TvHistogramChart
                  data={props.fdaCalendar}
                  height={300}
                  color="#d97706cc"
                  formatValue={(v) => `${Math.round(v)} decisions`}
                  tooltipTitle="FDA Decisions"
                />
              ) : (
                <EmptyChart message="No upcoming FDA decisions in calendar" />
              )}
            </ChartCard>

            {/* ═══ CATEGORY 4: Sector Performance ═══ */}
            <SectionHeader label="Sector Performance" />

            {/* Chart 13: Sector Scoreboard */}
            <ChartCard
              id="chart-13"
              title="Sector Performance Scoreboard"
              subtitle="30-day performance ranking of all biotech sectors"
              methodology="Ranks therapeutic sectors by their 30-day market cap change. Green bars indicate sectors gaining value, red bars show declining sectors. Use this to quickly identify which areas of biotech are attracting or losing capital."
            >
              <div className="px-2 py-4">
                {filteredSectorPerformance.map((d) => (
                  <div key={d.name} className="flex items-center gap-3 mb-2">
                    <div
                      className="shrink-0 text-right truncate"
                      style={{ width: 90, fontSize: 11, color: "var(--color-text-secondary)" }}
                    >
                      {d.name}
                    </div>
                    <div className="flex-1 h-5 flex items-center">
                      <div className="w-full flex items-center" style={{ position: "relative" }}>
                        <div
                          className="h-5 rounded-sm"
                          style={{
                            width: `${Math.min(100, (Math.abs(d.change30d || 0) / maxSectorPct) * 50)}%`,
                            background: (d.change30d || 0) >= 0 ? "#059669aa" : "#dc2626aa",
                            marginLeft: (d.change30d || 0) >= 0 ? "50%" : `${50 - (Math.abs(d.change30d || 0) / maxSectorPct) * 50}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div
                      className="shrink-0"
                      style={{
                        width: 60,
                        fontSize: 12,
                        fontWeight: 500,
                        textAlign: "right",
                        color: (d.change30d || 0) >= 0 ? "var(--color-accent)" : "#c0392b",
                      }}
                    >
                      {formatPercent(d.change30d)}
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* Chart 14: Sector Rotation */}
            <ChartCard
              id="chart-14"
              title="Sector Market Cap Trends"
              subtitle="How sector market caps are evolving — reveals capital rotation"
              methodology="Tracks each major sector's total market cap over time. When capital flows from one sector to another, the lines diverge. Sectors with steepening upward curves are attracting disproportionate investment."
            >
              {sectorRotationSeries.length > 0 ? (
                <TvMultiLineChart
                  series={sectorRotationSeries}
                  height={380}
                  formatValue={formatMarketCap}
                />
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            {/* Chart 15 collapsed into 14 since they use same data */}

            {/* ═══ CATEGORY 5: BiotechTube Indicators ═══ */}
            <SectionHeader label="BiotechTube Indicators" premium />

            {/* Chart 16: Hype Index */}
            <ChartCard
              id="chart-16"
              title="BiotechTube Hype Index"
              subtitle="Momentum-based sentiment gauge: 0 (extreme fear) to 100 (euphoria)"
              methodology="Momentum-based sentiment indicator derived from the biotech market's 30-day price performance, normalized to a 0-100 scale. Below 25 = extreme fear (historically a buying opportunity), 25-50 = cautious, 50-75 = optimistic, above 75 = euphoria (potential overheating). This is a directional indicator — not a composite of multiple signals."
              premium
            >
              <TvAreaChart
                data={props.hypeIndex}
                height={320}
                isPositive
                formatValue={(v) => `${v.toFixed(0)}/100`}
                tooltipTitle="Hype Index"
              />
            </ChartCard>

            {/* Chart 17: Pipeline Value Ratio */}
            <ChartCard
              id="chart-17"
              title="Pipeline Value Ratio"
              subtitle="Phase 3 drugs per $B of market cap — which sectors have untapped pipeline value"
              methodology="Divides the number of Phase 3 (near-approval) drugs by the sector's market cap in billions. A higher ratio suggests the sector has more late-stage pipeline potential relative to its current valuation — potentially undervalued. Lower ratios suggest the market has already priced in pipeline value."
              premium
            >
              <div className="px-2 py-4">
                {props.pipelineValueRatio.slice(0, 12).map((d) => (
                  <div key={d.name} className="flex items-center gap-3 mb-2.5">
                    <div
                      className="shrink-0 text-right truncate"
                      style={{ width: 90, fontSize: 11, color: "var(--color-text-secondary)" }}
                    >
                      {d.name}
                    </div>
                    <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: "var(--color-bg-secondary)" }}>
                      <div
                        className="h-full rounded-md flex items-center justify-between px-2"
                        style={{
                          width: `${(d.ratio / maxRatio) * 100}%`,
                          background: "#2563ebaa",
                          minWidth: 60,
                        }}
                      >
                        <span style={{ fontSize: 10, color: "white", fontWeight: 500 }}>
                          {d.phase3Count} drugs
                        </span>
                      </div>
                    </div>
                    <div
                      className="shrink-0"
                      style={{ width: 50, fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "right" }}
                    >
                      {d.ratio.toFixed(1)}x
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* Chart 18: Funding Velocity */}
            <ChartCard
              id="chart-18"
              title="Funding Velocity Indicator"
              subtitle="90-day vs 365-day funding moving average — signals funding cycle direction"
              methodology="Compares the 90-day rolling average of weekly funding totals to the 365-day average. When the short-term (red) line crosses above the long-term (blue) line, it signals a funding cycle heating up — a bullish signal. The reverse signals cooling. Similar to a 'Golden Cross' in stock trading."
              premium
            >
              {velocitySeries[0].data.length > 0 ? (
                <TvMultiLineChart
                  series={velocitySeries}
                  height={350}
                  formatValue={formatMarketCap}
                />
              ) : (
                <EmptyChart message="Insufficient data for velocity calculation" />
              )}
            </ChartCard>

            {/* Chart 20: Trading Volume */}
            <ChartCard
              id="chart-20"
              title="Biotech Trading Volume Index"
              subtitle="Aggregate daily trading volume across tracked public biotech companies"
              methodology="Shows aggregated daily trading volume from market snapshots. Volume spikes indicate increased market interest — often preceding or accompanying significant price moves. Note: this represents a partial sample of total biotech trading volume, useful for tracking relative trends rather than absolute values."
              premium
            >
              <TvHistogramChart
                data={props.tradingVolume}
                height={300}
                color="#2563ebcc"
                formatValue={formatVolume}
                tooltipTitle="Volume"
              />
            </ChartCard>
          </div>
        </div>
      </div>
    </main>
    <Footer />
    </div>
  );
}

/* ─── Helper components ─── */

function SectionHeader({ label, premium }: { label: string; premium?: boolean }) {
  return (
    <div className="flex items-center gap-3 pt-4 pb-1">
      <h2
        className="uppercase tracking-wider"
        style={{
          fontSize: 11,
          color: "var(--color-text-tertiary)",
          letterSpacing: "0.5px",
          fontWeight: 500,
        }}
      >
        {label}
      </h2>
      {premium && (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider"
          style={{
            background: "var(--color-accent)",
            color: "white",
            fontWeight: 500,
          }}
        >
          PRO
        </span>
      )}
      <div className="flex-1 h-px" style={{ background: "var(--color-border-subtle)" }} />
    </div>
  );
}

function EmptyChart({ message = "No data available" }: { message?: string }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ height: 300, color: "var(--color-text-tertiary)", fontSize: 13 }}
    >
      {message}
    </div>
  );
}
