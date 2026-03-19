import { Metadata } from "next";
import countriesData from "@/data/countries.json";
import { CountryPageClient } from "./CountryPageClient";

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
  return {
    title: country ? `${country.name} Biotech Companies — BiotechTube` : "Country — BiotechTube",
    description: country?.description || "Biotech companies by country",
  };
}

export default function CountryPage({ params }: { params: { country: string } }) {
  const country = countries.find((c) => c.slug === params.country);
  if (!country) {
    return <div>Country not found</div>;
  }
  // Find nearby countries (same region)
  const nearbyCountries = countries.filter((c) => c.region === country.region && c.slug !== country.slug);
  return <CountryPageClient country={country} nearbyCountries={nearbyCountries} />;
}
