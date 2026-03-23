import { Metadata } from "next";
import countriesData from "@/data/countries.json";
import { CountryPageClient } from "./CountryPageClient";

const SITE_URL = 'https://www.biotechtube.io';

interface CountryData {
  slug: string;
  name: string;
  flag: string;
  region: string;
  bioHubs: string[];
  companyCount: number;
  totalRaised: string;
  topStage: string;
  topFocus: string;
  description: string;
}

const countries = countriesData as CountryData[];

export function generateStaticParams() {
  return countries.map((c) => ({ country: c.slug }));
}

export function generateMetadata({ params }: { params: { country: string } }): Metadata {
  const country = countries.find((c) => c.slug === params.country);
  if (!country) return { title: "Country — BiotechTube" };

  const title = `${country.name} Biotech Companies (${country.companyCount}+) — BiotechTube`;
  const description = `Explore ${country.companyCount}+ biotech companies in ${country.name}. ${country.totalRaised} total raised. Key hubs: ${country.bioHubs.join(', ')}. Top focus: ${country.topFocus}.`;
  const url = `${SITE_URL}/companies/${country.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${country.flag} ${country.name} Biotech Companies`,
      description,
      url,
      siteName: 'BiotechTube',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: `${country.flag} ${country.name} Biotech Companies`,
      description,
    },
  };
}

export default function CountryPage({ params }: { params: { country: string } }) {
  const country = countries.find((c) => c.slug === params.country);
  if (!country) {
    return <div>Country not found</div>;
  }
  // Find nearby countries (same region)
  const nearbyCountries = countries.filter((c) => c.region === country.region && c.slug !== country.slug);

  // JSON-LD for country page
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Companies', item: `${SITE_URL}/companies` },
      { '@type': 'ListItem', position: 3, name: `${country.name} Biotech`, item: `${SITE_URL}/companies/${country.slug}` },
    ],
  };

  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${country.name} Biotech Companies`,
    description: country.description,
    url: `${SITE_URL}/companies/${country.slug}`,
    isPartOf: { '@type': 'WebSite', name: 'BiotechTube', url: SITE_URL },
    about: {
      '@type': 'Place',
      name: country.name,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <CountryPageClient country={country} nearbyCountries={nearbyCountries} />
    </>
  );
}
