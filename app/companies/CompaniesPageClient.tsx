"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { RecentlyFunded } from "@/components/RecentlyFunded";
import { PaywallCard } from "@/components/PaywallCard";
import { FiltersModal, Filters, defaultFilters } from "@/components/FiltersModal";
import { Company, FundingRound } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";
import { SlidersHorizontal, ArrowRight, ChevronDown, Globe, TrendingUp, DollarSign, FlaskConical, ArrowDownAZ } from "lucide-react";
import { CompanyAvatar } from "@/components/CompanyAvatar";

import companiesData from "@/data/companies.json";
import fundingData from "@/data/funding.json";

const companies = companiesData as Company[];
const funding = fundingData as FundingRound[];

const stageBadgeColors: Record<string, { bg: string; text: string; border: string }> = {
  Approved: { bg: "#e8f5f0", text: "#0a3d2e", border: "#5DCAA5" },
  "Phase 3": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 2": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 1/2": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Phase 1": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Pre-clinical": { bg: "#f7f7f6", text: "#6b6b65", border: "rgba(0,0,0,0.14)" },
};

const stageEmoji: Record<string, string> = {
  "Pre-clinical": "🔬", "Phase 1": "1️⃣", "Phase 1/2": "🔄",
  "Phase 2": "2️⃣", "Phase 3": "3️⃣", Approved: "✅",
};

const focusEmoji: Record<string, string> = {
  Oncology: "🎯", Immunotherapy: "🛡️", Diagnostics: "🔬",
  "Drug Delivery": "💉", Radiopharmaceuticals: "☢️", "DNA Vaccine": "🧬",
  Photochemistry: "🧪", "Bladder Cancer": "🎯", "Oncolytic Peptide": "🛡️",
  "Monoclonal Antibodies": "🧬", "AI Diagnostics": "🤖", "TCR Cell Therapy": "🦠",
};

const regionData = [
  { region: "🌍 Global", countries: [{ code: "global", name: "All Countries", flag: "🌍" }] },
  { region: "🇪🇺 Nordics", countries: [
    { code: "NO", name: "Norway", flag: "🇳🇴" }, { code: "SE", name: "Sweden", flag: "🇸🇪" },
    { code: "DK", name: "Denmark", flag: "🇩🇰" }, { code: "FI", name: "Finland", flag: "🇫🇮" },
  ]},
  { region: "🇪🇺 Western Europe", countries: [
    { code: "GB", name: "United Kingdom", flag: "🇬🇧" }, { code: "DE", name: "Germany", flag: "🇩🇪" },
    { code: "FR", name: "France", flag: "🇫🇷" }, { code: "CH", name: "Switzerland", flag: "🇨🇭" },
    { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  ]},
  { region: "🇺🇸 North America", countries: [
    { code: "US", name: "United States", flag: "🇺🇸" }, { code: "CA", name: "Canada", flag: "🇨🇦" },
  ]},
  { region: "🌏 Asia Pacific", countries: [
    { code: "JP", name: "Japan", flag: "🇯🇵" }, { code: "AU", name: "Australia", flag: "🇦🇺" },
    { code: "SG", name: "Singapore", flag: "🇸🇬" },
  ]},
];

const sortTabs = [
  { key: "trending", label: "🔥 Trending", icon: TrendingUp },
  { key: "raised", label: "💰 Most Funded", icon: DollarSign },
  { key: "stage", label: "🧬 By Stage", icon: FlaskConical },
  { key: "name", label: "🔤 A–Z", icon: ArrowDownAZ },
] as const;
type SortKey = (typeof sortTabs)[number]["key"];

export function CompaniesPageClient() {
  const [activeSort, setActiveSort] = useState<SortKey>("trending");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [countryOpen, setCountryOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(regionData[0].countries[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setCountryOpen(false);
    }
    if (countryOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [countryOpen]);

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value !== "" && value !== "All" && value !== defaultFilters[key as keyof Filters]
  ).length;

  const filtered = useMemo(() => {
    let result = [...companies];

    if (selectedCountry.code !== "global") {
      result = result.filter((c) => c.country === selectedCountry.name);
    }
    if (filters.therapeuticArea !== "All") result = result.filter((c) => c.focus.includes(filters.therapeuticArea));
    if (filters.stage !== "All") result = result.filter((c) => c.stage === filters.stage);
    if (filters.country !== "All") result = result.filter((c) => c.country === filters.country);
    if (filters.type !== "All") result = result.filter((c) => c.type === filters.type);
    if (filters.raisedMin) { const min = parseFloat(filters.raisedMin) * 1e6; if (!isNaN(min)) result = result.filter((c) => c.totalRaised >= min); }
    if (filters.raisedMax) { const max = parseFloat(filters.raisedMax) * 1e6; if (!isNaN(max)) result = result.filter((c) => c.totalRaised <= max); }

    // Sort
    if (activeSort === "trending") result.sort((a, b) => (a.trending ?? 999) - (b.trending ?? 999));
    else if (activeSort === "raised") result.sort((a, b) => b.totalRaised - a.totalRaised);
    else if (activeSort === "stage") {
      const order = ["Approved", "Phase 3", "Phase 2", "Phase 1/2", "Phase 1", "Pre-clinical"];
      result.sort((a, b) => order.indexOf(a.stage) - order.indexOf(b.stage));
    } else if (activeSort === "name") result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [filters, selectedCountry, activeSort]);

  const visibleCompanies = filtered.slice(0, 5);
  const blurredCompanies = filtered.slice(5, 8);

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      {/* Page Header */}
      <div className="px-5 md:px-8 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-12 uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-accent)" }}>
            Directory
          </span>
          <span
            className="inline-flex items-center gap-1.5 text-11 px-2 py-[2px] rounded-full border"
            style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)", borderWidth: "0.5px" }}
          >
            <span className="w-[6px] h-[6px] rounded-full" style={{ background: "#22c55e" }} />
            14,000+ companies
          </span>
        </div>
        <h1 className="text-[28px] md:text-[36px] font-medium tracking-tight" style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}>
          Global Biotech Directory
        </h1>
        <p className="text-14 mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Explore biotech companies across 58 countries — filter by stage, focus, and funding.
        </p>
      </div>

      {/* Sort Tabs + Country + Filters */}
      <div className="flex items-center justify-between px-5 md:px-8 pt-2 pb-0" style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}>
        <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {sortTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSort(tab.key)}
              className="text-13 py-2.5 px-2.5 transition-all duration-200 border-b-[1.5px] whitespace-nowrap"
              style={{
                color: activeSort === tab.key ? "var(--color-accent)" : "var(--color-text-secondary)",
                borderBottomColor: activeSort === tab.key ? "var(--color-accent)" : "transparent",
                fontWeight: activeSort === tab.key ? 500 : 400,
                ...(activeSort === tab.key ? { background: "var(--color-bg-secondary)", borderTopLeftRadius: 4, borderTopRightRadius: 4 } : {}),
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {/* Country Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setCountryOpen(!countryOpen)}
              className="flex items-center gap-1.5 text-13 font-medium px-2.5 py-1.5 rounded border transition-colors duration-150"
              style={{
                borderColor: selectedCountry.code !== "global" ? "var(--color-accent)" : "var(--color-border-medium)",
                color: selectedCountry.code !== "global" ? "var(--color-accent)" : "var(--color-text-secondary)",
                background: selectedCountry.code !== "global" ? "#e8f5f0" : "transparent",
              }}
            >
              <Globe size={12} />
              <span className="hidden sm:inline">{selectedCountry.flag} {selectedCountry.code === "global" ? "Global" : selectedCountry.name}</span>
              <span className="sm:hidden">{selectedCountry.flag}</span>
              <ChevronDown size={10} style={{ opacity: 0.5 }} />
            </button>

            {countryOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-50 rounded-lg overflow-hidden"
                style={{ background: "var(--color-bg-primary)", border: "0.5px solid var(--color-border-medium)", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", width: 280, maxHeight: 420, overflowY: "auto" }}
              >
                <div className="px-3 py-2.5 sticky top-0 z-10" style={{ background: "var(--color-bg-primary)", borderBottom: "0.5px solid var(--color-border-subtle)" }}>
                  <div className="text-12 font-medium" style={{ color: "var(--color-text-primary)" }}>Select Region</div>
                  <div className="text-11" style={{ color: "var(--color-text-tertiary)" }}>Filter by country</div>
                </div>
                {regionData.map((group) => (
                  <div key={group.region}>
                    <div className="px-3 py-1.5 text-11 font-medium uppercase tracking-[0.5px]" style={{ color: "var(--color-text-tertiary)", background: "var(--color-bg-tertiary)" }}>
                      {group.region}
                    </div>
                    {group.countries.map((c) => {
                      const isSel = selectedCountry.code === c.code;
                      return (
                        <button
                          key={c.code}
                          onClick={() => { setSelectedCountry(c); setCountryOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100"
                          style={{ background: isSel ? "#e8f5f0" : "transparent", color: isSel ? "var(--color-accent)" : "var(--color-text-primary)" }}
                          onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "var(--color-bg-secondary)"; }}
                          onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = ""; }}
                        >
                          <span className="text-[16px] leading-none">{c.flag}</span>
                          <span className="text-13 font-medium">{c.name}</span>
                          {isSel && <span className="ml-auto text-11" style={{ color: "var(--color-accent)" }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                ))}
                <div className="px-3 py-2 text-11" style={{ color: "var(--color-text-tertiary)", borderTop: "0.5px solid var(--color-border-subtle)", background: "var(--color-bg-tertiary)" }}>
                  🌐 More countries coming soon
                </div>
              </div>
            )}
          </div>

          {/* Filters Button */}
          <button
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-1.5 text-13 font-medium px-2.5 py-1.5 rounded border transition-colors duration-150"
            style={{
              borderColor: activeFilterCount > 0 ? "var(--color-accent)" : "var(--color-border-medium)",
              color: activeFilterCount > 0 ? "var(--color-accent)" : "var(--color-text-secondary)",
              background: activeFilterCount > 0 ? "#e8f5f0" : "transparent",
            }}
          >
            <SlidersHorizontal size={12} />
            Filters
            {activeFilterCount > 0 && (
              <span className="text-[9px] font-medium px-1.5 py-[1px] rounded-full text-white" style={{ background: "var(--color-accent)" }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-col lg:grid" style={{ gridTemplateColumns: "1fr 260px" }}>
        {/* Main Content */}
        <div className="px-5 md:px-8 py-4 min-w-0 lg:border-r" style={{ borderColor: "var(--color-border-subtle)" }}>
          {/* Results count */}
          <div className="text-12 mb-3" style={{ color: "var(--color-text-tertiary)" }}>
            Showing {Math.min(filtered.length, 5)} of {filtered.length} companies
          </div>

          {/* Company Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleCompanies.map((company) => {
              const sc = stageBadgeColors[company.stage] || stageBadgeColors["Pre-clinical"];
              return (
                <Link
                  key={company.slug}
                  href={`/company/${company.slug}`}
                  className="block rounded-lg border px-4 py-3.5 transition-all duration-150 hover:border-[var(--color-border-medium)] hover:shadow-sm"
                  style={{ borderColor: "var(--color-border-subtle)", borderWidth: "0.5px" }}
                >
                  <div className="flex items-start gap-3">
                    <CompanyAvatar name={company.name} logoUrl={company.logoUrl} website={company.website} size={44} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[15px] font-medium" style={{ color: "var(--color-text-primary)" }}>{company.name}</span>
                        {company.ticker && (
                          <span className="text-[9px] font-medium px-1 py-[1px] rounded-sm" style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-tertiary)", border: "0.5px solid var(--color-border-subtle)" }}>
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
                    {company.focus.map((f) => (
                      <span
                        key={f}
                        className="text-11 px-2 py-[2px] rounded-sm border whitespace-nowrap"
                        style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)", borderColor: "var(--color-border-subtle)", borderWidth: "0.5px" }}
                      >
                        {focusEmoji[f] || "🧬"} {f}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span
                      className="text-11 px-[8px] py-[3px] rounded-sm border whitespace-nowrap"
                      style={{ background: sc.bg, color: sc.text, borderColor: sc.border, borderWidth: "0.5px" }}
                    >
                      {stageEmoji[company.stage] || ""} {company.stage}
                    </span>
                    <span className="text-14 font-medium" style={{ color: "var(--color-accent)" }}>
                      {formatCurrency(company.totalRaised)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Paywall Prompt */}
          {filtered.length > 5 && (
            <>
              <div
                className="flex items-center justify-between rounded-lg border px-4 py-3.5 my-4"
                style={{ borderColor: "var(--color-accent)", background: "#e8f5f0", borderWidth: "0.5px" }}
              >
                <div>
                  <div className="text-14 font-medium" style={{ color: "var(--color-text-primary)" }}>
                    Sign up to see all 14,000+ companies
                  </div>
                  <div className="text-12" style={{ color: "var(--color-text-secondary)" }}>
                    Full access to the global biotech directory with advanced filters and alerts.
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

              {/* Blurred */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3" style={{ filter: "blur(4px)", opacity: 0.4, pointerEvents: "none" }}>
                {blurredCompanies.map((company) => {
                  const sc = stageBadgeColors[company.stage] || stageBadgeColors["Pre-clinical"];
                  return (
                    <div key={company.slug} className="rounded-lg border px-4 py-3.5" style={{ borderColor: "var(--color-border-subtle)", borderWidth: "0.5px" }}>
                      <div className="flex items-start gap-3">
                        <CompanyAvatar name={company.name} logoUrl={company.logoUrl} website={company.website} size={44} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] font-medium" style={{ color: "var(--color-text-primary)" }}>{company.name}</div>
                          <div className="text-12" style={{ color: "var(--color-text-tertiary)" }}>{company.city}, {company.country}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-11 px-[8px] py-[3px] rounded-sm border" style={{ background: sc.bg, color: sc.text, borderColor: sc.border, borderWidth: "0.5px" }}>
                          {company.stage}
                        </span>
                        <span className="text-14 font-medium" style={{ color: "var(--color-accent)" }}>{formatCurrency(company.totalRaised)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[260px] border-t lg:border-t-0">
          <RecentlyFunded funding={funding} companies={companies} />
          <div className="p-3.5">
            <PaywallCard />
          </div>
        </div>
      </div>

      {/* Filters Modal */}
      <FiltersModal isOpen={filtersOpen} onClose={() => setFiltersOpen(false)} filters={filters} onApply={setFilters} />

      <Footer />
    </div>
  );
}
