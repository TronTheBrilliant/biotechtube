import { Metadata } from "next";
import { FundingPageClient } from "./FundingPageClient";

const SITE_URL = 'https://www.biotechtube.io';

export const metadata: Metadata = {
  title: "Biotech Funding Rounds & Investment Data | BiotechTube",
  description:
    "Track biotech funding rounds, venture capital investments, and IPOs. Real-time data on Series A-C rounds, grants, and public offerings across the global biotech industry.",
  alternates: { canonical: `${SITE_URL}/funding` },
  openGraph: {
    title: "Biotech Funding Rounds & Investment Data",
    description: "Track biotech funding rounds, venture capital investments, and IPOs worldwide.",
    url: `${SITE_URL}/funding`,
    siteName: 'BiotechTube',
    type: 'website',
  },
};

export default function FundingPage() {
  return <FundingPageClient />;
}
