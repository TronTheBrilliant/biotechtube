import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Company, CompanyReport, FundingRound } from "@/lib/types";
import { CompanyPageClient } from "./CompanyPageClient";
import { dbRowToCompany, dbRowsToCompanies } from "@/lib/adapters";
import { createClient } from "@supabase/supabase-js";

import fundingData from "@/data/funding.json";

export const dynamic = 'force-dynamic';

const funding = fundingData as FundingRound[];

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getCompany(slug: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single();

  return data ? dbRowToCompany(data) : null;
}

async function getCompanyReport(slug: string): Promise<CompanyReport | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('company_reports')
    .select('*')
    .eq('report_slug', slug)
    .single();

  return data as CompanyReport | null;
}

async function getCompanySectors(slug: string) {
  const supabase = getSupabase();
  // First get the company's UUID by slug
  const { data: companyRow } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', slug)
    .single();
  if (!companyRow?.id) return [];
  const { data } = await supabase
    .from('company_sectors')
    .select('sector_id, is_primary, confidence, sectors(id, name, slug)')
    .eq('company_id', companyRow.id)
    .order('is_primary', { ascending: false });
  // Supabase returns joined sectors as object, but TS infers array — cast appropriately
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => ({
    sector_id: row.sector_id,
    is_primary: row.is_primary,
    confidence: row.confidence,
    sectors: Array.isArray(row.sectors) ? row.sectors[0] || null : row.sectors || null,
  }));
}

async function getSimilarCompanies(company: Company) {
  const supabase = getSupabase();
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

  const report = await getCompanyReport(params.slug);

  const title = `${company.name} | Pipeline, Team & Analysis | BiotechTube`;
  const description =
    report?.summary ||
    company.description ||
    `${company.name} — a ${company.type?.toLowerCase() || ""} biotech company based in ${company.city}, ${company.country}.`;

  const keywords = [
    company.name,
    "biotech",
    ...(company.focus || []),
    ...(report?.therapeutic_areas || []),
    company.country,
    company.city,
    "pipeline",
    "clinical trials",
  ].filter(Boolean);

  return {
    title,
    description,
    keywords: keywords.join(", "),
    openGraph: {
      title,
      description,
      type: "profile",
      siteName: "BiotechTube",
      url: `https://biotechtube.vercel.app/company/${params.slug}`,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function CompanyPage({
  params,
}: {
  params: { slug: string };
}) {
  const company = await getCompany(params.slug);
  if (!company) notFound();

  const [companyFunding, similar, report, sectors] = await Promise.all([
    Promise.resolve(funding.filter((f) => f.companySlug === company.slug)),
    getSimilarCompanies(company),
    getCompanyReport(params.slug),
    getCompanySectors(params.slug),
  ]);

  // Build JSON-LD structured data
  const isPublic = company.type === "Public";
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": isPublic ? "Corporation" : "Organization",
    name: company.name,
    url: company.website || `https://biotechtube.vercel.app/company/${params.slug}`,
    description: report?.summary || company.description || undefined,
    foundingDate: company.founded ? String(company.founded) : undefined,
    numberOfEmployees: report?.employee_estimate || company.employees || undefined,
  };

  if (report?.headquarters_city || company.city) {
    jsonLd.address = {
      "@type": "PostalAddress",
      addressLocality: report?.headquarters_city || company.city,
      addressCountry: report?.headquarters_country || company.country,
      ...(report?.contact_address ? { streetAddress: report.contact_address } : {}),
    };
  }

  if (isPublic && company.ticker) {
    jsonLd.tickerSymbol = company.ticker;
  }

  // Remove undefined values
  const cleanJsonLd = JSON.parse(JSON.stringify(jsonLd));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanJsonLd) }}
      />
      <CompanyPageClient
        company={company}
        companyFunding={companyFunding}
        similar={similar}
        report={report}
        sectors={sectors}
      />
    </>
  );
}
