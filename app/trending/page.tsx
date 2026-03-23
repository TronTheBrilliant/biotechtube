import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { formatMarketCap, formatPercent, pctColor } from "@/lib/market-utils";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface TrendingCompany {
  slug: string;
  name: string;
  ticker: string | null;
  country: string | null;
  logo_url: string | null;
  change30d: number;
  marketCap: number;
}

async function getTrendingCompanies(): Promise<TrendingCompany[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get latest date
  const { data: latestRow } = await supabase
    .from("company_price_history")
    .select("date")
    .not("market_cap_usd", "is", null)
    .order("date", { ascending: false })
    .limit(1)
    .single();
  if (!latestRow) return [];

  const latestDate = latestRow.date;
  const thirtyDaysAgo = new Date(latestDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 35);
  const oldCutoff = thirtyDaysAgo.toISOString().split("T")[0];
  const oldEnd = new Date(latestDate);
  oldEnd.setDate(oldEnd.getDate() - 25);
  const oldEndStr = oldEnd.toISOString().split("T")[0];

  // Get current prices (latest date)
  const { data: currentPrices } = await supabase
    .from("company_price_history")
    .select("company_id, market_cap_usd")
    .eq("date", latestDate)
    .not("market_cap_usd", "is", null);

  // Get old prices (~30 days ago range)
  const { data: oldPrices } = await supabase
    .from("company_price_history")
    .select("company_id, market_cap_usd, date")
    .gte("date", oldCutoff)
    .lte("date", oldEndStr)
    .not("market_cap_usd", "is", null)
    .order("date", { ascending: false });

  if (!currentPrices || !oldPrices) return [];

  // Build maps
  const currentMap = new Map<string, number>();
  for (const r of currentPrices) {
    if (!currentMap.has(r.company_id))
      currentMap.set(r.company_id, r.market_cap_usd);
  }
  const oldMap = new Map<string, number>();
  for (const r of oldPrices) {
    if (!oldMap.has(r.company_id))
      oldMap.set(r.company_id, r.market_cap_usd);
  }

  // Compute 30d change — only include companies with market cap > $500M
  const changes: { companyId: string; change30d: number; marketCap: number }[] =
    [];
  currentMap.forEach((currentMcap, companyId) => {
    const oldMcap = oldMap.get(companyId);
    if (oldMcap && oldMcap > 0 && currentMcap > 500_000_000) {
      const pct = ((currentMcap - oldMcap) / oldMcap) * 100;
      changes.push({
        companyId,
        change30d: Math.round(pct * 100) / 100,
        marketCap: currentMcap,
      });
    }
  });

  changes.sort((a, b) => b.change30d - a.change30d);
  const top50 = changes.slice(0, 50);
  const top50Ids = top50.map((c) => c.companyId);

  // Fetch company details
  const { data: companyRows } = await supabase
    .from("companies")
    .select("id, slug, name, ticker, country, logo_url")
    .in("id", top50Ids);

  if (!companyRows) return [];

  const companyMap = new Map<string, (typeof companyRows)[0]>();
  for (const c of companyRows) companyMap.set(c.id, c);

  return top50
    .map((ch) => {
      const c = companyMap.get(ch.companyId);
      return {
        slug: c?.slug || "",
        name: c?.name || "",
        ticker: c?.ticker || null,
        country: c?.country || null,
        logo_url: c?.logo_url || null,
        change30d: ch.change30d,
        marketCap: ch.marketCap,
      };
    })
    .filter((c) => c.slug);
}

export default async function TrendingPage() {
  const companies = await getTrendingCompanies();

  const bestPerformer = companies.length > 0 ? companies[0] : null;
  const marketCaps = companies.map((c) => c.marketCap);
  const minCap = marketCaps.length > 0 ? Math.min(...marketCaps) : 0;
  const maxCap = marketCaps.length > 0 ? Math.max(...marketCaps) : 0;

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
          Trending Biotech Companies
        </h1>
        <p
          className="text-[15px] md:text-[17px] mt-2 max-w-[560px]"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}
        >
          Companies with the strongest 30-day market performance, ranked by
          market cap change.
        </p>

        {/* Stats strip */}
        <div className="flex flex-wrap items-center gap-4 md:gap-6 mt-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
              Showing
            </span>
            <span
              className="text-[13px] font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {companies.length} companies
            </span>
          </div>
          {bestPerformer && (
            <div className="flex items-center gap-1.5">
              <span className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
                Best performer
              </span>
              <span
                className="text-[13px] font-semibold"
                style={{ color: "var(--color-accent)" }}
              >
                {formatPercent(bestPerformer.change30d)}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
              Market cap range
            </span>
            <span
              className="text-[13px] font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {formatMarketCap(minCap)} &ndash; {formatMarketCap(maxCap)}
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
                    Company
                  </th>
                  <th
                    className="hidden md:table-cell text-left text-10 font-medium px-3 py-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Country
                  </th>
                  <th
                    className="text-right text-10 font-medium px-3 py-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    30D Change
                  </th>
                  <th
                    className="text-right text-10 font-medium px-3 py-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Market Cap
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
                        href={`/companies/${c.slug}`}
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
                      className="hidden md:table-cell px-3 py-2 text-12"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {c.country || "\u2014"}
                    </td>
                    <td
                      className="text-right text-12 px-3 py-2 font-semibold"
                      style={{ color: pctColor(c.change30d) }}
                    >
                      {formatPercent(c.change30d)}
                    </td>
                    <td
                      className="text-right text-12 px-3 py-2"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {formatMarketCap(c.marketCap)}
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
                      No trending data available at this time.
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
