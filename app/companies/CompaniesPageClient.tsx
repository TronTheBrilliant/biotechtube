"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { RecentlyFunded } from "@/components/RecentlyFunded";
import { PaywallCard } from "@/components/PaywallCard";
import { Company, FundingRound } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";
import { Search, ArrowRight, Shield, ChevronRight } from "lucide-react";
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
  "Gene Therapy": "🧬", "Cell Therapy": "🦠", "Small Molecule": "💊",
};

// Therapeutic categories for the browse section
const categories = [
  { name: "Oncology", emoji: "🎯", count: 4200, color: "#fff0f0" },
  { name: "Immunotherapy", emoji: "🛡️", count: 2800, color: "#f5f3ff" },
  { name: "Gene Therapy", emoji: "🧬", count: 1900, color: "#eff6ff" },
  { name: "Diagnostics", emoji: "🔬", count: 1600, color: "#e8f5f0" },
  { name: "Drug Delivery", emoji: "💉", count: 1200, color: "#fef3e2" },
  { name: "Cell Therapy", emoji: "🦠", count: 980, color: "#f5f3ff" },
  { name: "Radiopharmaceuticals", emoji: "☢️", count: 340, color: "#fef3e2" },
  { name: "AI / Digital Health", emoji: "🤖", count: 780, color: "#e8f5f0" },
];

// Regions for the world map section
const regions = [
  { name: "Nordics", flag: "🇪🇺", countries: ["🇳🇴 Norway", "🇸🇪 Sweden", "🇩🇰 Denmark", "🇫🇮 Finland"], count: 420, featured: true },
  { name: "United Kingdom", flag: "🇬🇧", countries: ["🇬🇧 England", "🇬🇧 Scotland", "🇬🇧 Wales"], count: 1800 },
  { name: "Germany & DACH", flag: "🇩🇪", countries: ["🇩🇪 Germany", "🇨🇭 Switzerland", "🇦🇹 Austria"], count: 1200 },
  { name: "France & Benelux", flag: "🇫🇷", countries: ["🇫🇷 France", "🇧🇪 Belgium", "🇳🇱 Netherlands"], count: 950 },
  { name: "United States", flag: "🇺🇸", countries: ["Boston/Cambridge", "San Francisco", "San Diego", "New York"], count: 4200 },
  { name: "Asia Pacific", flag: "🌏", countries: ["🇯🇵 Japan", "🇰🇷 South Korea", "🇨🇳 China", "🇦🇺 Australia"], count: 2100 },
];

export function CompaniesPageClient() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      {/* ═══ HERO + SEARCH ═══ */}
      <div className="px-5 md:px-8 pt-8 md:pt-12 pb-6 md:pb-8 text-center max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-12 px-3 py-1 rounded-full border" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)", borderWidth: "0.5px" }}>
            <span className="w-[6px] h-[6px] rounded-full" style={{ background: "#22c55e" }} />
            14,207 companies tracked
          </span>
        </div>
        <h1 className="text-[28px] md:text-[42px] font-medium tracking-tight mb-2" style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
          Find any biotech company in the world
        </h1>
        <p className="text-14 md:text-[16px] mb-6" style={{ color: "var(--color-text-secondary)" }}>
          Search 14,000+ companies across 58 countries by name, therapeutic area, or location.
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
            Is your company listed? Claim your profile for free →
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
            <div className="flex items-center justify-between rounded-lg border px-4 py-3.5 mt-4" style={{ borderColor: "var(--color-accent)", background: "#e8f5f0", borderWidth: "0.5px" }}>
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
                    <div className="text-12" style={{ color: "var(--color-text-tertiary)" }}>{cat.count.toLocaleString()} companies</div>
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
                  className="rounded-lg border px-4 py-4 transition-all duration-150 hover:border-[var(--color-border-medium)] hover:shadow-sm cursor-pointer"
                  style={{
                    borderColor: region.featured ? "var(--color-accent)" : "var(--color-border-subtle)",
                    borderWidth: "0.5px",
                    background: region.featured ? "#f0faf6" : "transparent",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[22px]">{region.flag}</span>
                      <div>
                        <div className="text-[15px] font-medium" style={{ color: "var(--color-text-primary)" }}>{region.name}</div>
                        <div className="text-12" style={{ color: "var(--color-accent)" }}>{region.count.toLocaleString()} companies</div>
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: "var(--color-text-tertiary)" }} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {region.countries.map((c) => (
                      <span key={c} className="text-11 px-2 py-[2px] rounded-sm" style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-tertiary)" }}>
                        {c}
                      </span>
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
          </div>

          {/* Section: Browse by Stage */}
          <div className="mb-10">
            <h2 className="text-12 uppercase tracking-[0.5px] font-medium mb-4" style={{ color: "var(--color-text-secondary)" }}>
              📊 Browse by development stage
            </h2>
            <div className="flex flex-wrap gap-2">
              {["Pre-clinical", "Phase 1", "Phase 1/2", "Phase 2", "Phase 3", "Approved"].map((stage) => {
                const sc = stageBadgeColors[stage] || stageBadgeColors["Pre-clinical"];
                const counts: Record<string, number> = { "Pre-clinical": 3200, "Phase 1": 2100, "Phase 1/2": 890, "Phase 2": 3400, "Phase 3": 1200, Approved: 2800 };
                return (
                  <button
                    key={stage}
                    className="flex items-center gap-2 rounded-lg border px-4 py-2.5 transition-all duration-150 hover:border-[var(--color-border-medium)] hover:shadow-sm"
                    style={{ borderColor: sc.border, borderWidth: "0.5px", background: sc.bg }}
                  >
                    <span className="text-13 font-medium" style={{ color: sc.text }}>
                      {stageEmoji[stage]} {stage}
                    </span>
                    <span className="text-11" style={{ color: sc.text, opacity: 0.7 }}>
                      {counts[stage]?.toLocaleString()}
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
              style={{ background: "white", color: "#0a3d2e" }}
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
