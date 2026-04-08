import { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import { getAllFundingData } from "@/lib/funding-queries";
import { getAllIntelligenceData } from "@/lib/funding-intelligence-queries";
import { FundingIntelligenceClient } from "./FundingIntelligenceClient";

export const revalidate = 1800; // 30 min

const ogImageUrl =
  "https://biotechtube.io/api/og?title=Biotech%20Funding%20Intelligence&subtitle=Deals%20%C2%B7%20Charts%20%C2%B7%20Investors&type=funding";

export const metadata: Metadata = {
  title: "Biotech Funding Intelligence | BiotechTube",
  description:
    "Track biotech funding rounds, investment trends, AI-generated deal analysis, and top investor activity across the global biotech industry.",
  openGraph: {
    title: "Biotech Funding Intelligence | BiotechTube",
    description:
      "Real-time biotech funding intelligence — deals, charts, investors, and AI analysis.",
    type: "website",
    siteName: "BiotechTube",
    images: [
      { url: ogImageUrl, width: 1200, height: 630, alt: "Biotech Funding Intelligence on BiotechTube" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@biotechtube",
    title: "Biotech Funding Intelligence | BiotechTube",
    description:
      "Track biotech funding rounds, VC deals, and investment trends across the global biotech industry.",
    images: [ogImageUrl],
  },
  alternates: {
    canonical: "https://biotechtube.io/funding",
  },
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function FundingPage() {
  const supabase = getSupabase();

  const [fundingData, articlesResult, intelligenceData] = await Promise.all([
    getAllFundingData(),
    supabase
      .from("funding_articles")
      .select(
        "id, slug, headline, subtitle, body, company_name, company_slug, round_type, amount_usd, lead_investor, round_date, sector, country, deal_size_category, article_type, is_featured, published_at"
      )
      .order("round_date", { ascending: false, nullsFirst: false })
      .limit(100),
    getAllIntelligenceData(),
  ]);

  const fundingJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Biotech Funding Rounds",
    description:
      "Comprehensive dataset of biotech and life sciences funding rounds including venture capital, Series A-E, IPOs, and grants.",
    url: "https://biotechtube.io/funding",
    provider: {
      "@type": "Organization",
      name: "BiotechTube",
      url: "https://biotechtube.io",
    },
    temporalCoverage: "2010/..",
    keywords: [
      "biotech funding",
      "venture capital",
      "life sciences investment",
      "Series A",
      "IPO",
      "biotech financing",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(fundingJsonLd) }}
      />
      <Suspense>
        <FundingIntelligenceClient
          annualData={fundingData.annualData}
          quarterlyData={fundingData.quarterlyData}
          monthlyData={fundingData.monthlyData}
          rounds={fundingData.rounds}
          fundingStats={fundingData.stats}
          topInvestors={fundingData.topInvestors}
          investorStats={fundingData.investorStats}
          articles={articlesResult.data || []}
          pulse={intelligenceData.pulse}
          byRoundType={intelligenceData.byRoundType}
          bySector={intelligenceData.bySector}
          byCountry={intelligenceData.byCountry}
          dealVelocity={intelligenceData.dealVelocity}
          coInvestors={intelligenceData.coInvestors}
        />
      </Suspense>
    </>
  );
}
