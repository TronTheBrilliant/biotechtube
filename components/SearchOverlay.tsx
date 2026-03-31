"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Search, X, TrendingUp, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Company } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { dbRowToCompany } from "@/lib/adapters";

// Hardcoded trending companies (top 30-day performers from the homepage data)
const mc = (s: string, n: string, t: string, c: string, f: string, w: string): Company => ({ slug: s, name: n, ticker: t, country: c, focus: [f], city: "", founded: 0, website: w, description: "", stage: "" as Company["stage"], type: "Public", totalRaised: 0, employees: "" });

const TRENDING_COMPANIES: Company[] = [
  mc("day-one-biopharmaceuticals", "Day One Biopharmaceuticals", "DAWN", "United States", "Oncology", "dayonebio.com"),
  mc("tango-therapeutics", "Tango Therapeutics", "TNGX", "United States", "Oncology", "tangotx.com"),
  mc("telix-pharmaceuticals", "Telix Pharmaceuticals", "TLX.AX", "Australia", "Radiopharmaceuticals", "telixpharma.com"),
  mc("veradermics", "Veradermics", "MANE", "United States", "Dermatology", "veradermics.com"),
  mc("xenon-pharmaceuticals", "Xenon Pharmaceuticals", "XENE", "Canada", "Neuroscience", "xenon-pharma.com"),
];

const MOCK_SPONSORS: Company[] = [
  mc("eli-lilly", "Eli Lilly", "LLY", "United States", "Antibodies", "lilly.com"),
  mc("roche", "Roche", "ROG.SW", "Switzerland", "Diagnostics", "roche.com"),
];

const stageColors: Record<string, { bg: string; text: string; border: string }> = {
  Approved: { bg: "#ecfdf5", text: "#064e3b", border: "#34d399" },
  "Phase 3": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 2": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 1/2": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Phase 1": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Pre-clinical": { bg: "var(--color-bg-secondary)", text: "var(--color-text-secondary)", border: "var(--color-border-medium)" },
};

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [featured, setFeatured] = useState<Company[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Load featured companies on open
  useEffect(() => {
    if (isOpen && featured.length === 0) {
      fetch("/api/companies?limit=5&sort=trending")
        .then((r) => r.json())
        .then((d) => {
          if (d.companies) {
            setFeatured(d.companies.map(dbRowToCompany));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, featured.length]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!value || value.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    searchTimeout.current = setTimeout(() => {
      fetch(`/api/companies/search?q=${encodeURIComponent(value)}`)
        .then((r) => r.json())
        .then((d) => {
          setResults((d.results || []).map(dbRowToCompany));
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }, 200);
  }, []);

  if (!isOpen) return null;

  const hasQuery = query.trim().length > 0;
  const trending = TRENDING_COMPANIES;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />

      {/* Search Panel */}
      <div
        className="relative mx-auto mt-0 md:mt-12 w-full md:max-w-[560px] md:rounded-xl overflow-hidden"
        style={{
          background: "var(--color-bg-primary)",
          maxHeight: "calc(100vh - 0px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        {/* Search Input */}
        <div
          className="flex items-center gap-3 px-4 h-[52px]"
          style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" style={{ color: "var(--color-accent)", flexShrink: 0 }} />
          ) : (
            <Search size={18} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search companies, pipelines, therapeutic areas..."
            className="flex-1 text-[16px] bg-transparent border-0 outline-none"
            style={{ color: "var(--color-text-primary)" }}
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); }} className="p-0.5" style={{ color: "var(--color-text-tertiary)" }}>
              <X size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-11 px-2 py-1 rounded"
            style={{ color: "var(--color-text-tertiary)", background: "var(--color-bg-tertiary)" }}
          >
            ESC
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 52px - 48px)", scrollbarWidth: "none" }}>
          {/* Search Results */}
          {hasQuery && (
            <div className="px-4 py-3">
              {results.length > 0 ? (
                <>
                  <div className="text-10 uppercase tracking-[0.5px] font-medium mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                    {results.length} result{results.length !== 1 ? "s" : ""}
                  </div>
                  {results.map((c) => (
                    <CompanyRow key={c.slug} company={c} onClose={onClose} highlight={query} />
                  ))}
                </>
              ) : !loading ? (
                <div className="py-6 text-center">
                  <p className="text-13" style={{ color: "var(--color-text-tertiary)" }}>
                    No companies found for &ldquo;{query}&rdquo;
                  </p>
                  <p className="text-11 mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                    Try a different search term or{" "}
                    <Link href="/companies" onClick={onClose} style={{ color: "var(--color-accent)" }}>
                      browse all companies
                    </Link>
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* Default state: Trending + Boosted */}
          {!hasQuery && (
            <>
              {/* Trending */}
              <div
                className="mx-3 mt-3 rounded-lg overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(26, 122, 94, 0.05) 0%, rgba(26, 122, 94, 0.01) 100%)",
                  border: "1px solid rgba(26, 122, 94, 0.12)",
                }}
              >
                <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                  <TrendingUp size={14} style={{ color: "var(--color-accent)" }} />
                  <span className="text-11 uppercase tracking-[0.5px] font-semibold" style={{ color: "var(--color-accent)" }}>
                    Trending Now
                  </span>
                  <span className="text-[9px] px-2 py-[2px] rounded-full font-medium" style={{ background: "var(--color-accent)", color: "white" }}>
                    Hot
                  </span>
                </div>
                <div className="px-2 pb-2">
                  {trending.map((c, i) => (
                    <CompanyRow key={c.slug} company={c} onClose={onClose} showRank rank={i + 1} />
                  ))}
                </div>
              </div>

              {/* Spacer */}
              <div className="h-2" />

              {/* Boosted / Sponsored */}
              <div
                className="mx-3 rounded-lg overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(180, 83, 9, 0.06) 0%, rgba(180, 83, 9, 0.02) 100%)",
                  border: "1px solid rgba(180, 83, 9, 0.12)",
                }}
              >
                <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                  <Sparkles size={14} style={{ color: "#b45309" }} />
                  <span className="text-11 uppercase tracking-[0.5px] font-semibold" style={{ color: "#b45309" }}>
                    Featured Companies
                  </span>
                  <span className="text-[9px] px-2 py-[2px] rounded-full font-medium" style={{ background: "#b45309", color: "white" }}>
                    Sponsored
                  </span>
                </div>
                <div className="px-2 pb-2">
                  {MOCK_SPONSORS.map((c) => (
                    <CompanyRow key={c.slug} company={c} onClose={onClose} sponsored />
                  ))}
                </div>
              </div>

              {/* Browse all */}
              <div className="px-4 py-3" style={{ borderTop: "0.5px solid var(--color-border-subtle)" }}>
                <Link
                  href="/companies"
                  onClick={onClose}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded text-12 font-medium transition-colors duration-150"
                  style={{ color: "var(--color-accent)", background: "var(--color-bg-secondary)" }}
                >
                  Browse all 10,000+ companies
                  <ArrowRight size={12} />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CompanyRow({
  company,
  onClose,
  showRank,
  rank,
  highlight,
}: {
  company: Company;
  onClose: () => void;
  showRank?: boolean;
  rank?: number;
  sponsored?: boolean;
  highlight?: string;
}) {
  const sc = stageColors[company.stage] || stageColors["Pre-clinical"];

  // Highlight matching text
  function highlightText(text: string) {
    if (!highlight) return text;
    const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span style={{ background: "#fef3e2", borderRadius: 2, padding: "0 1px" }}>
          {text.slice(idx, idx + highlight.length)}
        </span>
        {text.slice(idx + highlight.length)}
      </>
    );
  }

  return (
    <Link
      href={`/company/${company.slug}`}
      onClick={onClose}
      className="flex items-center gap-3 py-2.5 rounded-md px-2 -mx-2 transition-colors duration-100 hover:bg-[var(--color-bg-secondary)]"
    >
      {showRank && rank && (
        <span className="text-10 font-medium w-4 text-center" style={{ color: "var(--color-accent)" }}>
          #{rank}
        </span>
      )}
      <CompanyAvatar name={company.name} logoUrl={company.logoUrl} website={company.website} size={32} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[15px] font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
            {highlightText(company.name)}
          </span>
          {company.ticker && (
            <span className="text-[9px] px-1 py-[1px] rounded-sm flex-shrink-0" style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-tertiary)" }}>
              {company.ticker}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-12" style={{ color: "var(--color-text-tertiary)" }}>
          {company.city && <><span>{company.city}, {company.country}</span><span>·</span></>}
          {!company.city && company.country && <><span>{company.country}</span><span>·</span></>}
          <span>{company.focus[0] || "Biotech"}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {company.stage && (
          <span
            className="text-[9px] px-1.5 py-[2px] rounded-sm border"
            style={{ background: sc.bg, color: sc.text, borderColor: sc.border, borderWidth: "0.5px" }}
          >
            {company.stage}
          </span>
        )}
        {company.totalRaised > 0 && (
          <span className="text-10 font-medium" style={{ color: "var(--color-accent)" }}>
            {formatCurrency(company.totalRaised)}
          </span>
        )}
      </div>
    </Link>
  );
}
