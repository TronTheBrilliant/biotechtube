import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getAllInvestors } from "@/lib/seo-utils";
import Link from "next/link";

export const revalidate = 300;

export default async function TopInvestorsPage() {
  const allInvestors = await getAllInvestors();

  // Sort by number of portfolio companies (desc), then by name
  const sorted = allInvestors
    .filter((inv) => inv.companies.length >= 1)
    .sort((a, b) => {
      if (b.companies.length !== a.companies.length)
        return b.companies.length - a.companies.length;
      return a.name.localeCompare(b.name);
    });

  const top50 = sorted.slice(0, 50);

  return (
    <div
      className="page-content"
      style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}
    >
      <Nav />

      {/* Hero */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
        <h1
          className="text-[32px] md:text-[48px] font-bold tracking-tight"
          style={{
            color: "var(--color-text-primary)",
            letterSpacing: "-1px",
            lineHeight: 1.1,
          }}
        >
          Top Biotech Investors
        </h1>
        <p
          className="text-[15px] md:text-[17px] mt-2 max-w-[560px]"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}
        >
          Leading venture capital firms and institutional investors in biotech.
        </p>

        {/* Stats strip */}
        <div className="flex flex-wrap items-center gap-4 md:gap-6 mt-4">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[13px]"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Showing
            </span>
            <span
              className="text-[13px] font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {allInvestors.length.toLocaleString()} investors tracked
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-4 md:px-6 pb-8 max-w-[1200px] mx-auto">
        <div
          className="rounded-lg border overflow-hidden"
          style={{
            background: "var(--color-bg-secondary)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <table className="w-full">
              <thead>
                <tr
                  style={{
                    borderBottom: "0.5px solid var(--color-border-subtle)",
                  }}
                >
                  <th
                    className="text-left text-10 font-medium px-3 py-2 w-10"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    #
                  </th>
                  <th
                    className="text-left text-10 font-medium px-3 py-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Investor Name
                  </th>
                  <th
                    className="text-right text-10 font-medium px-3 py-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Portfolio Companies
                  </th>
                  <th
                    className="hidden md:table-cell text-left text-10 font-medium px-3 py-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Focus Areas
                  </th>
                </tr>
              </thead>
              <tbody>
                {top50.map((inv, i) => {
                  // Compute top focus areas for this investor
                  const areaCounts: Record<string, number> = {};
                  for (const c of inv.companies) {
                    for (const area of c.therapeuticAreas || []) {
                      areaCounts[area] = (areaCounts[area] || 0) + 1;
                    }
                  }
                  const topAreas = Object.entries(areaCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 2)
                    .map(([area]) => area);

                  // Show up to 3 portfolio company names
                  const sampleCompanies = inv.companies.slice(0, 3);

                  return (
                    <tr
                      key={inv.slug}
                      className="transition-colors duration-100 hover:bg-[var(--color-bg-primary)]"
                      style={{
                        borderBottom: "0.5px solid var(--color-border-subtle)",
                      }}
                    >
                      <td
                        className="px-3 py-2 text-12"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        {i + 1}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <Link
                            href={`/investors/${inv.slug}`}
                            className="text-12 font-medium hover:underline"
                            style={{ color: "var(--color-accent)" }}
                          >
                            {inv.name}
                          </Link>
                          {sampleCompanies.length > 0 && (
                            <span
                              className="text-10 mt-0.5"
                              style={{ color: "var(--color-text-tertiary)" }}
                            >
                              {sampleCompanies.map((c) => c.name).join(", ")}
                              {inv.companies.length > 3 &&
                                ` +${inv.companies.length - 3} more`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className="text-right text-12 px-3 py-2 font-semibold"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {inv.companies.length}
                      </td>
                      <td
                        className="hidden md:table-cell px-3 py-2 text-12"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {topAreas.length > 0 ? topAreas.join(", ") : "\u2014"}
                      </td>
                    </tr>
                  );
                })}
                {top50.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-8 text-center text-13"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      No investor data available at this time.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
