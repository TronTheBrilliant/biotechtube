"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import type { TemplateProps } from "@/lib/template-types";
import { generatePalette, getThemeVars } from "@/lib/template-colors";
import { formatMarketCap } from "@/lib/market-utils";
import { Nav } from "@/components/Nav";
import { TemplateHeader } from "@/components/templates/TemplateHeader";
import { TemplateHero } from "@/components/templates/TemplateHero";
import { TemplatePipeline } from "@/components/templates/TemplatePipeline";
import { TemplateFunding } from "@/components/templates/TemplateFunding";
import { TemplateResearch } from "@/components/templates/TemplateResearch";
import { TemplateFooter } from "@/components/templates/TemplateFooter";
import { TvStockChart } from "@/components/charts/TvStockChart";

/* ─── Sections for bottom nav ─── */
const TEMPLATE_SECTIONS = [
  { id: "about", label: "About" },
  { id: "pipeline", label: "Pipeline" },
  { id: "funding", label: "Funding" },
  { id: "stock", label: "Stock" },
  { id: "research", label: "Research" },
  { id: "contact", label: "Contact" },
];

/* ─── CSS animation keyframes (injected once) ─── */
const TEMPLATE_STYLES = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.6s ease-out both;
  }
  .t-reveal {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }
  .t-reveal.t-visible {
    opacity: 1;
    transform: translateY(0);
  }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

export function CleanTemplate(props: TemplateProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  const toggleTheme = useCallback(() => {
    setTheme(isDark ? "light" : "dark");
  }, [isDark, setTheme]);

  const palette = useMemo(() => generatePalette(props.brandColor), [props.brandColor]);
  const themeVars = useMemo(() => getThemeVars(palette, isDark ? "dark" : "light"), [palette, isDark]);

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

  // Market cap from latest price history
  const marketCap = useMemo(() => {
    const latest = [...props.priceHistory].reverse().find((p) => p.market_cap_usd && p.market_cap_usd > 0);
    return latest?.market_cap_usd || props.company.valuation || null;
  }, [props.priceHistory, props.company.valuation]);

  // Sectors
  const sectorNames = useMemo(
    () => props.sectors.map((s) => s.sectors?.name).filter(Boolean) as string[],
    [props.sectors]
  );

  // About section data
  const description = props.report?.summary || props.report?.business_model || props.company.description || "";
  const technology = props.report?.technology_platform || null;

  // Filter sections to only those with data
  const activeSections = TEMPLATE_SECTIONS.filter((s) => {
    if (s.id === "pipeline" && props.pipelines.length === 0) return false;
    if (s.id === "funding" && props.dbFundingRounds.length === 0) return false;
    if (s.id === "stock" && chartData.length < 5) return false;
    if (s.id === "research" && props.publications.length === 0 && props.patents.length === 0) return false;
    return true;
  });

  return (
    <>
      <style>{TEMPLATE_STYLES}</style>
      <Nav />
      <div
        style={{
          ...themeVars,
          background: "var(--t-bg)",
          color: "var(--t-text)",
          minHeight: "100vh",
          paddingBottom: 60, // space for fixed bottom nav
          fontFamily: "'Geist', -apple-system, sans-serif",
        } as React.CSSProperties}
      >
        {/* Floating bottom section nav */}
        <TemplateHeader
          companyName={props.company.name}
          logoUrl={props.company.logoUrl || null}
          domain={props.company.website || null}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          sections={activeSections}
        />

        <TemplateHero
          companyName={props.company.name}
          tagline={props.heroTagline}
          logoUrl={props.company.logoUrl || null}
          domain={props.company.website || null}
          ticker={props.company.ticker || null}
          marketCap={marketCap}
          founded={props.company.founded || null}
          country={props.company.country || null}
          city={null}
          sectors={sectorNames}
          brandColor={props.brandColor}
        />

        {/* About Section */}
        {description && (
          <section id="about" className="py-20 sm:py-28" style={{ background: "var(--t-bg-secondary)" }}>
            <div className="max-w-[1200px] mx-auto px-6">
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--t-brand)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                About
              </div>
              <h2 className="mt-3" style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 300, color: "var(--t-text)", letterSpacing: "-0.01em" }}>
                Company Overview
              </h2>
              <div className="grid md:grid-cols-2 gap-12 mt-10">
                <div>
                  <p style={{ fontSize: 16, lineHeight: 1.8, color: "var(--t-text-secondary)" }}>
                    {description}
                  </p>
                </div>
                {technology && (
                  <div>
                    <h3 className="mb-4" style={{ fontSize: 16, fontWeight: 500, color: "var(--t-text)" }}>
                      Technology Platform
                    </h3>
                    <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--t-text-secondary)" }}>
                      {technology}
                    </p>
                  </div>
                )}
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-12">
                {props.pipelines.length > 0 && (
                  <StatCard label="Pipeline Programs" value={String(props.pipelines.length)} />
                )}
                {props.publications.length > 0 && (
                  <StatCard label="Publications" value={String(props.publications.length)} />
                )}
                {props.patents.length > 0 && (
                  <StatCard label="Patents" value={String(props.patents.length)} />
                )}
                {props.dbFundingRounds.length > 0 && (
                  <StatCard
                    label="Total Raised"
                    value={formatMarketCap(
                      props.dbFundingRounds.reduce((s, r) => s + (r.amount_usd || 0), 0)
                    )}
                  />
                )}
              </div>
            </div>
          </section>
        )}

        {/* Pipeline */}
        <TemplatePipeline pipelines={props.pipelines} />

        {/* Funding */}
        <TemplateFunding rounds={props.dbFundingRounds} />

        {/* Stock Chart */}
        {chartData.length > 5 && (
          <section id="stock" className="py-20 sm:py-28">
            <div className="max-w-[1200px] mx-auto px-6">
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--t-brand)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Stock Performance
              </div>
              <h2 className="mt-3" style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 300, color: "var(--t-text)", letterSpacing: "-0.01em" }}>
                {props.company.ticker || "Market"} Price History
              </h2>

              {latestPrice && (
                <div className="flex items-baseline gap-4 mt-6">
                  <span style={{ fontSize: 32, fontWeight: 300, color: "var(--t-text)" }}>
                    {currency} {latestPrice.price.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="mt-8 rounded-xl overflow-hidden" style={{ border: "0.5px solid var(--t-border)" }}>
                <div
                  style={{
                    // Override TradingView chart colors to match template
                    ["--color-bg-secondary" as string]: isDark ? "#141414" : "#fafafa",
                    ["--color-text-tertiary" as string]: isDark ? "#666" : "#999",
                    ["--color-border-subtle" as string]: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                  }}
                >
                  <TvStockChart
                    data={chartData}
                    isPositive={isPositive}
                    logScale={false}
                    currency={currency}
                    height={400}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Team */}
        {props.teamMembers.length > 0 && (
          <section id="team" className="py-20 sm:py-28" style={{ background: "var(--t-bg-secondary)" }}>
            <div className="max-w-[1200px] mx-auto px-6">
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--t-brand)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Team
              </div>
              <h2 className="mt-3" style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 300, color: "var(--t-text)", letterSpacing: "-0.01em" }}>
                Leadership
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mt-12">
                {props.teamMembers.map((m) => (
                  <div key={m.id} className="text-center">
                    <div
                      className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                      style={{
                        background: m.photo_url ? `url(${m.photo_url}) center/cover` : "var(--t-brand-subtle)",
                        color: "var(--t-brand)",
                        fontSize: 24,
                        fontWeight: 300,
                      }}
                    >
                      {!m.photo_url && m.name.charAt(0)}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--t-text)" }}>
                      {m.name}
                    </div>
                    {m.title && (
                      <div style={{ fontSize: 12, color: "var(--t-text-tertiary)", marginTop: 2 }}>
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
        <TemplateResearch publications={props.publications} patents={props.patents} />

        {/* Footer */}
        <TemplateFooter
          companyName={props.company.name}
          website={props.company.website || null}
          country={props.company.country || null}
          city={null}
        />
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="p-5 rounded-xl"
      style={{ background: "var(--t-bg)", border: "0.5px solid var(--t-border)" }}
    >
      <div style={{ fontSize: 11, color: "var(--t-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div className="mt-2" style={{ fontSize: 24, fontWeight: 300, color: "var(--t-text)" }}>
        {value}
      </div>
    </div>
  );
}
