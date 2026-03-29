"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { RecentlyFunded } from "@/components/RecentlyFunded";
import { PaywallCard } from "@/components/PaywallCard";
import { Company, FundingRound } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";
import { Search, ArrowRight, Shield, ChevronRight } from "lucide-react";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { dbRowsToCompanies } from "@/lib/adapters";

import fundingData from "@/data/funding.json";

const funding = fundingData as FundingRound[];

const stageBadgeColors: Record<string, { bg: string; text: string; border: string }> = {
  Approved: { bg: "#e8f5f0", text: "#0a3d2e", border: "#5DCAA5" },
  "Phase 3": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 2": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 1/2": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Phase 1": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Pre-clinical": { bg: "var(--color-bg-secondary)", text: "var(--color-text-secondary)", border: "var(--color-border-medium)" },
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
  "Gene Therapy": "🧬", "Cell Therapy": "🦠", "Small Molecule": "💊",
};

// Therapeutic categories for the browse section
const categories = [
  // Therapeutics
  { name: "Oncology", emoji: "🎯", color: "#fff0f0" },
  { name: "Immunotherapy", emoji: "🛡️", color: "#f5f3ff" },
  { name: "Gene Therapy", emoji: "🧬", color: "#eff6ff" },
  { name: "Cell Therapy", emoji: "🦠", color: "#f5f3ff" },
  { name: "Vaccines", emoji: "💉", color: "#e8f5f0" },
  { name: "Small Molecule", emoji: "💊", color: "#fff0f0" },
  { name: "Biologics", emoji: "🧪", color: "#eff6ff" },
  { name: "Biosimilars", emoji: "🔄", color: "var(--color-bg-secondary)" },
  { name: "Radiopharmaceuticals", emoji: "☢️", color: "#fef3e2" },
  // Technology
  { name: "AI / Digital Health", emoji: "🤖", color: "#e8f5f0" },
  { name: "Diagnostics", emoji: "🔬", color: "#e8f5f0" },
  { name: "Drug Delivery", emoji: "💉", color: "#fef3e2" },
  { name: "Nanotechnology", emoji: "🔮", color: "#f5f3ff" },
  { name: "Microbiome", emoji: "🦠", color: "#e8f5f0" },
  { name: "Genetics & Genomics", emoji: "🧬", color: "#eff6ff" },
  // Services & Other
  { name: "Contract Manufacturing", emoji: "🏭", color: "var(--color-bg-secondary)" },
  { name: "Contract Research", emoji: "📋", color: "var(--color-bg-secondary)" },
  { name: "Medical Devices", emoji: "🩺", color: "#eff6ff" },
  { name: "Tissue Engineering", emoji: "🫀", color: "#fff0f0" },
];

// Regions for the world map section
const regions = [
  { name: "Nordics", flag: "🇪🇺", countries: [
    { label: "🇳🇴 Norway", slug: "norway" }, { label: "🇸🇪 Sweden", slug: "sweden" },
    { label: "🇩🇰 Denmark", slug: "denmark" }, { label: "🇫🇮 Finland", slug: "finland" },
  ], featured: true },
  { name: "United Kingdom", flag: "🇬🇧", countries: [
    { label: "🇬🇧 England", slug: "united-kingdom" }, { label: "🇬🇧 Scotland", slug: "united-kingdom" },
    { label: "🇬🇧 Wales", slug: "united-kingdom" },
  ] },
  { name: "Germany & DACH", flag: "🇩🇪", countries: [
    { label: "🇩🇪 Germany", slug: "germany" }, { label: "🇨🇭 Switzerland", slug: "switzerland" },
    { label: "🇦🇹 Austria", slug: "austria" },
  ] },
  { name: "France & Benelux", flag: "🇫🇷", countries: [
    { label: "🇫🇷 France", slug: "france" }, { label: "🇧🇪 Belgium", slug: "belgium" },
    { label: "🇳🇱 Netherlands", slug: "netherlands" },
  ] },
  { name: "United States", flag: "🇺🇸", countries: [
    { label: "Boston/Cambridge", slug: "united-states" }, { label: "San Francisco", slug: "united-states" },
    { label: "San Diego", slug: "united-states" }, { label: "New York", slug: "united-states" },
  ] },
  { name: "Asia Pacific", flag: "🌏", countries: [
    { label: "🇯🇵 Japan", slug: "japan" }, { label: "🇰🇷 South Korea", slug: "south-korea" },
    { label: "🇨🇳 China", slug: "china" }, { label: "🇦🇺 Australia", slug: "australia" },
  ] },
];

export function CompaniesPageClient() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [totalCount, setTotalCount] = useState(10632);

  // Fetch companies from API
  useEffect(() => {
    fetch("/api/companies?limit=50&sort=name")
      .then((r) => r.json())
      .then((d) => {
        if (d.companies) setCompanies(dbRowsToCompanies(d.companies));
        if (d.total) setTotalCount(d.total);
      })
      .catch(() => {});
  }, []);

  // Filter companies based on search and category
  const filtered = useMemo(() => {
    let result = [...companies];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.focus.some((f) => f.toLowerCase().includes(q)) ||
        c.city.toLowerCase().includes(q)
      );
    }
    if (selectedCategory) {
      result = result.filter((c) => c.focus.some((f) => f.toLowerCase().includes(selectedCategory.toLowerCase())));
    }
    return result;
  }, [search, selectedCategory]);

  const showResults = search.length > 0 || selectedCategory;

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      {/* ═══ HERO + SEARCH ═══ */}
      <div className="px-5 md:px-8 pt-8 md:pt-12 pb-6 md:pb-8 text-center max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-12 px-3 py-1 rounded-full border" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)", borderWidth: "0.5px" }}>
            <span className="w-[6px] h-[6px] rounded-full" style={{ background: "#22c55e" }} />
            {totalCount.toLocaleString()} companies tracked
          </span>
        </div>
        <h1 className="text-[28px] md:text-[42px] font-medium tracking-tight mb-2" style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
          Find any biotech company in the world
        </h1>
        <p className="text-14 md:text-[16px] mb-6" style={{ color: "var(--color-text-secondary)" }}>
          Search {totalCount.toLocaleString()}+ companies across 30+ countries by name, therapeutic area, or location.
        </p>

        {/* ═══ SEARCH BAR (central) ═══ */}
        <div className="relative max-w-xl mx-auto">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-tertiary)" }} />
          <input
            type="text"
            placeholder="Search by company name, therapeutic area, or city..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedCategory(null); }}
            className="w-full text-[16px] pl-11 pr-4 py-3.5 rounded-xl border outline-none transition-all duration-200 focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(26,122,94,0.1)]"
            style={{ borderColor: "var(--color-border-medium)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)", borderWidth: "0.5px" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-12" style={{ color: "var(--color-text-tertiary)" }}>
              Clear
            </button>
          )}
        </div>

        {/* ═══ CLAIM CTA ═══ */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <Shield size={14} style={{ color: "var(--color-accent)" }} />
          <Link href="/claim/oncoinvent" className="text-13 font-medium" style={{ color: "var(--color-accent)" }}>
            Is your company listed? Is your company listed? Claim your profile →
          </Link>
        </div>
      </div>

      {/* ═══ SEARCH RESULTS (shown when searching) ═══ */}
      {showResults && (
        <div className="max-w-5xl mx-auto px-5 md:px-8 pb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-13" style={{ color: "var(--color-text-tertiary)" }}>
              {filtered.length} {filtered.length === 1 ? "company" : "companies"} found
              {selectedCategory && <> in <strong style={{ color: "var(--color-text-primary)" }}>{selectedCategory}</strong></>}
            </span>
            {selectedCategory && (
              <button onClick={() => setSelectedCategory(null)} className="text-12" style={{ color: "var(--color-accent)" }}>
                Clear filter ×
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.slice(0, 6).map((company) => {
              const sc = stageBadgeColors[company.stage] || stageBadgeColors["Pre-clinical"];
              return (
                <Link
                  key={company.slug}
                  href={`/company/${company.slug}`}
                  className="block rounded-lg border px-4 py-3.5 transition-all duration-150 hover:border-[var(--color-border-medium)] hover:shadow-sm"
                  style={{ borderColor: "var(--color-border-subtle)", borderWidth: "0.5px" }}
                >
                  <div className="flex items-start gap-3">
                    <CompanyAvatar name={company.name} logoUrl={company.logoUrl} website={company.website} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[15px] font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{company.name}</span>
                        {company.ticker && (
                          <span className="text-[9px] font-medium px-1 py-[1px] rounded-sm flex-shrink-0" style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-tertiary)", border: "0.5px solid var(--color-border-subtle)" }}>
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
                    {company.focus.slice(0, 2).map((f) => (
                      <span key={f} className="text-11 px-2 py-[2px] rounded-sm border whitespace-nowrap" style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)", borderColor: "var(--color-border-subtle)", borderWidth: "0.5px" }}>
                        {focusEmoji[f] || "🧬"} {f}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-11 px-[8px] py-[3px] rounded-sm border whitespace-nowrap" style={{ background: sc.bg, color: sc.text, borderColor: sc.border, borderWidth: "0.5px" }}>
                      {stageEmoji[company.stage] || ""} {company.stage}
                    </span>
                    <span className="text-14 font-medium" style={{ color: "var(--color-accent)" }}>{formatCurrency(company.totalRaised)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
          {filtered.length > 6 && (
            <div className="flex items-center justify-between rounded-lg border px-4 py-3.5 mt-4" style={{ borderColor: "var(--color-accent)", background: "var(--color-accent-subtle)", borderWidth: "0.5px" }}>
              <div>
                <div className="text-14 font-medium" style={{ color: "var(--color-text-primary)" }}>Sign up to see all {filtered.length} results</div>
                <div className="text-12" style={{ color: "var(--color-text-secondary)" }}>Full access with advanced filters, watchlists, and alerts.</div>
              </div>
              <Link href="/signup" className="flex items-center gap-1.5 text-13 font-medium px-4 py-2 rounded text-white flex-shrink-0" style={{ background: "var(--color-accent)" }}>
                Sign up free <ArrowRight size={13} />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ═══ BROWSE BY CATEGORY (shown when NOT searching) ═══ */}
      {!showResults && (
        <div className="max-w-5xl mx-auto px-5 md:px-8 pb-8">
          {/* Section: Categories */}
          <div className="mb-10">
            <h2 className="text-12 uppercase tracking-[0.5px] font-medium mb-4" style={{ color: "var(--color-text-secondary)" }}>
              🧬 Browse by therapeutic area
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className="flex items-start gap-3 rounded-lg border px-4 py-3.5 text-left transition-all duration-150 hover:border-[var(--color-border-medium)] hover:shadow-sm"
                  style={{ borderColor: "var(--color-border-subtle)", borderWidth: "0.5px" }}
                >
                  <span className="text-[24px] mt-0.5">{cat.emoji}</span>
                  <div>
                    <div className="text-14 font-medium" style={{ color: "var(--color-text-primary)" }}>{cat.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Regions */}
          <div className="mb-10">
            <h2 className="text-12 uppercase tracking-[0.5px] font-medium mb-4" style={{ color: "var(--color-text-secondary)" }}>
              🌍 Browse by region
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {regions.map((region) => (
                <div
                  key={region.name}
                  className="rounded-lg border px-4 py-4 transition-all duration-150 hover:border-[var(--color-border-medium)] hover:shadow-sm"
                  style={{
                    borderColor: region.featured ? "var(--color-accent)" : "var(--color-border-subtle)",
                    borderWidth: "0.5px",
                    background: region.featured ? "#f0faf6" : "transparent",
                  }}
                >
                  <Link href={`/companies/${region.countries[0].slug}`} className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[22px]">{region.flag}</span>
                      <div>
                        <div className="text-[15px] font-medium" style={{ color: "var(--color-text-primary)" }}>{region.name}</div>
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: "var(--color-text-tertiary)" }} />
                  </Link>
                  <div className="flex flex-wrap gap-1.5">
                    {region.countries.map((c) => (
                      <Link key={c.label} href={`/companies/${c.slug}`} className="text-11 px-2 py-[2px] rounded-sm hover:bg-[var(--color-bg-tertiary)] transition-colors" style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-tertiary)" }}>
                        {c.label}
                      </Link>
                    ))}
                  </div>
                  {region.featured && (
                    <div className="text-[10px] font-medium mt-2 px-2 py-[2px] rounded-sm inline-block" style={{ background: "var(--color-accent)", color: "white" }}>
                      Featured region
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="text-center mt-3">
              <span className="text-13" style={{ color: "var(--color-text-tertiary)" }}>
                25 countries covered · <Link href="/companies/united-states" className="font-medium" style={{ color: "var(--color-accent)" }}>Browse all →</Link>
              </span>
            </div>
          </div>

          {/* Section: Browse by Stage */}
          <div className="mb-10">
            <h2 className="text-12 uppercase tracking-[0.5px] font-medium mb-4" style={{ color: "var(--color-text-secondary)" }}>
              📊 Browse by development stage
            </h2>
            <div className="flex flex-wrap gap-2">
              {["Pre-clinical", "Phase 1", "Phase 1/2", "Phase 2", "Phase 3", "Approved"].map((stage) => {
                const sc = stageBadgeColors[stage] || stageBadgeColors["Pre-clinical"];
                return (
                  <button
                    key={stage}
                    className="flex items-center gap-2 rounded-lg border px-4 py-2.5 transition-all duration-150 hover:border-[var(--color-border-medium)] hover:shadow-sm"
                    style={{ borderColor: sc.border, borderWidth: "0.5px", background: sc.bg }}
                  >
                    <span className="text-13 font-medium" style={{ color: sc.text }}>
                      {stageEmoji[stage]} {stage}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Recently Added Companies */}
          <div className="mb-8">
            <h2 className="text-12 uppercase tracking-[0.5px] font-medium mb-4" style={{ color: "var(--color-text-secondary)" }}>
              ✨ Recently added
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {companies.sort((a, b) => b.founded - a.founded).slice(0, 3).map((company) => {
                const sc = stageBadgeColors[company.stage] || stageBadgeColors["Pre-clinical"];
                return (
                  <Link
                    key={company.slug}
                    href={`/company/${company.slug}`}
                    className="block rounded-lg border px-4 py-3.5 transition-all duration-150 hover:border-[var(--color-border-medium)] hover:shadow-sm"
                    style={{ borderColor: "var(--color-border-subtle)", borderWidth: "0.5px" }}
                  >
                    <div className="flex items-start gap-3">
                      <CompanyAvatar name={company.name} logoUrl={company.logoUrl} website={company.website} size={40} />
                      <div className="flex-1 min-w-0">
                        <span className="text-[15px] font-medium" style={{ color: "var(--color-text-primary)" }}>{company.name}</span>
                        <div className="text-12 mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>{company.city}, {company.country} · Est. {company.founded}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-11 px-[8px] py-[3px] rounded-sm border whitespace-nowrap" style={{ background: sc.bg, color: sc.text, borderColor: sc.border, borderWidth: "0.5px" }}>
                        {stageEmoji[company.stage] || ""} {company.stage}
                      </span>
                      <span className="text-14 font-medium" style={{ color: "var(--color-accent)" }}>{formatCurrency(company.totalRaised)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Claim CTA Card */}
          <div
            className="rounded-xl px-6 py-6 md:flex md:items-center md:justify-between"
            style={{ background: "var(--color-accent-dark, #0a3d2e)", color: "white" }}
          >
            <div className="mb-4 md:mb-0">
              <div className="text-[20px] font-medium mb-1">Is your company on BiotechTube?</div>
              <div className="text-14" style={{ color: "#5DCAA5" }}>
                Claim your profile to control your company page, post updates, and connect with investors — completely free.
              </div>
            </div>
            <Link
              href="/claim/oncoinvent"
              className="inline-flex items-center gap-2 text-14 font-medium px-5 py-2.5 rounded-lg flex-shrink-0"
              style={{ background: "var(--color-bg-primary)", color: "var(--color-accent-dark, #0a3d2e)" }}
            >
              <Shield size={14} />
              Claim your profile
            </Link>
          </div>
        </div>
      )}

      {/* Sidebar section (for search results) */}
      {showResults && (
        <div className="max-w-5xl mx-auto px-5 md:px-8 pb-8 flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-[260px] flex-shrink-0">
            <RecentlyFunded funding={funding} companies={companies} />
            <div className="mt-3">
              <PaywallCard />
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
