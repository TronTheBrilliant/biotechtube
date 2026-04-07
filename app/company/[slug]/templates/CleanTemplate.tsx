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
import { TrendingUp, Users, Shield, Target, Lightbulb, Building2 } from "lucide-react";

const ALL_SECTIONS = [
  { id: "about", label: "About" },
  { id: "technology", label: "Technology" },
  { id: "pipeline", label: "Pipeline" },
  { id: "team", label: "Team" },
  { id: "funding", label: "Funding" },
  { id: "stock", label: "Stock" },
  { id: "research", label: "Research" },
  { id: "contact", label: "Contact" },
];

const TEMPLATE_STYLES = `
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  html { scroll-behavior: smooth; }
`;

export function CleanTemplate(props: TemplateProps) {
  const brandColor = props.brandColor;
  const report = props.report;

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

  const marketCap = useMemo(() => {
    const latest = [...props.priceHistory].reverse().find((p) => p.market_cap_usd && p.market_cap_usd > 0);
    return latest?.market_cap_usd || props.company.valuation || null;
  }, [props.priceHistory, props.company.valuation]);

  const sectorNames = useMemo(
    () => props.sectors.map((s) => s.sectors?.name).filter(Boolean) as string[],
    [props.sectors]
  );

  // Rich data from company_reports
  const deepReport = report?.deep_report || null;
  const technologyText = report?.technology_platform || null;
  const competitiveLandscape = report?.competitive_landscape || null;
  const therapeuticAreas = report?.therapeutic_areas || [];
  const keyPeople = (report?.key_people as Array<{ name: string; role: string }>) || [];
  const partners = report?.partners || [];
  const investors = report?.investors || [];
  const summary = report?.summary || props.company.description || "";
  const employeeEstimate = report?.employee_estimate || props.company.employees || null;

  // Parse deep report sections
  const reportSections = useMemo(() => {
    if (!deepReport) return {};
    const sections: Record<string, string> = {};
    const parts = deepReport.split(/^## /m);
    for (const part of parts) {
      if (!part.trim()) continue;
      const lines = part.split("\n");
      const title = lines[0].trim();
      const content = lines.slice(1).join("\n").trim();
      if (title && content) sections[title] = content;
    }
    return sections;
  }, [deepReport]);

  // Pipeline programs from report (curated, better than raw ClinicalTrials.gov)
  const curatedPipeline = (report?.pipeline_programs as Array<{
    name: string; phase: string; status: string; trial_id?: string; indication: string;
  }>) || [];

  // Filter sections with data
  const activeSections = ALL_SECTIONS.filter((s) => {
    if (s.id === "technology" && !technologyText && !reportSections["Technology Platform"]) return false;
    if (s.id === "pipeline" && props.pipelines.length === 0 && curatedPipeline.length === 0) return false;
    if (s.id === "team" && keyPeople.length === 0 && props.teamMembers.length === 0) return false;
    if (s.id === "funding" && props.dbFundingRounds.length === 0) return false;
    if (s.id === "stock" && chartData.length < 5) return false;
    if (s.id === "research" && props.publications.length === 0 && props.patents.length === 0) return false;
    return true;
  });

  return (
    <>
      <style>{TEMPLATE_STYLES}</style>
      <Nav />
      <div style={{ paddingBottom: 60 }}>
        <TemplateHeader
          companyName={props.company.name}
          logoUrl={props.company.logoUrl || null}
          domain={props.company.website || null}
          sections={activeSections}
        />

        {/* ═══════════ HERO ═══════════ */}
        <TemplateHero
          companyName={props.company.name}
          tagline={props.heroTagline}
          logoUrl={props.company.logoUrl || null}
          ticker={props.company.ticker || null}
          marketCap={marketCap}
          founded={props.company.founded || null}
          country={props.company.country || null}
          city={report?.headquarters_city || null}
          sectors={sectorNames}
          brandColor={brandColor}
          pipelineCount={props.pipelines.length || curatedPipeline.length}
          publicationCount={props.publications.length}
          patentCount={props.patents.length}
          employeeCount={employeeEstimate ? String(employeeEstimate) : null}
        />

        {/* ═══════════ ABOUT / MISSION ═══════════ */}
        <section id="about" className="py-20 sm:py-28" style={{ background: "var(--color-bg-secondary)" }}>
          <div className="max-w-[1100px] mx-auto px-6">
            <SectionLabel icon={<Building2 size={14} />} color={brandColor}>About</SectionLabel>
            <h2 className="mt-3" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300, color: "var(--color-text-primary)", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
              Company Overview
            </h2>

            <div className="grid md:grid-cols-5 gap-12 mt-10">
              {/* Main description — 3 cols */}
              <div className="md:col-span-3">
                <p style={{ fontSize: 17, lineHeight: 1.85, color: "var(--color-text-secondary)" }}>
                  {summary}
                </p>

                {/* Therapeutic areas */}
                {therapeuticAreas.length > 0 && (
                  <div className="mt-8">
                    <h4 className="mb-3" style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Therapeutic Focus
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {therapeuticAreas.map((area) => (
                        <span
                          key={area}
                          className="px-3 py-1.5 rounded-lg"
                          style={{ fontSize: 13, color: brandColor, background: `${brandColor}08`, border: `0.5px solid ${brandColor}20` }}
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick facts sidebar — 2 cols */}
              <div className="md:col-span-2">
                <div className="rounded-xl p-6" style={{ background: "var(--color-bg-primary)", border: "0.5px solid var(--color-border-subtle)" }}>
                  <h4 className="mb-4" style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
                    Key Facts
                  </h4>
                  <div className="flex flex-col gap-3">
                    {props.company.founded && <FactRow label="Founded" value={String(props.company.founded)} />}
                    {(report?.headquarters_city || props.company.country) && (
                      <FactRow label="Headquarters" value={[report?.headquarters_city, props.company.country].filter(Boolean).join(", ")} />
                    )}
                    {employeeEstimate && <FactRow label="Employees" value={String(employeeEstimate)} />}
                    {props.company.ticker && <FactRow label="Listed" value={`NASDAQ: ${props.company.ticker}`} />}
                    {marketCap && <FactRow label="Market Cap" value={formatMarketCap(marketCap)} />}
                    {report?.revenue_status && <FactRow label="Revenue" value={report.revenue_status} />}
                    {partners.length > 0 && <FactRow label="Key Partners" value={partners.join(", ")} />}
                    {investors.length > 0 && <FactRow label="Key Investors" value={investors.join(", ")} />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ TECHNOLOGY PLATFORM ═══════════ */}
        {(technologyText || reportSections["Technology Platform"]) && (
          <section id="technology" className="py-20 sm:py-28">
            <div className="max-w-[1100px] mx-auto px-6">
              <SectionLabel icon={<Lightbulb size={14} />} color={brandColor}>Technology</SectionLabel>
              <h2 className="mt-3 mb-10" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300, color: "var(--color-text-primary)", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                Technology Platform
              </h2>

              {/* Full technology description from deep report */}
              <div className="max-w-3xl">
                {(reportSections["Technology Platform"] || technologyText || "").split("\n\n").map((paragraph, i) => {
                  // Handle bullet points
                  if (paragraph.trim().startsWith("*")) {
                    const items = paragraph.split("\n").filter((l) => l.trim().startsWith("*"));
                    return (
                      <div key={i} className="my-6 flex flex-col gap-3">
                        {items.map((item, j) => {
                          const text = item.replace(/^\*\s*/, "").replace(/\*\*/g, "");
                          const [title, ...desc] = text.split(":");
                          return (
                            <div key={j} className="flex gap-3 p-4 rounded-xl" style={{ background: "var(--color-bg-secondary)", border: "0.5px solid var(--color-border-subtle)" }}>
                              <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5" style={{ background: `${brandColor}10`, color: brandColor }}>
                                <span style={{ fontSize: 14, fontWeight: 500 }}>{j + 1}</span>
                              </div>
                              <div>
                                {desc.length > 0 ? (
                                  <>
                                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{title.trim()}</div>
                                    <div style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.7, marginTop: 2 }}>{desc.join(":").trim()}</div>
                                  </>
                                ) : (
                                  <div style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>{title.trim()}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  // Regular paragraphs (strip markdown bold)
                  const cleanText = paragraph.replace(/\*\*/g, "").replace(/^\s+/gm, "").trim();
                  if (!cleanText) return null;
                  return (
                    <p key={i} className="mb-5" style={{ fontSize: 16, lineHeight: 1.85, color: "var(--color-text-secondary)" }}>
                      {cleanText}
                    </p>
                  );
                })}
              </div>

              {/* Competitive landscape */}
              {competitiveLandscape && (
                <div className="mt-12 p-6 rounded-xl" style={{ background: "var(--color-bg-secondary)", border: "0.5px solid var(--color-border-subtle)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Shield size={14} style={{ color: brandColor }} />
                    <h4 style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>Competitive Position</h4>
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--color-text-secondary)" }}>
                    {competitiveLandscape}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ═══════════ PIPELINE HIGHLIGHTS (from curated report) ═══════════ */}
        {curatedPipeline.length > 0 && (
          <section className="py-20 sm:py-28" style={{ background: "var(--color-bg-secondary)" }}>
            <div className="max-w-[1100px] mx-auto px-6">
              <SectionLabel icon={<Target size={14} />} color={brandColor}>Key Programs</SectionLabel>
              <h2 className="mt-3 mb-8" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300, color: "var(--color-text-primary)", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                Pipeline Highlights
              </h2>
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${brandColor}30` }}>
                      <th className="text-left py-3 pr-4" style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Program</th>
                      <th className="text-left py-3 pr-4" style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Indication</th>
                      <th className="text-left py-3 pr-4" style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Phase</th>
                      <th className="text-left py-3" style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {curatedPipeline.map((prog, i) => (
                      <tr
                        key={i}
                        style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}
                      >
                        <td className="py-3.5 pr-4">
                          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{prog.name}</div>
                        </td>
                        <td className="py-3.5 pr-4">
                          <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{prog.indication}</div>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span
                            className="inline-block px-2 py-0.5 rounded-full"
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              color: prog.phase === "Approved" ? "#16a34a" : brandColor,
                              background: prog.phase === "Approved" ? "#f0fdf4" : `${brandColor}10`,
                            }}
                          >
                            {prog.phase}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{prog.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ═══════════ FULL PIPELINE (ClinicalTrials.gov) ═══════════ */}
        <TemplatePipeline pipelines={props.pipelines} brandColor={brandColor} />

        {/* ═══════════ TEAM ═══════════ */}
        {(keyPeople.length > 0 || props.teamMembers.length > 0) && (
          <section id="team" className="py-20 sm:py-28">
            <div className="max-w-[1100px] mx-auto px-6">
              <SectionLabel icon={<Users size={14} />} color={brandColor}>Leadership</SectionLabel>
              <h2 className="mt-3" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300, color: "var(--color-text-primary)", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                Executive Team
              </h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-10">
                {(keyPeople.length > 0 ? keyPeople : props.teamMembers.map((m) => ({ name: m.name, role: m.title || "" }))).map((person, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-xl transition-all hover:scale-[1.02]"
                    style={{
                      background: "var(--color-bg-secondary)",
                      border: "0.5px solid var(--color-border-subtle)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                      style={{ background: `${brandColor}10`, color: brandColor, fontSize: 18, fontWeight: 300 }}
                    >
                      {person.name.charAt(0)}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)" }}>
                      {person.name}
                    </div>
                    <div className="mt-1" style={{ fontSize: 12, color: "var(--color-text-tertiary)", lineHeight: 1.4 }}>
                      {person.role}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══════════ FUNDING ═══════════ */}
        <TemplateFunding rounds={props.dbFundingRounds} brandColor={brandColor} />

        {/* ═══════════ STOCK ═══════════ */}
        {chartData.length > 5 && (
          <section id="stock" className="py-20 sm:py-28">
            <div className="max-w-[1100px] mx-auto px-6">
              <SectionLabel icon={<TrendingUp size={14} />} color={brandColor}>Stock Performance</SectionLabel>
              <h2 className="mt-3" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300, color: "var(--color-text-primary)", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
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
                      <span style={{ fontSize: 32, fontWeight: 300, color: "var(--color-text-primary)" }}>
                        {currency} {latestPrice.price.toFixed(2)}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 500, color: ytdChange >= 0 ? "#059669" : "#dc2626" }}>
                        {ytdChange >= 0 ? "+" : ""}{ytdChange.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-8 mt-4">
                      {marketCap && <StatInline label="Market Cap" value={formatMarketCap(marketCap)} />}
                      <StatInline label="52W High" value={`${currency} ${high52w.toFixed(2)}`} />
                      <StatInline label="52W Low" value={`${currency} ${low52w.toFixed(2)}`} />
                    </div>
                  </>
                );
              })()}

              <div className="mt-8 rounded-xl overflow-hidden" style={{ border: "0.5px solid var(--color-border-subtle)" }}>
                <TvStockChart data={chartData} isPositive={isPositive} logScale={false} currency={currency} height={400} />
              </div>

              {/* Financial context from deep report */}
              {reportSections["Financial Position"] && (
                <div className="mt-8 p-6 rounded-xl" style={{ background: "var(--color-bg-secondary)", border: "0.5px solid var(--color-border-subtle)" }}>
                  <h4 className="mb-3" style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>Financial Context</h4>
                  <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--color-text-secondary)" }}>
                    {reportSections["Financial Position"].replace(/\*\*/g, "").split("\n").filter(l => l.trim() && !l.trim().startsWith("*")).slice(0, 3).join(" ")}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ═══════════ MARKET OPPORTUNITY ═══════════ */}
        {reportSections["Market Opportunity"] && (
          <section className="py-20 sm:py-28" style={{ background: "var(--color-bg-secondary)" }}>
            <div className="max-w-[1100px] mx-auto px-6">
              <SectionLabel icon={<Target size={14} />} color={brandColor}>Market</SectionLabel>
              <h2 className="mt-3 mb-8" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300, color: "var(--color-text-primary)", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                Market Opportunity
              </h2>
              <div className="max-w-3xl">
                {reportSections["Market Opportunity"].split("\n\n").map((p, i) => {
                  const clean = p.replace(/\*\*/g, "").trim();
                  if (!clean) return null;
                  return (
                    <p key={i} className="mb-5" style={{ fontSize: 16, lineHeight: 1.85, color: "var(--color-text-secondary)" }}>
                      {clean}
                    </p>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ═══════════ RISKS ═══════════ */}
        {reportSections["Key Risks"] && (
          <section className="py-20 sm:py-28">
            <div className="max-w-[1100px] mx-auto px-6">
              <SectionLabel icon={<Shield size={14} />} color={brandColor}>Risk Factors</SectionLabel>
              <h2 className="mt-3 mb-8" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300, color: "var(--color-text-primary)", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                Key Considerations
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {reportSections["Key Risks"].split("\n").filter(l => l.trim().startsWith("*")).map((line, i) => {
                  const text = line.replace(/^\*\s*/, "").replace(/\*\*/g, "");
                  const [title, ...desc] = text.split(":");
                  return (
                    <div key={i} className="p-5 rounded-xl" style={{ background: "var(--color-bg-secondary)", border: "0.5px solid var(--color-border-subtle)" }}>
                      {desc.length > 0 ? (
                        <>
                          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 }}>{title.trim()}</div>
                          <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--color-text-secondary)" }}>{desc.join(":").trim()}</div>
                        </>
                      ) : (
                        <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--color-text-secondary)" }}>{title.trim()}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ═══════════ OUTLOOK ═══════════ */}
        {reportSections["Outlook"] && (
          <section className="py-20 sm:py-28" style={{ background: "var(--color-bg-secondary)" }}>
            <div className="max-w-[1100px] mx-auto px-6">
              <SectionLabel icon={<Lightbulb size={14} />} color={brandColor}>Outlook</SectionLabel>
              <h2 className="mt-3 mb-8" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300, color: "var(--color-text-primary)", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                Forward Looking
              </h2>
              <div className="max-w-3xl">
                {reportSections["Outlook"].split("\n\n").map((p, i) => {
                  const clean = p.replace(/\*\*/g, "").trim();
                  if (!clean) return null;
                  return (
                    <p key={i} className="mb-5" style={{ fontSize: 16, lineHeight: 1.85, color: "var(--color-text-secondary)" }}>
                      {clean}
                    </p>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ═══════════ RESEARCH ═══════════ */}
        <TemplateResearch publications={props.publications} patents={props.patents} brandColor={brandColor} />

        {/* ═══════════ FOOTER ═══════════ */}
        <TemplateFooter
          companyName={props.company.name}
          website={props.company.website || null}
          country={props.company.country || null}
          city={report?.headquarters_city || null}
          ticker={props.company.ticker || null}
          founded={props.company.founded || null}
          sectors={sectorNames}
          brandColor={brandColor}
        />
      </div>
    </>
  );
}

/* ─── Shared sub-components ─── */

function SectionLabel({ children, icon, color }: { children: React.ReactNode; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 500, color, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {children}
      </span>
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2.5" style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}>
      <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>{label}</span>
      <span className="text-right max-w-[60%]" style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{value}</span>
    </div>
  );
}

function StatInline({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      <div className="mt-0.5" style={{ fontSize: 15, fontWeight: 400, color: "var(--color-text-primary)" }}>{value}</div>
    </div>
  );
}
