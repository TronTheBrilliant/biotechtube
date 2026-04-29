"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Plus } from "lucide-react";
import { CompanyAvatar } from "@/components/CompanyAvatar";

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

interface Props {
  onAdd: (slug: string) => void;
  size?: "sm" | "lg";
  placeholder?: string;
}

export function AddCompanyInput({
  onAdd,
  size = "sm",
  placeholder = "Add a company",
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
          setResults((d.results || []).slice(0, 6));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 180);
  }, []);

  const handleChange = (v: string) => {
    setQuery(v);
    setHighlightIdx(-1);
    runSearch(v);
    setOpen(true);
  };

  const handleSelect = (slug: string) => {
    onAdd(slug);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      const target = highlightIdx >= 0 ? results[highlightIdx] : results[0];
      if (target) {
        e.preventDefault();
        handleSelect(target.slug);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const inputHeight = size === "lg" ? 44 : 32;
  const inputFontSize = size === "lg" ? 15 : 13;

  return (
    <div ref={wrapperRef} className="relative w-full">
      <label
        className="flex items-center gap-2 w-full transition-colors"
        style={{
          height: inputHeight,
          padding: "0 12px",
          background: "var(--color-bg-primary)",
          border: "0.5px solid var(--color-border-medium)",
          borderRadius: 8,
        }}
      >
        <Search size={size === "lg" ? 16 : 14} strokeWidth={1.75} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="flex-1 bg-transparent border-0 outline-none min-w-0"
          style={{
            fontSize: inputFontSize,
            color: "var(--color-text-primary)",
          }}
        />
      </label>

      {open && query.trim().length > 0 && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-30 overflow-hidden"
          style={{
            background: "var(--color-bg-primary)",
            border: "0.5px solid var(--color-border-medium)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            maxHeight: 320,
          }}
        >
          <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
            {loading ? (
              <div className="px-3 py-3 text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
                Searching…
              </div>
            ) : results.length === 0 ? (
              <div className="px-3 py-3 text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
                No companies match &ldquo;{query}&rdquo;.
              </div>
            ) : (
              results.map((r, i) => {
                const isHi = i === highlightIdx;
                return (
                  <button
                    key={r.slug}
                    type="button"
                    onClick={() => handleSelect(r.slug)}
                    onMouseEnter={() => setHighlightIdx(i)}
                    className="flex items-center gap-2.5 w-full text-left px-3 py-2 transition-colors"
                    style={{
                      background: isHi ? "var(--color-bg-secondary)" : "transparent",
                      borderBottom:
                        i < results.length - 1
                          ? "0.5px solid var(--color-border-subtle)"
                          : "none",
                      cursor: "pointer",
                    }}
                  >
                    <CompanyAvatar
                      name={r.name}
                      logoUrl={r.logo_url ?? undefined}
                      website={r.website ?? undefined}
                      size={24}
                    />
                    <div className="flex-1 min-w-0">
                      <span
                        className="block text-[13px] font-medium truncate"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {r.name}
                      </span>
                      <span
                        className="text-[11px]"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        {[r.ticker, r.country].filter(Boolean).join(" · ") || "Biotech"}
                      </span>
                    </div>
                    <Plus
                      size={14}
                      strokeWidth={2}
                      style={{
                        color: isHi ? "var(--color-accent)" : "var(--color-text-tertiary)",
                        flexShrink: 0,
                      }}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
