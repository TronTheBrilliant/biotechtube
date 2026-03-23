"use client";

import Link from "next/link";
import { TvSparkline } from "@/components/charts/TvSparkline";
import { formatMarketCap, formatVolume, formatPercent } from "@/lib/market-utils";

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

function formatCount(n: number): string {
  return n.toLocaleString();
}

export function IndexCards({ snapshot }: IndexCardsProps) {
  const change1d = snapshot.change_1d_pct;
  const up1d = change1d === null ? true : change1d >= 0;

  const cardData = [
    {
      label: "📊 BIOTECH MARKET CAP",
      value: formatMarketCap(snapshot.total_market_cap),
      change: formatPercent(change1d),
      up: up1d,
      href: "/markets",
      data: [40, 42, 38, 44, 46, 43, 48, 50, 47, 52, 55, 53],
    },
    {
      label: "🧬 BROWSE SECTORS",
      value: "20 Sectors",
      change: "Indexed charts →",
      up: true,
      href: "/sectors",
      data: [30, 35, 33, 40, 45, 42, 50, 55, 52, 60, 65, 62],
    },
    {
      label: "🏢 PUBLIC COMPANIES",
      value: formatCount(snapshot.public_companies_count),
      change: "",
      up: true,
      href: "/companies",
      data: [200, 210, 220, 235, 248, 260, 275, 290, 305, 318, 330, 345],
    },
    {
      label: "💹 24H VOLUME",
      value: formatVolume(snapshot.total_volume),
      change: "",
      up: true,
      href: "/markets",
      data: [100, 105, 108, 106, 112, 115, 118, 120, 122, 125, 128, 130],
    },
  ];

  return (
    <div className="flex md:grid md:grid-cols-4 gap-2.5 px-5 py-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      {cardData.map((card) => (
        <Link
          key={card.label}
          href={card.href}
          className="rounded-md px-3.5 py-3 border min-w-[160px] md:min-w-0 min-h-[160px] flex-shrink-0 md:flex-shrink transition-all duration-150 hover:border-[var(--color-border-medium)] hover:shadow-sm"
          style={{
            background: "var(--color-bg-secondary)",
            borderColor: "var(--color-border-subtle)",
            borderLeft: card.up ? "3px solid #1a7a5e" : "3px solid #c0392b",
          }}
        >
          <div
            className="text-12 uppercase tracking-[0.4px] mb-1 whitespace-nowrap"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {card.label}
          </div>
          <div
            className="text-[32px] font-medium tracking-tight mb-[3px]"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
          >
            {card.value}
          </div>
          <div className="flex items-center justify-between">
            <span
              className="text-13 font-medium"
              style={{ color: card.up ? "var(--color-accent)" : "#c0392b" }}
            >
              {card.change}
            </span>
            <div className="w-[80px] h-[48px]">
              <TvSparkline data={card.data} width={80} height={48} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
