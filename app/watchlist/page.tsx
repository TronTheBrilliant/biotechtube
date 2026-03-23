"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { createBrowserClient } from "@/lib/supabase";
import { Search, X, Trash2, Plus } from "lucide-react";

const supabase = createBrowserClient();

interface WatchlistCompany {
  item_id: string;
  company_id: string;
  name: string;
  slug: string;
  ticker: string | null;
  country: string;
  valuation: number | null;
  logo_url: string | null;
  added_at: string;
}

function formatValuation(val: number | null): string {
  if (!val) return "\u2014";
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  return `$${val.toLocaleString()}`;
}

export default function WatchlistPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [watchlistId, setWatchlistId] = useState<string | null>(null);
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

  // Fetch default watchlist and its items
  const fetchWatchlist = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get the default watchlist
    const { data: watchlists, error: wlError } = await supabase
      .from("watchlists")
      .select("id, name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (wlError || !watchlists || watchlists.length === 0) {
      setLoading(false);
      return;
    }

    const wl = watchlists[0];
    setWatchlistId(wl.id);

    // Get items with company data
    const { data: items, error: itemsError } = await supabase
      .from("watchlist_items")
      .select(`
        id,
        company_id,
        added_at,
        companies (
          name,
          slug,
          ticker,
          country,
          valuation,
          logo_url
        )
      `)
      .eq("watchlist_id", wl.id)
      .order("added_at", { ascending: false });

    if (itemsError) {
      console.error("Error fetching watchlist items:", itemsError.message);
      setLoading(false);
      return;
    }

    const mapped: WatchlistCompany[] = (items || [])
      .filter((item: Record<string, unknown>) => item.companies)
      .map((item: Record<string, unknown>) => {
        const c = item.companies as Record<string, unknown>;
        return {
          item_id: item.id as string,
          company_id: item.company_id as string,
          name: c.name as string,
          slug: c.slug as string,
          ticker: c.ticker as string | null,
          country: c.country as string,
          valuation: c.valuation as number | null,
          logo_url: c.logo_url as string | null,
          added_at: item.added_at as string,
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
    if (!watchlistId) return;

    // Check if already in watchlist
    const exists = companies.some((c) => c.company_id === companyId);
    if (exists) return;

    const { error } = await supabase
      .from("watchlist_items")
      .insert({ watchlist_id: watchlistId, company_id: companyId });

    if (!error) {
      setSearchQuery("");
      setSearchResults([]);
      setShowSearch(false);
      await fetchWatchlist();
    }
  }

  async function removeCompany(itemId: string) {
    const { error } = await supabase
      .from("watchlist_items")
      .delete()
      .eq("id", itemId);

    if (!error) {
      setCompanies((prev) => prev.filter((c) => c.item_id !== itemId));
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

      <main
        className="flex flex-col items-center px-4 py-16"
        style={{ minHeight: "calc(100vh - 120px)" }}
      >
        <div className="w-full" style={{ maxWidth: 700 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1
                className="text-[28px] font-medium mb-1 tracking-tight"
                style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
              >
                Watchlist
              </h1>
              <p className="text-13" style={{ color: "var(--color-text-secondary)" }}>
                {companies.length} {companies.length === 1 ? "company" : "companies"} tracked
              </p>
            </div>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="flex items-center gap-1.5 text-13 font-medium px-3 py-2 rounded text-white"
              style={{ background: "var(--color-accent)" }}
            >
              <Plus size={14} /> Add company
            </button>
          </div>

          {/* Search box */}
          {showSearch && (
            <div
              className="mb-6 rounded-lg p-4"
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
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
                  className="w-full text-13 pl-9 pr-8 py-2 rounded border outline-none"
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

              {/* Search results */}
              {(searchResults.length > 0 || searching) && (
                <div className="mt-2">
                  {searching && (
                    <p className="text-12 py-2 px-1" style={{ color: "var(--color-text-tertiary)" }}>
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
                        style={{
                          opacity: alreadyAdded ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (!alreadyAdded) e.currentTarget.style.background = "var(--color-bg-tertiary)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <div>
                          <span className="text-13 font-medium" style={{ color: "var(--color-text-primary)" }}>
                            {result.name}
                          </span>
                          {result.ticker && (
                            <span className="text-11 ml-2" style={{ color: "var(--color-text-tertiary)" }}>
                              {result.ticker}
                            </span>
                          )}
                          <span className="text-11 ml-2" style={{ color: "var(--color-text-tertiary)" }}>
                            {result.country}
                          </span>
                        </div>
                        <span className="text-11" style={{ color: alreadyAdded ? "var(--color-text-tertiary)" : "var(--color-accent)" }}>
                          {alreadyAdded ? "Added" : "+ Add"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Companies list */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-13" style={{ color: "var(--color-text-tertiary)" }}>Loading watchlist...</p>
            </div>
          ) : companies.length === 0 ? (
            <div
              className="rounded-lg py-12 text-center"
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
              }}
            >
              <p className="text-[18px] font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>
                No companies yet
              </p>
              <p className="text-13 mb-4" style={{ color: "var(--color-text-secondary)" }}>
                Add companies to your watchlist to track them
              </p>
              <button
                onClick={() => setShowSearch(true)}
                className="text-13 font-medium px-4 py-2 rounded text-white inline-flex items-center gap-1.5"
                style={{ background: "var(--color-accent)" }}
              >
                <Plus size={14} /> Add your first company
              </button>
            </div>
          ) : (
            <div
              className="rounded-lg overflow-hidden"
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
              }}
            >
              {/* Table header */}
              <div
                className="grid px-4 py-2.5 text-11 font-medium"
                style={{
                  gridTemplateColumns: "1fr 100px 100px 40px",
                  color: "var(--color-text-tertiary)",
                  borderBottom: "1px solid var(--color-border-subtle)",
                }}
              >
                <span>Company</span>
                <span>Ticker</span>
                <span className="text-right">Valuation</span>
                <span />
              </div>

              {/* Rows */}
              {companies.map((company) => (
                <div
                  key={company.item_id}
                  className="grid px-4 py-3 items-center transition-colors"
                  style={{
                    gridTemplateColumns: "1fr 100px 100px 40px",
                    borderBottom: "1px solid var(--color-border-subtle)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <Link
                    href={`/company/${company.slug}`}
                    className="text-13 font-medium hover:underline"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {company.name}
                  </Link>
                  <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>
                    {company.ticker || "\u2014"}
                  </span>
                  <span className="text-12 text-right" style={{ color: "var(--color-text-secondary)" }}>
                    {formatValuation(company.valuation)}
                  </span>
                  <button
                    onClick={() => removeCompany(company.item_id)}
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
      </main>

      <Footer />
    </div>
  );
}
