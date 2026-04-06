"use client";

import { useMemo } from "react";
import type { TemplateProps } from "@/lib/template-types";
import { formatMarketCap } from "@/lib/market-utils";
import { Nav } from "@/components/Nav";
import { TemplateHeader } from "@/components/templates/TemplateHeader";
import { TemplateHero } from "@/components/templates/TemplateHero";
import { TemplatePipeline } from "@/components/templates/TemplatePipeline";
import { TemplateFunding } from "@/components/templates/TemplateFunding";
import { TemplateResearch } from "@/components/templates/TemplateResearch";
import { TemplateFooter } from "@/components/templates/TemplateFooter";
import { TvStockChart } from "@/components/charts/TvStockChart";
import { TrendingUp, Newspaper } from "lucide-react";

/* ─── Sections for bottom nav ─── */
const ALL_SECTIONS = [
  { id: "about", label: "About" },
  { id: "pipeline", label: "Pipeline" },
  { id: "funding", label: "Funding" },
  { id: "stock", label: "Stock" },
  { id: "research", label: "Research" },
  { id: "news", label: "News" },
  { id: "contact", label: "Contact" },
];

const TEMPLATE_STYLES = `
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  html { scroll-behavior: smooth; }
`;

export function CleanTemplate(props: TemplateProps) {
  const brandColor = props.brandColor;

  // Stock chart data
  const chartData = useMemo(() => {
    return props.priceHistory.map((p) => ({
      date: p.date,
      price: p.adj_close ?? p.close,
      volume: p.volume ?? 0,
    }));
  }, [props.priceHistory]);

  const latestPrice = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const firstPrice = chartData.length > 1 ? chartData[0] : null;
  const isPositive = latestPrice && firstPrice ? latestPrice.price >= firstPrice.price : true;
  const currency = props.priceHistory[0]?.currency || "USD";

  // Market cap
  const marketCap = useMemo(() => {
    const latest = [...props.priceHistory].reverse().find((p) => p.market_cap_usd && p.market_cap_usd > 0);
    return latest?.market_cap_usd || props.company.valuation || null;
  }, [props.priceHistory, props.company.valuation]);

  // Sectors
  const sectorNames = useMemo(
    () => props.sectors.map((s) => s.sectors?.name).filter(Boolean) as string[],
    [props.sectors]
  );

  // About section
  const description = props.report?.summary || props.report?.business_model || props.company.description || "";
  const technology = props.report?.technology_platform || null;

  // Filter sections with data
  const activeSections = ALL_SECTIONS.filter((s) => {
    if (s.id === "pipeline" && props.pipelines.length === 0) return false;
    if (s.id === "funding" && props.dbFundingRounds.length === 0) return false;
    if (s.id === "stock" && chartData.length < 5) return false;
    if (s.id === "research" && props.publications.length === 0 && props.patents.length === 0) return false;
    if (s.id === "news") return false; // TODO: enable when company news data exists
    return true;
  });

  // Active pipeline count for hero
  const activePipelineCount = props.pipelines.filter(
    (p) => p.trial_status === "Recruiting" || p.trial_status === "Active"
  ).length;

  return (
    <>
      <style>{TEMPLATE_STYLES}</style>
      <Nav />
      <div style={{ paddingBottom: 60 }}>
        {/* Bottom section nav — always visible */}
        <TemplateHeader
          companyName={props.company.name}
          logoUrl={props.company.logoUrl || null}
          domain={props.company.website || null}
          sections={activeSections}
        />

        {/* Hero */}
        <TemplateHero
          companyName={props.company.name}
          tagline={props.heroTagline}
          logoUrl={props.company.logoUrl || null}
          ticker={props.company.ticker || null}
          marketCap={marketCap}
          founded={props.company.founded || null}
          country={props.company.country || null}
          city={null}
          sectors={sectorNames}
          brandColor={brandColor}
          pipelineCount={props.pipelines.length}
          publicationCount={props.publications.length}
          patentCount={props.patents.length}
        />

        {/* About */}
        {description && (
          <section id="about" className="py-20 sm:py-28" style={{ background: "var(--color-bg-secondary)" }}>
            <div className="max-w-[1200px] mx-auto px-6">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 11, fontWeight: 500, color: brandColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  About
                </span>
              </div>
              <h2 className="mt-3" style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 300, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
                Company Overview
              </h2>
              <div className="grid md:grid-cols-2 gap-12 mt-10">
                <div>
                  <p style={{ fontSize: 16, lineHeight: 1.8, color: "var(--color-text-secondary)" }}>
                    {description}
                  </p>
                </div>
                {technology && (
                  <div>
                    <h3 className="mb-4" style={{ fontSize: 16, fontWeight: 500, color: "var(--color-text-primary)" }}>
                      Technology Platform
                    </h3>
                    <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--color-text-secondary)" }}>
                      {technology}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Pipeline */}
        <TemplatePipeline pipelines={props.pipelines} brandColor={brandColor} />

        {/* Funding */}
        <TemplateFunding rounds={props.dbFundingRounds} brandColor={brandColor} />

        {/* Stock Chart */}
        {chartData.length > 5 && (
          <section id="stock" className="py-20 sm:py-28">
            <div className="max-w-[1200px] mx-auto px-6">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} style={{ color: brandColor }} />
                <span style={{ fontSize: 11, fontWeight: 500, color: brandColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Stock Performance
                </span>
              </div>
              <h2 className="mt-3" style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 300, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
                {props.company.ticker || "Market"} Price History
              </h2>

              {latestPrice && (() => {
                const prices = chartData.map(d => d.price).filter(p => p > 0);
                const high52w = Math.max(...prices);
                const low52w = Math.min(...prices);
                const yearAgoPrice = chartData.length > 250 ? chartData[chartData.length - 250].price : chartData[0].price;
                const ytdChange = yearAgoPrice > 0 ? ((latestPrice.price - yearAgoPrice) / yearAgoPrice * 100) : 0;

                return (
                  <>
                    <div className="flex items-baseline gap-3 mt-4">
                      <span style={{ fontSize: 28, fontWeight: 300, color: "var(--color-text-primary)" }}>
                        {currency} {latestPrice.price.toFixed(2)}
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: ytdChange >= 0 ? "#059669" : "#dc2626",
                        }}
                      >
                        {ytdChange >= 0 ? "+" : ""}{ytdChange.toFixed(1)}% YTD
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-6 mt-4">
                      {marketCap && (
                        <div>
                          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>Market Cap</span>
                          <div style={{ fontSize: 14, color: "var(--color-text-primary)", marginTop: 2 }}>{formatMarketCap(marketCap)}</div>
                        </div>
                      )}
                      <div>
                        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>52W High</span>
                        <div style={{ fontSize: 14, color: "var(--color-text-primary)", marginTop: 2 }}>{currency} {high52w.toFixed(2)}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>52W Low</span>
                        <div style={{ fontSize: 14, color: "var(--color-text-primary)", marginTop: 2 }}>{currency} {low52w.toFixed(2)}</div>
                      </div>
                    </div>
                  </>
                );
              })()}

              <div className="mt-8 rounded-xl overflow-hidden" style={{ border: "0.5px solid var(--color-border-subtle)" }}>
                <TvStockChart
                  data={chartData}
                  isPositive={isPositive}
                  logScale={false}
                  currency={currency}
                  height={400}
                />
              </div>
            </div>
          </section>
        )}

        {/* Team */}
        {props.teamMembers.length > 0 && (
          <section id="team" className="py-20 sm:py-28" style={{ background: "var(--color-bg-secondary)" }}>
            <div className="max-w-[1200px] mx-auto px-6">
              <span style={{ fontSize: 11, fontWeight: 500, color: brandColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Team
              </span>
              <h2 className="mt-3" style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 300, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
                Leadership
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mt-12">
                {props.teamMembers.map((m) => (
                  <div key={m.id} className="text-center">
                    <div
                      className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                      style={{
                        background: m.photo_url ? `url(${m.photo_url}) center/cover` : `${brandColor}12`,
                        color: brandColor,
                        fontSize: 24,
                        fontWeight: 300,
                      }}
                    >
                      {!m.photo_url && m.name.charAt(0)}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
                      {m.name}
                    </div>
                    {m.title && (
                      <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>
                        {m.title}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Research */}
        <TemplateResearch publications={props.publications} patents={props.patents} brandColor={brandColor} />

        {/* Footer */}
        <TemplateFooter
          companyName={props.company.name}
          website={props.company.website || null}
          country={props.company.country || null}
          city={null}
          ticker={props.company.ticker || null}
          founded={props.company.founded || null}
          sectors={sectorNames}
          brandColor={brandColor}
        />
      </div>
    </>
  );
}
