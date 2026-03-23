import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Landmark, Building2, TrendingUp } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getAllInvestors, investorSlug, InvestorWithCompanies } from "@/lib/seo-utils";
import { formatCurrency } from "@/lib/formatting";

export const revalidate = 86400;
export const dynamicParams = true;

interface InvestorPageProps {
  params: { "investor-slug": string };
}

async function getInvestorData(slug: string): Promise<InvestorWithCompanies | null> {
  const all = await getAllInvestors();
  return all.find((inv) => investorSlug(inv.name) === slug) || null;
}

export async function generateMetadata({ params }: InvestorPageProps): Promise<Metadata> {
  const investor = await getInvestorData(params["investor-slug"]);
  if (!investor) return { title: "Investor Not Found | BiotechTube" };

  const title = `${investor.name} — Biotech Portfolio & Investments | BiotechTube`;
  const description = `${investor.name} has invested in ${investor.companies.length} biotech companies. View their full portfolio, investment focus, and portfolio company analysis on BiotechTube.`;

  return {
    title,
    description,
    keywords: [investor.name, "biotech investor", "venture capital", "portfolio", ...investor.companies.map((c) => c.name).slice(0, 5)],
    openGraph: { title, description, type: "profile", siteName: "BiotechTube" },
    twitter: { card: "summary", title, description },
  };
}

export default async function InvestorPage({ params }: InvestorPageProps) {
  const investor = await getInvestorData(params["investor-slug"]);
  if (!investor || investor.companies.length < 2) notFound(); // minimum 2 portfolio companies

  // Sort companies by valuation
  const sortedCompanies = [...investor.companies].sort((a, b) => (b.valuation || 0) - (a.valuation || 0));

  // Aggregate stats
  const totalValuation = sortedCompanies.reduce((sum, c) => sum + (c.valuation || 0), 0);
  const allAreas = Array.from(new Set(sortedCompanies.flatMap((c) => c.therapeuticAreas || [])));
  const stages = sortedCompanies.reduce((acc, c) => {
    if (c.stage) acc[c.stage] = (acc[c.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Find co-investors
  const allInvestors = await getAllInvestors();
  const portfolioSlugs = new Set(investor.companies.map((c) => c.slug));
  const coInvestors = allInvestors
    .filter(
      (inv) =>
        investorSlug(inv.name) !== params["investor-slug"] &&
        inv.companies.some((c) => portfolioSlugs.has(c.slug))
    )
    .map((inv) => ({
      ...inv,
      overlap: inv.companies.filter((c) => portfolioSlugs.has(c.slug)).length,
    }))
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 8);

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: investor.name,
    description: `${investor.name} is a biotech investor with ${investor.companies.length} portfolio companies.`,
    url: `https://biotechtube.io/investors/${params["investor-slug"]}`,
  };

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
        {/* Breadcrumb */}
        <div className="max-w-4xl mx-auto px-5 pt-4">
          <div className="flex items-center gap-1.5 text-12" style={{ color: "var(--color-text-tertiary)" }}>
            <Link href="/" className="hover:underline">Home</Link>
            <span>/</span>
            <span style={{ color: "var(--color-text-secondary)" }}>Investors</span>
            <span>/</span>
            <span style={{ color: "var(--color-text-secondary)" }}>{investor.name}</span>
          </div>
        </div>

        {/* Hero */}
        <div className="max-w-4xl mx-auto px-5 py-6">
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ background: "#e8f5f0", border: "1px solid #5DCAA5" }}
            >
              <Landmark size={22} style={{ color: "#0a3d2e" }} />
            </div>
            <div>
              <h1
                className="text-[28px] font-medium tracking-tight"
                style={{ color: "var(--color-text-primary)", letterSpacing: "-0.4px" }}
              >
                {investor.name}
              </h1>
              <p className="text-14 mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                Biotech Investor &middot; {investor.companies.length} portfolio companies
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div
              className="rounded-lg border p-3"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              <div className="text-11 uppercase tracking-wide mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                Portfolio
              </div>
              <div className="text-[20px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                {investor.companies.length}
              </div>
            </div>
            {totalValuation > 0 && (
              <div
                className="rounded-lg border p-3"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                <div className="text-11 uppercase tracking-wide mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                  Combined Value
                </div>
                <div className="text-[20px] font-medium" style={{ color: "var(--color-accent)" }}>
                  {formatCurrency(totalValuation)}
                </div>
              </div>
            )}
            <div
              className="rounded-lg border p-3"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              <div className="text-11 uppercase tracking-wide mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                Focus Areas
              </div>
              <div className="text-[20px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                {allAreas.length}
              </div>
            </div>
            {Object.keys(stages).length > 0 && (
              <div
                className="rounded-lg border p-3"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                <div className="text-11 uppercase tracking-wide mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                  Top Stage
                </div>
                <div className="text-[20px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {Object.entries(stages).sort((a, b) => b[1] - a[1])[0]?.[0] || "—"}
                </div>
              </div>
            )}
          </div>

          {/* Therapeutic Areas */}
          {allAreas.length > 0 && (
            <div className="mb-6">
              <h2 className="text-14 font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>
                Investment Focus
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {allAreas.slice(0, 15).map((area) => (
                  <Link
                    key={area}
                    href={`/therapeutic-areas/${area.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`}
                    className="text-12 px-2 py-[3px] rounded-sm border hover:opacity-80"
                    style={{
                      background: "var(--color-bg-secondary)",
                      color: "var(--color-text-secondary)",
                      borderColor: "var(--color-border-subtle)",
                      borderWidth: "0.5px",
                    }}
                  >
                    {area}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Portfolio Companies */}
          <div className="mb-6">
            <h2 className="text-16 font-medium mb-3 flex items-center gap-1.5" style={{ color: "var(--color-text-primary)" }}>
              <Building2 size={16} />
              Portfolio Companies
            </h2>
            <div
              className="rounded-lg border overflow-hidden"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              <table className="w-full">
                <thead>
                  <tr style={{ background: "var(--color-bg-secondary)" }}>
                    <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium" style={{ color: "var(--color-text-tertiary)" }}>Company</th>
                    <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium hidden md:table-cell" style={{ color: "var(--color-text-tertiary)" }}>Stage</th>
                    <th className="text-right text-11 uppercase tracking-wide px-4 py-2.5 font-medium" style={{ color: "var(--color-text-tertiary)" }}>Valuation</th>
                    <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium hidden md:table-cell" style={{ color: "var(--color-text-tertiary)" }}>Focus</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCompanies.map((c) => (
                    <tr key={c.slug} className="border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
                      <td className="px-4 py-2.5">
                        <Link href={`/company/${c.slug}`} className="text-13 font-medium hover:underline" style={{ color: "var(--color-accent)" }}>
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-13 hidden md:table-cell" style={{ color: "var(--color-text-secondary)" }}>
                        {c.stage || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-13 text-right font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {c.valuation ? formatCurrency(c.valuation) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-12 hidden md:table-cell" style={{ color: "var(--color-text-tertiary)" }}>
                        {c.therapeuticAreas?.slice(0, 2).join(", ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Co-Investors */}
          {coInvestors.length > 0 && (
            <div className="mb-8">
              <h2 className="text-16 font-medium mb-3 flex items-center gap-1.5" style={{ color: "var(--color-text-primary)" }}>
                <TrendingUp size={16} />
                Frequent Co-Investors
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {coInvestors.map((ci) => (
                  <Link
                    key={ci.slug}
                    href={`/investors/${ci.slug}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:border-[var(--color-accent)] transition-colors"
                    style={{ borderColor: "var(--color-border-subtle)" }}
                  >
                    <span className="text-13 font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {ci.name}
                    </span>
                    <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>
                      {ci.overlap} shared
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      <Footer />
    </div>
  );
}
