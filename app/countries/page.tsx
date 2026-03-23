import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { formatMarketCap, formatPercent, pctColor } from "@/lib/market-utils";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface CountryRow {
  country: string;
  combined_market_cap: number | null;
  total_volume: number | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
  public_company_count: number | null;
}

const COUNTRY_FLAGS: Record<string, string> = {
  "United States": "\u{1F1FA}\u{1F1F8}",
  Canada: "\u{1F1E8}\u{1F1E6}",
  "United Kingdom": "\u{1F1EC}\u{1F1E7}",
  Germany: "\u{1F1E9}\u{1F1EA}",
  France: "\u{1F1EB}\u{1F1F7}",
  Switzerland: "\u{1F1E8}\u{1F1ED}",
  Norway: "\u{1F1F3}\u{1F1F4}",
  Sweden: "\u{1F1F8}\u{1F1EA}",
  Denmark: "\u{1F1E9}\u{1F1F0}",
  Finland: "\u{1F1EB}\u{1F1EE}",
  Israel: "\u{1F1EE}\u{1F1F1}",
  Australia: "\u{1F1E6}\u{1F1FA}",
  Japan: "\u{1F1EF}\u{1F1F5}",
  China: "\u{1F1E8}\u{1F1F3}",
  "South Korea": "\u{1F1F0}\u{1F1F7}",
  India: "\u{1F1EE}\u{1F1F3}",
  Belgium: "\u{1F1E7}\u{1F1EA}",
  Netherlands: "\u{1F1F3}\u{1F1F1}",
  Italy: "\u{1F1EE}\u{1F1F9}",
  Spain: "\u{1F1EA}\u{1F1F8}",
  Singapore: "\u{1F1F8}\u{1F1EC}",
  "Hong Kong": "\u{1F1ED}\u{1F1F0}",
  Ireland: "\u{1F1EE}\u{1F1EA}",
  Austria: "\u{1F1E6}\u{1F1F9}",
  Brazil: "\u{1F1E7}\u{1F1F7}",
  Taiwan: "\u{1F1F9}\u{1F1FC}",
  "New Zealand": "\u{1F1F3}\u{1F1FF}",
  Iceland: "\u{1F1EE}\u{1F1F8}",
  Portugal: "\u{1F1F5}\u{1F1F9}",
  Poland: "\u{1F1F5}\u{1F1F1}",
  Greece: "\u{1F1EC}\u{1F1F7}",
  Mexico: "\u{1F1F2}\u{1F1FD}",
  "South Africa": "\u{1F1FF}\u{1F1E6}",
  Thailand: "\u{1F1F9}\u{1F1ED}",
  Malaysia: "\u{1F1F2}\u{1F1FE}",
  Indonesia: "\u{1F1EE}\u{1F1E9}",
  Turkey: "\u{1F1F9}\u{1F1F7}",
  "Czech Republic": "\u{1F1E8}\u{1F1FF}",
  Hungary: "\u{1F1ED}\u{1F1FA}",
  Argentina: "\u{1F1E6}\u{1F1F7}",
  Chile: "\u{1F1E8}\u{1F1F1}",
  Colombia: "\u{1F1E8}\u{1F1F4}",
  "Saudi Arabia": "\u{1F1F8}\u{1F1E6}",
  "United Arab Emirates": "\u{1F1E6}\u{1F1EA}",
  Luxembourg: "\u{1F1F1}\u{1F1FA}",
  Russia: "\u{1F1F7}\u{1F1FA}",
  Philippines: "\u{1F1F5}\u{1F1ED}",
  Vietnam: "\u{1F1FB}\u{1F1F3}",
  Egypt: "\u{1F1EA}\u{1F1EC}",
  Pakistan: "\u{1F1F5}\u{1F1F0}",
  Nigeria: "\u{1F1F3}\u{1F1EC}",
  Kenya: "\u{1F1F0}\u{1F1EA}",
  Romania: "\u{1F1F7}\u{1F1F4}",
  Croatia: "\u{1F1ED}\u{1F1F7}",
  Slovenia: "\u{1F1F8}\u{1F1EE}",
  Estonia: "\u{1F1EA}\u{1F1EA}",
  Latvia: "\u{1F1F1}\u{1F1FB}",
  Lithuania: "\u{1F1F1}\u{1F1F9}",
  Bulgaria: "\u{1F1E7}\u{1F1EC}",
  Slovakia: "\u{1F1F8}\u{1F1F0}",
  Serbia: "\u{1F1F7}\u{1F1F8}",
};

function countrySlug(country: string): string {
  return country.toLowerCase().replace(/\s+/g, "-");
}

async function getCountryData(): Promise<CountryRow[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: latestDate } = await supabase
    .from("country_market_data")
    .select("snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .single();

  if (!latestDate) return [];

  const { data: rows } = await supabase
    .from("country_market_data")
    .select(
      "country, combined_market_cap, total_volume, change_1d_pct, change_7d_pct, change_30d_pct, public_company_count"
    )
    .eq("snapshot_date", latestDate.snapshot_date);

  return ((rows ?? []) as CountryRow[]).sort(
    (a, b) => (b.combined_market_cap ?? 0) - (a.combined_market_cap ?? 0)
  );
}

export default async function CountriesPage() {
  const countries = await getCountryData();

  const totalMarketCap = countries.reduce(
    (sum, c) => sum + (c.combined_market_cap ?? 0),
    0
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
          Biotech Market by Country
        </h1>
        <p
          className="text-[15px] md:text-[17px] mt-2 max-w-[620px]"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}
        >
          Explore the global biotech landscape &mdash; market cap, company
          count, and performance by country.
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
              {countries.length} countries
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-[13px]"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Total market cap
            </span>
            <span
              className="text-[13px] font-semibold"
              style={{ color: "var(--color-accent)" }}
            >
              {formatMarketCap(totalMarketCap)}
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
                    Country
                  </th>
                  <th
                    className="text-right text-10 font-medium px-3 py-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Market Cap
                  </th>
                  <th
                    className="text-right text-10 font-medium px-3 py-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    1D %
                  </th>
                  <th
                    className="hidden md:table-cell text-right text-10 font-medium px-3 py-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    7D %
                  </th>
                  <th
                    className="hidden md:table-cell text-right text-10 font-medium px-3 py-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Public Companies
                  </th>
                </tr>
              </thead>
              <tbody>
                {countries.map((c, i) => (
                  <tr
                    key={c.country}
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
                      <Link
                        href={`/companies/${countrySlug(c.country)}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <span className="text-[16px]">
                          {COUNTRY_FLAGS[c.country] ?? ""}
                        </span>
                        <span
                          className="text-12 font-medium"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {c.country}
                        </span>
                      </Link>
                    </td>
                    <td
                      className="text-right text-12 px-3 py-2"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {formatMarketCap(c.combined_market_cap ?? 0)}
                    </td>
                    <td
                      className="text-right text-12 px-3 py-2 font-medium"
                      style={{ color: pctColor(c.change_1d_pct) }}
                    >
                      {formatPercent(c.change_1d_pct)}
                    </td>
                    <td
                      className="hidden md:table-cell text-right text-12 px-3 py-2 font-medium"
                      style={{ color: pctColor(c.change_7d_pct) }}
                    >
                      {formatPercent(c.change_7d_pct)}
                    </td>
                    <td
                      className="hidden md:table-cell text-right text-12 px-3 py-2"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {c.public_company_count ?? "\u2014"}
                    </td>
                  </tr>
                ))}
                {countries.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-8 text-center text-13"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      No country data available at this time.
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
