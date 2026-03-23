import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { formatMarketCap, formatPercent, pctColor } from "@/lib/market-utils";
import { dbRowsToCompanies } from "@/lib/adapters";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface RankedCompany {
  slug: string;
  name: string;
  ticker: string | null;
  country: string | null;
  logo_url: string | null;
  marketCap: number;
  change1d: number | null;
}

async function getTopCompanies(): Promise<RankedCompany[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("companies")
    .select("*")
    .order("valuation", { ascending: false, nullsFirst: false })
    .limit(1000);
  if (!data) return [];

  const companies = dbRowsToCompanies(data);

  // Override valuation with USD market cap from price history
  const companyIds = data.map((row: { id: string }) => row.id);
  const marketCapMap = new Map<string, number>();
  const changeMap = new Map<string, number>();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 5);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const BATCH_SIZE = 200;
  for (let i = 0; i < companyIds.length; i += BATCH_SIZE) {
    const batch = companyIds.slice(i, i + BATCH_SIZE);
    const { data: priceRows } = await supabase
      .from("company_price_history")
      .select("company_id, market_cap_usd, change_pct, date")
      .in("company_id", batch)
      .gte("date", cutoffStr)
      .not("market_cap_usd", "is", null)
      .order("date", { ascending: false });
    if (priceRows) {
      for (const row of priceRows) {
        if (row.market_cap_usd != null && !marketCapMap.has(row.company_id)) {
          marketCapMap.set(row.company_id, row.market_cap_usd);
        }
        if (row.change_pct != null && !changeMap.has(row.company_id)) {
          changeMap.set(row.company_id, row.change_pct);
        }
      }
    }
  }

  const slugToId = new Map<string, string>();
  for (const row of data) slugToId.set(row.slug, row.id);

  const ranked: RankedCompany[] = [];
  for (const company of companies) {
    const id = slugToId.get(company.slug);
    if (!id) continue;
    const usdMarketCap = marketCapMap.get(id);
    if (usdMarketCap != null && usdMarketCap > 0) {
      ranked.push({
        slug: company.slug,
        name: company.name,
        ticker: company.ticker || null,
        country: company.country || null,
        logo_url: company.logoUrl || null,
        marketCap: usdMarketCap,
        change1d: changeMap.get(id) ?? null,
      });
    }
  }

  ranked.sort((a, b) => b.marketCap - a.marketCap);
  return ranked.slice(0, 100);
}

export default async function TopCompaniesPage() {
  const companies = await getTopCompanies();

  const totalMarketCap = companies.reduce((sum, c) => sum + c.marketCap, 0);

  return (
    <div
      className="page-content"
      style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}
    >
      <Nav />

      {/* Hero */}
      <div className="px-5 md:px-8 py-6 md:py-8">
        <h1
          className="text-[32px] md:text-[48px] font-bold tracking-tight"
          style={{
            color: "var(--color-text-primary)",
            letterSpacing: "-1px",
            lineHeight: 1.1,
          }}
        >
          Top Biotech Companies by Market Cap
        </h1>
        <p
          className="text-[15px] md:text-[17px] mt-2 max-w-[560px]"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}
        >
          The definitive ranking of the world&apos;s largest publicly traded
          biotech companies.
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
              {companies.length} companies
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
              style={{ color: "var(--color-text-primary)" }}
            >
              {formatMarketCap(totalMarketCap)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-[13px]"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Updated daily
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
            <table className="w-full min-w-[650px]">
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
                    className="text-right text-10 font-medium px-3 py-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    1D Change
                  </th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c, i) => (
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
                      {i + 1}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/company/${c.slug}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        {c.logo_url ? (
                          <img
                            src={c.logo_url}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                            style={{
                              background: "var(--color-bg-primary)",
                              border: "1px solid var(--color-border-subtle)",
                            }}
                          />
                        ) : (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                            style={{
                              background: "var(--color-bg-primary)",
                              border: "1px solid var(--color-border-subtle)",
                              color: "var(--color-text-tertiary)",
                            }}
                          >
                            {c.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span
                            className="text-12 font-medium"
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
                      className="text-right text-12 px-3 py-2 font-semibold"
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
        </div>
      </div>

      <Footer />
    </div>
  );
}
