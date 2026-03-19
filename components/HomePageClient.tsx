"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { SlidersHorizontal, Lock, Star } from "lucide-react";
import { RankingTable } from "./RankingTable";
import { FiltersModal, Filters, defaultFilters } from "./FiltersModal";
import { Company, FundingRound } from "@/lib/types";

const homeTabs = [
  { key: "top", label: "Top" },
  { key: "trending", label: "Trending \u00b7 5" },
  { key: "funded", label: "Funded \u00b7 4" },
  { key: "new", label: "New \u00b7 12" },
  { key: "watchlist", label: "Watchlist" },
] as const;
type HomeTab = (typeof homeTabs)[number]["key"];

interface HomePageClientProps {
  companies: Company[];
  funding: FundingRound[];
}

export function HomePageClient({ companies, funding }: HomePageClientProps) {
  const [activeTab, setActiveTab] = useState<HomeTab>("top");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value !== "" && value !== "All" && value !== defaultFilters[key as keyof Filters]
  ).length;

  // Apply filters
  const filteredCompanies = useMemo(() => {
    let result = [...companies];

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
  }, [companies, filters]);

  // Apply tab sorting
  const sortedCompanies = useMemo(() => {
    const arr = [...filteredCompanies];
    switch (activeTab) {
      case "top":
        return arr; // default order from data
      case "trending":
        return arr.sort((a, b) => (a.trending || 99) - (b.trending || 99));
      case "funded":
        // Companies that appear in funding data first, sorted by most recent
        const fundedSlugs = funding.map((f) => f.companySlug);
        return arr.sort((a, b) => {
          const aIdx = fundedSlugs.indexOf(a.slug);
          const bIdx = fundedSlugs.indexOf(b.slug);
          if (aIdx === -1 && bIdx === -1) return b.totalRaised - a.totalRaised;
          if (aIdx === -1) return 1;
          if (bIdx === -1) return -1;
          return aIdx - bIdx;
        });
      case "new":
        return arr.sort((a, b) => b.founded - a.founded);
      default:
        return arr;
    }
  }, [filteredCompanies, activeTab, funding]);

  return (
    <>
      {/* Tabs + Filter Bar */}
      <div
        className="flex items-center justify-between px-5 pt-2 pb-0"
        style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}
      >
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {homeTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => tab.key !== "watchlist" && setActiveTab(tab.key)}
              className="text-12 py-2.5 px-2 transition-all duration-200 border-b-[1.5px] whitespace-nowrap flex items-center gap-1"
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

        {/* Filter Button */}
        <button
          onClick={() => setFiltersOpen(true)}
          className="flex items-center gap-1.5 text-11 font-medium px-2.5 py-1.5 rounded border transition-colors duration-150 flex-shrink-0 ml-2"
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
            <RankingTable companies={sortedCompanies} />
          ) : (
            <div className="px-5 py-8 text-center">
              <p className="text-13" style={{ color: "var(--color-text-tertiary)" }}>
                No companies match your filters.
              </p>
              <button
                onClick={() => setFilters(defaultFilters)}
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
