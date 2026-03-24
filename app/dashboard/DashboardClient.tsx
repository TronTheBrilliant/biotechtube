"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { useUser } from "@/lib/auth";
import { createBrowserClient } from "@/lib/supabase";
import {
  Heart, Trash2, BarChart3, Bell, TrendingUp,
  Building2, Search, Plus, X,
} from "lucide-react";

const supabase = createBrowserClient();

interface WatchlistCompany {
  watchlist_id: string;
  company_id: string;
  name: string;
  slug: string;
  ticker: string | null;
  country: string;
  valuation: number | null;
  logo_url: string | null;
  stage: string | null;
  created_at: string;
}

function formatValuation(val: number | null): string {
  if (!val) return "\u2014";
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  return `$${val.toLocaleString()}`;
}

export default function DashboardClient() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useUser();
  const [companies, setCompanies] = useState<WatchlistCompany[]>([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; slug: string; ticker: string | null; country: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  // Fetch watchlist
  const fetchWatchlist = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("user_watchlist")
      .select(`
        id,
        company_id,
        created_at,
        companies (
          name,
          slug,
          ticker,
          country,
          valuation,
          logo_url,
          stage
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching watchlist:", error.message);
      setLoading(false);
      return;
    }

    const mapped: WatchlistCompany[] = (data || [])
      .filter((item: Record<string, unknown>) => item.companies)
      .map((item: Record<string, unknown>) => {
        const c = item.companies as Record<string, unknown>;
        return {
          watchlist_id: item.id as string,
          company_id: item.company_id as string,
          name: c.name as string,
          slug: c.slug as string,
          ticker: c.ticker as string | null,
          country: c.country as string,
          valuation: c.valuation as number | null,
          logo_url: c.logo_url as string | null,
          stage: c.stage as string | null,
          created_at: item.created_at as string,
        };
      });

    setCompanies(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchWatchlist();
  }, [user, fetchWatchlist]);

  // Search companies
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("companies")
        .select("id, name, slug, ticker, country")
        .ilike("name", `%${searchQuery}%`)
        .limit(8);
      setSearchResults(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  async function addCompany(companyId: string) {
    if (!user) return;
    const exists = companies.some((c) => c.company_id === companyId);
    if (exists) return;

    const { error } = await supabase
      .from("user_watchlist")
      .insert({ user_id: user.id, company_id: companyId });

    if (!error) {
      setSearchQuery("");
      setSearchResults([]);
      setShowSearch(false);
      await fetchWatchlist();
    }
  }

  async function removeCompany(watchlistId: string) {
    const { error } = await supabase
      .from("user_watchlist")
      .delete()
      .eq("id", watchlistId);

    if (!error) {
      setCompanies((prev) => prev.filter((c) => c.watchlist_id !== watchlistId));
    }
  }

  if (authLoading || !user) {
    return (
      <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
        <Nav />
        <main className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 120px)" }}>
          <p className="text-13" style={{ color: "var(--color-text-tertiary)" }}>Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <main className="px-4 py-10 md:py-16" style={{ minHeight: "calc(100vh - 120px)" }}>
        <div className="w-full mx-auto" style={{ maxWidth: 900 }}>

          {/* ─── Dashboard Header ─── */}
          <div className="mb-8">
            <h1
              className="text-[28px] font-medium tracking-tight mb-1"
              style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
            >
              Your Dashboard
            </h1>
            <p className="text-13" style={{ color: "var(--color-text-secondary)" }}>
              Welcome back, {profile?.full_name || user.email}
            </p>
          </div>

          {/* ─── Quick Stats ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div
              className="rounded-xl px-5 py-4"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Heart size={14} style={{ color: "var(--color-accent)" }} />
                <span className="text-[11px] uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                  Watchlist
                </span>
              </div>
              <p className="text-[24px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {companies.length}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                {companies.length === 1 ? "company" : "companies"} tracked
              </p>
            </div>

            <div
              className="rounded-xl px-5 py-4"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={14} style={{ color: "var(--color-text-tertiary)" }} />
                <span className="text-[11px] uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                  Public Companies
                </span>
              </div>
              <p className="text-[24px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {companies.filter((c) => c.ticker).length}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                with stock data
              </p>
            </div>

            <div
              className="rounded-xl px-5 py-4"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} style={{ color: "var(--color-text-tertiary)" }} />
                <span className="text-[11px] uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                  Portfolio Value
                </span>
              </div>
              <p className="text-[24px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {formatValuation(
                  companies.reduce((sum, c) => sum + (c.valuation || 0), 0) || null
                )}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                combined market cap
              </p>
            </div>
          </div>

          {/* ─── Watchlist Section ─── */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-[18px] font-medium tracking-tight"
                style={{ color: "var(--color-text-primary)" }}
              >
                Watchlist
              </h2>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg text-white transition-opacity"
                style={{ background: "var(--color-accent)" }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                <Plus size={13} /> Add company
              </button>
            </div>

            {/* Search box */}
            {showSearch && (
              <div
                className="mb-4 rounded-xl p-4"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-[13px] pl-9 pr-8 py-2.5 rounded-lg border outline-none"
                    style={{
                      borderColor: "var(--color-border-medium)",
                      background: "var(--color-bg-primary)",
                      color: "var(--color-text-primary)",
                    }}
                    placeholder="Search companies to add..."
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {(searchResults.length > 0 || searching) && (
                  <div className="mt-2">
                    {searching && (
                      <p className="text-[12px] py-2 px-1" style={{ color: "var(--color-text-tertiary)" }}>
                        Searching...
                      </p>
                    )}
                    {searchResults.map((result) => {
                      const alreadyAdded = companies.some((c) => c.company_id === result.id);
                      return (
                        <button
                          key={result.id}
                          onClick={() => !alreadyAdded && addCompany(result.id)}
                          disabled={alreadyAdded}
                          className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-left transition-colors"
                          style={{ opacity: alreadyAdded ? 0.5 : 1 }}
                          onMouseEnter={(e) => {
                            if (!alreadyAdded) e.currentTarget.style.background = "var(--color-bg-tertiary)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <div>
                            <span className="text-[13px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                              {result.name}
                            </span>
                            {result.ticker && (
                              <span className="text-[11px] ml-2" style={{ color: "var(--color-text-tertiary)" }}>
                                {result.ticker}
                              </span>
                            )}
                            <span className="text-[11px] ml-2" style={{ color: "var(--color-text-tertiary)" }}>
                              {result.country}
                            </span>
                          </div>
                          <span className="text-[11px]" style={{ color: alreadyAdded ? "var(--color-text-tertiary)" : "var(--color-accent)" }}>
                            {alreadyAdded ? "Added" : "+ Add"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Watchlist content */}
            {loading ? (
              <div className="text-center py-12">
                <p className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>Loading watchlist...</p>
              </div>
            ) : companies.length === 0 ? (
              <div
                className="rounded-xl py-12 text-center"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                <Building2 size={32} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)", opacity: 0.5 }} />
                <p className="text-[16px] font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
                  No companies yet
                </p>
                <p className="text-[13px] mb-4" style={{ color: "var(--color-text-secondary)" }}>
                  Add companies to your watchlist to track them here
                </p>
                <button
                  onClick={() => setShowSearch(true)}
                  className="text-[13px] font-medium px-4 py-2 rounded-lg text-white inline-flex items-center gap-1.5"
                  style={{ background: "var(--color-accent)" }}
                >
                  <Plus size={14} /> Add your first company
                </button>
              </div>
            ) : (
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                {/* Table header */}
                <div
                  className="hidden sm:grid px-4 py-2.5 text-[11px] font-medium"
                  style={{
                    gridTemplateColumns: "1fr 90px 100px 40px",
                    color: "var(--color-text-tertiary)",
                    borderBottom: "1px solid var(--color-border-subtle)",
                  }}
                >
                  <span>Company</span>
                  <span>Ticker</span>
                  <span className="text-right">Market Cap</span>
                  <span />
                </div>

                {/* Rows */}
                {companies.map((company) => (
                  <div
                    key={company.watchlist_id}
                    className="grid px-4 py-3 items-center transition-colors"
                    style={{
                      gridTemplateColumns: "1fr 90px 100px 40px",
                      borderBottom: "1px solid var(--color-border-subtle)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-primary)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {company.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={company.logo_url}
                          alt=""
                          className="w-7 h-7 rounded-md object-contain shrink-0"
                          style={{ background: "var(--color-bg-primary)" }}
                        />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-semibold shrink-0"
                          style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-tertiary)" }}
                        >
                          {company.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/company/${company.slug}`}
                          className="text-[13px] font-medium hover:underline truncate block"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {company.name}
                        </Link>
                        <span className="text-[11px] sm:hidden" style={{ color: "var(--color-text-tertiary)" }}>
                          {company.ticker || company.country}
                        </span>
                      </div>
                    </div>
                    <span className="text-[12px] hidden sm:block" style={{ color: "var(--color-text-tertiary)" }}>
                      {company.ticker || "\u2014"}
                    </span>
                    <span className="text-[12px] text-right hidden sm:block" style={{ color: "var(--color-text-secondary)" }}>
                      {formatValuation(company.valuation)}
                    </span>
                    <button
                      onClick={() => removeCompany(company.watchlist_id)}
                      className="p-1 rounded transition-colors ml-auto"
                      style={{ color: "var(--color-text-tertiary)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#dc2626"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-tertiary)"; }}
                      title="Remove from watchlist"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── Recent Activity / Coming Soon ─── */}
          <div className="mb-8">
            <h2
              className="text-[18px] font-medium tracking-tight mb-4"
              style={{ color: "var(--color-text-primary)" }}
            >
              Recent Activity
            </h2>
            <div
              className="rounded-xl px-6 py-8 text-center"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <Bell size={28} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)", opacity: 0.4 }} />
              <p className="text-[14px] font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
                Coming soon
              </p>
              <p className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
                Pipeline alerts, price alerts, and activity feed are on the way.
              </p>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
