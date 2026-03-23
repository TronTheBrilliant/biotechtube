import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Company, FundingRound } from "@/lib/types";
import { CompanyPageClient } from "./CompanyPageClient";
import { dbRowToCompany, dbRowsToCompanies } from "@/lib/adapters";
import { createServerClient } from "@/lib/supabase";
import { cache } from "react";

import fundingData from "@/data/funding.json";

// ISR: revalidate every 2 hours (company data changes infrequently)
export const revalidate = 7200;

const funding = fundingData as FundingRound[];

// Columns needed for the company detail page
const COMPANY_COLUMNS = 'slug, name, country, city, website, domain, categories, description, founded, employee_range, stage, company_type, ticker, logo_url, total_raised, valuation, is_estimated, trending_rank, profile_views';

// Fewer columns needed for similar companies cards
const CARD_COLUMNS = 'slug, name, country, city, categories, logo_url, stage, company_type, ticker, total_raised, valuation, is_estimated, domain, founded, trending_rank, profile_views';

// React cache deduplicates this call between generateMetadata and the page component
const getCompany = cache(async (slug: string) => {
  const supabase = createServerClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from('companies')
    .select(COMPANY_COLUMNS)
    .eq('slug', slug)
    .single();

  return data ? dbRowToCompany(data) : null;
});

async function getSimilarCompanies(company: Company) {
  const supabase = createServerClient();
  if (!supabase) return [];

  // Try to find companies with overlapping categories first
  if (company.focus.length > 0) {
    const { data } = await supabase
      .from('companies')
      .select(CARD_COLUMNS)
      .contains('categories', [company.focus[0]])
      .neq('slug', company.slug)
      .limit(4);

    if (data && data.length > 0) return dbRowsToCompanies(data);
  }

  // Fallback: same country
  const { data } = await supabase
    .from('companies')
    .select(CARD_COLUMNS)
    .eq('country', company.country)
    .neq('slug', company.slug)
    .limit(4);

  return data ? dbRowsToCompanies(data) : [];
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const company = await getCompany(params.slug);
  if (!company) return { title: "Company Not Found" };

  return {
    title: `${company.name} — BiotechTube`,
    description: company.description || `${company.name} - ${company.city}, ${company.country}`,
  };
}

export default async function CompanyPage({
  params,
}: {
  params: { slug: string };
}) {
  const company = await getCompany(params.slug);
  if (!company) notFound();

  // Run funding filter and similar companies fetch in parallel
  const [companyFunding, similar] = await Promise.all([
    Promise.resolve(funding.filter((f) => f.companySlug === company.slug)),
    getSimilarCompanies(company),
  ]);

  return (
    <CompanyPageClient
      company={company}
      companyFunding={companyFunding}
      similar={similar}
    />
  );
}
