"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { SlidersHorizontal, Lock, Star, ChevronDown, Globe } from "lucide-react";
import { RankingTable } from "./RankingTable";
import { FiltersModal, Filters, defaultFilters } from "./FiltersModal";
import { Company, FundingRound } from "@/lib/types";

const homeTabs = [
  { key: "top", label: "📈 Top" },
  { key: "trending", label: "🔥 Trending \u00b7 5" },
  { key: "funded", label: "💰 Funded \u00b7 4" },
  { key: "new", label: "🆕 New \u00b7 12" },
  { key: "watchlist", label: "⭐ Watchlist" },
] as const;
type HomeTab = (typeof homeTabs)[number]["key"];

// Country/Region data with flags and grouping
const regionData = [
  {
    region: "🌍 Global",
    countries: [{ code: "global", name: "All Countries", flag: "🌍" }],
  },
  {
    region: "🇪🇺 Nordics",
    countries: [
      { code: "NO", name: "Norway", flag: "🇳🇴" },
      { code: "SE", name: "Sweden", flag: "🇸🇪" },
      { code: "DK", name: "Denmark", flag: "🇩🇰" },
      { code: "FI", name: "Finland", flag: "🇫🇮" },
      { code: "IS", name: "Iceland", flag: "🇮🇸" },
    ],
  },
  {
    region: "🇪🇺 Western Europe",
    countries: [
      { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
      { code: "DE", name: "Germany", flag: "🇩🇪" },
      { code: "FR", name: "France", flag: "🇫🇷" },
      { code: "CH", name: "Switzerland", flag: "🇨🇭" },
      { code: "NL", name: "Netherlands", flag: "🇳🇱" },
      { code: "BE", name: "Belgium", flag: "🇧🇪" },
      { code: "IE", name: "Ireland", flag: "🇮🇪" },
      { code: "AT", name: "Austria", flag: "🇦🇹" },
    ],
  },
  {
    region: "🇪🇺 Southern Europe",
    countries: [
      { code: "IT", name: "Italy", flag: "🇮🇹" },
      { code: "ES", name: "Spain", flag: "🇪🇸" },
      { code: "PT", name: "Portugal", flag: "🇵🇹" },
      { code: "GR", name: "Greece", flag: "🇬🇷" },
    ],
  },
  {
    region: "🇺🇸 North America",
    countries: [
      { code: "US", name: "United States", flag: "🇺🇸" },
      { code: "CA", name: "Canada", flag: "🇨🇦" },
    ],
  },
  {
    region: "🌏 Asia Pacific",
    countries: [
      { code: "JP", name: "Japan", flag: "🇯🇵" },
      { code: "KR", name: "South Korea", flag: "🇰🇷" },
      { code: "CN", name: "China", flag: "🇨🇳" },
      { code: "AU", name: "Australia", flag: "🇦🇺" },
      { code: "SG", name: "Singapore", flag: "🇸🇬" },
      { code: "IN", name: "India", flag: "🇮🇳" },
    ],
  },
  {
    region: "🌍 Rest of World",
    countries: [
      { code: "IL", name: "Israel", flag: "🇮🇱" },
      { code: "BR", name: "Brazil", flag: "🇧🇷" },
      { code: "ZA", name: "South Africa", flag: "🇿🇦" },
    ],
  },
];

interface HomePageClientProps {
  companies: Company[];
  funding: FundingRound[];
}

export function HomePageClient({ companies, funding }: HomePageClientProps) {
  const [activeTab, setActiveTab] = useState<HomeTab>("top");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [countryOpen, setCountryOpen] = useState(false);
  const [mobileTabOpen, setMobileTabOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; name: string; flag: string }>({ code: "global", name: "All Countries", flag: "🌍" });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tabSheetRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setCountryOpen(false);
      if (tabSheetRef.current && !tabSheetRef.current.contains(e.target as Node)) setMobileTabOpen(false);
    }
    if (countryOpen || mobileTabOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [countryOpen, mobileTabOpen]);

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value !== "" && value !== "All" && value !== defaultFilters[key as keyof Filters]
  ).length;

  // Apply filters
  const filteredCompanies = useMemo(() => {
    let result = [...companies];

    // Country filter from dropdown
    if (selectedCountry.code !== "global") {
      result = result.filter((c) => c.country === selectedCountry.name);
    }

    if (filters.therapeuticArea !== "All") {
      result = result.filter((c) => c.focus.includes(filters.therapeuticArea));
    }
    if (filters.stage !== "All") {
      result = result.filter((c) => c.stage === filters.stage);
    }
    if (filters.country !== "All") {
      result = result.filter((c) => c.country === filters.country);
    }
    if (filters.type !== "All") {
      result = result.filter((c) => c.type === filters.type);
    }
    if (filters.raisedMin) {
      const min = parseFloat(filters.raisedMin) * 1_000_000;
      if (!isNaN(min)) result = result.filter((c) => c.totalRaised >= min);
    }
    if (filters.raisedMax) {
      const max = parseFloat(filters.raisedMax) * 1_000_000;
      if (!isNaN(max)) result = result.filter((c) => c.totalRaised <= max);
    }
    if (filters.foundedMin) {
      const min = parseInt(filters.foundedMin);
      if (!isNaN(min)) result = result.filter((c) => c.founded >= min);
    }
    if (filters.foundedMax) {
      const max = parseInt(filters.foundedMax);
      if (!isNaN(max)) result = result.filter((c) => c.founded <= max);
    }

    return result;
  }, [companies, filters, selectedCountry]);

  // Apply tab sorting
  const sortedCompanies = useMemo(() => {
    const arr = [...filteredCompanies];
    switch (activeTab) {
      case "top":
        return arr;
      case "trending":
        return arr.sort((a, b) => (a.trending || 99) - (b.trending || 99));
      case "funded": {
        const fundedSlugs = funding.map((f) => f.companySlug);
        return arr.sort((a, b) => {
          const aIdx = fundedSlugs.indexOf(a.slug);
          const bIdx = fundedSlugs.indexOf(b.slug);
          if (aIdx === -1 && bIdx === -1) return b.totalRaised - a.totalRaised;
          if (aIdx === -1) return 1;
          if (bIdx === -1) return -1;
          return aIdx - bIdx;
        });
      }
      case "new":
        return arr.sort((a, b) => b.founded - a.founded);
      default:
        return arr;
    }
  }, [filteredCompanies, activeTab, funding]);

  return (
    <>
      {/* Tabs + Country Selector + Filter Bar */}
      <div
        className="flex items-center justify-between px-5 pt-2 pb-0"
        style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}
      >
        {/* Desktop Tabs (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-1 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: "none" }}>
          {homeTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => tab.key !== "watchlist" && setActiveTab(tab.key)}
              className="text-14 py-2.5 px-2 transition-all duration-200 border-b-[1.5px] whitespace-nowrap flex items-center gap-1"
              style={{
                color: activeTab === tab.key ? "var(--color-accent)" : tab.key === "watchlist" ? "var(--color-text-tertiary)" : "var(--color-text-secondary)",
                borderBottomColor: activeTab === tab.key ? "var(--color-accent)" : "transparent",
                fontWeight: activeTab === tab.key ? 500 : 400,
                ...(activeTab === tab.key ? { background: "var(--color-bg-secondary)", borderTopLeftRadius: 4, borderTopRightRadius: 4 } : {}),
              }}
            >
              {tab.key === "watchlist" && <Lock size={10} />}
              {tab.key === "watchlist" && <Star size={10} />}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mobile Tab Selector (visible on mobile only) */}
        <div className="md:hidden relative" ref={tabSheetRef}>
          <button
            onClick={() => setMobileTabOpen(!mobileTabOpen)}
            className="flex items-center gap-2 text-14 font-medium py-2.5 px-1 transition-all duration-200"
            style={{ color: "var(--color-accent)" }}
          >
            {homeTabs.find(t => t.key === activeTab)?.label || "📈 Top"}
            <ChevronDown size={14} style={{ opacity: 0.6 }} />
          </button>

          {mobileTabOpen && (
            <div
              className="absolute left-0 top-full mt-1 z-50 rounded-xl overflow-hidden"
              style={{
                background: "var(--color-bg-primary)",
                border: "0.5px solid var(--color-border-medium)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
                width: 280,
              }}
            >
              <div className="px-3 py-2.5" style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}>
                <div className="text-12 font-medium" style={{ color: "var(--color-text-primary)" }}>Sort companies</div>
                <div className="text-11" style={{ color: "var(--color-text-tertiary)" }}>Choose how to rank the list</div>
              </div>

              {[
                { key: "top" as HomeTab, emoji: "📈", title: "Top Ranked", desc: "Overall ranking by momentum and market position" },
                { key: "trending" as HomeTab, emoji: "🔥", title: "Trending Now", desc: "Most viewed companies this week" },
                { key: "funded" as HomeTab, emoji: "💰", title: "Funding Radar", desc: "Recently funded companies first" },
                { key: "new" as HomeTab, emoji: "🆕", title: "Newest Companies", desc: "Most recently founded first" },
                { key: "watchlist" as HomeTab, emoji: "⭐", title: "My Watchlist", desc: "Companies you're tracking", locked: true },
              ].map((item) => {
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      if (!item.locked) {
                        setActiveTab(item.key);
                        setMobileTabOpen(false);
                      }
                    }}
                    className="w-full flex items-start gap-3 px-3 py-3 text-left transition-colors duration-100"
                    style={{
                      background: isActive ? "#e8f5f0" : "transparent",
                      borderBottom: "0.5px solid var(--color-border-subtle)",
                      opacity: item.locked ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => { if (!isActive && !item.locked) e.currentTarget.style.background = "var(--color-bg-secondary)"; }}
                    onMouseLeave={(e) => { if (!isActive && !item.locked) e.currentTarget.style.background = ""; }}
                  >
                    <span className="text-[20px] leading-none mt-0.5">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-13 font-medium" style={{ color: isActive ? "var(--color-accent)" : "var(--color-text-primary)" }}>
                          {item.title}
                        </span>
                        {item.locked && <Lock size={10} style={{ color: "var(--color-text-tertiary)" }} />}
                        {isActive && <span className="text-11" style={{ color: "var(--color-accent)" }}>✓</span>}
                      </div>
                      <div className="text-11 mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right side: Country dropdown + Filters */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {/* Country/Region Dropdown */}
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

            {/* Dropdown panel */}
            {countryOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-50 rounded-lg overflow-hidden"
                style={{
                  background: "var(--color-bg-primary)",
                  border: "0.5px solid var(--color-border-medium)",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                  width: 280,
                  maxHeight: 420,
                  overflowY: "auto",
                }}
              >
                {/* Dropdown header */}
                <div
                  className="px-3 py-2.5 sticky top-0 z-10"
                  style={{
                    background: "var(--color-bg-primary)",
                    borderBottom: "0.5px solid var(--color-border-subtle)",
                  }}
                >
                  <div className="text-12 font-medium" style={{ color: "var(--color-text-primary)" }}>
                    Select Region
                  </div>
                  <div className="text-11" style={{ color: "var(--color-text-tertiary)" }}>
                    Filter companies by country
                  </div>
                </div>

                {regionData.map((group) => (
                  <div key={group.region}>
                    {/* Region header */}
                    <div
                      className="px-3 py-1.5 text-11 font-medium uppercase tracking-[0.5px]"
                      style={{
                        color: "var(--color-text-tertiary)",
                        background: "var(--color-bg-tertiary)",
                      }}
                    >
                      {group.region}
                    </div>

                    {/* Countries in region */}
                    {group.countries.map((country) => {
                      const isSelected = selectedCountry.code === country.code;
                      return (
                        <button
                          key={country.code}
                          onClick={() => {
                            setSelectedCountry(country);
                            setCountryOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100"
                          style={{
                            background: isSelected ? "#e8f5f0" : "transparent",
                            color: isSelected ? "var(--color-accent)" : "var(--color-text-primary)",
                          }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--color-bg-secondary)"; }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = ""; }}
                        >
                          <span className="text-[16px] leading-none">{country.flag}</span>
                          <span className="text-13 font-medium">{country.name}</span>
                          {isSelected && (
                            <span className="ml-auto text-11" style={{ color: "var(--color-accent)" }}>✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}

                {/* Footer note */}
                <div
                  className="px-3 py-2 text-11"
                  style={{
                    color: "var(--color-text-tertiary)",
                    borderTop: "0.5px solid var(--color-border-subtle)",
                    background: "var(--color-bg-tertiary)",
                  }}
                >
                  🌐 More countries coming soon
                </div>
              </div>
            )}
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-1.5 text-13 font-medium px-2.5 py-1.5 rounded border transition-colors duration-150 flex-shrink-0"
            style={{
              borderColor: activeFilterCount > 0 ? "var(--color-accent)" : "var(--color-border-medium)",
              color: activeFilterCount > 0 ? "var(--color-accent)" : "var(--color-text-secondary)",
              background: activeFilterCount > 0 ? "#e8f5f0" : "transparent",
            }}
          >
            <SlidersHorizontal size={12} />
            Filters
            {activeFilterCount > 0 && (
              <span
                className="text-[9px] font-medium px-1.5 py-[1px] rounded-full text-white"
                style={{ background: "var(--color-accent)" }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Watchlist tab CTA */}
      {activeTab === "watchlist" && (
        <div className="px-5 py-8 text-center">
          <Star size={24} style={{ color: "var(--color-text-tertiary)", margin: "0 auto 8px" }} />
          <h3 className="text-14 font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
            Your Watchlist
          </h3>
          <p className="text-12 mb-3" style={{ color: "var(--color-text-secondary)" }}>
            Track companies, get funding alerts, and monitor pipeline changes.
          </p>
          <Link
            href="/signup"
            className="inline-block text-12 font-medium px-4 py-2 rounded text-white"
            style={{ background: "var(--color-accent)" }}
          >
            Sign up to create your watchlist
          </Link>
        </div>
      )}

      {/* Ranking Table (for all tabs except watchlist) */}
      {activeTab !== "watchlist" && (
        <div className="pt-0 pb-3">
          {sortedCompanies.length > 0 ? (
            <RankingTable companies={sortedCompanies} mode={activeTab} funding={funding} />
          ) : (
            <div className="px-5 py-8 text-center">
              <p className="text-13" style={{ color: "var(--color-text-tertiary)" }}>
                No companies match your filters.
              </p>
              <button
                onClick={() => {
                  setFilters(defaultFilters);
                  setSelectedCountry({ code: "global", name: "All Countries", flag: "🌍" });
                }}
                className="text-12 mt-2"
                style={{ color: "var(--color-accent)" }}
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filters Modal */}
      <FiltersModal
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onApply={setFilters}
      />
    </>
  );
}
