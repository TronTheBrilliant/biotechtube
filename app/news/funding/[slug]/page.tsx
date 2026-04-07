import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { formatMarketCap } from "@/lib/market-utils";
import { ArrowLeft, Calendar, DollarSign, Building2, MapPin, Users, ArrowUpRight, Tag } from "lucide-react";

export const revalidate = 3600;

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

interface ArticleRow {
  id: string;
  slug: string;
  headline: string;
  subtitle: string | null;
  body: string;
  company_name: string;
  company_slug: string | null;
  company_id: string | null;
  round_type: string | null;
  amount_usd: number | null;
  lead_investor: string | null;
  round_date: string | null;
  sector: string | null;
  country: string | null;
  deal_size_category: string | null;
  article_type: string;
  published_at: string;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("funding_articles")
    .select("headline, subtitle, company_name, amount_usd, round_type, round_date, sector")
    .eq("slug", params.slug)
    .single();

  if (!data) return { title: "Article Not Found | BiotechTube" };

  const amountStr = data.amount_usd ? formatMarketCap(data.amount_usd) : "";
  const description = data.subtitle || `${data.company_name} ${data.round_type || "funding"} round${amountStr ? ` of ${amountStr}` : ""}. Analysis and insights.`;

  return {
    title: `${data.headline} | BiotechTube`,
    description,
    openGraph: {
      title: data.headline,
      description,
      type: "article",
      siteName: "BiotechTube",
      publishedTime: data.round_date || undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: data.headline,
      description,
    },
    alternates: {
      canonical: `https://biotechtube.io/news/funding/${params.slug}`,
    },
  };
}

export default async function FundingArticlePage({ params }: { params: { slug: string } }) {
  const supabase = getSupabase();

  const { data: article } = await supabase
    .from("funding_articles")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!article) notFound();

  // Get related articles (same sector or same round type)
  const { data: related } = await supabase
    .from("funding_articles")
    .select("id, slug, headline, company_name, amount_usd, round_type, round_date, sector")
    .neq("id", article.id)
    .order("published_at", { ascending: false })
    .limit(20);

  // Prioritize same sector, then same round type
  const relatedArticles = (related || [])
    .sort((a, b) => {
      const aScore = (a.sector === article.sector ? 2 : 0) + (a.round_type === article.round_type ? 1 : 0);
      const bScore = (b.sector === article.sector ? 2 : 0) + (b.round_type === article.round_type ? 1 : 0);
      return bScore - aScore;
    })
    .slice(0, 4);

  // Company info
  let companyInfo: { description: string | null; ticker: string | null; valuation: number | null; logo_url: string | null } | null = null;
  if (article.company_id) {
    const { data } = await supabase
      .from("companies")
      .select("description, ticker, valuation, logo_url")
      .eq("id", article.company_id)
      .single();
    companyInfo = data;
  }

  const date = article.round_date ? new Date(article.round_date) : null;
  const dateStr = date?.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const ROUND_COLORS: Record<string, string> = {
    Seed: "#16a34a", "Series A": "#2563eb", "Series B": "#7c3aed",
    "Series C": "#d97706", "Series D": "#dc2626", IPO: "#059669",
    Grant: "#0891b2", Venture: "#6366f1",
  };
  const roundColor = ROUND_COLORS[article.round_type || ""] || "#059669";

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.headline,
    description: article.subtitle || article.headline,
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    author: { "@type": "Organization", name: "BiotechTube", url: "https://biotechtube.io" },
    publisher: { "@type": "Organization", name: "BiotechTube", url: "https://biotechtube.io" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://biotechtube.io/news/funding/${article.slug}` },
    about: {
      "@type": "MonetaryGrant",
      amount: article.amount_usd ? { "@type": "MonetaryAmount", value: article.amount_usd, currency: "USD" } : undefined,
      funder: article.lead_investor ? { "@type": "Organization", name: article.lead_investor } : undefined,
    },
  };

  return (
    <div>
      <Nav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main style={{ background: "var(--color-bg-primary)" }}>
        {/* Breadcrumb */}
        <div className="max-w-3xl mx-auto px-5 pt-20">
          <Link
            href="/news/funding"
            className="inline-flex items-center gap-1.5 mb-6 transition-opacity hover:opacity-70"
            style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}
          >
            <ArrowLeft size={14} />
            Funding News
          </Link>
        </div>

        {/* Article header */}
        <header className="max-w-3xl mx-auto px-5 pb-8">
          {/* Meta badges */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {article.round_type && (
              <span className="px-2.5 py-1 rounded-full" style={{ fontSize: 11, fontWeight: 500, color: roundColor, background: `${roundColor}12` }}>
                {article.round_type}
              </span>
            )}
            {article.amount_usd && (
              <span className="px-2.5 py-1 rounded-full" style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-primary)", background: "var(--color-bg-secondary)" }}>
                {formatMarketCap(article.amount_usd)}
              </span>
            )}
            {article.sector && (
              <span className="px-2.5 py-1 rounded-full" style={{ fontSize: 11, color: "var(--color-text-secondary)", background: "var(--color-bg-secondary)" }}>
                {article.sector}
              </span>
            )}
          </div>

          <h1 style={{ fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 500, color: "var(--color-text-primary)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            {article.headline}
          </h1>

          {article.subtitle && (
            <p className="mt-3" style={{ fontSize: 18, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
              {article.subtitle}
            </p>
          )}

          {/* Author line */}
          <div className="flex items-center gap-4 mt-6 pt-6" style={{ borderTop: "0.5px solid var(--color-border-subtle)" }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--color-accent)", color: "white", fontSize: 12, fontWeight: 500 }}>
                BT
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>BiotechTube Research</div>
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                  {dateStr || "Recent"} · AI-assisted analysis
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Article body */}
        <article className="max-w-3xl mx-auto px-5 pb-12">
          <div className="prose">
            {article.body.split("\n\n").map((paragraph: string, i: number) => (
              <p key={i} style={{ fontSize: 17, lineHeight: 1.85, color: "var(--color-text-secondary)", marginBottom: 24 }}>
                {paragraph}
              </p>
            ))}
          </div>

          {/* Deal summary card */}
          <div className="mt-10 p-6 rounded-xl" style={{ background: "var(--color-bg-secondary)", border: "0.5px solid var(--color-border-subtle)" }}>
            <h3 className="mb-4" style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>Deal Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {article.company_name && (
                <div className="flex items-start gap-2">
                  <Building2 size={14} className="mt-0.5 shrink-0" style={{ color: "var(--color-text-tertiary)" }} />
                  <div>
                    <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>Company</div>
                    {article.company_slug ? (
                      <Link href={`/company/${article.company_slug}`} className="hover:underline" style={{ fontSize: 13, fontWeight: 500, color: "var(--color-accent)" }}>
                        {article.company_name} <ArrowUpRight size={11} className="inline" />
                      </Link>
                    ) : (
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{article.company_name}</div>
                    )}
                  </div>
                </div>
              )}
              {article.amount_usd && (
                <div className="flex items-start gap-2">
                  <DollarSign size={14} className="mt-0.5 shrink-0" style={{ color: "var(--color-text-tertiary)" }} />
                  <div>
                    <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>Amount</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{formatMarketCap(article.amount_usd)}</div>
                  </div>
                </div>
              )}
              {article.round_type && (
                <div className="flex items-start gap-2">
                  <Tag size={14} className="mt-0.5 shrink-0" style={{ color: "var(--color-text-tertiary)" }} />
                  <div>
                    <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>Round</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{article.round_type}</div>
                  </div>
                </div>
              )}
              {article.lead_investor && article.lead_investor !== "Undisclosed" && (
                <div className="flex items-start gap-2">
                  <Users size={14} className="mt-0.5 shrink-0" style={{ color: "var(--color-text-tertiary)" }} />
                  <div>
                    <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>Lead Investor</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{article.lead_investor}</div>
                  </div>
                </div>
              )}
              {dateStr && (
                <div className="flex items-start gap-2">
                  <Calendar size={14} className="mt-0.5 shrink-0" style={{ color: "var(--color-text-tertiary)" }} />
                  <div>
                    <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>Date</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{dateStr}</div>
                  </div>
                </div>
              )}
              {article.country && (
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: "var(--color-text-tertiary)" }} />
                  <div>
                    <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>Geography</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{article.country}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Company context */}
          {companyInfo?.description && (
            <div className="mt-6 p-6 rounded-xl" style={{ background: "var(--color-bg-secondary)", border: "0.5px solid var(--color-border-subtle)" }}>
              <h3 className="mb-3" style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
                About {article.company_name}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-text-secondary)" }}>
                {companyInfo.description.substring(0, 300)}
                {companyInfo.description.length > 300 ? "..." : ""}
              </p>
              {article.company_slug && (
                <Link
                  href={`/company/${article.company_slug}`}
                  className="inline-flex items-center gap-1 mt-3 transition-opacity hover:opacity-70"
                  style={{ fontSize: 13, color: "var(--color-accent)", fontWeight: 500 }}
                >
                  View full profile <ArrowUpRight size={12} />
                </Link>
              )}
            </div>
          )}
        </article>

        {/* Related articles */}
        {relatedArticles.length > 0 && (
          <section className="py-12" style={{ background: "var(--color-bg-secondary)", borderTop: "0.5px solid var(--color-border-subtle)" }}>
            <div className="max-w-3xl mx-auto px-5">
              <h2 className="mb-6" style={{ fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)" }}>
                Related Funding News
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {relatedArticles.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/news/funding/${rel.slug}`}
                    className="rounded-xl p-4 transition-all hover:shadow-sm"
                    style={{ background: "var(--color-bg-primary)", border: "0.5px solid var(--color-border-subtle)" }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {rel.round_type && (
                        <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 500, color: ROUND_COLORS[rel.round_type] || "#059669", background: `${ROUND_COLORS[rel.round_type] || "#059669"}12` }}>
                          {rel.round_type}
                        </span>
                      )}
                      {rel.amount_usd && (
                        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>
                          {formatMarketCap(rel.amount_usd)}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.35 }}>
                      {rel.headline}
                    </h3>
                    <div className="mt-2" style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                      {rel.company_name}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
