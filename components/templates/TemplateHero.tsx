"use client";
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
}: Props) {
  const location = [city, country].filter(Boolean).join(", ");

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: `linear-gradient(170deg, ${brandColor}06 0%, ${brandColor}12 40%, ${brandColor}04 100%)`,
        minHeight: "90vh",
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* Subtle ambient glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.07] blur-[120px]"
        style={{ background: brandColor }}
      />

      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 py-24 sm:py-32 text-center">
        {/* Logo */}
        {logoUrl && (
          <div className="mb-10">
            <img
              src={logoUrl}
              alt={companyName}
              width={72}
              height={72}
              className="mx-auto rounded-2xl"
              style={{
                boxShadow: `0 12px 48px ${brandColor}18`,
                background: "var(--color-bg-primary)",
                padding: 8,
              }}
            />
          </div>
        )}

        {/* Ticker */}
        {ticker && (
          <div className="flex items-center justify-center gap-2 mb-6">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{
                background: `${brandColor}12`,
                color: brandColor,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: brandColor }} />
              {ticker}
            </span>
          </div>
        )}

        {/* Name */}
        <h1
          style={{
            fontSize: "clamp(40px, 6vw, 64px)",
            fontWeight: 300,
            color: "var(--color-text-primary)",
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
          }}
        >
          {companyName}
        </h1>

        {/* Tagline */}
        {tagline && (
          <p
            className="mt-6 mx-auto"
            style={{
              fontSize: "clamp(16px, 2vw, 20px)",
              color: "var(--color-text-secondary)",
              lineHeight: 1.6,
              fontWeight: 300,
              maxWidth: 540,
            }}
          >
            {tagline}
          </p>
        )}

        {/* Sectors */}
        {sectors.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {sectors.map((s) => (
              <span
                key={s}
                className="px-3 py-1 rounded-full"
                style={{
                  fontSize: 12,
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

        {/* Key metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mt-14 max-w-3xl mx-auto">
          {marketCap && marketCap > 0 && (
            <MetricPill label="Market Cap" value={formatMarketCap(marketCap)} />
          )}
          {founded && <MetricPill label="Founded" value={String(founded)} />}
          {location && <MetricPill label="HQ" value={location} />}
          {pipelineCount > 0 && <MetricPill label="Pipeline" value={`${pipelineCount} programs`} />}
          {publicationCount > 0 && <MetricPill label="Publications" value={String(publicationCount)} />}
          {patentCount > 0 && <MetricPill label="Patents" value={String(patentCount)} />}
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" style={{ color: "var(--color-text-tertiary)" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl px-3 py-3 text-center"
      style={{
        background: "var(--color-bg-primary)",
        border: "0.5px solid var(--color-border-subtle)",
      }}
    >
      <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div className="mt-1" style={{ fontSize: 15, fontWeight: 400, color: "var(--color-text-primary)" }}>
        {value}
      </div>
    </div>
  );
}
