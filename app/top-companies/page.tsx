import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { formatMarketCap } from "@/lib/market-utils";
import { dbRowsToCompanies } from "@/lib/adapters";
import { createClient } from "@supabase/supabase-js";
import { TopCompaniesClient } from "./TopCompaniesClient";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const revalidate = 300;

const ogImageUrl = "https://biotechtube.io/api/og?title=Top%20Biotech%20Companies&subtitle=Ranked%20by%20Market%20Cap%20%C2%B7%20Updated%20Daily&type=default";

export const metadata: Metadata = {
  title: "Top Biotech Companies by Market Cap (2026) | BiotechTube",
  description:
    "Definitive ranking of the world's largest publicly traded biotech companies by market capitalization. Updated daily with stock prices, 1-day change, and company details.",
  openGraph: {
    title: "Top Biotech Companies by Market Cap | BiotechTube",
    description:
      "Definitive ranking of the world's largest publicly traded biotech companies by market cap. Updated daily.",
    type: "website",
    siteName: "BiotechTube",
    images: [{ url: ogImageUrl, width: 1200, height: 630, alt: "Top Biotech Companies on BiotechTube" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@biotechtube",
    title: "Top Biotech Companies by Market Cap | BiotechTube",
    description:
      "Definitive ranking of the world's largest publicly traded biotech companies by market cap.",
    images: [ogImageUrl],
  },
  alternates: {
    canonical: "https://biotechtube.io/top-companies",
  },
};

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
  website: string | null;
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
        website: company.website || null,
        marketCap: usdMarketCap,
        change1d: changeMap.get(id) ?? null,
      });
    }
  }

  ranked.sort((a, b) => b.marketCap - a.marketCap);
  return ranked;
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
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="mb-3">
          <Breadcrumbs items={[
            { label: "Home", href: "/" },
            { label: "Top Companies" },
          ]} />
        </div>
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
        <TopCompaniesClient companies={companies} />
      </div>

      <Footer />
    </div>
  );
}
