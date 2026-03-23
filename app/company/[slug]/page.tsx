import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Company, FundingRound } from "@/lib/types";
import { CompanyPageClient } from "./CompanyPageClient";
import { dbRowToCompany, dbRowsToCompanies } from "@/lib/adapters";
import { createClient } from "@supabase/supabase-js";

import fundingData from "@/data/funding.json";

export const dynamic = 'force-dynamic';

const funding = fundingData as FundingRound[];

async function getCompany(slug: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single();

  return data ? dbRowToCompany(data) : null;
}

async function getSimilarCompanies(company: Company) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return [];

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Find companies in same country or with overlapping categories
  const { data } = await supabase
    .from('companies')
    .select('*')
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

  const companyFunding = funding.filter((f) => f.companySlug === company.slug);
  const similar = await getSimilarCompanies(company);

  return (
    <CompanyPageClient
      company={company}
      companyFunding={companyFunding}
      similar={similar}
    />
  );
}
