"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { FundingFilterModal } from "./FundingFilterModal";
import { PaywallCard } from "@/components/PaywallCard";
import type { FundingRoundRow } from "@/lib/funding-queries";

/* ── constants ── */

const roundBadgeColors: Record<string, { bg: string; text: string }> = {
  Seed: { bg: "#f0fdf4", text: "#166534" },
  "Series A": { bg: "#eff6ff", text: "#1d4ed8" },
  "Series B": { bg: "#f5f3ff", text: "#5b21b6" },
  "Series C": { bg: "#fef3e2", text: "#b45309" },
  "Series D": { bg: "#fef3e2", text: "#92400e" },
  Grant: { bg: "#ecfdf5", text: "#064e3b" },
  IPO: { bg: "#fef9c3", text: "#854d0e" },
  PIPE: { bg: "#fce7f3", text: "#9d174d" },
};

const AMOUNT_RANGES = [
  { label: "Any amount", min: 0, max: Infinity },
  { label: "$0 – $1M", min: 0, max: 1_000_000 },
  { label: "$1M – $10M", min: 1_000_000, max: 10_000_000 },
  { label: "$10M – $100M", min: 10_000_000, max: 100_000_000 },
  { label: "$100M – $500M", min: 100_000_000, max: 500_000_000 },
  { label: "$500M+", min: 500_000_000, max: Infinity },
];

const DATE_RANGES = ["All time", "Last 30 days", "Last 90 days", "Last 12 months"];

type SortField = "amount" | "date" | "company";
type SortDir = "asc" | "desc";

function fmtAmount(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

function dateInRange(dateStr: string, range: string): boolean {
  if (range === "All time") return true;
  const d = new Date(dateStr);
  const now = new Date();
  if (range === "Last 30 days") return d >= new Date(now.getTime() - 30 * 86400000);
  if (range === "Last 90 days") return d >= new Date(now.getTime() - 90 * 86400000);
  if (range === "Last 12 months") return d >= new Date(now.getTime() - 365 * 86400000);
  return true;
}

/* ── component ── */

interface Props {
  rounds: FundingRoundRow[];
}

export function FundingDealsTab({ rounds }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  /* ── filter state (initialised from URL) ── */
  const [roundFilter, setRoundFilter] = useState(() => searchParams.get("round") || "All");
  const [dateFilter, setDateFilter] = useState(() => {
    const v = searchParams.get("date");
    return v && DATE_RANGES.includes(v) ? v : "All time";
  });
  const [countryFilter, setCountryFilter] = useState(() => searchParams.get("country") || "All");
  const [amountRange, setAmountRange] = useState(() => {
    const v = searchParams.get("amount");
    return v && AMOUNT_RANGES.some((r) => r.label === v) ? v : "Any amount";
  });
  const [companySearch, setCompanySearch] = useState(() => searchParams.get("company") || "");
  const [investorSearch, setInvestorSearch] = useState("");
  const [selectedInvestor, setSelectedInvestor] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [investorInputFocused, setInvestorInputFocused] = useState(false);

  /* ── sort state ── */
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  /* ── refs for investor autocomplete ── */
  const investorInputRef = useRef<HTMLInputElement | null>(null);
  const investorDropdownRef = useRef<HTMLDivElement | null>(null);

  /* ── derived lists ── */
  const roundTypes = useMemo(
    () => Array.from(new Set(rounds.map((r) => r.round_type).filter(Boolean) as string[])).sort(),
    [rounds]
  );

  const countries = useMemo(
    () => Array.from(new Set(rounds.map((r) => r.country).filter(Boolean) as string[])).sort(),
    [rounds]
  );

  const investorSuggestions = useMemo(() => {
    const all = Array.from(new Set(rounds.map((r) => r.lead_investor).filter(Boolean) as string[])).sort();
    if (!investorSearch) return all.slice(0, 20);
    const q = investorSearch.toLowerCase();
    return all.filter((i) => i.toLowerCase().includes(q)).slice(0, 20);
  }, [rounds, investorSearch]);

  /* ── persist filters to URL ── */
  const updateUrl = useCallback(
    (overrides: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(overrides)) {
        if (!v || v === "All" || v === "All time" || v === "Any amount" || v === "") {
          params.delete(k);
        } else {
          params.set(k, v);
        }
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [searchParams, router]
  );

  const setRoundFilterUrl = (v: string) => { setRoundFilter(v); updateUrl({ round: v }); };
  const setDateFilterUrl = (v: string) => { setDateFilter(v); updateUrl({ date: v }); };
  const setCountryFilterUrl = (v: string) => { setCountryFilter(v); updateUrl({ country: v }); };
  const setAmountRangeUrl = (v: string) => { setAmountRange(v); updateUrl({ amount: v }); };
  const setCompanySearchUrl = (v: string) => { setCompanySearch(v); updateUrl({ company: v }); };

  /* ── clear all ── */
  const clearAllFilters = useCallback(() => {
    setRoundFilter("All");
    setDateFilter("All time");
    setCountryFilter("All");
    setAmountRange("Any amount");
    setCompanySearch("");
    setInvestorSearch("");
    setSelectedInvestor(null);
    router.replace("?", { scroll: false });
  }, [router]);

  /* ── filter + sort ── */
  const filtered = useMemo(() => {
    let list = rounds;

    if (roundFilter !== "All") list = list.filter((r) => r.round_type === roundFilter);
    if (dateFilter !== "All time") list = list.filter((r) => dateInRange(r.announced_date, dateFilter));
    if (countryFilter !== "All") list = list.filter((r) => r.country === countryFilter);
    if (companySearch) {
      const q = companySearch.toLowerCase();
      list = list.filter((r) => r.company_name.toLowerCase().includes(q));
    }
    if (selectedInvestor) {
      list = list.filter((r) => r.lead_investor === selectedInvestor);
    }
    if (amountRange !== "Any amount") {
      const range = AMOUNT_RANGES.find((r) => r.label === amountRange);
      if (range) list = list.filter((r) => r.amount_usd >= range.min && r.amount_usd < range.max);
    }

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "amount") cmp = a.amount_usd - b.amount_usd;
      else if (sortField === "date") cmp = new Date(a.announced_date).getTime() - new Date(b.announced_date).getTime();
      else cmp = a.company_name.localeCompare(b.company_name);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list.slice(0, 100);
  }, [rounds, roundFilter, dateFilter, countryFilter, companySearch, selectedInvestor, amountRange, sortField, sortDir]);

  const hasFilters =
    roundFilter !== "All" ||
    dateFilter !== "All time" ||
    countryFilter !== "All" ||
    amountRange !== "Any amount" ||
    companySearch !== "" ||
    selectedInvestor !== null;

  /* ── sort handler ── */
  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "amount" ? "desc" : field === "date" ? "desc" : "asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <ChevronUp size={14} style={{ marginLeft: 2, opacity: 0.7 }} />
    ) : (
      <ChevronDown size={14} style={{ marginLeft: 2, opacity: 0.7 }} />
    );
  }

  /* ── styles ── */
  const thStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontSize: 11,
    fontWeight: 500,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    color: "var(--color-text-tertiary)",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    textAlign: "left",
  };

  const tdStyle: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 400,
    color: "var(--color-text-primary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const pillStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    background: "var(--color-bg-tertiary)",
    color: "var(--color-text-secondary)",
    border: "0.5px solid var(--color-border-subtle)",
  };

  const pillXStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    color: "var(--color-text-tertiary)",
    cursor: "pointer",
    padding: 0,
    lineHeight: 1,
    fontSize: 14,
    display: "inline-flex",
    alignItems: "center",
  };

  return (
    <div style={{ display: "flex", gap: 24 }}>
      {/* ── Main column ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* ── Top bar: search + filter button ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search companies..."
            value={companySearch}
            onChange={(e) => setCompanySearchUrl(e.target.value)}
            style={{
              flex: 1,
              minWidth: 160,
              height: 36,
              padding: "0 12px",
              fontSize: 13,
              fontWeight: 400,
              borderRadius: 8,
              border: "0.5px solid var(--color-border-subtle)",
              background: "var(--color-bg-secondary)",
              color: "var(--color-text-primary)",
              outline: "none",
            }}
          />
          <button
            onClick={() => setShowFilterModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 36,
              padding: "0 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              border: "0.5px solid var(--color-border-subtle)",
              background: hasFilters ? "var(--color-accent)" : "var(--color-bg-secondary)",
              color: hasFilters ? "#fff" : "var(--color-text-secondary)",
              cursor: "pointer",
            }}
          >
            <SlidersHorizontal size={14} />
            Filters{hasFilters ? " *" : ""}
          </button>
        </div>

        {/* ── Active filter pills ── */}
        {hasFilters && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, alignItems: "center" }}>
            {roundFilter !== "All" && (
              <span style={pillStyle}>
                {roundFilter}
                <button style={pillXStyle} onClick={() => setRoundFilterUrl("All")} aria-label="Remove round filter"><X size={12} /></button>
              </span>
            )}
            {dateFilter !== "All time" && (
              <span style={pillStyle}>
                {dateFilter}
                <button style={pillXStyle} onClick={() => setDateFilterUrl("All time")} aria-label="Remove date filter"><X size={12} /></button>
              </span>
            )}
            {countryFilter !== "All" && (
              <span style={pillStyle}>
                {countryFilter}
                <button style={pillXStyle} onClick={() => setCountryFilterUrl("All")} aria-label="Remove country filter"><X size={12} /></button>
              </span>
            )}
            {amountRange !== "Any amount" && (
              <span style={pillStyle}>
                {amountRange}
                <button style={pillXStyle} onClick={() => setAmountRangeUrl("Any amount")} aria-label="Remove amount filter"><X size={12} /></button>
              </span>
            )}
            {companySearch && (
              <span style={pillStyle}>
                &quot;{companySearch}&quot;
                <button style={pillXStyle} onClick={() => setCompanySearchUrl("")} aria-label="Remove company search"><X size={12} /></button>
              </span>
            )}
            {selectedInvestor && (
              <span style={pillStyle}>
                {selectedInvestor}
                <button style={pillXStyle} onClick={() => setSelectedInvestor(null)} aria-label="Remove investor filter"><X size={12} /></button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              style={{
                background: "none",
                border: "none",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--color-accent)",
                cursor: "pointer",
                padding: "4px 8px",
              }}
            >
              Clear all
            </button>
          </div>
        )}

        {/* ── Table ── */}
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 16px",
              color: "var(--color-text-tertiary)",
              background: "var(--color-bg-secondary)",
              borderRadius: 12,
              border: "0.5px solid var(--color-border-subtle)",
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>No rounds match these filters</p>
            <p style={{ fontSize: 13, fontWeight: 400, marginBottom: 16 }}>Try broadening your search</p>
            <button
              onClick={clearAllFilters}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                background: "var(--color-accent)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div
            style={{
              borderRadius: 12,
              border: "0.5px solid var(--color-border-subtle)",
              overflow: "hidden",
              background: "var(--color-bg-secondary)",
            }}
          >
            {/* Desktop table */}
            <div className="deals-table-desktop" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}>
                    <th style={thStyle} onClick={() => toggleSort("company")}>
                      Company <SortIcon field="company" />
                    </th>
                    <th style={thStyle}>Round</th>
                    <th style={thStyle} onClick={() => toggleSort("amount")}>
                      Amount <SortIcon field="amount" />
                    </th>
                    <th style={{ ...thStyle }} className="deals-hide-mobile">Investor</th>
                    <th style={thStyle} onClick={() => toggleSort("date")} className="deals-hide-mobile">
                      Date <SortIcon field="date" />
                    </th>
                    <th style={thStyle} className="deals-hide-mobile">Source</th>
                    <th style={thStyle}>Country</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => {
                    const badge = roundBadgeColors[r.round_type || ""] || { bg: "var(--color-bg-tertiary)", text: "var(--color-text-secondary)" };
                    return (
                      <tr
                        key={`${r.company_name}-${r.announced_date}-${i}`}
                        className="deals-row"
                        style={{ borderBottom: i < filtered.length - 1 ? "0.5px solid var(--color-border-subtle)" : "none" }}
                      >
                        {/* Company */}
                        <td style={{ ...tdStyle, fontWeight: 500 }}>
                          {r.company_slug ? (
                            <Link
                              href={`/company/${r.company_slug}`}
                              style={{ color: "var(--color-accent)", textDecoration: "none" }}
                            >
                              {r.company_name}
                            </Link>
                          ) : (
                            r.company_name
                          )}
                        </td>

                        {/* Round badge */}
                        <td style={tdStyle}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 500,
                              background: badge.bg,
                              color: badge.text,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {r.round_type || "Other"}
                          </span>
                        </td>

                        {/* Amount */}
                        <td style={{ ...tdStyle, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                          {r.amount_usd > 0 ? fmtAmount(r.amount_usd) : "—"}
                        </td>

                        {/* Lead Investor */}
                        <td style={tdStyle} className="deals-hide-mobile">
                          {r.lead_investor ? (
                            <button
                              onClick={() => setSelectedInvestor(r.lead_investor)}
                              style={{
                                background: "none",
                                border: "none",
                                padding: 0,
                                color: "var(--color-accent)",
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: 400,
                                textDecoration: "none",
                                textAlign: "left",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: 180,
                                display: "block",
                              }}
                              title={`Filter by ${r.lead_investor}`}
                            >
                              {r.lead_investor}
                            </button>
                          ) : (
                            <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
                          )}
                        </td>

                        {/* Date */}
                        <td style={{ ...tdStyle, color: "var(--color-text-secondary)", fontSize: 12 }} className="deals-hide-mobile">
                          {fmtDate(r.announced_date)}
                        </td>

                        {/* Source / Confidence */}
                        <td style={tdStyle} className="deals-hide-mobile">
                          <ConfidenceBadge confidence={r.confidence} sourceName={r.source_name} compact />
                        </td>

                        {/* Country */}
                        <td style={{ ...tdStyle, fontSize: 12, color: "var(--color-text-secondary)" }}>
                          {r.country || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filtered.length > 0 && (
          <p style={{ fontSize: 11, fontWeight: 400, color: "var(--color-text-tertiary)", marginTop: 8, textAlign: "right" }}>
            Showing {filtered.length} of {rounds.length} rounds
          </p>
        )}
      </div>

      {/* ── Sidebar (lg only) ── */}
      <div className="deals-sidebar" style={{ width: 280, flexShrink: 0 }}>
        <PaywallCard />
      </div>

      {/* ── Filter modal ── */}
      {showFilterModal && (
        <FundingFilterModal
          roundFilter={roundFilter}
          setRoundFilter={setRoundFilterUrl}
          dateFilter={dateFilter}
          setDateFilter={setDateFilterUrl}
          countryFilter={countryFilter}
          setCountryFilter={setCountryFilterUrl}
          investorSearch={investorSearch}
          setInvestorSearch={setInvestorSearch}
          selectedInvestor={selectedInvestor}
          setSelectedInvestor={setSelectedInvestor}
          investorInputFocused={investorInputFocused}
          setInvestorInputFocused={setInvestorInputFocused}
          investorInputRef={investorInputRef}
          investorDropdownRef={investorDropdownRef}
          investorSuggestions={investorSuggestions}
          amountRange={amountRange}
          setAmountRange={setAmountRangeUrl}
          roundTypes={roundTypes}
          countries={countries}
          clearAllFilters={clearAllFilters}
          onClose={() => setShowFilterModal(false)}
        />
      )}

      {/* ── Responsive styles ── */}
      <style>{`
        .deals-row:hover {
          background: var(--color-bg-tertiary);
        }
        .deals-sidebar {
          display: none;
        }
        @media (min-width: 1024px) {
          .deals-sidebar {
            display: block;
          }
        }
        @media (max-width: 480px) {
          .deals-hide-mobile {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
