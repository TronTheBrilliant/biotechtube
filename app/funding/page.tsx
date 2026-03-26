import { Metadata } from "next";
import { Suspense } from "react";
import { getAllFundingData } from "@/lib/funding-queries";
import FundingPageClient from "./FundingPageClient";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Biotech Funding Rounds & Investment Data | BiotechTube",
  description:
    "Track biotech funding rounds, venture capital deals, and investment trends. Explore annual and quarterly data, top investors, and the latest biotech financing activity.",
  openGraph: {
    title: "Biotech Funding Rounds & Investment Data | BiotechTube",
    description:
      "Track biotech funding rounds, VC deals, and investment trends across the global biotech industry.",
    type: "website",
    siteName: "BiotechTube",
  },
  twitter: {
    card: "summary",
    title: "Biotech Funding & Investment Data | BiotechTube",
    description:
      "Track biotech funding rounds, VC deals, and investment trends across the global biotech industry.",
  },
};

export default async function FundingPage() {
  const { annualData, quarterlyData, monthlyData, rounds, stats, topInvestors, investorStats } =
    await getAllFundingData();

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
        <FundingPageClient
          annualData={annualData}
          quarterlyData={quarterlyData}
          monthlyData={monthlyData}
          rounds={rounds}
          stats={stats}
          topInvestors={topInvestors}
          investorStats={investorStats}
        />
      </Suspense>
    </>
  );
}
