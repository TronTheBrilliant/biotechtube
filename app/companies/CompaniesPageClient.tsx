"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { RecentlyFunded } from "@/components/RecentlyFunded";
import { PaywallCard } from "@/components/PaywallCard";
import { Company, FundingRound } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";
import { Search, ArrowRight } from "lucide-react";

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

function getInitials(name: string) {
  return name
    .split(" ")
    .filter((w) => w.length > 0)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const allCountries = Array.from(new Set(companies.map((c) => c.country))).sort();
const allFocusAreas = Array.from(new Set(companies.flatMap((c) => c.focus))).sort();
const allStages = ["Pre-clinical", "Phase 1", "Phase 1/2", "Phase 2", "Phase 3", "Approved"];

export function CompaniesPageClient() {
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("All");
  const [focus, setFocus] = useState("All");
  const [stage, setStage] = useState("All");
  const [type, setType] = useState("All");
  const [sort, setSort] = useState("Trending");

  const filtered = useMemo(() => {
    let result = [...companies];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.focus.some((f) => f.toLowerCase().includes(q))
      );
    }
    if (country !== "All") result = result.filter((c) => c.country === country);
    if (focus !== "All") result = result.filter((c) => c.focus.includes(focus));
    if (stage !== "All") result = result.filter((c) => c.stage === stage);
    if (type !== "All") result = result.filter((c) => c.type === type);

    if (sort === "Trending") {
      result.sort((a, b) => (a.trending ?? 999) - (b.trending ?? 999));
    } else if (sort === "Total Raised") {
      result.sort((a, b) => b.totalRaised - a.totalRaised);
    } else if (sort === "Stage") {
      const order = ["Approved", "Phase 3", "Phase 2", "Phase 1/2", "Phase 1", "Pre-clinical"];
      result.sort((a, b) => order.indexOf(a.stage) - order.indexOf(b.stage));
    } else if (sort === "Name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [search, country, focus, stage, type, sort]);

  const visibleCompanies = filtered.slice(0, 5);
  const blurredCompanies = filtered.slice(5, 8);

  const selectStyle = {
    borderColor: "var(--color-border-medium)",
    background: "var(--color-bg-primary)",
    color: "var(--color-text-secondary)",
  };

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      {/* Page Header */}
      <div
        className="px-5 pt-7 pb-5 border-b"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-10 uppercase tracking-[0.5px] font-medium"
            style={{ color: "var(--color-accent)" }}
          >
            DIRECTORY
          </span>
          <span
            className="inline-flex items-center gap-1.5 text-10 px-2 py-[2px] rounded-full border"
            style={{
              borderColor: "var(--color-border-subtle)",
              color: "var(--color-text-secondary)",
              borderWidth: "0.5px",
            }}
          >
            <span
              className="w-[6px] h-[6px] rounded-full"
              style={{ background: "#22c55e" }}
            />
            14,000+ companies
          </span>
        </div>
        <h1
          className="text-[24px] font-medium tracking-tight mt-1"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.4px" }}
        >
          Global Biotech Directory
        </h1>
        <p
          className="text-13 mt-1"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}
        >
          14,000+ biotech companies across 58 countries
        </p>
      </div>

      {/* Two Column Layout */}
      <div
        className="flex flex-col lg:grid border-t"
        style={{
          gridTemplateColumns: "1fr 260px",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        {/* Main Content */}
        <div
          className="px-5 py-4 min-w-0 lg:border-r"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          {/* Filter Bar */}
          <div
            className="flex items-center gap-2 mb-4 overflow-x-auto pb-2"
            style={{ scrollbarWidth: "none" }}
          >
            <div className="relative flex-shrink-0">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2"
                style={{ color: "var(--color-text-tertiary)" }}
              />
              <input
                type="text"
                placeholder="Search companies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-12 pl-8 pr-2.5 py-1.5 rounded border outline-none w-[180px]"
                style={{
                  borderColor: "var(--color-border-medium)",
                  background: "var(--color-bg-primary)",
                  color: "var(--color-text-primary)",
                  borderWidth: "0.5px",
                }}
              />
            </div>
            <select
              className="text-12 px-2.5 py-1.5 rounded border outline-none flex-shrink-0"
              style={selectStyle}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="All">All Countries</option>
              {allCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="text-12 px-2.5 py-1.5 rounded border outline-none flex-shrink-0"
              style={selectStyle}
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
            >
              <option value="All">All Therapeutic Areas</option>
              {allFocusAreas.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <select
              className="text-12 px-2.5 py-1.5 rounded border outline-none flex-shrink-0"
              style={selectStyle}
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              <option value="All">All Stages</option>
              {allStages.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              className="text-12 px-2.5 py-1.5 rounded border outline-none flex-shrink-0"
              style={selectStyle}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="Public">Public</option>
              <option value="Private">Private</option>
            </select>
            <select
              className="text-12 px-2.5 py-1.5 rounded border outline-none flex-shrink-0"
              style={selectStyle}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="Trending">Trending</option>
              <option value="Total Raised">Total Raised</option>
              <option value="Stage">Stage</option>
              <option value="Name">Name</option>
            </select>
          </div>

          {/* Company Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleCompanies.map((company) => {
              const sc = stageBadgeColors[company.stage] || stageBadgeColors["Pre-clinical"];
              return (
                <Link
                  key={company.slug}
                  href={`/company/${company.slug}`}
                  className="block rounded-lg border px-3.5 py-3 transition-all duration-150 hover:border-[var(--color-border-medium)]"
                  style={{
                    borderColor: "var(--color-border-subtle)",
                    borderWidth: "0.5px",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-11 font-medium flex-shrink-0"
                      style={{
                        background: "var(--color-bg-tertiary)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {getInitials(company.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-13 font-medium"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {company.name}
                      </div>
                      <div className="text-11" style={{ color: "var(--color-text-tertiary)" }}>
                        {company.city}, {company.country}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {company.focus.map((f) => (
                      <span
                        key={f}
                        className="text-10 px-2 py-[2px] rounded-sm border"
                        style={{
                          background: "var(--color-bg-secondary)",
                          color: "var(--color-text-secondary)",
                          borderColor: "var(--color-border-subtle)",
                          borderWidth: "0.5px",
                        }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2.5">
                    <span
                      className="text-10 px-2 py-[2px] rounded-sm border"
                      style={{
                        background: sc.bg,
                        color: sc.text,
                        borderColor: sc.border,
                        borderWidth: "0.5px",
                      }}
                    >
                      {company.stage}
                    </span>
                    <span
                      className="text-12 font-medium"
                      style={{ color: "var(--color-accent)" }}
                    >
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
                style={{
                  borderColor: "var(--color-accent)",
                  background: "#e8f5f0",
                  borderWidth: "0.5px",
                }}
              >
                <div>
                  <div
                    className="text-13 font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    Sign up to see all 14,000+ companies
                  </div>
                  <div className="text-11" style={{ color: "var(--color-text-secondary)" }}>
                    Full access to the global biotech directory with advanced filters and alerts.
                  </div>
                </div>
                <Link
                  href="/signup"
                  className="flex items-center gap-1.5 text-12 font-medium px-3.5 py-2 rounded text-white flex-shrink-0"
                  style={{ background: "var(--color-accent)" }}
                >
                  Sign up free
                  <ArrowRight size={13} />
                </Link>
              </div>

              {/* Blurred Companies */}
              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-3"
                style={{ filter: "blur(4px)", opacity: 0.4, pointerEvents: "none" }}
              >
                {blurredCompanies.map((company) => {
                  const sc = stageBadgeColors[company.stage] || stageBadgeColors["Pre-clinical"];
                  return (
                    <div
                      key={company.slug}
                      className="rounded-lg border px-3.5 py-3"
                      style={{
                        borderColor: "var(--color-border-subtle)",
                        borderWidth: "0.5px",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-11 font-medium flex-shrink-0"
                          style={{
                            background: "var(--color-bg-tertiary)",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {getInitials(company.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-13 font-medium"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            {company.name}
                          </div>
                          <div className="text-11" style={{ color: "var(--color-text-tertiary)" }}>
                            {company.city}, {company.country}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {company.focus.map((f) => (
                          <span
                            key={f}
                            className="text-10 px-2 py-[2px] rounded-sm border"
                            style={{
                              background: "var(--color-bg-secondary)",
                              color: "var(--color-text-secondary)",
                              borderColor: "var(--color-border-subtle)",
                              borderWidth: "0.5px",
                            }}
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-2.5">
                        <span
                          className="text-10 px-2 py-[2px] rounded-sm border"
                          style={{
                            background: sc.bg,
                            color: sc.text,
                            borderColor: sc.border,
                            borderWidth: "0.5px",
                          }}
                        >
                          {company.stage}
                        </span>
                        <span
                          className="text-12 font-medium"
                          style={{ color: "var(--color-accent)" }}
                        >
                          {formatCurrency(company.totalRaised)}
                        </span>
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

      <Footer />
    </div>
  );
}
