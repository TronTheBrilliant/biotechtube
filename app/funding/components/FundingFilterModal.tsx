"use client";

import React from "react";

const COUNTRY_FLAGS: Record<string, string> = {
  "United States": "\u{1f1fa}\u{1f1f8}", "United Kingdom": "\u{1f1ec}\u{1f1e7}", Switzerland: "\u{1f1e8}\u{1f1ed}", Japan: "\u{1f1ef}\u{1f1f5}",
  China: "\u{1f1e8}\u{1f1f3}", Denmark: "\u{1f1e9}\u{1f1f0}", India: "\u{1f1ee}\u{1f1f3}", France: "\u{1f1eb}\u{1f1f7}", "South Korea": "\u{1f1f0}\u{1f1f7}",
  Germany: "\u{1f1e9}\u{1f1ea}", Belgium: "\u{1f1e7}\u{1f1ea}", Netherlands: "\u{1f1f3}\u{1f1f1}", Australia: "\u{1f1e6}\u{1f1fa}",
  Ireland: "\u{1f1ee}\u{1f1ea}", Israel: "\u{1f1ee}\u{1f1f1}", Canada: "\u{1f1e8}\u{1f1e6}", Norway: "\u{1f1f3}\u{1f1f4}",
  Sweden: "\u{1f1f8}\u{1f1ea}", Singapore: "\u{1f1f8}\u{1f1ec}", Spain: "\u{1f1ea}\u{1f1f8}",
};

const DATE_RANGES = ["All time", "Last 30 days", "Last 90 days", "Last 12 months"];

const AMOUNT_RANGES = [
  { label: "Any amount" }, { label: "$0 \u2013 $1M" }, { label: "$1M \u2013 $10M" },
  { label: "$10M \u2013 $100M" }, { label: "$100M \u2013 $500M" }, { label: "$500M+" },
];

const controlStyle: React.CSSProperties = {
  background: "var(--color-bg-secondary)",
  border: "0.5px solid var(--color-border-subtle)",
  color: "var(--color-text-primary)",
  borderRadius: 8, padding: "0 12px", height: 42,
  fontSize: 13, fontWeight: 500, outline: "none", cursor: "pointer", width: "100%",
};

interface Props {
  roundFilter: string; setRoundFilter: (v: string) => void;
  dateFilter: string; setDateFilter: (v: string) => void;
  countryFilter: string; setCountryFilter: (v: string) => void;
  investorSearch: string; setInvestorSearch: (v: string) => void;
  selectedInvestor: string | null; setSelectedInvestor: (v: string | null) => void;
  investorInputFocused: boolean; setInvestorInputFocused: (v: boolean) => void;
  investorInputRef: React.RefObject<HTMLInputElement | null>;
  investorDropdownRef: React.RefObject<HTMLDivElement | null>;
  investorSuggestions: string[];
  amountRange: string; setAmountRange: (v: string) => void;
  roundTypes: string[]; countries: string[];
  clearAllFilters: () => void; onClose: () => void;
}

export function FundingFilterModal({
  roundFilter, setRoundFilter, dateFilter, setDateFilter,
  countryFilter, setCountryFilter, investorSearch, setInvestorSearch,
  selectedInvestor, setSelectedInvestor, investorInputFocused, setInvestorInputFocused,
  investorInputRef, investorDropdownRef, investorSuggestions,
  amountRange, setAmountRange, roundTypes, countries, clearAllFilters, onClose,
}: Props) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.15s ease-out" }}
      onClick={onClose}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", width: "100%", maxWidth: 420, margin: "0 16px",
          background: "var(--color-bg-secondary)", border: "0.5px solid var(--color-border-subtle)",
          borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          animation: "slideUp 0.2s ease-out", maxHeight: "85vh", overflowY: "auto",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}>
          <h3 className="text-[16px] font-medium" style={{ color: "var(--color-text-primary)" }}>Filters</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--color-text-tertiary)", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 4 }}>{"\u00d7"}</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-5">
          <Section label="Round type">
            <select value={roundFilter} onChange={(e) => setRoundFilter(e.target.value)} style={controlStyle}>
              {roundTypes.map((t) => <option key={t} value={t}>{t === "All" ? "All rounds" : t}</option>)}
            </select>
          </Section>
          <Section label="Time period">
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={controlStyle}>
              {DATE_RANGES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Section>
          <Section label="Country">
            <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} style={controlStyle}>
              {countries.map((c) => {
                const flag = c === "All" ? "\u{1f30d}" : (COUNTRY_FLAGS[c] || "");
                return <option key={c} value={c}>{flag} {c === "All" ? "All countries" : c}</option>;
              })}
            </select>
          </Section>
          <Section label="Lead investor">
            <div style={{ position: "relative" }}>
              <input
                ref={investorInputRef as React.RefObject<HTMLInputElement>}
                type="text" placeholder="Search investor..."
                value={selectedInvestor || investorSearch}
                onChange={(e) => { setSelectedInvestor(null); setInvestorSearch(e.target.value); }}
                onFocus={() => setInvestorInputFocused(true)}
                style={{ ...controlStyle, cursor: "text" }}
              />
              {investorInputFocused && investorSuggestions.length > 0 && (
                <div
                  ref={investorDropdownRef as React.RefObject<HTMLDivElement>}
                  style={{
                    position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
                    background: "var(--color-bg-primary)", border: "0.5px solid var(--color-border-subtle)",
                    borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.12)", zIndex: 60,
                    maxHeight: 200, overflowY: "auto",
                  }}
                >
                  {investorSuggestions.map((name) => (
                    <div
                      key={name}
                      style={{ padding: "8px 12px", fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer", borderBottom: "0.5px solid var(--color-border-subtle)" }}
                      onMouseDown={(e) => { e.preventDefault(); setSelectedInvestor(name); setInvestorSearch(name); setInvestorInputFocused(false); }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-tertiary)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                    >{name}</div>
                  ))}
                </div>
              )}
            </div>
          </Section>
          <Section label="Amount range">
            <select value={amountRange} onChange={(e) => setAmountRange(e.target.value)} style={controlStyle}>
              {AMOUNT_RANGES.map((r) => <option key={r.label} value={r.label}>{r.label}</option>)}
            </select>
          </Section>
        </div>

        <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: "0.5px solid var(--color-border-subtle)" }}>
          <button onClick={clearAllFilters} style={{ background: "none", border: "none", color: "var(--color-text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: "8px 4px" }}>Clear all</button>
          <button onClick={onClose} style={{ background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Apply filters</button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-10 uppercase tracking-[0.5px] font-medium block mb-2" style={{ color: "var(--color-text-tertiary)" }}>{label}</label>
      {children}
    </div>
  );
}
