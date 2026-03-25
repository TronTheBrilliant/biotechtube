import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { formatMarketCap, formatPercent, pctColor, capPercent } from "@/lib/market-utils";
import { getSectorEmoji } from "@/lib/sector-emojis";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export const revalidate = 300;

interface SectorRanked {
  slug: string;
  name: string;
  combinedMarketCap: number | null;
  change1d: number | null;
  change7d: number | null;
  change30d: number | null;
  companyCount: number | null;
}

interface SectorRow {
  id: string;
  slug: string;
  name: string;
  company_count: number | null;
}

interface SectorMarketRow {
  sector_id: string;
  combined_market_cap: number | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
}

async function getTopSectors(): Promise<SectorRanked[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get latest snapshot date for sector market data
  const { data: latestDateRow } = await supabase
    .from("sector_market_data")
    .select("snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .single();

  if (!latestDateRow) {
    // No market data -- still show sectors without metrics
    const { data: sectorRows } = await supabase
      .from("sectors")
      .select("id, slug, name, company_count");

    return ((sectorRows ?? []) as SectorRow[]).map((s) => ({
      slug: s.slug,
      name: s.name,
      combinedMarketCap: null,
      change1d: null,
      change7d: null,
      change30d: null,
      companyCount: s.company_count,
    }));
  }

  const [sectorMarketResult, sectorResult] = await Promise.all([
    supabase
      .from("sector_market_data")
      .select(
        "sector_id, combined_market_cap, change_1d_pct, change_7d_pct, change_30d_pct"
      )
      .eq("snapshot_date", latestDateRow.snapshot_date)
      .then((r) => (r.data ?? []) as SectorMarketRow[]),
    supabase
      .from("sectors")
      .select("id, slug, name, company_count")
      .then((r) => (r.data ?? []) as SectorRow[]),
  ]);

  const sectorMap = new Map<string, SectorRow>();
  for (const s of sectorResult) sectorMap.set(s.id, s);

  const sectors: SectorRanked[] = sectorMarketResult
    .map((m) => {
      const s = sectorMap.get(m.sector_id);
      if (!s) return null;
      return {
        slug: s.slug,
        name: s.name,
        combinedMarketCap: m.combined_market_cap,
        change1d: m.change_1d_pct,
        change7d: m.change_7d_pct,
        change30d: m.change_30d_pct,
        companyCount: s.company_count,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  sectors.sort(
    (a, b) => (b.combinedMarketCap ?? 0) - (a.combinedMarketCap ?? 0)
  );

  return sectors;
}

export default async function TopSectorsPage() {
  const sectors = await getTopSectors();

  const totalMarketCap = sectors.reduce(
    (sum, s) => sum + (s.combinedMarketCap ?? 0),
    0
  );

  const bestSector = sectors.reduce<SectorRanked | null>((best, s) => {
    const capped = capPercent(s.change1d, "1d");
    if (capped == null) return best;
    if (!best || capPercent(best.change1d, "1d") == null) return s;
    return capped > (capPercent(best.change1d, "1d") ?? 0) ? s : best;
  }, null);

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
          Top Biotech Sectors
        </h1>
        <p
          className="text-[15px] md:text-[17px] mt-2 max-w-[560px]"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}
        >
          Performance and market cap breakdown across {sectors.length} biotech
          sectors.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="px-4 md:px-6 pb-6 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Combined Sector Value */}
          <div
            className="rounded-lg border px-4 py-3"
            style={{
              background: "var(--color-bg-secondary)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            <span
              className="text-[11px] font-medium uppercase tracking-wide"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Combined Sector Value
            </span>
            <div
              className="text-[20px] font-bold mt-0.5"
              style={{ color: "var(--color-text-primary)" }}
            >
              {formatMarketCap(totalMarketCap)}
            </div>
            <span
              className="text-[10px]"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              (includes overlap)
            </span>
          </div>

          {/* Number of Sectors */}
          <div
            className="rounded-lg border px-4 py-3"
            style={{
              background: "var(--color-bg-secondary)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            <span
              className="text-[11px] font-medium uppercase tracking-wide"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Active Sectors
            </span>
            <div
              className="text-[20px] font-bold mt-0.5"
              style={{ color: "var(--color-text-primary)" }}
            >
              {sectors.length} sectors
            </div>
          </div>

          {/* Best Performing Sector */}
          <div
            className="rounded-lg border px-4 py-3"
            style={{
              background: "var(--color-bg-secondary)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            <span
              className="text-[11px] font-medium uppercase tracking-wide"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Top Mover Today
            </span>
            {bestSector ? (
              <div className="mt-0.5 flex items-baseline gap-2">
                <span
                  className="text-[20px] font-bold"
                  style={{ color: pctColor(capPercent(bestSector.change1d, "1d")) }}
                >
                  {formatPercent(capPercent(bestSector.change1d, "1d"))}
                </span>
                <span
                  className="text-[12px]"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {bestSector.name}
                </span>
              </div>
            ) : (
              <div
                className="text-[20px] font-bold mt-0.5"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                &mdash;
              </div>
            )}
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
                    Sector
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
                    30D %
                  </th>
                  <th
                    className="hidden md:table-cell text-right text-10 font-medium px-3 py-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Companies
                  </th>
                </tr>
              </thead>
              <tbody>
                {sectors.map((s, i) => {
                  const capped1d = capPercent(s.change1d, "1d");
                  const isPositive = (capped1d ?? 0) >= 0;
                  return (
                    <tr
                      key={s.slug}
                      className="transition-colors duration-100 hover:bg-[var(--color-bg-primary)] relative"
                      style={{
                        borderBottom: "0.5px solid var(--color-border-subtle)",
                        borderLeft: `3px solid ${isPositive ? "var(--color-positive, #22c55e)" : "var(--color-negative, #ef4444)"}`,
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
                            href={`/sectors/${s.slug}`}
                            className="text-12 font-medium hover:underline"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            <span className="truncate max-w-[180px] md:max-w-none inline-block">
                              {getSectorEmoji(s.name)} {s.name}
                            </span>
                          </Link>
                          {s.companyCount != null && (
                            <span
                              className="text-[10px] mt-0.5"
                              style={{ color: "var(--color-text-tertiary)" }}
                            >
                              {s.companyCount} {s.companyCount === 1 ? "company" : "companies"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className="text-right text-12 px-3 py-2"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {s.combinedMarketCap
                          ? formatMarketCap(s.combinedMarketCap)
                          : "\u2014"}
                      </td>
                      <td
                        className="text-right text-12 px-3 py-2 font-semibold"
                        style={{ color: pctColor(capped1d) }}
                      >
                        {formatPercent(capped1d)}
                      </td>
                      <td
                        className="hidden md:table-cell text-right text-12 px-3 py-2 font-semibold"
                        style={{ color: pctColor(capPercent(s.change7d, "7d")) }}
                      >
                        {formatPercent(capPercent(s.change7d, "7d"))}
                      </td>
                      <td
                        className="hidden md:table-cell text-right text-12 px-3 py-2 font-semibold"
                        style={{ color: pctColor(capPercent(s.change30d, "30d")) }}
                      >
                        {formatPercent(capPercent(s.change30d, "30d"))}
                      </td>
                      <td
                        className="hidden md:table-cell text-right text-12 px-3 py-2"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {s.companyCount ?? "\u2014"}
                      </td>
                    </tr>
                  );
                })}
                {sectors.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-13"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      No sector data available at this time.
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
