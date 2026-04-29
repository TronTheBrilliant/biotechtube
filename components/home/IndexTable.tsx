"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { CompanySparkline } from "@/components/charts/CompanySparkline";
import { formatMarketCap } from "@/lib/market-utils";

export interface IndexCompany {
  id: string | null;
  slug: string;
  name: string;
  ticker: string | null;
  country: string | null;
  valuation: number | null;
  logo_url: string | null;
  website: string | null;
  dailyChange: number | null;
  sparkline: number[];
}

interface Props {
  companies: IndexCompany[];
  pageSize?: number;
}

type SortKey = "rank" | "name" | "country" | "valuation" | "dailyChange";
type SortDir = "asc" | "desc";

function readSortFromUrl(params: URLSearchParams): { key: SortKey; dir: SortDir } {
  const raw = params.get("sort") ?? "valuation:desc";
  const [k, d] = raw.split(":") as [SortKey, SortDir];
  const validKeys: SortKey[] = ["rank", "name", "country", "valuation", "dailyChange"];
  return {
    key: validKeys.includes(k) ? k : "valuation",
    dir: d === "asc" ? "asc" : "desc",
  };
}

function readPageFromUrl(params: URLSearchParams): number {
  const n = Number(params.get("page") ?? "1");
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function readCountryFromUrl(params: URLSearchParams): string {
  return params.get("country") ?? "all";
}

function compareCompanies(a: IndexCompany, b: IndexCompany, key: SortKey, originalIndex: Map<string, number>): number {
  if (key === "rank") {
    return (originalIndex.get(a.slug) ?? 0) - (originalIndex.get(b.slug) ?? 0);
  }
  if (key === "name") {
    return a.name.localeCompare(b.name);
  }
  if (key === "country") {
    const ac = a.country ?? "";
    const bc = b.country ?? "";
    return ac.localeCompare(bc);
  }
  if (key === "valuation") {
    return (a.valuation ?? 0) - (b.valuation ?? 0);
  }
  if (key === "dailyChange") {
    return (a.dailyChange ?? 0) - (b.dailyChange ?? 0);
  }
  return 0;
}

export function IndexTable({ companies, pageSize = 50 }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL-synced state
  const [sortKey, setSortKey] = useState<SortKey>(() => readSortFromUrl(searchParams));
  const [sortDir, setSortDir] = useState<SortDir>(() => readSortFromUrl(searchParams).dir);
  const [page, setPage] = useState<number>(() => readPageFromUrl(searchParams));
  const [country, setCountry] = useState<string>(() => readCountryFromUrl(searchParams));

  // Keep URL state in sync (replace, not push, so back-button still works)
  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    const sortVal = `${sortKey}:${sortDir}`;
    if (sortVal === "valuation:desc") sp.delete("sort"); else sp.set("sort", sortVal);
    if (page === 1) sp.delete("page"); else sp.set("page", String(page));
    if (country === "all") sp.delete("country"); else sp.set("country", country);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortKey, sortDir, page, country]);

  // Original ranks (by market cap desc, the canonical default sort)
  const originalIndex = useMemo(() => {
    const map = new Map<string, number>();
    [...companies]
      .sort((a, b) => (b.valuation ?? 0) - (a.valuation ?? 0))
      .forEach((c, i) => map.set(c.slug, i));
    return map;
  }, [companies]);

  // Country options for the dropdown
  const countries = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => {
      if (c.country) set.add(c.country);
    });
    return Array.from(set).sort();
  }, [companies]);

  // Filter + sort
  const filteredAndSorted = useMemo(() => {
    let rows = country === "all" ? companies : companies.filter((c) => c.country === country);
    rows = [...rows].sort((a, b) => {
      const cmp = compareCompanies(a, b, sortKey, originalIndex);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [companies, country, sortKey, sortDir, originalIndex]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredAndSorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      // numeric columns default to desc on first click; alpha to asc
      setSortDir(key === "name" || key === "country" ? "asc" : "desc");
    }
    setPage(1);
  };

  const SortCaret = ({ active, dir }: { active: boolean; dir: SortDir }) => {
    if (!active) return null;
    return dir === "asc"
      ? <ArrowUp size={11} strokeWidth={2.25} style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 4 }} />
      : <ArrowDown size={11} strokeWidth={2.25} style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 4 }} />;
  };

  return (
    <div
      style={{
        background: "var(--color-bg-primary)",
        border: "0.5px solid var(--color-border-subtle)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {/* Toolbar: result count + country filter */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "0.5px solid var(--color-border-medium)" }}
      >
        <div className="flex items-center gap-3">
          <h2
            className="text-[13px] font-bold uppercase tracking-[0.5px]"
            style={{ color: "var(--color-text-primary)", letterSpacing: "0.3px" }}
          >
            The Index
          </h2>
          <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
            {filteredAndSorted.length.toLocaleString()} companies
            {country !== "all" && ` · ${country}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-medium uppercase" style={{ color: "var(--color-text-tertiary)", letterSpacing: "0.3px" }}>
            Country
          </label>
          <select
            value={country}
            onChange={(e) => { setCountry(e.target.value); setPage(1); }}
            className="text-[12px] px-2 py-1 rounded-md outline-none"
            style={{
              background: "var(--color-bg-secondary)",
              color: "var(--color-text-primary)",
              border: "0.5px solid var(--color-border-medium)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <option value="all">All countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table header */}
      <div
        className="grid items-center px-4 py-2.5 text-[10px] font-semibold uppercase"
        style={{
          gridTemplateColumns: "36px 28px 1fr 140px 110px 90px 90px",
          gap: 12,
          color: "var(--color-text-tertiary)",
          letterSpacing: "0.5px",
          borderBottom: "0.5px solid var(--color-border-medium)",
          background: "var(--color-bg-secondary)",
        }}
      >
        <button
          onClick={() => handleSort("rank")}
          className="text-left transition-colors hover:opacity-70"
          style={{ color: sortKey === "rank" ? "var(--color-text-primary)" : "inherit" }}
        >
          # <SortCaret active={sortKey === "rank"} dir={sortDir} />
        </button>
        <span></span>
        <button
          onClick={() => handleSort("name")}
          className="text-left transition-colors hover:opacity-70"
          style={{ color: sortKey === "name" ? "var(--color-text-primary)" : "inherit" }}
        >
          Company <SortCaret active={sortKey === "name"} dir={sortDir} />
        </button>
        <button
          onClick={() => handleSort("country")}
          className="text-left transition-colors hover:opacity-70 hidden md:inline"
          style={{ color: sortKey === "country" ? "var(--color-text-primary)" : "inherit" }}
        >
          Country <SortCaret active={sortKey === "country"} dir={sortDir} />
        </button>
        <button
          onClick={() => handleSort("valuation")}
          className="text-right transition-colors hover:opacity-70"
          style={{ color: sortKey === "valuation" ? "var(--color-text-primary)" : "inherit" }}
        >
          Market Cap <SortCaret active={sortKey === "valuation"} dir={sortDir} />
        </button>
        <button
          onClick={() => handleSort("dailyChange")}
          className="text-right transition-colors hover:opacity-70"
          style={{ color: sortKey === "dailyChange" ? "var(--color-text-primary)" : "inherit" }}
        >
          1D <SortCaret active={sortKey === "dailyChange"} dir={sortDir} />
        </button>
        <span className="text-right hidden lg:inline">7-Day</span>
      </div>

      {/* Rows */}
      {pageRows.length === 0 ? (
        <div className="px-4 py-12 text-center text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
          No companies match the current filter.
        </div>
      ) : (
        pageRows.map((c, i) => {
          const rank = (originalIndex.get(c.slug) ?? 0) + 1;
          const change = c.dailyChange ?? 0;
          const positive = change >= 0;
          return (
            <Link
              key={c.slug}
              href={`/company/${c.slug}`}
              className="grid items-center px-4 py-3 transition-colors hover:bg-[var(--color-bg-secondary)]"
              style={{
                gridTemplateColumns: "36px 28px 1fr 140px 110px 90px 90px",
                gap: 12,
                color: "inherit",
                textDecoration: "none",
                borderBottom: i < pageRows.length - 1 ? "0.5px solid var(--color-border-subtle)" : "none",
                minHeight: 56,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: "var(--color-text-tertiary)",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {rank}
              </span>
              <CompanyAvatar
                name={c.name}
                logoUrl={c.logo_url ?? undefined}
                website={c.website ?? undefined}
                size={28}
              />
              <div className="flex flex-col min-w-0">
                <span
                  className="font-medium truncate"
                  style={{ fontSize: 14, color: "var(--color-text-primary)" }}
                >
                  {c.name}
                </span>
                {c.ticker && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-secondary)",
                      fontFamily: "var(--font-geist-mono), monospace",
                    }}
                  >
                    {c.ticker}
                  </span>
                )}
              </div>
              <span
                className="text-[12px] truncate hidden md:inline"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {c.country ?? "—"}
              </span>
              <span
                className="text-right font-medium"
                style={{
                  fontSize: 13,
                  color: "var(--color-text-primary)",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {c.valuation != null ? formatMarketCap(c.valuation) : "—"}
              </span>
              <span
                className="text-right font-semibold"
                style={{
                  fontSize: 13,
                  color: c.dailyChange != null
                    ? (positive ? "var(--color-positive)" : "var(--color-negative)")
                    : "var(--color-text-tertiary)",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {c.dailyChange != null
                  ? `${positive ? "+" : ""}${change.toFixed(2)}%`
                  : "—"}
              </span>
              <span className="hidden lg:flex items-center justify-end">
                {c.sparkline && c.sparkline.length >= 2 ? (
                  <CompanySparkline data={c.sparkline} positive={positive} width={80} height={24} />
                ) : (
                  <span style={{ color: "var(--color-text-tertiary)", fontSize: 11 }}>—</span>
                )}
              </span>
            </Link>
          );
        })
      )}

      {/* Pagination footer */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between px-4 py-3 text-[11px]"
          style={{
            borderTop: "0.5px solid var(--color-border-medium)",
            background: "var(--color-bg-secondary)",
            color: "var(--color-text-tertiary)",
            letterSpacing: "0.2px",
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="flex items-center gap-1 px-2 py-1 rounded-md font-medium transition-colors"
            style={{
              color: safePage <= 1 ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
              opacity: safePage <= 1 ? 0.4 : 1,
              cursor: safePage <= 1 ? "not-allowed" : "pointer",
              background: "transparent",
              border: "none",
            }}
            onMouseEnter={(e) => {
              if (safePage > 1) e.currentTarget.style.background = "var(--color-bg-tertiary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <ChevronLeft size={12} /> Prev
          </button>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            Page {safePage} of {totalPages} · {filteredAndSorted.length.toLocaleString()} companies
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="flex items-center gap-1 px-2 py-1 rounded-md font-medium transition-colors"
            style={{
              color: safePage >= totalPages ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
              opacity: safePage >= totalPages ? 0.4 : 1,
              cursor: safePage >= totalPages ? "not-allowed" : "pointer",
              background: "transparent",
              border: "none",
            }}
            onMouseEnter={(e) => {
              if (safePage < totalPages) e.currentTarget.style.background = "var(--color-bg-tertiary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            Next <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
