"use client";

import { useState, useMemo } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

import Link from "next/link";
import fundingHistorical from "@/data/funding-historical.json";

interface HistoricalRound {
  company: string;
  companySlug: string;
  type: string;
  amount: number;
  currency: string;
  date: string;
  leadInvestor: string;
  quarter: string;
}

const roundBadgeColors: Record<string, { bg: string; text: string }> = {
  Seed: { bg: "#f0fdf4", text: "#166534" },
  "Series A": { bg: "#eff6ff", text: "#1d4ed8" },
  "Series B": { bg: "#f5f3ff", text: "#5b21b6" },
  "Series C": { bg: "#fef3e2", text: "#b45309" },
  "Series D": { bg: "#fef3e2", text: "#92400e" },
  Grant: { bg: "#e8f5f0", text: "#0a3d2e" },
  Public: { bg: "#f7f7f6", text: "#6b6b65" },
  "Public Offering": { bg: "#f7f7f6", text: "#6b6b65" },
  "Follow-on": { bg: "#f7f7f6", text: "#6b6b65" },
  IPO: { bg: "#fef9c3", text: "#854d0e" },
  Mega: { bg: "#fce7f3", text: "#9d174d" },
};

const allRounds = (fundingHistorical as HistoricalRound[]).sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
);

const totalRaisedM = allRounds.reduce((sum, r) => sum + r.amount, 0);
const uniqueCompanies = new Set(allRounds.map((r) => r.companySlug)).size;
const largestRound = allRounds.reduce((max, r) => (r.amount > max.amount ? r : max), allRounds[0]);

const PAGE_SIZE = 20;

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function FundingRadarPage() {
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(allRounds.length / PAGE_SIZE);
  const pageRounds = useMemo(
    () => allRounds.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [page]
  );

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
          Biotech Funding Radar
        </h1>
        <p
          className="text-[15px] md:text-[17px] mt-2 max-w-[620px]"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}
        >
          Track the latest venture capital and funding rounds across the biotech
          industry.
        </p>

        {/* Stats strip */}
        <div className="flex flex-wrap items-center gap-4 md:gap-6 mt-4">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[13px]"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Tracking
            </span>
            <span
              className="text-[13px] font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {allRounds.length} rounds
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-[13px]"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Total raised
            </span>
            <span
              className="text-[13px] font-semibold"
              style={{ color: "var(--color-accent)" }}
            >
              ${(totalRaisedM / 1000).toFixed(1)}B
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-[13px]"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Companies
            </span>
            <span
              className="text-[13px] font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {uniqueCompanies}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-[13px]"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Largest round
            </span>
            <span
              className="text-[13px] font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              ${largestRound.amount}M ({largestRound.company})
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
            <table className="w-full min-w-[750px]">
              <thead>
                <tr
                  style={{
                    borderBottom: "0.5px solid var(--color-border-subtle)",
                  }}
                >
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
                    Round
                  </th>
                  <th
                    className="text-right text-10 font-medium px-3 py-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Amount
                  </th>
                  <th
                    className="text-left text-10 font-medium px-3 py-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Lead Investor
                  </th>
                  <th
                    className="text-left text-10 font-medium px-3 py-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Date
                  </th>
                  <th
                    className="text-left text-10 font-medium px-3 py-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Quarter
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRounds.map((row, i) => {
                  const badge =
                    roundBadgeColors[row.type] || roundBadgeColors.Seed;
                  return (
                    <tr
                      key={`${row.companySlug}-${row.date}-${i}`}
                      className="transition-colors duration-100 hover:bg-[var(--color-bg-primary)]"
                      style={{
                        borderBottom:
                          "0.5px solid var(--color-border-subtle)",
                      }}
                    >
                      <td className="px-3 py-2">
                        <Link
                          href={`/company/${row.companySlug}`}
                          className="text-12 font-medium hover:underline"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {row.company}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className="inline-block px-2 py-[2px] rounded text-[10px] font-medium"
                          style={{
                            background: badge.bg,
                            color: badge.text,
                          }}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td
                        className="text-right text-12 px-3 py-2 font-medium"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        ${row.amount}M
                      </td>
                      <td
                        className="px-3 py-2 text-12"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {row.leadInvestor}
                      </td>
                      <td
                        className="px-3 py-2 text-12"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        {formatDate(row.date)}
                      </td>
                      <td
                        className="px-3 py-2 text-12"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        {row.quarter}
                      </td>
                    </tr>
                  );
                })}
                {allRounds.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-12 text-center"
                    >
                      <div
                        className="text-[32px] mb-2"
                        style={{ opacity: 0.4 }}
                      >
                        {"\u{1F4E1}"}
                      </div>
                      <div
                        className="text-13 font-medium mb-1"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        No funding rounds tracked yet
                      </div>
                      <div
                        className="text-12"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        Check back soon as we update our radar with the latest
                        biotech funding activity.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderTop: "0.5px solid var(--color-border-subtle)" }}
            >
              <span
                className="text-12"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                Showing {page * PAGE_SIZE + 1}&ndash;
                {Math.min((page + 1) * PAGE_SIZE, allRounds.length)} of{" "}
                {allRounds.length} rounds
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="text-12 font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-40"
                  style={{
                    background: "var(--color-bg-tertiary)",
                    color: "var(--color-text-primary)",
                    border: "0.5px solid var(--color-border-medium)",
                  }}
                >
                  Previous
                </button>
                <span
                  className="text-12"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="text-12 font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-40"
                  style={{
                    background: "var(--color-bg-tertiary)",
                    color: "var(--color-text-primary)",
                    border: "0.5px solid var(--color-border-medium)",
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
