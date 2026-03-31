"use client";

import Link from "next/link";
import { TvSparkline } from "@/components/charts/TvSparkline";
import { formatMarketCap, formatPercent, capPercent } from "@/lib/market-utils";
import { TrendingUp, Globe, Building2, BarChart3 } from "lucide-react";

interface IndexCardsProps {
  snapshot: {
    total_market_cap: number;
    total_volume: number;
    public_companies_count: number;
    change_1d_pct: number | null;
    change_7d_pct: number | null;
    top_gainer_pct: number | null;
  };
}

export function IndexCards({ snapshot }: IndexCardsProps) {
  const change1d = capPercent(snapshot.change_1d_pct, "1d");
  const change7d = capPercent(snapshot.change_7d_pct, "7d");
  const up1d = change1d === null ? true : change1d >= 0;
  const topGainer = snapshot.top_gainer_pct;

  const cards = [
    {
      icon: <BarChart3 size={16} />,
      label: "BIOTECH INDEX",
      value: formatMarketCap(snapshot.total_market_cap),
      subtitle: `${formatPercent(change1d)} today`,
      subtitleColor: up1d ? "var(--color-accent)" : "#c0392b",
      accent: up1d ? "#059669" : "#c0392b",
      href: "/markets",
      sparkline: [40, 42, 38, 44, 46, 43, 48, 50, 47, 52, 55, 53],
      sparkColor: up1d ? "#059669" : "#c0392b",
    },
    {
      icon: <TrendingUp size={16} />,
      label: "TOP GAINER",
      value: topGainer ? formatPercent(topGainer) : "—",
      subtitle: "Best 24h performer",
      subtitleColor: "var(--color-text-tertiary)",
      accent: "#059669",
      href: "/trending",
      sparkline: [20, 28, 25, 35, 42, 38, 50, 58, 55, 68, 75, 80],
      sparkColor: "#059669",
    },
    {
      icon: <Globe size={16} />,
      label: "COUNTRIES",
      value: "30+",
      subtitle: "Explore markets →",
      subtitleColor: "var(--color-accent)",
      accent: "#059669",
      href: "/countries",
      sparkline: [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 30],
      sparkColor: "#059669",
    },
    {
      icon: <Building2 size={16} />,
      label: "COMPANIES TRACKED",
      value: "10,600+",
      subtitle: `${snapshot.public_companies_count} public · ${change7d !== null ? formatPercent(change7d) + " 7d" : ""}`,
      subtitleColor: "var(--color-text-tertiary)",
      accent: "#059669",
      href: "/top-companies",
      sparkline: [200, 210, 220, 235, 248, 260, 275, 290, 305, 318, 330, 345],
      sparkColor: "#059669",
    },
  ];

  return (
    <div
      className="flex md:grid md:grid-cols-4 gap-2.5 px-4 md:px-6 py-3 overflow-x-auto max-w-[1200px] mx-auto"
      style={{ scrollbarWidth: "none" }}
    >
      {cards.map((card) => (
        <Link
          key={card.label}
          href={card.href}
          className="rounded-lg min-w-[170px] md:min-w-0 flex-shrink-0 md:flex-shrink transition-all duration-200 hover:shadow-md hover:scale-[1.02] overflow-hidden"
          style={{
            background: "var(--color-bg-primary)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          {/* Top accent bar */}
          <div style={{ height: 3, background: card.accent }} />

          <div className="px-3.5 pt-3 pb-3">
            {/* Header */}
            <div className="flex items-center gap-1.5 mb-2">
              <span style={{ color: card.accent }}>{card.icon}</span>
              <span
                className="text-[10px] uppercase tracking-[0.5px] font-semibold"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {card.label}
              </span>
            </div>

            {/* Value + Sparkline */}
            <div className="flex items-end justify-between gap-2">
              <div>
                <div
                  className="text-[28px] font-bold tracking-tight leading-none mb-1"
                  style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
                >
                  {card.value}
                </div>
                <div
                  className="text-12 font-medium"
                  style={{ color: card.subtitleColor }}
                >
                  {card.subtitle}
                </div>
              </div>
              <div className="w-[72px] h-[40px] flex-shrink-0 opacity-60">
                <TvSparkline data={card.sparkline} width={72} height={40} color={card.sparkColor} />
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
