"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Loader2, X, ArrowRight, Building2 } from "lucide-react";
import { CompanyAvatar } from "@/components/CompanyAvatar";

// Minimal shape we render — narrower than the full Company type to keep this component self-contained.
interface SearchResult {
  slug: string;
  name: string;
  ticker: string | null;
  country: string | null;
  city: string | null;
  stage: string | null;
  logo_url: string | null;
  website: string | null;
  categories: string[] | null;
}

const PLACEHOLDER_SAMPLES = [
  "Search companies — try \"Moderna\"",
  "Search companies — try \"Regeneron\"",
  "Search companies — try \"CRISPR\"",
  "Search companies — try \"Novo Nordisk\"",
];

export function HomeHeroSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [placeholder, setPlaceholder] = useState(PLACEHOLDER_SAMPLES[0]);

  // Rotate the placeholder every 4s so the hero feels alive (only when input is empty & unfocused).
  // Respects prefers-reduced-motion: vestibular-sensitive users get a single static placeholder.
  useEffect(() => {
    if (focused || query) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % PLACEHOLDER_SAMPLES.length;
      setPlaceholder(PLACEHOLDER_SAMPLES[i]);
    }, 4000);
    return () => clearInterval(t);
  }, [focused, query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search against the same endpoint the nav overlay uses
  const runSearch = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value || value.trim().length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/companies/search?q=${encodeURIComponent(value)}`)
        .then((r) => r.json())
        .then((d) => {
          setResults(d.results || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 180);
  }, []);

  const onChange = (v: string) => {
    setQuery(v);
    setHighlightIdx(-1);
    runSearch(v);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (highlightIdx >= 0 && results[highlightIdx]) {
        router.push(`/company/${results[highlightIdx].slug}`);
      } else if (results.length > 0) {
        router.push(`/company/${results[0].slug}`);
      } else if (query.trim()) {
        router.push(`/companies?q=${encodeURIComponent(query.trim())}`);
      }
    } else if (e.key === "Escape") {
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  const showDropdown = focused && (query.trim().length > 0);

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* The bar itself */}
      <div
        className="flex items-center w-full transition-all duration-200"
        style={{
          height: 64,
          padding: "0 18px",
          background: "var(--color-bg-primary)",
          border: `1px solid ${focused ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
          borderRadius: 16,
          outline: focused ? "2px solid var(--color-accent)" : "none",
          outlineOffset: 2,
        }}
      >
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: focused ? "var(--color-accent-subtle)" : "var(--color-bg-secondary)",
            color: focused ? "var(--color-accent)" : "var(--color-text-tertiary)",
            transition: "all 0.15s",
          }}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Search size={18} />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={onKeyDown}
          className="flex-1 bg-transparent border-0 outline-none mx-3"
          style={{
            fontSize: 17,
            fontWeight: 500,
            color: "var(--color-text-primary)",
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
            className="p-1.5 rounded-md mr-1"
            style={{ color: "var(--color-text-tertiary)" }}
            aria-label="Clear"
          >
            <X size={16} />
          </button>
        )}
        <div
          className="hidden md:flex items-center gap-1.5 text-[11px] shrink-0 pl-3 ml-1"
          style={{
            color: "var(--color-text-tertiary)",
            borderLeft: "1px solid var(--color-border-subtle)",
          }}
        >
          <kbd
            className="px-1.5 py-[2px] rounded text-[10px] font-semibold"
            style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border-subtle)" }}
          >
            ⌘K
          </kbd>
          <span>for full search</span>
        </div>
      </div>

      {/* Helper row (hidden when dropdown is open) */}
      {!showDropdown && (
        <div className="mt-2 flex items-center gap-2 px-1 text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
          <Building2 size={12} />
          <span>Search 14,000+ biotech companies by name, ticker, or therapeutic area.</span>
        </div>
      )}

      {/* Dropdown results */}
      {showDropdown && (
        <div
          className="absolute left-0 right-0 top-full mt-2 overflow-hidden z-40"
          style={{
            background: "var(--color-bg-primary)",
            border: "1px solid var(--color-border-subtle)",
            borderRadius: 14,
            boxShadow: "0 12px 32px rgba(0,0,0,0.10)",
          }}
        >
          <div className="max-h-[420px] overflow-y-auto">
            {results.length > 0 ? (
              <>
                <div
                  className="px-4 py-2 text-[10px] uppercase tracking-[0.6px] font-semibold"
                  style={{
                    color: "var(--color-text-tertiary)",
                    borderBottom: "1px solid var(--color-border-subtle)",
                    background: "var(--color-bg-secondary)",
                  }}
                >
                  {results.length} compan{results.length === 1 ? "y" : "ies"}
                </div>
                {results.map((c, i) => {
                  const isHi = i === highlightIdx;
                  const location = [c.city, c.country].filter(Boolean).join(", ");
                  const focus = c.categories?.[0];
                  return (
                    <Link
                      key={c.slug}
                      href={`/company/${c.slug}`}
                      onMouseEnter={() => setHighlightIdx(i)}
                      className="flex items-center gap-3 px-4 py-3 transition-colors"
                      style={{
                        background: isHi ? "var(--color-bg-secondary)" : "transparent",
                        borderBottom: i < results.length - 1 ? "1px solid var(--color-border-subtle)" : "none",
                      }}
                      onClick={() => setFocused(false)}
                    >
                      <CompanyAvatar name={c.name} logoUrl={c.logo_url ?? undefined} website={c.website ?? undefined} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                            {highlightMatch(c.name, query)}
                          </span>
                          {c.ticker && (
                            <span
                              className="text-[10px] px-1.5 py-[1px] rounded-sm shrink-0 font-semibold"
                              style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-tertiary)" }}
                            >
                              {c.ticker}
                            </span>
                          )}
                        </div>
                        <div className="text-[12px] truncate" style={{ color: "var(--color-text-tertiary)" }}>
                          {[location, focus].filter(Boolean).join(" · ") || "Biotech"}
                        </div>
                      </div>
                      {c.stage && (
                        <span
                          className="text-[10px] px-2 py-[2px] rounded-sm shrink-0"
                          style={{
                            background: "var(--color-bg-secondary)",
                            color: "var(--color-text-secondary)",
                            border: "1px solid var(--color-border-subtle)",
                          }}
                        >
                          {c.stage}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </>
            ) : !loading ? (
              <div className="px-4 py-6 text-center">
                <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                  No companies match &ldquo;{query}&rdquo;
                </p>
                <Link
                  href="/companies"
                  className="inline-flex items-center gap-1 mt-2 text-[12px] font-medium"
                  style={{ color: "var(--color-accent)" }}
                  onClick={() => setFocused(false)}
                >
                  Browse all companies <ArrowRight size={12} />
                </Link>
              </div>
            ) : (
              <div className="px-4 py-5 text-center text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
                Searching…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Bold the matched substring in results (case-insensitive)
function highlightMatch(text: string, q: string) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark
        style={{
          background: "var(--color-accent-subtle)",
          color: "var(--color-text-primary)",
          padding: "0 2px",
          borderRadius: 2,
        }}
      >
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}
