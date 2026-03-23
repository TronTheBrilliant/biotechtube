import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { formatCurrency } from "@/lib/formatting";
import Link from "next/link";
import fundingData from "@/data/funding.json";
import companiesData from "@/data/companies.json";

interface FundingRound {
  companySlug: string;
  company: string;
  type: string;
  amount: number;
  currency: string;
  date: string;
  leadInvestor: string;
  country: string;
  flag: string;
  daysAgo: number;
}

const roundBadgeColors: Record<string, { bg: string; text: string }> = {
  Seed: { bg: "#f0fdf4", text: "#166534" },
  "Series A": { bg: "#eff6ff", text: "#1d4ed8" },
  "Series B": { bg: "#f5f3ff", text: "#5b21b6" },
  "Series C": { bg: "#fef3e2", text: "#b45309" },
  Grant: { bg: "#e8f5f0", text: "#0a3d2e" },
  Public: { bg: "#f7f7f6", text: "#6b6b65" },
  "Public Offering": { bg: "#f7f7f6", text: "#6b6b65" },
  "Follow-on": { bg: "#f7f7f6", text: "#6b6b65" },
};

const jsonRounds: FundingRound[] = fundingData.map((r) => {
  const company = (companiesData as { slug: string; name: string; country?: string }[]).find(
    (c) => c.slug === r.companySlug
  );
  const now = new Date();
  const d = new Date(r.date);
  const diffDays = Math.round(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );
  return {
    companySlug: r.companySlug,
    company: company?.name || r.companySlug,
    type: r.type,
    amount: r.amount,
    currency: r.currency,
    date: r.date,
    leadInvestor: (r as Record<string, unknown>).leadInvestor as string || "Undisclosed",
    country: company?.country || "Norway",
    flag: "\u{1F1F3}\u{1F1F4}",
    daysAgo: diffDays,
  };
});

const extraRounds: FundingRound[] = [
  {
    companySlug: "biovica",
    company: "Biovica International",
    type: "Series C",
    amount: 22000000,
    currency: "USD",
    date: "2026-01-10",
    leadInvestor: "HealthCap",
    country: "Sweden",
    flag: "\u{1F1F8}\u{1F1EA}",
    daysAgo: 72,
  },
  {
    companySlug: "immunovia",
    company: "Immunovia AB",
    type: "Series B",
    amount: 15000000,
    currency: "USD",
    date: "2025-12-15",
    leadInvestor: "Novo Seeds",
    country: "Sweden",
    flag: "\u{1F1F8}\u{1F1EA}",
    daysAgo: 98,
  },
  {
    companySlug: "bavarian-nordic",
    company: "Bavarian Nordic",
    type: "Public Offering",
    amount: 45000000,
    currency: "USD",
    date: "2025-11-20",
    leadInvestor: "Public markets",
    country: "Denmark",
    flag: "\u{1F1E9}\u{1F1F0}",
    daysAgo: 123,
  },
  {
    companySlug: "evotec",
    company: "Evotec SE",
    type: "Grant",
    amount: 5000000,
    currency: "EUR",
    date: "2025-11-05",
    leadInvestor: "EU Horizon",
    country: "Germany",
    flag: "\u{1F1E9}\u{1F1EA}",
    daysAgo: 138,
  },
];

const allRounds: FundingRound[] = [...jsonRounds, ...extraRounds].sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
);

const totalRaised = allRounds.reduce((sum, r) => sum + r.amount, 0);

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function FundingRadarPage() {
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
              {formatCurrency(totalRaised, "USD")}
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
                    Country
                  </th>
                </tr>
              </thead>
              <tbody>
                {allRounds.map((row, i) => {
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
                        {formatCurrency(row.amount, row.currency)}
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
                      <td className="px-3 py-2 text-12">
                        <span>{row.flag}</span>
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
        </div>
      </div>

      <Footer />
    </div>
  );
}
