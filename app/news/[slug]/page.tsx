import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import BlockRenderer from "@/components/news/BlockRenderer";
import ArticlePlaceholder from "@/components/news/ArticlePlaceholder";
import { TipTapDoc, Source, PlaceholderStyle } from "@/lib/article-engine/types";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { formatMarketCap } from "@/lib/market-utils";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Users,
  Tag,
  Clock,
  ExternalLink,
} from "lucide-react";

export const revalidate = 1800;

// ── Type config ──

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  funding_deal: { label: "Funding", color: "#059669" },
  clinical_trial: { label: "Clinical Trial", color: "#2563eb" },
  market_analysis: { label: "Market Analysis", color: "#7c3aed" },
  company_deep_dive: { label: "Company Spotlight", color: "#ea580c" },
  weekly_roundup: { label: "Weekly Roundup", color: "#ca8a04" },
  breaking_news: { label: "Breaking News", color: "#dc2626" },
  science_essay: { label: "Deep Science", color: "#0891b2" },
  innovation_spotlight: { label: "Innovation", color: "#d946ef" },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? { label: "News", color: "#059669" };
}

// ── Data types ──

interface ArticleRow {
  id: string;
  slug: string;
  type: string;
  status: string;
  confidence: string | null;
  headline: string;
  subtitle: string | null;
  body: TipTapDoc;
  summary: string | null;
  hero_image_url: string | null;
  hero_image_prompt: string | null;
  hero_placeholder_style: PlaceholderStyle | null;
  sources: Source[] | null;
  company_id: string | null;
  company_ids: string[] | null;
  sector: string | null;
  article_style: string | null;
  metadata: Record<string, any> | null;
  seo_title: string | null;
  seo_description: string | null;
  reading_time_min: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
  edited_by: string | null;
}

// ── Data fetching ──

async function getArticle(slug: string): Promise<ArticleRow | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("articles" as any)
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return (data as any as ArticleRow) ?? null;
}

async function getRelatedArticles(article: ArticleRow) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("articles" as any)
    .select(
      "id, slug, type, headline, subtitle, hero_image_url, hero_placeholder_style, published_at, reading_time_min"
    )
    .eq("status", "published")
    .neq("id", article.id)
    .order("published_at", { ascending: false })
    .limit(3);
  return (data ?? []) as any as Array<{
    id: string;
    slug: string;
    type: string;
    headline: string;
    subtitle: string | null;
    hero_image_url: string | null;
    hero_placeholder_style: PlaceholderStyle | null;
    published_at: string | null;
    reading_time_min: number | null;
  }>;
}

// ── Metadata ──

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) return { title: "Article Not Found | BiotechTube" };

  const title = article.seo_title || `${article.headline} | BiotechTube`;
  const description =
    article.seo_description || article.summary || article.subtitle || "";

  return {
    title,
    description,
    openGraph: {
      title: article.headline,
      description,
      type: "article",
      siteName: "BiotechTube",
      publishedTime: article.published_at ?? undefined,
      ...(article.hero_image_url
        ? { images: [{ url: article.hero_image_url }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: article.headline,
      description,
    },
    alternates: {
      canonical: `https://biotechtube.io/news/${slug}`,
    },
  };
}

// ── Page ──

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) notFound();

  const related = await getRelatedArticles(article);

  // Fetch company data if article has a company_id
  let company: { name: string; logo_url: string | null; slug: string; ticker: string | null; valuation: number | null } | null = null;
  if (article.company_id) {
    const supabase = createServerClient();
    const { data: co } = await supabase
      .from('companies')
      .select('name, logo_url, slug, ticker, valuation')
      .eq('id', article.company_id)
      .single();
    company = co;
  }

  const { label: typeLabel, color: typeColor } = getTypeConfig(article.type);

  const publishedDate = article.published_at
    ? new Date(article.published_at)
    : null;
  const dateStr = publishedDate?.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Funding metadata from metadata JSON
  const meta = article.metadata ?? {};
  const roundType = meta.round_type as string | undefined;
  const amountUsd = meta.amount_usd as number | undefined;
  const leadInvestor = meta.lead_investor as string | undefined;

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.headline,
    description: article.summary || article.subtitle || article.headline,
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    author: {
      "@type": "Organization",
      name: "BiotechTube",
      url: "https://biotechtube.io",
    },
    publisher: {
      "@type": "Organization",
      name: "BiotechTube",
      url: "https://biotechtube.io",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://biotechtube.io/news/${article.slug}`,
    },
    ...(article.hero_image_url
      ? { image: article.hero_image_url }
      : {}),
  };

  return (
    <div>
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main style={{ background: "var(--color-bg-primary)" }}>
        {/* Breadcrumb */}
        <div className="max-w-3xl mx-auto px-5 pt-20">
          <nav
            className="flex items-center gap-1.5 mb-6 flex-wrap"
            style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}
          >
            <Link
              href="/"
              className="hover:opacity-70 transition-opacity"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Home
            </Link>
            <span>/</span>
            <Link
              href="/news"
              className="hover:opacity-70 transition-opacity"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              News
            </Link>
            <span>/</span>
            <span style={{ color: "var(--color-text-secondary)" }}>
              {typeLabel}
            </span>
          </nav>
        </div>

        {/* Article header */}
        <header className="max-w-3xl mx-auto px-5 pb-8">
          {/* Category pill + reading time */}
          <div className="flex items-center gap-3 mb-4">
            <span
              className="px-2.5 py-1 rounded-full"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: typeColor,
                background: `${typeColor}14`,
              }}
            >
              {typeLabel}
            </span>
            {article.reading_time_min && (
              <span
                className="flex items-center gap-1"
                style={{
                  fontSize: 12,
                  color: "var(--color-text-tertiary)",
                }}
              >
                <Clock size={12} />
                {article.reading_time_min} min read
              </span>
            )}
          </div>

          {/* Company banner */}
          {company && (
            <Link
              href={`/company/${company.slug}`}
              className="flex items-center gap-3 mb-5 p-3 rounded-lg transition-colors hover:opacity-80"
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
              }}
            >
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="rounded"
                  style={{ width: 32, height: 32, objectFit: "contain" }}
                />
              ) : (
                <div
                  className="rounded flex items-center justify-center"
                  style={{
                    width: 32,
                    height: 32,
                    background: typeColor,
                    color: "white",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {company.name.charAt(0)}
                </div>
              )}
              <div>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                  }}
                >
                  {company.name}
                </span>
                <div className="flex items-center gap-2" style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                  {company.ticker && <span>{company.ticker}</span>}
                  {company.ticker && company.valuation && <span>·</span>}
                  {company.valuation && (
                    <span>{formatMarketCap(company.valuation)}</span>
                  )}
                </div>
              </div>
            </Link>
          )}

          {/* Headline */}
          <h1
            style={{
              fontSize: "clamp(28px, 5vw, 40px)",
              fontWeight: 500,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            {article.headline}
          </h1>

          {/* Subtitle */}
          {article.subtitle && (
            <p
              className="mt-3"
              style={{
                fontSize: 18,
                color: "var(--color-text-secondary)",
                lineHeight: 1.5,
              }}
            >
              {article.subtitle}
            </p>
          )}

          {/* Author line */}
          <div
            className="flex items-center gap-4 mt-6 pt-6"
            style={{
              borderTop: "0.5px solid var(--color-border-subtle)",
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: "var(--color-accent)",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                BT
              </div>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--color-text-primary)",
                  }}
                >
                  BiotechTube
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  {dateStr || "Recent"} · AI-assisted analysis
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Hero image or placeholder */}
        <div className="max-w-3xl mx-auto px-5 mb-8">
          {article.hero_image_url ? (
            <img
              src={article.hero_image_url}
              alt={article.headline}
              className="w-full rounded-xl"
              style={{
                aspectRatio: "2 / 1",
                objectFit: "cover",
              }}
            />
          ) : article.hero_placeholder_style ? (
            <ArticlePlaceholder
              style={article.hero_placeholder_style}
              headline={article.headline}
              className="w-full rounded-xl"
            />
          ) : null}
        </div>

        {/* Article body */}
        <article className="max-w-3xl mx-auto px-5 pb-12">
          <BlockRenderer doc={article.body} />

          {/* Funding metadata badges (for funding_deal articles) */}
          {article.type === "funding_deal" &&
            (roundType || amountUsd || leadInvestor) && (
              <div
                className="mt-10 p-6 rounded-xl"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "0.5px solid var(--color-border-subtle)",
                }}
              >
                <h3
                  className="mb-4"
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--color-text-primary)",
                  }}
                >
                  Deal Summary
                </h3>
                <div className="flex flex-wrap gap-4">
                  {roundType && (
                    <div className="flex items-center gap-2">
                      <Tag
                        size={14}
                        style={{ color: "var(--color-text-tertiary)" }}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--color-text-tertiary)",
                            textTransform: "uppercase",
                          }}
                        >
                          Round
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--color-text-primary)",
                          }}
                        >
                          {roundType}
                        </div>
                      </div>
                    </div>
                  )}
                  {amountUsd && (
                    <div className="flex items-center gap-2">
                      <DollarSign
                        size={14}
                        style={{ color: "var(--color-text-tertiary)" }}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--color-text-tertiary)",
                            textTransform: "uppercase",
                          }}
                        >
                          Amount
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--color-text-primary)",
                          }}
                        >
                          {formatMarketCap(amountUsd)}
                        </div>
                      </div>
                    </div>
                  )}
                  {leadInvestor && leadInvestor !== "Undisclosed" && (
                    <div className="flex items-center gap-2">
                      <Users
                        size={14}
                        style={{ color: "var(--color-text-tertiary)" }}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--color-text-tertiary)",
                            textTransform: "uppercase",
                          }}
                        >
                          Lead Investor
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--color-text-primary)",
                          }}
                        >
                          {leadInvestor}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Sources */}
          {article.sources && article.sources.length > 0 && (
            <div
              className="mt-10 p-6 rounded-xl"
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
              }}
            >
              <h3
                className="mb-3"
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--color-text-primary)",
                }}
              >
                Sources
              </h3>
              <ul className="space-y-2">
                {article.sources.map((source, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ExternalLink
                      size={12}
                      className="mt-1 shrink-0"
                      style={{ color: "var(--color-text-tertiary)" }}
                    />
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                      style={{
                        fontSize: 13,
                        color: "var(--color-accent)",
                        lineHeight: 1.5,
                      }}
                    >
                      {source.name}
                      {source.date && (
                        <span
                          style={{
                            color: "var(--color-text-tertiary)",
                            marginLeft: 6,
                          }}
                        >
                          ({source.date})
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>

        {/* Related articles */}
        {related.length > 0 && (
          <section
            className="py-12"
            style={{
              background: "var(--color-bg-secondary)",
              borderTop: "0.5px solid var(--color-border-subtle)",
            }}
          >
            <div className="max-w-3xl mx-auto px-5">
              <h2
                className="mb-6"
                style={{
                  fontSize: 18,
                  fontWeight: 500,
                  color: "var(--color-text-primary)",
                }}
              >
                Related Articles
              </h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {related.map((rel) => {
                  const relType = getTypeConfig(rel.type);
                  return (
                    <Link
                      key={rel.id}
                      href={`/news/${rel.slug}`}
                      className="rounded-xl overflow-hidden transition-all hover:shadow-sm"
                      style={{
                        background: "var(--color-bg-primary)",
                        border: "0.5px solid var(--color-border-subtle)",
                      }}
                    >
                      {/* Card image */}
                      <div className="w-full" style={{ aspectRatio: "2 / 1" }}>
                        {rel.hero_image_url ? (
                          <img
                            src={rel.hero_image_url}
                            alt={rel.headline}
                            className="w-full h-full object-cover"
                          />
                        ) : rel.hero_placeholder_style ? (
                          <ArticlePlaceholder
                            style={rel.hero_placeholder_style}
                            className="w-full h-full"
                          />
                        ) : (
                          <div
                            className="w-full h-full"
                            style={{ background: "#0f172a" }}
                          />
                        )}
                      </div>

                      <div className="p-4">
                        {/* Type badge */}
                        <span
                          className="inline-block px-2 py-0.5 rounded-full mb-2"
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: relType.color,
                            background: `${relType.color}14`,
                          }}
                        >
                          {relType.label}
                        </span>

                        <h3
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: "var(--color-text-primary)",
                            lineHeight: 1.35,
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {rel.headline}
                        </h3>

                        {rel.published_at && (
                          <div
                            className="mt-2"
                            style={{
                              fontSize: 11,
                              color: "var(--color-text-tertiary)",
                            }}
                          >
                            {new Date(rel.published_at).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                              }
                            )}
                            {rel.reading_time_min
                              ? ` · ${rel.reading_time_min} min`
                              : ""}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
