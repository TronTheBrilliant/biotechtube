"use client";
import { useState } from "react";
import { formatMarketCap } from "@/lib/market-utils";

interface Props {
  companyName: string;
  tagline: string | null;
  logoUrl: string | null;
  ticker: string | null;
  marketCap: number | null;
  founded: number | null;
  country: string | null;
  city: string | null;
  sectors: string[];
  brandColor: string;
  pipelineCount: number;
  publicationCount: number;
  patentCount: number;
  employeeCount: string | null;
}

export function TemplateHero({
  companyName,
  tagline,
  logoUrl,
  ticker,
  marketCap,
  founded,
  country,
  city,
  sectors,
  brandColor,
  pipelineCount,
  publicationCount,
  patentCount,
  employeeCount,
}: Props) {
  const [logoError, setLogoError] = useState(false);
  const location = [city, country].filter(Boolean).join(", ");

  return (
    <section className="relative overflow-hidden" style={{ minHeight: "100vh" }}>
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 0%, ${brandColor}12 0%, transparent 70%),
            radial-gradient(ellipse 60% 40% at 80% 100%, ${brandColor}08 0%, transparent 60%),
            var(--color-bg-primary)
          `,
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-[1100px] mx-auto px-6 pt-28 sm:pt-36 pb-20">
        {/* Top bar: logo + ticker */}
        <div className="flex items-center gap-4 mb-10">
          {logoUrl && !logoError && (
            <img
              src={logoUrl}
              alt={companyName}
              width={48}
              height={48}
              className="rounded-xl"
              style={{ background: "var(--color-bg-secondary)", padding: 4 }}
              onError={() => setLogoError(true)}
            />
          )}
          {ticker && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{ background: `${brandColor}10`, color: brandColor, fontSize: 13, fontWeight: 500 }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: brandColor }} />
              {ticker}
            </span>
          )}
        </div>

        {/* Company name — massive */}
        <h1
          style={{
            fontSize: "clamp(48px, 8vw, 88px)",
            fontWeight: 250,
            color: "var(--color-text-primary)",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            maxWidth: 900,
          }}
        >
          {companyName}
        </h1>

        {/* Tagline */}
        {tagline && (
          <p
            className="mt-6"
            style={{
              fontSize: "clamp(18px, 2.5vw, 24px)",
              color: "var(--color-text-secondary)",
              lineHeight: 1.5,
              fontWeight: 300,
              maxWidth: 640,
            }}
          >
            {tagline}
          </p>
        )}

        {/* Sector badges */}
        {sectors.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8">
            {sectors.map((s) => (
              <span
                key={s}
                className="px-3 py-1.5 rounded-full"
                style={{
                  fontSize: 13,
                  color: "var(--color-text-secondary)",
                  border: "0.5px solid var(--color-border-medium)",
                  background: "var(--color-bg-primary)",
                }}
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Stats row — horizontal, clean */}
        <div className="flex flex-wrap gap-x-10 gap-y-4 mt-14">
          {marketCap && marketCap > 0 && <HeroStat label="Market Cap" value={formatMarketCap(marketCap)} />}
          {founded && <HeroStat label="Founded" value={String(founded)} />}
          {location && <HeroStat label="Headquarters" value={location} />}
          {employeeCount && <HeroStat label="Employees" value={employeeCount} />}
          {pipelineCount > 0 && <HeroStat label="Pipeline" value={`${pipelineCount} programs`} />}
          {publicationCount > 0 && <HeroStat label="Publications" value={String(publicationCount)} />}
          {patentCount > 0 && <HeroStat label="Patents" value={String(patentCount)} />}
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24"
        style={{
          background: `linear-gradient(transparent, var(--color-bg-secondary))`,
        }}
      />
    </section>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 400, color: "var(--color-text-primary)" }}>
        {value}
      </div>
    </div>
  );
}
