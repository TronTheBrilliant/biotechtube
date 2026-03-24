"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { useUser } from "@/lib/auth";
import { createBrowserClient } from "@/lib/supabase";
import {
  useWatchlistCollections,
  type WatchlistCollection,
} from "@/lib/useWatchlistCollections";
import {
  Heart, Trash2, BarChart3, Bell, TrendingUp,
  Building2, Search, Plus, X, Pencil, Check,
  Bookmark, FlaskConical, ChevronDown,
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

interface WatchlistPipeline {
  watchlist_id: string;
  pipeline_id: string;
  product_name: string;
  company_name: string;
  stage: string | null;
  indication: string | null;
  company_slug: string | null;
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
  const {
    collections,
    ensureDefault,
    createCollection,
    renameCollection,
    deleteCollection,
    fetchCollections,
  } = useWatchlistCollections();

  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<WatchlistCompany[]>([]);
  const [pipelines, setPipelines] = useState<WatchlistPipeline[]>([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; slug: string; ticker: string | null; country: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Collection management
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

  // Active tab: "companies" or "pipelines"
  const [activeTab, setActiveTab] = useState<"companies" | "pipelines">("companies");

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  // Auto-select first collection
  useEffect(() => {
    if (collections.length > 0 && !activeCollectionId) {
      setActiveCollectionId(collections[0].id);
    }
  }, [collections, activeCollectionId]);

  // Ensure default collection exists on first load
  useEffect(() => {
    if (user && collections.length === 0) {
      ensureDefault();
    }
  }, [user, collections.length, ensureDefault]);

  // Fetch watchlist items for active collection
  const fetchItems = useCallback(async () => {
    if (!user || !activeCollectionId) return;
    setLoading(true);

    // Fetch companies
    const { data: companyData } = await supabase
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
      .eq("collection_id", activeCollectionId)
      .order("created_at", { ascending: false });

    const mapped: WatchlistCompany[] = (companyData || [])
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

    // Fetch pipelines
    const { data: pipelineData } = await supabase
      .from("user_pipeline_watchlist")
      .select(`
        id,
        pipeline_id,
        pipelines (
          product_name,
          company_name,
          stage,
          indication,
          company_id
        )
      `)
      .eq("user_id", user.id)
      .eq("collection_id", activeCollectionId);

    // Get company slugs for pipelines
    const pipelineMapped: WatchlistPipeline[] = [];
    if (pipelineData) {
      const companyIds = Array.from(
        new Set(
          pipelineData
            .map((p: Record<string, unknown>) => {
              const pl = p.pipelines as Record<string, unknown> | null;
              return pl?.company_id as string | null;
            })
            .filter(Boolean)
        )
      );
      const slugMap = new Map<string, string>();
      if (companyIds.length > 0) {
        const { data: slugData } = await supabase
          .from("companies")
          .select("id, slug")
          .in("id", companyIds);
        if (slugData) {
          for (const s of slugData) {
            slugMap.set(s.id, s.slug);
          }
        }
      }

      for (const item of pipelineData) {
        const pl = item.pipelines as Record<string, unknown> | null;
        if (!pl) continue;
        pipelineMapped.push({
          watchlist_id: item.id as string,
          pipeline_id: item.pipeline_id as string,
          product_name: pl.product_name as string,
          company_name: pl.company_name as string,
          stage: pl.stage as string | null,
          indication: pl.indication as string | null,
          company_slug: slugMap.get(pl.company_id as string) || null,
        });
      }
    }
    setPipelines(pipelineMapped);
    setLoading(false);
  }, [user, activeCollectionId]);

  useEffect(() => {
    if (user && activeCollectionId) fetchItems();
  }, [user, activeCollectionId, fetchItems]);

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
    if (!user || !activeCollectionId) return;
    const exists = companies.some((c) => c.company_id === companyId);
    if (exists) return;

    const { error } = await supabase
      .from("user_watchlist")
      .insert({
        user_id: user.id,
        company_id: companyId,
        collection_id: activeCollectionId,
      });

    if (!error) {
      setSearchQuery("");
      setSearchResults([]);
      setShowSearch(false);
      await fetchItems();
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

  async function removePipeline(watchlistId: string) {
    const { error } = await supabase
      .from("user_pipeline_watchlist")
      .delete()
      .eq("id", watchlistId);
    if (!error) {
      setPipelines((prev) => prev.filter((p) => p.watchlist_id !== watchlistId));
    }
  }

  async function handleRename(id: string) {
    if (!editNameValue.trim()) return;
    await renameCollection(id, editNameValue.trim());
    setEditingName(null);
    setEditNameValue("");
  }

  async function handleDelete(col: WatchlistCollection) {
    if (col.is_default) return;
    await deleteCollection(col.id);
    if (activeCollectionId === col.id) {
      setActiveCollectionId(collections.find((c) => c.id !== col.id)?.id || null);
    }
  }

  async function handleCreateCollection() {
    if (!newCollectionName.trim()) return;
    const col = await createCollection(newCollectionName.trim());
    if (col) {
      setActiveCollectionId(col.id);
      setNewCollectionName("");
      setShowNewCollection(false);
    }
  }

  const activeCollection = collections.find((c) => c.id === activeCollectionId);
  const totalCompanies = companies.length;
  const totalPipelines = pipelines.length;

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
        <div className="w-full mx-auto" style={{ maxWidth: 960 }}>

          {/* Dashboard Header */}
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

          {/* Quick Stats */}
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
                  Collections
                </span>
              </div>
              <p className="text-[24px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {collections.length}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                watchlist {collections.length === 1 ? "list" : "lists"}
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
                <Building2 size={14} style={{ color: "var(--color-text-tertiary)" }} />
                <span className="text-[11px] uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                  Companies
                </span>
              </div>
              <p className="text-[24px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {totalCompanies}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                in current list
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
                <FlaskConical size={14} style={{ color: "var(--color-text-tertiary)" }} />
                <span className="text-[11px] uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                  Products
                </span>
              </div>
              <p className="text-[24px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {totalPipelines}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                pipeline items tracked
              </p>
            </div>
          </div>

          {/* Collection Tabs */}
          <div className="mb-6">
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => setActiveCollectionId(col.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
                  style={{
                    background:
                      activeCollectionId === col.id
                        ? "var(--color-accent)"
                        : "var(--color-bg-secondary)",
                    color:
                      activeCollectionId === col.id
                        ? "#fff"
                        : "var(--color-text-secondary)",
                    border:
                      activeCollectionId === col.id
                        ? "1px solid var(--color-accent)"
                        : "1px solid var(--color-border-subtle)",
                  }}
                >
                  {col.name}
                </button>
              ))}
              <button
                onClick={() => setShowNewCollection(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                style={{
                  background: "transparent",
                  color: "var(--color-text-tertiary)",
                  border: "1px dashed var(--color-border-subtle)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-accent)";
                  e.currentTarget.style.color = "var(--color-accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-border-subtle)";
                  e.currentTarget.style.color = "var(--color-text-tertiary)";
                }}
              >
                <Plus size={13} /> New list
              </button>
            </div>

            {/* New collection inline input */}
            {showNewCollection && (
              <div
                className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateCollection();
                    if (e.key === "Escape") {
                      setShowNewCollection(false);
                      setNewCollectionName("");
                    }
                  }}
                  placeholder="List name..."
                  className="flex-1 text-[13px] bg-transparent outline-none"
                  style={{ color: "var(--color-text-primary)" }}
                  autoFocus
                />
                <button
                  onClick={handleCreateCollection}
                  className="text-[12px] font-medium px-3 py-1 rounded-lg text-white"
                  style={{ background: "var(--color-accent)" }}
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowNewCollection(false);
                    setNewCollectionName("");
                  }}
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Active collection header */}
            {activeCollection && (
              <div className="flex items-center gap-3 mb-4">
                {editingName === activeCollection.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(activeCollection.id);
                        if (e.key === "Escape") setEditingName(null);
                      }}
                      className="text-[18px] font-medium bg-transparent outline-none px-1 rounded"
                      style={{
                        color: "var(--color-text-primary)",
                        border: "1px solid var(--color-border-medium)",
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleRename(activeCollection.id)}
                      className="p-1 rounded"
                      style={{ color: "var(--color-accent)" }}
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => setEditingName(null)}
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2
                      className="text-[18px] font-medium tracking-tight"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {activeCollection.name}
                    </h2>
                    <button
                      onClick={() => {
                        setEditingName(activeCollection.id);
                        setEditNameValue(activeCollection.name);
                      }}
                      className="p-1 rounded transition-colors"
                      style={{ color: "var(--color-text-tertiary)" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "var(--color-text-primary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--color-text-tertiary)";
                      }}
                      title="Rename list"
                    >
                      <Pencil size={13} />
                    </button>
                    {!activeCollection.is_default && (
                      <button
                        onClick={() => handleDelete(activeCollection)}
                        className="p-1 rounded transition-colors"
                        style={{ color: "var(--color-text-tertiary)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "#dc2626";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--color-text-tertiary)";
                        }}
                        title="Delete list"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    <span
                      className="text-[12px] ml-2"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      {totalCompanies} {totalCompanies === 1 ? "company" : "companies"}, {totalPipelines} {totalPipelines === 1 ? "product" : "products"}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Tab: Companies / Pipelines */}
          <div className="flex items-center gap-1 mb-4">
            <button
              onClick={() => setActiveTab("companies")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
              style={{
                background: activeTab === "companies" ? "var(--color-bg-tertiary)" : "transparent",
                color: activeTab === "companies" ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
              }}
            >
              <Building2 size={14} /> Companies
            </button>
            <button
              onClick={() => setActiveTab("pipelines")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
              style={{
                background: activeTab === "pipelines" ? "var(--color-bg-tertiary)" : "transparent",
                color: activeTab === "pipelines" ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
              }}
            >
              <FlaskConical size={14} /> Pipeline Products
            </button>

            {activeTab === "companies" && (
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg text-white transition-opacity ml-auto"
                style={{ background: "var(--color-accent)" }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                <Plus size={13} /> Add company
              </button>
            )}
          </div>

          {/* COMPANIES TAB */}
          {activeTab === "companies" && (
            <div className="mb-8">
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

              {/* Companies list */}
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>Loading...</p>
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
                    No companies in this list
                  </p>
                  <p className="text-[13px] mb-4" style={{ color: "var(--color-text-secondary)" }}>
                    Add companies to track them here
                  </p>
                  <button
                    onClick={() => setShowSearch(true)}
                    className="text-[13px] font-medium px-4 py-2 rounded-lg text-white inline-flex items-center gap-1.5"
                    style={{ background: "var(--color-accent)" }}
                  >
                    <Plus size={14} /> Add a company
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
                        title="Remove from list"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PIPELINES TAB */}
          {activeTab === "pipelines" && (
            <div className="mb-8">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>Loading...</p>
                </div>
              ) : pipelines.length === 0 ? (
                <div
                  className="rounded-xl py-12 text-center"
                  style={{
                    background: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border-subtle)",
                  }}
                >
                  <FlaskConical size={32} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)", opacity: 0.5 }} />
                  <p className="text-[16px] font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
                    No pipeline products in this list
                  </p>
                  <p className="text-[13px] mb-4" style={{ color: "var(--color-text-secondary)" }}>
                    Watch pipeline products from the{" "}
                    <Link href="/pipelines" style={{ color: "var(--color-accent)" }} className="underline">
                      Pipeline Tracker
                    </Link>{" "}
                    to see them here
                  </p>
                </div>
              ) : (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border-subtle)",
                  }}
                >
                  <div
                    className="hidden sm:grid px-4 py-2.5 text-[11px] font-medium"
                    style={{
                      gridTemplateColumns: "1fr 1fr 100px 40px",
                      color: "var(--color-text-tertiary)",
                      borderBottom: "1px solid var(--color-border-subtle)",
                    }}
                  >
                    <span>Product</span>
                    <span>Company</span>
                    <span>Stage</span>
                    <span />
                  </div>

                  {pipelines.map((pipeline) => (
                    <div
                      key={pipeline.watchlist_id}
                      className="grid px-4 py-3 items-center transition-colors"
                      style={{
                        gridTemplateColumns: "1fr 1fr 100px 40px",
                        borderBottom: "1px solid var(--color-border-subtle)",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-primary)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <div className="min-w-0">
                        <span className="text-[13px] font-medium truncate block" style={{ color: "var(--color-text-primary)" }}>
                          {pipeline.product_name}
                        </span>
                        {pipeline.indication && (
                          <span className="text-[11px] truncate block" style={{ color: "var(--color-text-tertiary)" }}>
                            {pipeline.indication}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        {pipeline.company_slug ? (
                          <Link
                            href={`/company/${pipeline.company_slug}`}
                            className="text-[13px] hover:underline truncate block"
                            style={{ color: "var(--color-accent)" }}
                          >
                            {pipeline.company_name}
                          </Link>
                        ) : (
                          <span className="text-[13px] truncate block" style={{ color: "var(--color-text-secondary)" }}>
                            {pipeline.company_name}
                          </span>
                        )}
                      </div>
                      <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
                        {pipeline.stage || "\u2014"}
                      </span>
                      <button
                        onClick={() => removePipeline(pipeline.watchlist_id)}
                        className="p-1 rounded transition-colors ml-auto"
                        style={{ color: "var(--color-text-tertiary)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#dc2626"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-tertiary)"; }}
                        title="Remove from list"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent Activity / Coming Soon */}
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
