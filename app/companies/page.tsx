import { Metadata } from "next";
import { CompaniesPageClient } from "./CompaniesPageClient";

const SITE_URL = 'https://www.biotechtube.io';

export const metadata: Metadata = {
  title: "Biotech Companies Directory — 14,000+ Companies Worldwide | BiotechTube",
  description:
    "Browse the global biotech directory. 14,000+ biotech companies across 58 countries with funding data, pipeline stages, and investor profiles.",
  alternates: { canonical: `${SITE_URL}/companies` },
  openGraph: {
    title: "Biotech Companies Directory — 14,000+ Companies Worldwide",
    description: "Browse the global biotech directory. 14,000+ biotech companies across 58 countries with funding data, pipeline stages, and investor profiles.",
    url: `${SITE_URL}/companies`,
    siteName: 'BiotechTube',
    type: 'website',
  },
};

export default function CompaniesPage() {
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Companies', item: `${SITE_URL}/companies` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <CompaniesPageClient />
    </>
  );
}
