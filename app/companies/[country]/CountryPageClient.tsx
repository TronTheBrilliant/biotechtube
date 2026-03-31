"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { RecentlyFunded } from "@/components/RecentlyFunded";
import { PaywallCard } from "@/components/PaywallCard";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { Company, FundingRound } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";
import fundingData from "@/data/funding.json";
import { Shield, ArrowRight } from "lucide-react";

const funding = fundingData as FundingRound[];

interface CountryData {
  slug: string;
  name: string;
  flag: string;
  region: string;
  bioHubs: string[];
  companyCount: number;
  totalRaised: string;
  topStage: string;
  topFocus: string;
  description: string;
}

interface CountryPageClientProps {
  country: CountryData;
  nearbyCountries: CountryData[];
}

const stageBadgeColors: Record<string, { bg: string; text: string; border: string }> = {
  Approved: { bg: "#ecfdf5", text: "#064e3b", border: "#34d399" },
  "Phase 3": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 2": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 1/2": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Phase 1": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Pre-clinical": { bg: "var(--color-bg-secondary)", text: "var(--color-text-secondary)", border: "var(--color-border-medium)" },
};

const stageEmoji: Record<string, string> = {
  "Pre-clinical": "🔬",
  "Phase 1": "1️⃣",
  "Phase 1/2": "🔄",
  "Phase 2": "2️⃣",
  "Phase 3": "3️⃣",
  Approved: "✅",
};

const focusEmoji: Record<string, string> = {
  Oncology: "🎯",
  Immunotherapy: "🛡️",
  Diagnostics: "🔬",
  "Drug Delivery": "💉",
  Radiopharmaceuticals: "☢️",
  "DNA Vaccine": "🧬",
  Photochemistry: "🧪",
  "Bladder Cancer": "🎯",
  "Oncolytic Peptide": "🛡️",
  "Monoclonal Antibodies": "🧬",
  "AI Diagnostics": "🤖",
  "TCR Cell Therapy": "🦠",
  "Gene Therapy": "🧬",
  "Cell Therapy": "🦠",
  "Small Molecule": "💊",
};

const categories = [
  { name: "All", emoji: "🌐" },
  { name: "Oncology", emoji: "🎯" },
  { name: "Immunotherapy", emoji: "🛡️" },
  { name: "Gene Therapy", emoji: "🧬" },
  { name: "Diagnostics", emoji: "🔬" },
  { name: "Drug Delivery", emoji: "💉" },
  { name: "Cell Therapy", emoji: "🦠" },
  { name: "Radiopharmaceuticals", emoji: "☢️" },
  { name: "AI / Digital Health", emoji: "🤖" },
];

type SortMode = "marketcap" | "trending" | "funded" | "newest";

export function CountryPageClient({ country, nearbyCountries }: CountryPageClientProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortMode, setSortMode] = useState<SortMode>("marketcap");
  const [apiCompanies, setApiCompanies] = useState<Company[]>([]);
  const [, setLoadingCompanies] = useState(true);

  useEffect(() => {
    fetch(`/api/companies?country=${encodeURIComponent(country.name)}&limit=100&sort=name`)
      .then(r => r.json())
      .then(d => {
        if (d.companies) {
          setApiCompanies(d.companies.map((row: Record<string, unknown>) => ({
            slug: row.slug as string,
            name: row.name as string,
            country: row.country as string,
            city: (row.city as string) || '',
            founded: (row.founded as number) || 0,
            stage: (row.stage as string) || 'Pre-clinical',
            type: (row.company_type as string) || 'Private',
            ticker: row.ticker as string || undefined,
            focus: (row.categories as string[]) || [],
            employees: (row.employee_range as string) || '',
            totalRaised: (row.total_raised as number) || 0,
            valuation: row.valuation as number || undefined,
            isEstimated: (row.is_estimated as boolean) || false,
            description: (row.description as string) || '',
            website: (row.domain as string) || (row.website as string) || '',
            logoUrl: row.logo_url as string || undefined,
            trending: row.trending_rank as number || null,
            profileViews: (row.profile_views as number) || 0,
          })));
        }
        setLoadingCompanies(false);
      })
      .catch(() => setLoadingCompanies(false));
  }, [country.name]);

  // Filter companies by country name
  const countryCompanies = useMemo(() => {
    let result = apiCompanies.filter((c) => c.country === country.name);

    // Filter by category
    if (selectedCategory !== "All") {
      result = result.filter((c) =>
        c.focus.some((f) => f.toLowerCase().includes(selectedCategory.toLowerCase()))
      );
    }

    // Sort
    switch (sortMode) {
      case "marketcap":
        result.sort((a, b) => (b.valuation || b.totalRaised) - (a.valuation || a.totalRaised));
        break;
      case "trending":
        result.sort((a, b) => {
          const at = a.trending ?? 999;
          const bt = b.trending ?? 999;
          return at - bt;
        });
        break;
      case "funded":
        result.sort((a, b) => b.totalRaised - a.totalRaised);
        break;
      case "newest":
        result.sort((a, b) => b.founded - a.founded);
        break;
    }

    return result;
  }, [apiCompanies, country.name, selectedCategory, sortMode]);

  const hasCompanies = countryCompanies.length > 0;
  const paywallIndex = Infinity; // paywall disabled

  const sortTabs: { key: SortMode; label: string; emoji: string }[] = [
    { key: "marketcap", label: "Market Cap", emoji: "📈" },
    { key: "trending", label: "Trending", emoji: "🔥" },
    { key: "funded", label: "Most Funded", emoji: "💰" },
    { key: "newest", label: "Newest", emoji: "🆕" },
  ];

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      {/* ═══ HERO SECTION ═══ */}
      <div className="px-5 md:px-8 pt-8 md:pt-12 pb-6 md:pb-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <span style={{ fontSize: 48, lineHeight: 1 }}>{country.flag}</span>
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-[28px] md:text-[36px] font-medium tracking-tight"
                style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px", lineHeight: 1.1 }}
              >
                {country.name}
              </h1>
              <span
                className="inline-flex items-center gap-1.5 text-12 px-3 py-1 rounded-full border"
                style={{
                  borderColor: "var(--color-border-subtle)",
                  color: "var(--color-text-secondary)",
                  borderWidth: "0.5px",
                }}
              >
                <span className="w-[6px] h-[6px] rounded-full" style={{ background: "#22c55e" }} />
                {country.companyCount} companies tracked
              </span>
            </div>
          </div>
        </div>

        <p
          className="text-14 md:text-[16px] mb-5 max-w-2xl"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}
        >
          {country.description}
        </p>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Companies", value: country.companyCount.toLocaleString() },
            { label: "Total Raised", value: country.totalRaised },
            { label: "Top Stage", value: country.topStage },
            { label: "Top Focus", value: country.topFocus },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border px-4 py-3"
              style={{ borderColor: "var(--color-border-subtle)", borderWidth: "0.5px" }}
            >
              <div className="text-11 uppercase tracking-[0.5px] mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                {stat.label}
              </div>
              <div className="text-[18px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Bio Hub Cities */}
        <div className="flex flex-wrap gap-2">
          {country.bioHubs.map((hub) => (
            <span
              key={hub}
              className="text-12 px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-150 hover:border-[var(--color-border-medium)]"
              style={{
                borderColor: "var(--color-border-subtle)",
                color: "var(--color-text-secondary)",
                borderWidth: "0.5px",
              }}
            >
              📍 {hub}
            </span>
          ))}
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="max-w-5xl mx-auto px-5 md:px-8 pb-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column (Main) */}
          <div className="flex-1 min-w-0">
            {/* Category Pills */}
            <div className="mb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              <div className="flex gap-2 pb-1" style={{ minWidth: "max-content" }}>
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat.name;
                  return (
                    <button
                      key={cat.name}
                      onClick={() => setSelectedCategory(cat.name)}
                      className="text-13 px-3 py-1.5 rounded-full border transition-all duration-150 whitespace-nowrap"
                      style={{
                        borderWidth: "0.5px",
                        borderColor: isActive ? "var(--color-accent)" : "var(--color-border-subtle)",
                        background: isActive ? "var(--color-accent-subtle)" : "transparent",
                        color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
                        fontWeight: isActive ? 500 : 400,
                      }}
                    >
                      {cat.emoji} {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sort Tabs */}
            <div
              className="flex gap-0 border-b mb-4"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              {sortTabs.map((tab) => {
                const isActive = sortMode === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setSortMode(tab.key)}
                    className="text-13 px-3 md:px-4 py-2.5 transition-all duration-150 whitespace-nowrap"
                    style={{
                      color: isActive ? "var(--color-accent)" : "var(--color-text-tertiary)",
                      fontWeight: isActive ? 500 : 400,
                      borderBottom: isActive ? "2px solid var(--color-accent)" : "2px solid transparent",
                      marginBottom: "-1px",
                    }}
                  >
                    {tab.emoji} {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Company List */}
            {hasCompanies ? (
              <div className="flex flex-col gap-3">
                {countryCompanies.map((company, index) => {
                  const isLocked = index >= paywallIndex;
                  const sc = stageBadgeColors[company.stage] || stageBadgeColors["Pre-clinical"];
                  return (
                    <div key={company.slug}>
                      <Link
                        href={`/company/${company.slug}`}
                        className="block rounded-lg border px-4 py-3.5 transition-all duration-150 hover:border-[var(--color-border-medium)] hover:shadow-sm"
                        style={{
                          borderColor: "var(--color-border-subtle)",
                          borderWidth: "0.5px",
                          ...(isLocked
                            ? { filter: "blur(3px)", opacity: 0.4, pointerEvents: "none" as const, userSelect: "none" as const }
                            : {}),
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <CompanyAvatar
                            name={company.name}
                            logoUrl={company.logoUrl}
                            website={company.website}
                            size={40}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="text-[15px] font-medium truncate"
                                style={{ color: "var(--color-text-primary)" }}
                              >
                                {company.name}
                              </span>
                              {company.ticker && (
                                <span
                                  className="text-[9px] font-medium px-1 py-[1px] rounded-sm flex-shrink-0"
                                  style={{
                                    background: "var(--color-bg-secondary)",
                                    color: "var(--color-text-tertiary)",
                                    border: "0.5px solid var(--color-border-subtle)",
                                  }}
                                >
                                  {company.ticker}
                                </span>
                              )}
                            </div>
                            <div className="text-12 mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                              {company.city}, {company.country} · Est. {company.founded}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {company.focus.slice(0, 3).map((f) => (
                            <span
                              key={f}
                              className="text-11 px-2 py-[2px] rounded-sm border whitespace-nowrap"
                              style={{
                                background: "var(--color-bg-secondary)",
                                color: "var(--color-text-secondary)",
                                borderColor: "var(--color-border-subtle)",
                                borderWidth: "0.5px",
                              }}
                            >
                              {focusEmoji[f] || "🧬"} {f}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span
                            className="text-11 px-[8px] py-[3px] rounded-sm border whitespace-nowrap"
                            style={{
                              background: sc.bg,
                              color: sc.text,
                              borderColor: sc.border,
                              borderWidth: "0.5px",
                            }}
                          >
                            {stageEmoji[company.stage] || ""} {company.stage}
                          </span>
                          <span className="text-14 font-medium" style={{ color: "var(--color-accent)" }}>
                            {formatCurrency(company.totalRaised)}
                          </span>
                        </div>
                      </Link>
                    </div>
                  );
                })}

                {/* Paywall CTA */}
                {countryCompanies.length > paywallIndex && (
                  <div
                    className="flex items-center justify-between rounded-lg border px-4 py-3.5"
                    style={{
                      borderColor: "var(--color-accent)",
                      background: "var(--color-accent-subtle)",
                      borderWidth: "0.5px",
                    }}
                  >
                    <div>
                      <div className="text-14 font-medium" style={{ color: "var(--color-text-primary)" }}>
                        Sign up to see all {country.companyCount} companies in {country.name}
                      </div>
                      <div className="text-12" style={{ color: "var(--color-text-secondary)" }}>
                        Full access with advanced filters, watchlists, and alerts.
                      </div>
                    </div>
                    <Link
                      href="/signup"
                      className="flex items-center gap-1.5 text-13 font-medium px-4 py-2 rounded text-white flex-shrink-0"
                      style={{ background: "var(--color-accent)" }}
                    >
                      Sign up free <ArrowRight size={13} />
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              /* ═══ EMPTY STATE (no seed data for this country) ═══ */
              <div
                className="rounded-lg border px-6 py-8 text-center"
                style={{ borderColor: "var(--color-border-subtle)", borderWidth: "0.5px" }}
              >
                <div className="text-[48px] mb-3">{country.flag}</div>
                <h2
                  className="text-[20px] font-medium mb-2"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  Coming soon
                </h2>
                <p className="text-14 mb-5 max-w-md mx-auto" style={{ color: "var(--color-text-secondary)" }}>
                  We&apos;re tracking {country.companyCount} companies in {country.name} — data is being loaded.
                </p>
                <div className="text-13 mb-2" style={{ color: "var(--color-text-secondary)" }}>
                  Want early access?
                </div>
                <div className="flex items-center justify-center gap-2 max-w-sm mx-auto">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="flex-1 text-14 px-3 py-2 rounded-lg border outline-none transition-all duration-200 focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(26,122,94,0.1)]"
                    style={{
                      borderColor: "var(--color-border-medium)",
                      background: "var(--color-bg-primary)",
                      color: "var(--color-text-primary)",
                      borderWidth: "0.5px",
                    }}
                  />
                  <button
                    className="text-13 font-medium px-4 py-2 rounded-lg text-white flex-shrink-0"
                    style={{ background: "var(--color-accent)" }}
                  >
                    Notify me
                  </button>
                </div>
              </div>
            )}

            {/* ═══ NEARBY COUNTRIES (mobile — shown below content) ═══ */}
            <div className="mt-6 lg:hidden">
              <h2
                className="text-12 uppercase tracking-[0.5px] font-medium mb-3"
                style={{ color: "var(--color-text-secondary)" }}
              >
                🌍 Nearby countries
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {nearbyCountries.slice(0, 6).map((nc) => (
                  <Link
                    key={nc.slug}
                    href={`/companies/${nc.slug}`}
                    className="rounded-lg border px-3 py-2.5 transition-all duration-150 hover:border-[var(--color-border-medium)] hover:shadow-sm"
                    style={{ borderColor: "var(--color-border-subtle)", borderWidth: "0.5px" }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[20px]">{nc.flag}</span>
                      <div>
                        <div className="text-13 font-medium" style={{ color: "var(--color-text-primary)" }}>
                          {nc.name}
                        </div>
                        <div className="text-11" style={{ color: "var(--color-text-tertiary)" }}>
                          {nc.companyCount} companies
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* ═══ CLAIM CTA ═══ */}
            <div
              className="rounded-xl px-6 py-6 mt-6 md:flex md:items-center md:justify-between"
              style={{ background: "var(--color-accent-dark, #064e3b)", color: "white" }}
            >
              <div className="mb-4 md:mb-0">
                <div className="text-[18px] font-medium mb-1">
                  Are you a {country.name} biotech?
                </div>
                <div className="text-14" style={{ color: "#34d399" }}>
                  Claim your profile for free — control your company page, post updates, and connect with investors.
                </div>
              </div>
              <Link
                href="/claim/oncoinvent"
                className="inline-flex items-center gap-2 text-14 font-medium px-5 py-2.5 rounded-lg flex-shrink-0"
                style={{ background: "var(--color-bg-primary)", color: "var(--color-accent-dark, #064e3b)" }}
              >
                <Shield size={14} />
                Claim your profile
              </Link>
            </div>
          </div>

          {/* ═══ RIGHT SIDEBAR (desktop) ═══ */}
          <div className="hidden lg:block w-[260px] flex-shrink-0">
            {/* Nearby Countries */}
            <div
              className="rounded-lg border overflow-hidden mb-3"
              style={{ borderColor: "var(--color-border-subtle)", borderWidth: "0.5px" }}
            >
              <div className="px-3.5 py-2.5 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                <span
                  className="text-12 uppercase tracking-[0.5px] font-medium"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  🌍 Nearby countries
                </span>
              </div>
              {nearbyCountries.slice(0, 6).map((nc) => (
                <Link
                  key={nc.slug}
                  href={`/companies/${nc.slug}`}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 border-b transition-colors duration-100 hover:bg-[var(--color-bg-secondary)]"
                  style={{ borderColor: "var(--color-border-subtle)" }}
                >
                  <span className="text-[18px]">{nc.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-13 font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {nc.name}
                    </div>
                    <div className="text-11" style={{ color: "var(--color-text-tertiary)" }}>
                      {nc.companyCount} companies
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Recently Funded */}
            <div
              className="rounded-lg border overflow-hidden mb-3"
              style={{ borderColor: "var(--color-border-subtle)", borderWidth: "0.5px" }}
            >
              <RecentlyFunded funding={funding} companies={apiCompanies} />
            </div>

            {/* Paywall Card */}
            <PaywallCard />
          </div>
        </div>
      </div>

      {/* Mobile sidebar content */}
      <div className="lg:hidden max-w-5xl mx-auto px-5 md:px-8 pb-8">
        <div
          className="rounded-lg border overflow-hidden mb-3"
          style={{ borderColor: "var(--color-border-subtle)", borderWidth: "0.5px" }}
        >
          <RecentlyFunded funding={funding} companies={apiCompanies} />
        </div>
        <PaywallCard />
      </div>

      <Footer />
    </div>
  );
}
