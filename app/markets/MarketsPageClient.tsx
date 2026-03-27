"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PaywallCard } from "@/components/PaywallCard";
import { Activity, TrendingUp, FlaskConical, Landmark, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Breadcrumbs } from "@/components/Breadcrumbs";

// ── Generate long-term index data (2010–2026) ──
const timescales = ["1Y", "3Y", "5Y", "10Y", "Max"] as const;
type Timescale = (typeof timescales)[number];

function generateIndexData(timescale: Timescale) {
  const pointMap: Record<string, number> = { "1Y": 252, "3Y": 756, "5Y": 1260, "10Y": 2520, Max: 4000 };
  const points = pointMap[timescale];
  let seed = 42;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed % 1000) / 1000; };
  const data: { date: string; value: number }[] = [];
  let value = 1000;
  const now = new Date(2026, 2, 18);
  for (let i = points; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    value += (rand() - 0.47) * 12;
    value = Math.max(value, 400);
    const label = points > 1500
      ? (i % 252 === 0 ? `${d.getFullYear()}` : "")
      : points > 500
      ? (i % 60 === 0 ? `${d.toLocaleString("en", { month: "short" })} ${d.getFullYear().toString().slice(2)}` : "")
      : (i % 20 === 0 ? `${d.toLocaleString("en", { month: "short" })}` : "");
    data.push({ date: label, value: Math.round(value * 10) / 10 });
  }
  return data;
}

// ── Quarterly funding data (2020–2026) ──
const quarterlyFunding = [
  { q: "Q1 20", value: 2.1 }, { q: "Q2 20", value: 1.8 }, { q: "Q3 20", value: 2.4 }, { q: "Q4 20", value: 3.1 },
  { q: "Q1 21", value: 3.8 }, { q: "Q2 21", value: 4.2 }, { q: "Q3 21", value: 3.9 }, { q: "Q4 21", value: 5.1 },
  { q: "Q1 22", value: 4.5 }, { q: "Q2 22", value: 3.2 }, { q: "Q3 22", value: 2.8 }, { q: "Q4 22", value: 2.5 },
  { q: "Q1 23", value: 2.9 }, { q: "Q2 23", value: 3.1 }, { q: "Q3 23", value: 3.4 }, { q: "Q4 23", value: 3.8 },
  { q: "Q1 24", value: 3.6 }, { q: "Q2 24", value: 3.9 }, { q: "Q3 24", value: 4.1 }, { q: "Q4 24", value: 4.5 },
  { q: "Q1 25", value: 4.0 }, { q: "Q2 25", value: 4.3 }, { q: "Q3 25", value: 4.6 }, { q: "Q4 25", value: 4.8 },
  { q: "Q1 26", value: 4.2 },
];

// ── Clinical trials by phase (yearly) ──
const trialsByPhase = [
  { year: "2018", pre: 800, ph1: 420, ph2: 380, ph3: 180, approved: 45 },
  { year: "2019", pre: 920, ph1: 460, ph2: 410, ph3: 195, approved: 52 },
  { year: "2020", pre: 1050, ph1: 510, ph2: 450, ph3: 210, approved: 58 },
  { year: "2021", pre: 1280, ph1: 580, ph2: 520, ph3: 240, approved: 65 },
  { year: "2022", pre: 1400, ph1: 620, ph2: 560, ph3: 260, approved: 72 },
  { year: "2023", pre: 1520, ph1: 680, ph2: 610, ph3: 285, approved: 78 },
  { year: "2024", pre: 1650, ph1: 740, ph2: 660, ph3: 310, approved: 85 },
  { year: "2025", pre: 1780, ph1: 800, ph2: 720, ph3: 340, approved: 92 },
  { year: "2026", pre: 1850, ph1: 830, ph2: 750, ph3: 355, approved: 98 },
];

// ── IPO data ──
const ipoData = [
  { year: "2018", count: 8, raised: 1.2 },
  { year: "2019", count: 12, raised: 2.1 },
  { year: "2020", count: 22, raised: 4.8 },
  { year: "2021", count: 35, raised: 8.2 },
  { year: "2022", count: 15, raised: 3.1 },
  { year: "2023", count: 18, raised: 3.8 },
  { year: "2024", count: 21, raised: 4.5 },
  { year: "2025", count: 16, raised: 3.4 },
  { year: "2026*", count: 17, raised: 3.6 },
];

// ── Market stats ──
const marketStats = [
  { label: "Index Value", value: "4,207", change: "+3.2%", up: true },
  { label: "Total Market Cap", value: "$842B", change: "+5.1%", up: true },
  { label: "YTD Funding", value: "$4.2B", change: "+8.3%", up: true },
  { label: "Active Trials", value: "3,841", change: "+24", up: true },
  { label: "IPOs (YTD)", value: "17", change: "+3", up: true },
  { label: "Avg. Valuation", value: "$182M", change: "-2.1%", up: false },
];

export function MarketsPageClient() {
  const [timescale, setTimescale] = useState<Timescale>("5Y");

  const indexData = useMemo(() => generateIndexData(timescale), [timescale]);
  const currentValue = indexData[indexData.length - 1]?.value || 0;
  const startValue = indexData[0]?.value || 0;
  const change = currentValue - startValue;
  const changePct = startValue > 0 ? (change / startValue) * 100 : 0;

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />
      <div className="max-w-7xl mx-auto px-5 pt-4">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Markets" }]} />
      </div>

      {/* Hero */}
      <div className="px-5 pt-6 pb-4" style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Activity size={16} style={{ color: "var(--color-accent)" }} />
          <span className="text-10 uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-accent)" }}>
            MARKET DATA
          </span>
        </div>
        <h1
          className="text-[32px] font-medium tracking-tight mb-1"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
        >
          Global Biotech Index
        </h1>
        <p className="text-13" style={{ color: "var(--color-text-secondary)" }}>
          Composite index tracking 14,000+ biotech companies worldwide. Updated daily.
        </p>
      </div>

      {/* Stats Strip */}
      <div className="flex items-center gap-4 px-5 py-3 overflow-x-auto" style={{ borderBottom: "0.5px solid var(--color-border-subtle)", scrollbarWidth: "none" }}>
        {marketStats.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
            <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>{s.label}</span>
            <span className="text-11 font-medium" style={{ color: "var(--color-text-primary)" }}>{s.value}</span>
            <span className="text-10" style={{ color: s.up ? "var(--color-accent)" : "#c0392b" }}>{s.change}</span>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:grid" style={{ gridTemplateColumns: "1fr 260px" }}>
        <div className="px-5 py-4 min-w-0 lg:border-r" style={{ borderColor: "var(--color-border-subtle)" }}>

          {/* ── Index Chart ── */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-10 uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                BIOTECHTUBE COMPOSITE INDEX
              </h2>
              <div className="flex items-center gap-1">
                {timescales.map((ts) => (
                  <button
                    key={ts}
                    onClick={() => setTimescale(ts)}
                    className="text-10 font-medium px-2 py-1 rounded transition-all duration-150"
                    style={{
                      background: timescale === ts ? "var(--color-accent)" : "transparent",
                      color: timescale === ts ? "white" : "var(--color-text-tertiary)",
                    }}
                  >
                    {ts}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-[26px] font-medium tracking-tight" style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}>
                {currentValue.toFixed(1)}
              </span>
              <span className="flex items-center gap-0.5 text-13 font-medium" style={{ color: change >= 0 ? "var(--color-accent)" : "#c0392b" }}>
                {change >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {change >= 0 ? "+" : ""}{changePct.toFixed(1)}%
              </span>
              <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>{timescale}</span>
            </div>
            <div className="h-[320px] md:h-[380px] rounded-lg overflow-hidden border" style={{ background: "var(--color-bg-secondary)" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={indexData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="idxGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={change >= 0 ? "#1a7a5e" : "#c0392b"} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={change >= 0 ? "#1a7a5e" : "#c0392b"} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={{ background: "var(--color-bg-primary)", border: "0.5px solid var(--color-border-subtle)", borderRadius: 6, fontSize: 11 }} />
                  <Area type="monotone" dataKey="value" stroke={change >= 0 ? "#1a7a5e" : "#c0392b"} strokeWidth={1.5} fill="url(#idxGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── Quarterly Funding ── */}
          <section className="mb-6 border-t pt-4" style={{ borderColor: "var(--color-border-subtle)" }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} style={{ color: "var(--color-accent)" }} />
              <h2 className="text-10 uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                QUARTERLY INVESTMENT VOLUME ($B)
              </h2>
            </div>
            <div className="h-[200px] md:h-[240px] rounded-lg overflow-hidden border" style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border-subtle)" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quarterlyFunding} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                  <XAxis dataKey="q" tick={{ fontSize: 9, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} interval={3} />
                  <YAxis tick={{ fontSize: 9, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}B`} width={40} />
                  <Tooltip contentStyle={{ background: "var(--color-bg-primary)", border: "0.5px solid var(--color-border-subtle)", borderRadius: 6, fontSize: 11 }} />
                  <Bar dataKey="value" fill="#1a7a5e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── Clinical Trials by Phase ── */}
          <section className="mb-6 border-t pt-4" style={{ borderColor: "var(--color-border-subtle)" }}>
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical size={14} style={{ color: "var(--color-accent)" }} />
              <h2 className="text-10 uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                CLINICAL TRIALS BY PHASE
              </h2>
            </div>
            <div className="h-[220px] md:h-[260px] rounded-lg overflow-hidden border" style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border-subtle)" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trialsByPhase} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 9, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={{ background: "var(--color-bg-primary)", border: "0.5px solid var(--color-border-subtle)", borderRadius: 6, fontSize: 11 }} />
                  <Area type="monotone" dataKey="approved" stackId="1" stroke="#1a7a5e" fill="#1a7a5e" fillOpacity={0.7} />
                  <Area type="monotone" dataKey="ph3" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                  <Area type="monotone" dataKey="ph2" stackId="1" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.4} />
                  <Area type="monotone" dataKey="ph1" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.35} />
                  <Area type="monotone" dataKey="pre" stackId="1" stroke="#9e9e96" fill="#9e9e96" fillOpacity={0.25} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {[
                { label: "Approved", color: "#1a7a5e" },
                { label: "Phase 3", color: "#3b82f6" },
                { label: "Phase 2", color: "#60a5fa" },
                { label: "Phase 1", color: "#8b5cf6" },
                { label: "Pre-clinical", color: "#9e9e96" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                  <span className="text-10" style={{ color: "var(--color-text-tertiary)" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── IPO Activity ── */}
          <section className="mb-6 border-t pt-4" style={{ borderColor: "var(--color-border-subtle)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Landmark size={14} style={{ color: "var(--color-accent)" }} />
              <h2 className="text-10 uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                BIOTECH IPO ACTIVITY
              </h2>
            </div>
            <div className="h-[180px] md:h-[220px] rounded-lg overflow-hidden border" style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border-subtle)" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ipoData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 9, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ background: "var(--color-bg-primary)", border: "0.5px solid var(--color-border-subtle)", borderRadius: 6, fontSize: 11 }} />
                  <Bar dataKey="count" fill="#1a7a5e" radius={[3, 3, 0, 0]} name="IPOs" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="text-center">
                <div className="text-10" style={{ color: "var(--color-text-tertiary)" }}>Peak Year</div>
                <div className="text-13 font-medium" style={{ color: "var(--color-text-primary)" }}>2021 (35)</div>
              </div>
              <div className="text-center">
                <div className="text-10" style={{ color: "var(--color-text-tertiary)" }}>Total Raised (Peak)</div>
                <div className="text-13 font-medium" style={{ color: "var(--color-accent)" }}>$8.2B</div>
              </div>
              <div className="text-center">
                <div className="text-10" style={{ color: "var(--color-text-tertiary)" }}>2026 YTD</div>
                <div className="text-13 font-medium" style={{ color: "var(--color-text-primary)" }}>17 IPOs</div>
              </div>
            </div>
          </section>

          {/* ── Paywall CTA ── */}
          <section className="border-t pt-4 pb-4" style={{ borderColor: "var(--color-border-subtle)" }}>
            <div className="rounded-lg p-4 border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}>
              <div className="text-13 font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
                Want deeper market analytics?
              </div>
              <p className="text-11 mb-3" style={{ color: "var(--color-text-secondary)" }}>
                Pro subscribers get access to sector breakdowns, geographic heat maps, therapeutic area deep dives, and downloadable reports.
              </p>
              <Link href="/signup" className="inline-block text-12 font-medium px-4 py-2 rounded text-white" style={{ background: "var(--color-accent)" }}>
                Start free trial →
              </Link>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[260px] border-t lg:border-t-0">
          <div className="p-3.5">
            <PaywallCard />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
