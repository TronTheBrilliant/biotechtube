import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Company, FundingRound } from "@/lib/types";
import { CompanyPageClient } from "./CompanyPageClient";

import companiesData from "@/data/companies.json";
import fundingData from "@/data/funding.json";

const companies = companiesData as Company[];
const funding = fundingData as FundingRound[];

export function generateStaticParams() {
  return companies.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const company = companies.find((c) => c.slug === params.slug);
  if (!company) return { title: "Company Not Found" };

  return {
    title: `${company.name} — BiotechTube`,
    description: company.description,
  };
}

export default function CompanyPage({
  params,
}: {
  params: { slug: string };
}) {
  const company = companies.find((c) => c.slug === params.slug);
  if (!company) notFound();

  const companyFunding = funding.filter((f) => f.companySlug === company.slug);
  const similar = companies
    .filter((c) => c.slug !== company.slug && c.focus.some((f) => company.focus.includes(f)))
    .slice(0, 4);

  return (
    <CompanyPageClient
      company={company}
      companyFunding={companyFunding}
      similar={similar}
    />
  );
}
