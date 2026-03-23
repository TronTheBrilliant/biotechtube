"use client";
import { useState } from "react";
import Link from "next/link";
import { formatMarketCap, formatPercent, pctColor } from "@/lib/market-utils";
import { CompanyAvatar } from "@/components/CompanyAvatar";

const PAGE_SIZE = 50;

interface RankedCompany {
  slug: string;
  name: string;
  ticker: string | null;
  country: string | null;
  logo_url: string | null;
  website: string | null;
  marketCap: number;
  change1d: number | null;
}

export function TopCompaniesClient({
  companies,
}: {
  companies: RankedCompany[];
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(companies.length / PAGE_SIZE));

  const start = (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, companies.length);
  const pageCompanies = companies.slice(start, end);

  const prev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const next = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  return (
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
                Company
              </th>
              <th
                className="text-left text-10 font-medium px-3 py-2"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                Country
              </th>
              <th
                className="text-right text-10 font-medium px-3 py-2"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                Market Cap
              </th>
              <th
                className="hidden md:table-cell text-right text-10 font-medium px-3 py-2"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                1D Change
              </th>
            </tr>
          </thead>
          <tbody>
            {pageCompanies.map((c, i) => (
              <tr
                key={c.slug}
                className="transition-colors duration-100 hover:bg-[var(--color-bg-primary)]"
                style={{
                  borderBottom: "0.5px solid var(--color-border-subtle)",
                }}
              >
                <td
                  className="px-3 py-2 text-12"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  {start + i + 1}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/company/${c.slug}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <CompanyAvatar
                      name={c.name}
                      logoUrl={c.logo_url ?? undefined}
                      website={c.website ?? undefined}
                      size={24}
                    />
                    <div className="flex flex-col">
                      <span
                        className="text-12 font-medium truncate max-w-[150px] md:max-w-none inline-block"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {c.name}
                      </span>
                      {c.ticker && (
                        <span
                          className="text-10"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          {c.ticker}
                        </span>
                      )}
                    </div>
                  </Link>
                </td>
                <td
                  className="px-3 py-2 text-12"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {c.country || "\u2014"}
                </td>
                <td
                  className="text-right text-12 px-3 py-2"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {formatMarketCap(c.marketCap)}
                </td>
                <td
                  className="hidden md:table-cell text-right text-12 px-3 py-2 font-semibold"
                  style={{ color: pctColor(c.change1d) }}
                >
                  {c.change1d !== null ? formatPercent(c.change1d) : "\u2014"}
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-13"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  No company data available at this time.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {companies.length > 0 && (
        <div
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          <span
            className="text-12"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Showing {start + 1}&ndash;{end} of {companies.length} companies
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={prev}
              className="text-12 px-3 py-1.5 rounded border transition-opacity"
              style={{
                borderColor: "var(--color-border-subtle)",
                color:
                  currentPage === 1
                    ? "var(--color-text-tertiary)"
                    : "var(--color-text-primary)",
                background: "var(--color-bg-primary)",
                opacity: currentPage === 1 ? 0.5 : 1,
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
              }}
            >
              Previous
            </button>
            <span
              className="text-12 font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={next}
              className="text-12 px-3 py-1.5 rounded border transition-opacity"
              style={{
                borderColor: "var(--color-border-subtle)",
                color:
                  currentPage === totalPages
                    ? "var(--color-text-tertiary)"
                    : "var(--color-text-primary)",
                background: "var(--color-bg-primary)",
                opacity: currentPage === totalPages ? 0.5 : 1,
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
