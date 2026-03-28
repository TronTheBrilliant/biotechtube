import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { PipelineWatchButton } from "@/components/PipelineWatchButton";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

export const revalidate = 3600;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Types ──

interface WatchlistData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  category: string;
}

interface WatchlistItemData {
  id: string;
  watchlist_id: string;
  pipeline_id: string;
  rank: number;
  reason: string | null;
  product_name: string;
  company_name: string;
  company_id: string;
  indication: string | null;
  stage: string | null;
  slug: string | null;
  company_slug: string | null;
  company_logo_url: string | null;
  company_website: string | null;
  hype_score: number | null;
}

interface SiblingWatchlist {
  name: string;
  slug: string;
  icon: string | null;
}

// ── Data Fetching ──

async function getWatchlist(slug: string): Promise<WatchlistData | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("curated_watchlists")
    .select("id, name, slug, description, icon, category")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
  return data;
}

async function getWatchlistItems(watchlistId: string): Promise<WatchlistItemData[]> {
  const supabase = getSupabase();

  const { data: items } = await supabase
    .from("curated_watchlist_items")
    .select("id, watchlist_id, pipeline_id, rank, reason")
    .eq("watchlist_id", watchlistId)
    .order("rank", { ascending: true });

  if (!items || items.length === 0) return [];

  // Get pipeline details
  const pipelineIds = items.map((i) => i.pipeline_id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pipelineMap = new Map<string, any>();

  for (let i = 0; i < pipelineIds.length; i += 200) {
    const batch = pipelineIds.slice(i, i + 200);
    const { data: pipelines } = await supabase
      .from("pipelines")
      .select("id, product_name, company_name, company_id, indication, stage, slug")
      .in("id", batch);
    if (pipelines) {
      for (const p of pipelines) pipelineMap.set(p.id, p);
    }
  }

  // Get company details
  const companyIds = [
    ...new Set(
      [...pipelineMap.values()].map((p) => p.company_id).filter(Boolean)
    ),
  ];
  const companyMap = new Map<
    string,
    { slug: string; logo_url: string | null; website: string | null }
  >();

  for (let i = 0; i < companyIds.length; i += 200) {
    const batch = companyIds.slice(i, i + 200);
    const { data: companies } = await supabase
      .from("companies")
      .select("id, slug, logo_url, website")
      .in("id", batch);
    if (companies) {
      for (const c of companies) {
        companyMap.set(c.id, {
          slug: c.slug,
          logo_url: c.logo_url,
          website: c.website,
        });
      }
    }
  }

  // Get hype scores
  const scoreMap = new Map<string, number>();
  if (pipelineIds.length > 0) {
    const { data: scores } = await supabase
      .from("product_scores")
      .select("pipeline_id, hype_score")
      .in("pipeline_id", pipelineIds);
    if (scores) {
      for (const s of scores) {
        scoreMap.set(s.pipeline_id, s.hype_score);
      }
    }
  }

  return items.map((item) => {
    const pipeline = pipelineMap.get(item.pipeline_id);
    const company = pipeline ? companyMap.get(pipeline.company_id) : null;
    return {
      id: item.id,
      watchlist_id: item.watchlist_id,
      pipeline_id: item.pipeline_id,
      rank: item.rank,
      reason: item.reason,
      product_name: pipeline?.product_name || "Unknown",
      company_name: pipeline?.company_name || "Unknown",
      company_id: pipeline?.company_id || "",
      indication: pipeline?.indication || null,
      stage: pipeline?.stage || null,
      slug: pipeline?.slug || null,
      company_slug: company?.slug || null,
      company_logo_url: company?.logo_url || null,
      company_website: company?.website || null,
      hype_score: scoreMap.get(item.pipeline_id) ?? null,
    };
  });
}

async function getSiblingWatchlists(currentSlug: string): Promise<SiblingWatchlist[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("curated_watchlists")
    .select("name, slug, icon")
    .eq("is_active", true)
    .neq("slug", currentSlug)
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  return data || [];
}

// ── SEO ──

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const watchlist = await getWatchlist(slug);
  if (!watchlist) {
    return { title: "Watchlist Not Found | BiotechTube" };
  }
  return {
    title: `${watchlist.name} — Top Pipeline Programs | BiotechTube`,
    description: watchlist.description || `Curated list of top pipeline programs: ${watchlist.name}`,
    alternates: { canonical: `https://biotechtube.io/watchlist/${slug}` },
    openGraph: {
      title: `${watchlist.name} — Top Pipeline Programs | BiotechTube`,
      description: watchlist.description || `Curated list of top pipeline programs: ${watchlist.name}`,
      url: `https://biotechtube.io/watchlist/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${watchlist.name} | BiotechTube`,
      description: watchlist.description || `Curated list of top pipeline programs`,
    },
  };
}

// ── Helpers ──

function getStageBadgeStyle(stage: string | null): React.CSSProperties {
  switch (stage) {
    case "Pre-clinical": return { background: "#f3f4f6", color: "#4b5563" };
    case "Phase 1": return { background: "#eff6ff", color: "#1d4ed8" };
    case "Phase 1/2": return { background: "#eff6ff", color: "#2563eb" };
    case "Phase 2": return { background: "#faf5ff", color: "#7c3aed" };
    case "Phase 2/3": return { background: "#faf5ff", color: "#7c3aed" };
    case "Phase 3": return { background: "#f0fdf4", color: "#15803d" };
    case "Approved": return { background: "#d1fae5", color: "#065f46" };
    default: return { background: "#f3f4f6", color: "#6b7280" };
  }
}

const RANK_STYLES: Record<number, { medal: string; borderColor: string; bgTint: string }> = {
  1: { medal: "\uD83E\uDD47", borderColor: "#D4A843", bgTint: "rgba(212,168,67,0.08)" },
  2: { medal: "\uD83E\uDD48", borderColor: "#A0A0A0", bgTint: "rgba(160,160,160,0.06)" },
  3: { medal: "\uD83E\uDD49", borderColor: "#CD7F32", bgTint: "rgba(205,127,50,0.06)" },
};

// ── Page ──

export default async function WatchlistDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const watchlist = await getWatchlist(slug);
  if (!watchlist) notFound();

  const [items, siblings] = await Promise.all([
    getWatchlistItems(watchlist.id),
    getSiblingWatchlists(slug),
  ]);

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Pipeline Intelligence", href: "/pipelines" },
    { label: watchlist.name },
  ];

  const now = new Date();
  const updatedLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div
      className="page-content"
      style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}
    >
      <Nav />
      <div className="max-w-4xl mx-auto px-4 pt-3 pb-0">
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            {watchlist.icon && (
              <span className="text-[32px]">{watchlist.icon}</span>
            )}
            <h1
              className="text-[28px] md:text-[36px] font-bold tracking-tight"
              style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px", lineHeight: 1.15 }}
            >
              {watchlist.name}
            </h1>
          </div>
          {watchlist.description && (
            <p
              className="text-[15px] md:text-[17px] mt-2 max-w-[640px] leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {watchlist.description}
            </p>
          )}
          <p
            className="text-[13px] mt-3 font-medium"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {items.length} programs &middot; Updated {updatedLabel}
          </p>
        </div>

        {/* Items list */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[14px]" style={{ color: "var(--color-text-tertiary)" }}>
                No items in this watchlist yet.
              </p>
            </div>
          ) : (
            items.map((item, i) => {
              const rank = item.rank || i + 1;
              const isTop3 = rank <= 3;
              const rankStyle = RANK_STYLES[rank];

              return (
                <div
                  key={item.id}
                  className="px-4 md:px-6 py-4 flex items-start gap-3 md:gap-4 transition-colors hover:bg-[var(--color-bg-primary)]"
                  style={{
                    borderBottom: i < items.length - 1 ? "1px solid var(--color-border-subtle)" : undefined,
                    borderLeft: isTop3 && rankStyle ? `4px solid ${rankStyle.borderColor}` : "4px solid transparent",
                    background: isTop3 && rankStyle ? rankStyle.bgTint : undefined,
                  }}
                >
                  {/* Rank indicator */}
                  <div className="flex-shrink-0 w-8 text-center pt-0.5">
                    {isTop3 && rankStyle ? (
                      <span className="text-[20px]">{rankStyle.medal}</span>
                    ) : (
                      <span
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-bold"
                        style={{
                          background: "var(--color-bg-tertiary, var(--color-bg-primary))",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {rank}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.slug ? (
                        <Link
                          href={`/product/${item.slug}`}
                          className="text-[15px] md:text-[16px] font-bold hover:underline"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {item.product_name}
                        </Link>
                      ) : (
                        <span
                          className="text-[15px] md:text-[16px] font-bold"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {item.product_name}
                        </span>
                      )}
                      {item.stage && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={getStageBadgeStyle(item.stage)}
                        >
                          {item.stage}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {item.company_slug ? (
                        <Link
                          href={`/company/${item.company_slug}`}
                          className="inline-flex items-center gap-1 hover:underline"
                        >
                          <CompanyAvatar
                            name={item.company_name}
                            logoUrl={item.company_logo_url ?? undefined}
                            website={item.company_website ?? undefined}
                            size={18}
                          />
                          <span className="text-[13px] font-medium" style={{ color: "var(--color-accent)" }}>
                            {item.company_name}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                          {item.company_name}
                        </span>
                      )}
                      {item.indication && (
                        <>
                          <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>&middot;</span>
                          <span className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
                            {item.indication}
                          </span>
                        </>
                      )}
                      {item.hype_score != null && item.hype_score > 0 && (
                        <>
                          <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>&middot;</span>
                          <span className="text-[12px] font-medium" style={{ color: "var(--color-accent)" }}>
                            Interest: {item.hype_score}/100
                          </span>
                        </>
                      )}
                    </div>

                    {item.reason && (
                      <p
                        className="text-[13px] mt-1.5 leading-relaxed"
                        style={{ color: "var(--color-text-secondary)", fontStyle: "italic" }}
                      >
                        &ldquo;{item.reason}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Watch button */}
                  <div className="flex-shrink-0 pt-1">
                    <PipelineWatchButton pipelineId={item.pipeline_id} size={14} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Other Watchlists */}
        {siblings.length > 0 && (
          <div className="mt-10">
            <h2
              className="text-[14px] font-bold mb-4"
              style={{ color: "var(--color-text-primary)" }}
            >
              Other Watchlists
            </h2>
            <div className="flex flex-wrap gap-2">
              {siblings.map((s) => (
                <Link
                  key={s.slug}
                  href={`/watchlist/${s.slug}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors hover:opacity-80"
                  style={{
                    background: "var(--color-bg-secondary)",
                    color: "var(--color-text-primary)",
                    border: "1px solid var(--color-border-subtle)",
                  }}
                >
                  {s.icon && <span>{s.icon}</span>}
                  {s.name}
                  <ArrowRight size={12} style={{ color: "var(--color-text-tertiary)" }} />
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>
      <Footer />
    </div>
  );
}
