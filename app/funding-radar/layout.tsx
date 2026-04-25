import type { Metadata } from "next";

// Client page cannot export metadata itself; this layout file provides it.
const fundingRadarOg =
  "https://biotechtube.io/api/og?title=Funding%20Radar&subtitle=Deal%20flow%20across%20the%20biotech%20venture%20market&type=default";

export const metadata: Metadata = {
  title: "Biotech Funding Radar — Deal Flow, Rounds & Lead Investors | BiotechTube",
  description:
    "Real-time biotech funding tracker: Series A through IPO, deal sizes, lead investors, and quarterly trends across oncology, immunology, rare disease, and beyond.",
  alternates: { canonical: "https://biotechtube.io/funding-radar" },
  openGraph: {
    title: "Biotech Funding Radar | BiotechTube",
    description:
      "Live biotech venture deal flow — Series A through IPO — with lead investors and trends.",
    type: "website",
    siteName: "BiotechTube",
    url: "https://biotechtube.io/funding-radar",
    images: [
      { url: fundingRadarOg, width: 1200, height: 630, alt: "Biotech Funding Radar on BiotechTube" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@biotechtube",
    title: "Biotech Funding Radar | BiotechTube",
    description: "Deal flow, round sizes, and lead investors across the biotech venture market.",
    images: [fundingRadarOg],
  },
};

export default function FundingRadarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
