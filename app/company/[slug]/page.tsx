import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Company, CompanyReport, FundingRound } from "@/lib/types";
import { CompanyPageClient } from "./CompanyPageClient";
import { dbRowToCompany, dbRowsToCompanies } from "@/lib/adapters";
import { createClient } from "@supabase/supabase-js";
import { formatMarketCap } from "@/lib/market-utils";

import fundingData from "@/data/funding.json";

export const revalidate = 300;

const funding = fundingData as FundingRound[];

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getCompanyWithId(slug: string): Promise<{ company: ReturnType<typeof dbRowToCompany>; id: string } | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single();

  return data ? { company: dbRowToCompany(data), id: data.id } : null;
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

async function getCompanyClaim(companyId: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('company_claims')
    .select('id, status, plan, verified_at')
    .eq('company_id', companyId)
    .eq('status', 'verified')
    .single();
  return data || null;
}

async function getCompanyTeam(companyId: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('company_team')
    .select('id, name, title, bio, photo_url, linkedin_url, display_order')
    .eq('company_id', companyId)
    .order('display_order');
  return data || [];
}

async function getCompanyNews(companyId: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('company_news')
    .select('id, title, content, published_at')
    .eq('company_id', companyId)
    .order('published_at', { ascending: false })
    .limit(10);
  return data || [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPriceHistory(companyId: string): Promise<any[]> {
  const supabase = getSupabase();
  // Paginate to get ALL price history (some stocks have 10K+ rows going back decades)
  const allRows: any[] = [];
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from('company_price_history')
      .select('date, close, adj_close, volume, market_cap_usd')
      .eq('company_id', companyId)
      .order('date', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
    if (offset > 20000) break; // safety cap
  }
  return allRows;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const result = await getCompanyWithId(params.slug);
  if (!result) return { title: "Company Not Found" };
  const { company } = result;

  const report = await getCompanyReport(params.slug);

  const ticker = company.ticker ? ` (${company.ticker})` : '';
  const marketCap = company.valuation ? ` worth ${formatMarketCap(company.valuation)}` : '';
  const pipelineCount = report?.pipeline_count || '';
  const title = `${company.name}${ticker} — Stock, Pipeline & Market Cap | BiotechTube`;
  const description =
    report?.summary ||
    `Explore ${company.name}'s${pipelineCount ? ` pipeline of ${pipelineCount} drugs,` : ' drug pipeline,'}${marketCap ? ` ${formatMarketCap(company.valuation!)} market cap,` : ''} and latest funding. Track stock price and FDA approvals on BiotechTube.`;

  const keywords = [
    company.name,
    company.ticker,
    "biotech",
    "pharmaceutical",
    "stock price",
    "pipeline",
    ...(company.focus || []),
    ...(report?.therapeutic_areas || []),
    company.country,
    company.city,
    "clinical trials",
    "FDA approvals",
    "patents",
    "market cap",
  ].filter(Boolean);

  const ogSubtitle = `${company.ticker || 'Biotech'}${marketCap ? ` · ${formatMarketCap(company.valuation!)} Market Cap` : ''}`;
  const ogImageUrl = `https://biotechtube.io/api/og?title=${encodeURIComponent(company.name)}&subtitle=${encodeURIComponent(ogSubtitle)}&type=company${marketCap ? `&value=${encodeURIComponent(formatMarketCap(company.valuation!))}` : ''}`;

  return {
    title,
    description,
    keywords: keywords.join(", "),
    alternates: {
      canonical: `https://biotechtube.io/company/${params.slug}`,
    },
    openGraph: {
      title: `${company.name}${ticker} | BiotechTube`,
      description: `Track ${company.name}'s stock price, pipeline, and market data.`,
      type: "website",
      siteName: "BiotechTube",
      url: `https://biotechtube.io/company/${params.slug}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${company.name} on BiotechTube` }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@biotechtube",
      title: `${company.name}${ticker} | BiotechTube`,
      description: `Track ${company.name}'s stock price, pipeline, and market data.`,
      images: [ogImageUrl],
    },
  };
}

export default async function CompanyPage({
  params,
}: {
  params: { slug: string };
}) {
  const result = await getCompanyWithId(params.slug);
  if (!result) notFound();
  const { company, id: companyId } = result;

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
    companyClaim,
    companyTeam,
    companyNews,
  ] = await Promise.all([
    Promise.resolve(funding.filter((f) => f.companySlug === company.slug)),
    getSimilarCompanies(company),
    getCompanyReport(params.slug),
    getCompanySectors(companyId),
    getPipelines(companyId),
    getFundingRounds(companyId),
    getFdaApprovals(companyId),
    getPublications(companyId),
    getPatents(companyId),
    getPriceHistory(companyId),
    getCompanyClaim(companyId),
    getCompanyTeam(companyId),
    getCompanyNews(companyId),
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
  };

  if (report?.employee_estimate || company.employees) {
    const empValue = report?.employee_estimate || company.employees;
    const empNum = typeof empValue === 'string' ? parseInt(empValue, 10) : empValue;
    if (empNum && !isNaN(empNum)) {
      jsonLd.numberOfEmployees = {
        "@type": "QuantitativeValue",
        value: empNum,
      };
    }
  }

  if (report?.headquarters_city || company.city || company.country) {
    jsonLd.address = {
      "@type": "PostalAddress",
      ...(report?.headquarters_city || company.city ? { addressLocality: report?.headquarters_city || company.city } : {}),
      ...(report?.headquarters_country || company.country ? { addressCountry: report?.headquarters_country || company.country } : {}),
      ...(report?.contact_address ? { streetAddress: report.contact_address } : {}),
    };
  }

  if (isPublic && company.ticker) {
    jsonLd.tickerSymbol = company.ticker;
  }

  // Remove undefined values
  const cleanJsonLd = JSON.parse(JSON.stringify(jsonLd));

  return (
    <article>
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
        isClaimed={!!companyClaim}
        claimPlan={companyClaim?.plan || null}
        teamMembers={companyTeam}
        companyNews={companyNews}
      />
    </article>
  );
}
