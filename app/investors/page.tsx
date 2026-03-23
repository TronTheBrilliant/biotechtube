import { Metadata } from "next";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getAllInvestors } from "@/lib/seo-utils";
import { formatCurrency } from "@/lib/formatting";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Biotech Investors — Venture Capital & Portfolio Tracker | BiotechTube",
  description:
    "Explore biotech and pharmaceutical investors, venture capital firms, and their portfolio companies. Track investment activity, portfolio valuations, and therapeutic focus areas.",
  keywords: [
    "biotech investors",
    "biotech venture capital",
    "pharma investors",
    "biotech portfolio",
    "life science VC",
    "biotech funding",
  ],
};

export default async function InvestorsIndex() {
  const allInvestors = await getAllInvestors();

  // Only show investors with 2+ portfolio companies (same threshold as individual pages)
  const qualifiedInvestors = allInvestors
    .filter((inv) => inv.companies.length >= 2)
    .sort((a, b) => {
      // Sort by combined portfolio value, then by company count
      const aVal = a.companies.reduce((sum, c) => sum + (c.valuation || 0), 0);
      const bVal = b.companies.reduce((sum, c) => sum + (c.valuation || 0), 0);
      if (bVal !== aVal) return bVal - aVal;
      return b.companies.length - a.companies.length;
    });

  // Compute stats
  const totalPortfolioCompanies = new Set(
    qualifiedInvestors.flatMap((inv) => inv.companies.map((c) => c.slug))
  ).size;

  // Top focus areas
  const areaCounts: Record<string, number> = {};
  for (const inv of qualifiedInvestors) {
    for (const c of inv.companies) {
      for (const area of c.therapeuticAreas || []) {
        areaCounts[area] = (areaCounts[area] || 0) + 1;
      }
    }
  }
  const topAreas = Object.entries(areaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([area]) => area);

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />
      <div className="max-w-4xl mx-auto px-5 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-12 mb-4" style={{ color: "var(--color-text-tertiary)" }}>
          <Link href="/" className="hover:underline">Home</Link>
          <span>/</span>
          <span style={{ color: "var(--color-text-secondary)" }}>Investors</span>
        </div>

        <h1
          className="text-[32px] font-medium tracking-tight mb-2"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
        >
          Biotech Investors
        </h1>
        <p className="text-15 mb-2" style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}>
          {qualifiedInvestors.length.toLocaleString()} venture capital firms, institutional investors, and funds
          backing biotech and pharmaceutical companies. Sorted by portfolio value.
        </p>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="text-13" style={{ color: "var(--color-text-tertiary)" }}>
            <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>{qualifiedInvestors.length.toLocaleString()}</span> investors
          </div>
          <div className="text-13" style={{ color: "var(--color-text-tertiary)" }}>
            <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>{totalPortfolioCompanies.toLocaleString()}</span> portfolio companies
          </div>
        </div>

        {/* Top focus areas */}
        {topAreas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {topAreas.map((area) => (
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
        )}

        {/* Investor list */}
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--color-border-subtle)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--color-bg-secondary)" }}>
                <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                  Investor
                </th>
                <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium hidden md:table-cell" style={{ color: "var(--color-text-tertiary)" }}>
                  Portfolio
                </th>
                <th className="text-right text-11 uppercase tracking-wide px-4 py-2.5 font-medium hidden md:table-cell" style={{ color: "var(--color-text-tertiary)" }}>
                  Combined Value
                </th>
                <th className="text-left text-11 uppercase tracking-wide px-4 py-2.5 font-medium hidden lg:table-cell" style={{ color: "var(--color-text-tertiary)" }}>
                  Focus
                </th>
              </tr>
            </thead>
            <tbody>
              {qualifiedInvestors.map((inv) => {
                const totalVal = inv.companies.reduce((sum, c) => sum + (c.valuation || 0), 0);

                // Top therapeutic area for this investor
                const invAreas: Record<string, number> = {};
                for (const c of inv.companies) {
                  for (const a of c.therapeuticAreas || []) {
                    invAreas[a] = (invAreas[a] || 0) + 1;
                  }
                }
                const topArea = Object.entries(invAreas).sort((a, b) => b[1] - a[1])[0]?.[0];

                return (
                  <tr
                    key={inv.slug}
                    className="border-t"
                    style={{ borderColor: "var(--color-border-subtle)" }}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/investors/${inv.slug}`}
                        className="text-14 font-medium hover:underline flex items-center gap-2"
                        style={{ color: "var(--color-accent)" }}
                      >
                        <Landmark size={14} className="shrink-0" style={{ color: "var(--color-text-tertiary)" }} />
                        {inv.name}
                      </Link>
                      <div className="md:hidden text-12 mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                        {inv.companies.length} companies
                        {totalVal > 0 && ` · ${formatCurrency(totalVal)}`}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-13 hidden md:table-cell" style={{ color: "var(--color-text-secondary)" }}>
                      {inv.companies.length} {inv.companies.length === 1 ? "company" : "companies"}
                    </td>
                    <td className="px-4 py-3 text-13 text-right hidden md:table-cell" style={{ color: "var(--color-text-secondary)" }}>
                      {totalVal > 0 ? formatCurrency(totalVal) : "—"}
                    </td>
                    <td className="px-4 py-3 text-12 hidden lg:table-cell" style={{ color: "var(--color-text-tertiary)" }}>
                      {topArea || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </div>
  );
}
