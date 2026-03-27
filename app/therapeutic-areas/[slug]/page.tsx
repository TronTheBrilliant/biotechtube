import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { formatCurrency } from "@/lib/formatting";
import { createServerClient } from "@/lib/supabase";
import { dbRowsToCompanies } from "@/lib/adapters";
import therapeuticAreasData from "@/data/therapeutic-areas.json";
import type { Company } from "@/lib/types";

export const revalidate = 3600;

const SITE_URL = "https://www.biotechtube.io";

const CARD_COLUMNS =
  "slug, name, country, city, categories, logo_url, stage, company_type, ticker, total_raised, valuation, is_estimated, domain, founded, trending_rank, profile_views";

interface TherapeuticArea {
  slug: string;
  name: string;
  description: string;
  icon: string;
  keywords: string[];
}

const areas = therapeuticAreasData as TherapeuticArea[];

const stageBadgeColors: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  Approved: { bg: "#e8f5f0", text: "#0a3d2e", border: "#5DCAA5" },
  "Phase 3": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 2": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 1/2": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Phase 1": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Pre-clinical": {
    bg: "#f7f7f6",
    text: "#6b6b65",
    border: "rgba(0,0,0,0.14)",
  },
};

export function generateStaticParams() {
  return areas.map((a) => ({ slug: a.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const area = areas.find((a) => a.slug === params.slug);
  if (!area) return { title: "Therapeutic Area — BiotechTube" };

  const title = `${area.name} Biotech Companies — ${area.name} Drug Development | BiotechTube`;
  const description = `Discover ${area.name.toLowerCase()} biotech companies. ${area.description.slice(0, 140)}`;
  const url = `${SITE_URL}/therapeutic-areas/${area.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${area.icon} ${area.name} Biotech Companies`,
      description,
      url,
      siteName: "BiotechTube",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${area.icon} ${area.name} Biotech Companies`,
      description,
    },
  };
}

async function getCompaniesForArea(areaName: string): Promise<Company[]> {
  const supabase = createServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("companies")
    .select(CARD_COLUMNS)
    .contains("categories", [areaName])
    .order("total_raised", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return dbRowsToCompanies(data);
}

export default async function TherapeuticAreaPage({
  params,
}: {
  params: { slug: string };
}) {
  const area = areas.find((a) => a.slug === params.slug);
  if (!area) notFound();

  const companies = await getCompaniesForArea(area.name);
  const relatedAreas = areas.filter((a) => a.slug !== area.slug);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Therapeutic Areas",
        item: `${SITE_URL}/therapeutic-areas`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: area.name,
        item: `${SITE_URL}/therapeutic-areas/${area.slug}`,
      },
    ],
  };

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${area.name} Biotech Companies`,
    description: area.description,
    url: `${SITE_URL}/therapeutic-areas/${area.slug}`,
    isPartOf: { "@type": "WebSite", name: "BiotechTube", url: SITE_URL },
    about: {
      "@type": "Thing",
      name: area.name,
    },
  };

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />

      {/* Hero */}
      <div className="px-5 md:px-8 pt-8 md:pt-12 pb-6 md:pb-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <span style={{ fontSize: 48, lineHeight: 1 }}>{area.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-[28px] md:text-[36px] font-medium tracking-tight"
                style={{
                  color: "var(--color-text-primary)",
                  letterSpacing: "-0.5px",
                  lineHeight: 1.1,
                }}
              >
                {area.name}
              </h1>
            </div>
          </div>
        </div>

        <p
          className="text-14 md:text-[16px] mb-5 max-w-2xl"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}
        >
          {area.description}
        </p>

        {/* Keywords */}
        <div className="flex flex-wrap gap-2">
          {area.keywords.map((kw) => (
            <span
              key={kw}
              className="text-12 px-3 py-1.5 rounded-full border"
              style={{
                borderColor: "var(--color-border-subtle)",
                color: "var(--color-text-secondary)",
                borderWidth: "0.5px",
              }}
            >
              {kw}
            </span>
          ))}
        </div>
      </div>

      {/* Companies Section */}
      <div className="max-w-5xl mx-auto px-5 md:px-8 pb-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Column */}
          <div className="flex-1 min-w-0">
            <h2
              className="text-12 uppercase tracking-[0.5px] font-medium mb-4"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Companies in {area.name}
              {companies.length > 0 && (
                <span
                  className="ml-2 text-11 px-2 py-0.5 rounded-full border"
                  style={{
                    borderColor: "var(--color-border-subtle)",
                    color: "var(--color-text-tertiary)",
                    borderWidth: "0.5px",
                  }}
                >
                  {companies.length}
                </span>
              )}
            </h2>

            {companies.length > 0 ? (
              <div className="flex flex-col gap-3">
                {companies.map((company) => {
                  const sc =
                    stageBadgeColors[company.stage] ||
                    stageBadgeColors["Pre-clinical"];
                  return (
                    <Link
                      key={company.slug}
                      href={`/company/${company.slug}`}
                      className="block rounded-lg border px-4 py-3.5 transition-all duration-150 hover:border-[var(--color-border-medium)] hover:shadow-sm"
                      style={{
                        borderColor: "var(--color-border-subtle)",
                        borderWidth: "0.5px",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <CompanyAvatar
                          name={company.name}
                          logoUrl={company.logoUrl}
                          website={company.website}
                          size={40}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-[15px] font-medium truncate"
                              style={{ color: "var(--color-text-primary)" }}
                            >
                              {company.name}
                            </span>
                            {company.ticker && (
                              <span
                                className="text-[9px] font-medium px-1 py-[1px] rounded-sm flex-shrink-0"
                                style={{
                                  background: "var(--color-bg-secondary)",
                                  color: "var(--color-text-tertiary)",
                                  border:
                                    "0.5px solid var(--color-border-subtle)",
                                }}
                              >
                                {company.ticker}
                              </span>
                            )}
                          </div>
                          <div
                            className="text-12 mt-0.5"
                            style={{ color: "var(--color-text-tertiary)" }}
                          >
                            {company.country}
                            {company.city ? `, ${company.city}` : ""}
                            {company.founded
                              ? ` · Est. ${company.founded}`
                              : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span
                          className="text-11 px-[8px] py-[3px] rounded-sm border whitespace-nowrap"
                          style={{
                            background: sc.bg,
                            color: sc.text,
                            borderColor: sc.border,
                            borderWidth: "0.5px",
                          }}
                        >
                          {company.stage}
                        </span>
                        {company.totalRaised > 0 && (
                          <span
                            className="text-14 font-medium"
                            style={{ color: "var(--color-accent)" }}
                          >
                            {formatCurrency(company.totalRaised)}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div
                className="rounded-lg border px-6 py-8 text-center"
                style={{
                  borderColor: "var(--color-border-subtle)",
                  borderWidth: "0.5px",
                }}
              >
                <div className="text-[48px] mb-3">{area.icon}</div>
                <h2
                  className="text-[20px] font-medium mb-2"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  Coming soon
                </h2>
                <p
                  className="text-14 mb-5 max-w-md mx-auto"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  We&apos;re building the {area.name.toLowerCase()} company
                  directory. Check back soon for a comprehensive list of{" "}
                  {area.name.toLowerCase()} biotech companies.
                </p>
              </div>
            )}
          </div>

          {/* Right Sidebar (desktop) */}
          <div className="hidden lg:block w-[260px] flex-shrink-0">
            <div
              className="rounded-lg border overflow-hidden"
              style={{
                borderColor: "var(--color-border-subtle)",
                borderWidth: "0.5px",
              }}
            >
              <div
                className="px-3.5 py-2.5 border-b"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                <span
                  className="text-12 uppercase tracking-[0.5px] font-medium"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Other therapeutic areas
                </span>
              </div>
              {relatedAreas.map((ra) => (
                <Link
                  key={ra.slug}
                  href={`/therapeutic-areas/${ra.slug}`}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 border-b transition-colors duration-100 hover:bg-[var(--color-bg-secondary)]"
                  style={{ borderColor: "var(--color-border-subtle)" }}
                >
                  <span className="text-[18px]">{ra.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-13 font-medium"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {ra.name}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Related areas (mobile) */}
        <div className="mt-6 lg:hidden">
          <h2
            className="text-12 uppercase tracking-[0.5px] font-medium mb-3"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Other therapeutic areas
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {relatedAreas.slice(0, 6).map((ra) => (
              <Link
                key={ra.slug}
                href={`/therapeutic-areas/${ra.slug}`}
                className="rounded-lg border px-3 py-2.5 transition-all duration-150 hover:border-[var(--color-border-medium)] hover:shadow-sm"
                style={{
                  borderColor: "var(--color-border-subtle)",
                  borderWidth: "0.5px",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[20px]">{ra.icon}</span>
                  <div
                    className="text-13 font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {ra.name}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
