"use client";
import { formatMarketCap } from "@/lib/market-utils";

interface Props {
  companyName: string;
  tagline: string | null;
  logoUrl: string | null;
  domain: string | null;
  ticker: string | null;
  marketCap: number | null;
  founded: number | null;
  country: string | null;
  city: string | null;
  sectors: string[];
  brandColor: string;
}

export function TemplateHero({
  companyName,
  tagline,
  logoUrl,
  domain,
  ticker,
  marketCap,
  founded,
  country,
  city,
  sectors,
  brandColor,
}: Props) {
  const imgSrc = logoUrl || (domain ? `https://img.logo.dev/${domain}?token=pk_FNHUWoZORpiR_7j_vzFnmQ&size=200` : null);
  const location = [city, country].filter(Boolean).join(", ");

  return (
    <section
      className="relative min-h-[85vh] flex items-center justify-center overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${brandColor}08 0%, ${brandColor}15 50%, ${brandColor}05 100%)`,
      }}
    >
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, ${brandColor} 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 text-center max-w-3xl mx-auto px-6 py-32">
        {/* Logo */}
        {imgSrc && (
          <div className="mb-8 animate-fadeIn">
            <img
              src={imgSrc}
              alt={companyName}
              width={80}
              height={80}
              className="mx-auto rounded-2xl"
              style={{ boxShadow: `0 8px 40px ${brandColor}20` }}
            />
          </div>
        )}

        {/* Ticker badge */}
        {ticker && (
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-6 animate-fadeIn"
            style={{
              background: "var(--t-brand-subtle)",
              color: "var(--t-brand)",
              fontSize: 13,
              fontWeight: 500,
              animationDelay: "0.1s",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--t-brand)" }} />
            {ticker}
          </div>
        )}

        {/* Company name */}
        <h1
          className="animate-fadeIn"
          style={{
            fontSize: "clamp(36px, 5vw, 56px)",
            fontWeight: 300,
            color: "var(--t-text)",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            animationDelay: "0.15s",
          }}
        >
          {companyName}
        </h1>

        {/* Tagline */}
        {tagline && (
          <p
            className="mt-6 animate-fadeIn"
            style={{
              fontSize: "clamp(16px, 2vw, 20px)",
              color: "var(--t-text-secondary)",
              lineHeight: 1.6,
              fontWeight: 300,
              maxWidth: 560,
              margin: "24px auto 0",
              animationDelay: "0.25s",
            }}
          >
            {tagline}
          </p>
        )}

        {/* Sector badges */}
        {sectors.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-8 animate-fadeIn" style={{ animationDelay: "0.3s" }}>
            {sectors.map((s) => (
              <span
                key={s}
                className="px-3 py-1 rounded-full"
                style={{
                  fontSize: 12,
                  color: "var(--t-text-secondary)",
                  border: "0.5px solid var(--t-border-medium)",
                }}
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Key metrics */}
        <div
          className="flex flex-wrap justify-center gap-8 sm:gap-12 mt-12 animate-fadeIn"
          style={{ animationDelay: "0.4s" }}
        >
          {marketCap && marketCap > 0 && (
            <Metric label="Market Cap" value={formatMarketCap(marketCap)} />
          )}
          {founded && <Metric label="Founded" value={String(founded)} />}
          {location && <Metric label="Headquarters" value={location} />}
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
        style={{ color: "var(--t-text-tertiary)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div style={{ fontSize: 13, color: "var(--t-text-tertiary)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 400, color: "var(--t-text)" }}>
        {value}
      </div>
    </div>
  );
}
