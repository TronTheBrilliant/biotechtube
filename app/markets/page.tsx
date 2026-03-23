import { Metadata } from "next";
import { MarketsPageClient } from "./MarketsPageClient";

export const metadata: Metadata = {
  title: "Biotech Market Indices & Stock Performance | BiotechTube",
  description:
    "Track biotech market indices, stock performance, and sector trends. Real-time data on public biotech companies, market caps, and investment signals.",
  alternates: { canonical: 'https://www.biotechtube.io/markets' },
  openGraph: {
    title: "Biotech Market Indices & Stock Performance",
    description: "Track biotech market indices, stock performance, and sector trends.",
    url: 'https://www.biotechtube.io/markets',
    siteName: 'BiotechTube',
    type: 'website',
  },
};

export default function MarketsPage() {
  return <MarketsPageClient />;
}
