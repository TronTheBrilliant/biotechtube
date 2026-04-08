"use client";

import Link from "next/link";
import { formatMarketCap } from "@/lib/market-utils";
import type { FundingPulse } from "@/lib/funding-intelligence-queries";
import type { FundingStats } from "@/lib/funding-queries";

interface Props {
  pulse: FundingPulse;
  fundingStats: FundingStats;
}

export function FundingHero({ pulse, fundingStats }: Props) {
  const latestDealAge = pulse.latestDealDate
    ? Math.floor((Date.now() - new Date(pulse.latestDealDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const showTicker = latestDealAge !== null && latestDealAge <= 7 && pulse.latestDealCompany;

  return (
    <div className="mb-6">
      <h1
        className="text-[28px] md:text-[32px] font-medium tracking-tight"
        style={{ letterSpacing: "-0.5px", color: "var(--color-text-primary)" }}
      >
        Funding Intelligence
      </h1>
      <p className="text-13 mt-2" style={{ color: "var(--color-text-secondary)" }}>
        {fundingStats.totalRounds.toLocaleString()} rounds · {formatMarketCap(fundingStats.totalTracked)} tracked · {fundingStats.totalCompanies.toLocaleString()} companies
      </p>
      <div className="flex flex-col gap-1 mt-3">
        <BulletPoint text="AI-generated deal analysis and funding news" />
        <BulletPoint text="Sortable deal flow with advanced filters" />
        <BulletPoint text="6 interactive charts — sector, geography, velocity" />
        <BulletPoint text="Top investor rankings with portfolio deep-dives" />
      </div>

      {/* Live deal ticker */}
      {showTicker && (
        <div
          className="mt-4 rounded-lg px-4 py-2 flex items-center gap-2"
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
          }}
        >
          <span
            className="motion-reduce:animate-none"
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--color-accent)",
              flexShrink: 0,
              animation: "heroTickerPulse 2s ease-in-out infinite",
            }}
          />
          <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>LIVE</span>
          <span className="text-12 truncate" style={{ color: "var(--color-text-secondary)" }}>
            {pulse.latestDealCompany} raised{" "}
            <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>
              {pulse.latestDealAmount ? formatMarketCap(pulse.latestDealAmount) : ""}
            </span>{" "}
            {pulse.latestDealType} · {latestDealAge === 0 ? "today" : `${latestDealAge}d ago`}
          </span>
          {pulse.latestDealSlug && (
            <Link
              href={`/news/funding/${pulse.latestDealSlug}`}
              className="text-11 font-medium shrink-0 ml-auto"
              style={{ color: "var(--color-accent)" }}
            >
              View →
            </Link>
          )}
          <style>{`@keyframes heroTickerPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
        </div>
      )}
    </div>
  );
}

function BulletPoint({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: "var(--color-accent)", fontSize: 10 }}>●</span>
      <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>{text}</span>
    </div>
  );
}
