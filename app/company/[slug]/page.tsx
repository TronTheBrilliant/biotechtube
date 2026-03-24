import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Company, CompanyReport, FundingRound } from "@/lib/types";
import { CompanyPageClient } from "./CompanyPageClient";
import { dbRowToCompany, dbRowsToCompanies } from "@/lib/adapters";
import { createClient } from "@supabase/supabase-js";

import fundingData from "@/data/funding.json";

export const revalidate = 300;

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

async function getCompanyId(slug: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', slug)
    .single();
  return data?.id || null;
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

async function getCompanySectors(companyId: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('company_sectors')
    .select('sector_id, is_primary, confidence, sectors(id, name, slug)')
    .eq('company_id', companyId)
    .order('is_primary', { ascending: false });
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
  // Try to find companies in the same country first
  const { data } = await supabase
    .from('companies')
    .select('*')
    .eq('country', company.country)
    .neq('slug', company.slug)
    .limit(5);

  return data ? dbRowsToCompanies(data) : [];
}

// --- New enriched data fetchers ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPipelines(companyId: string): Promise<any[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('pipelines')
    .select('*')
    .eq('company_id', companyId)
    .order('stage', { ascending: false });
  return data || [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getFundingRounds(companyId: string): Promise<any[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('funding_rounds')
    .select('*')
    .eq('company_id', companyId)
    .order('announced_date', { ascending: false });
  return data || [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getFdaApprovals(companyId: string): Promise<any[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('fda_approvals')
    .select('*')
    .eq('company_id', companyId)
    .order('approval_date', { ascending: false });
  return data || [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPublications(companyId: string): Promise<any[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('publications')
    .select('*')
    .eq('company_id', companyId)
    .order('publication_date', { ascending: false })
    .limit(20);
  return data || [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPatents(companyId: string): Promise<any[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('patents')
    .select('*')
    .eq('company_id', companyId)
    .order('grant_date', { ascending: false })
    .limit(20);
  return data || [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPriceHistory(companyId: string): Promise<any[]> {
  const supabase = getSupabase();
  // Fetch the latest 1000 rows (DESC) to get recent data reliably, then reverse for display
  const { data } = await supabase
    .from('company_price_history')
    .select('date, close, adj_close, volume, market_cap_usd')
    .eq('company_id', companyId)
    .order('date', { ascending: false })
    .limit(1000);
  // Reverse to ascending order for chart display
  return (data || []).reverse();
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const company = await getCompany(params.slug);
  if (!company) return { title: "Company Not Found" };

  const report = await getCompanyReport(params.slug);

  const title = `${company.name} | Pipeline, Funding & Analysis | BiotechTube`;
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
    "FDA approvals",
    "patents",
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
      url: `https://biotechtube.io/company/${params.slug}`,
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

  const companyId = await getCompanyId(params.slug);

  // Fetch all enriched data in parallel
  const [
    companyFunding,
    similar,
    report,
    sectors,
    pipelines,
    dbFundingRounds,
    fdaApprovals,
    publications,
    patents,
    priceHistory,
  ] = await Promise.all([
    Promise.resolve(funding.filter((f) => f.companySlug === company.slug)),
    getSimilarCompanies(company),
    getCompanyReport(params.slug),
    companyId ? getCompanySectors(companyId) : Promise.resolve([]),
    companyId ? getPipelines(companyId) : Promise.resolve([]),
    companyId ? getFundingRounds(companyId) : Promise.resolve([]),
    companyId ? getFdaApprovals(companyId) : Promise.resolve([]),
    companyId ? getPublications(companyId) : Promise.resolve([]),
    companyId ? getPatents(companyId) : Promise.resolve([]),
    companyId ? getPriceHistory(companyId) : Promise.resolve([]),
  ]);

  // Build JSON-LD structured data
  const isPublic = company.type === "Public";
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": isPublic ? "Corporation" : "Organization",
    name: company.name,
    url: company.website || `https://biotechtube.io/company/${params.slug}`,
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
        companyId={companyId}
        companyFunding={companyFunding}
        similar={similar}
        report={report}
        sectors={sectors}
        pipelines={pipelines}
        dbFundingRounds={dbFundingRounds}
        fdaApprovals={fdaApprovals}
        publications={publications}
        patents={patents}
        priceHistory={priceHistory}
      />
    </>
  );
}
