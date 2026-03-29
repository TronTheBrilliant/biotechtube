import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Company, CompanyReport, FundingRound } from "@/lib/types";
import { CompanyPageClient } from "./CompanyPageClient";
import { dbRowToCompany, dbRowsToCompanies } from "@/lib/adapters";
import { createClient } from "@supabase/supabase-js";
import { formatMarketCap } from "@/lib/market-utils";

import fundingData from "@/data/funding.json";

export const revalidate = 300;

/* ─── Tier detection ─── */
interface SectorRanking {
  sector: string;
  sectorSlug: string;
  rank: number;
}

interface CompetitorEntry {
  slug: string;
  name: string;
  logoUrl: string | null;
  marketCap: number | null;
  primarySector: string | null;
}

interface TimelineEvent {
  year: number;
  label: string;
  detail: string;
  type: 'founded' | 'funding' | 'ipo' | 'fda';
}

function getProfileTier(
  company: ReturnType<typeof dbRowToCompany>,
  qualityScore: number,
  isClaimed: boolean,
  claimPlan: string | null,
  dataSectionCount: number,
): 'basic' | 'enhanced' | 'premium' {
  if (isClaimed && claimPlan) return 'premium';

  const hasGoodDescription = company.description && company.description.length > 200;
  if (hasGoodDescription && qualityScore >= 6.5 && dataSectionCount >= 2) return 'enhanced';

  return 'basic';
}

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
  const companyCategories = (company as any).categories || [];
  const companyValuation = (company as any).valuation || 0;

  // Find companies in the same primary sector with similar market cap
  if (companyCategories.length > 0) {
    const primarySector = companyCategories[0];
    const { data } = await supabase
      .from('companies')
      .select('*')
      .contains('categories', [primarySector])
      .neq('slug', company.slug)
      .not('valuation', 'is', null)
      .order('valuation', { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      const sorted = data.sort((a: any, b: any) => {
        const diffA = Math.abs((a.valuation || 0) - companyValuation);
        const diffB = Math.abs((b.valuation || 0) - companyValuation);
        return diffA - diffB;
      });
      return dbRowsToCompanies(sorted.slice(0, 5));
    }
  }

  // Fallback: same country, ordered by valuation
  const { data } = await supabase
    .from('companies')
    .select('*')
    .eq('country', company.country)
    .neq('slug', company.slug)
    .not('valuation', 'is', null)
    .order('valuation', { ascending: false })
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
    .select('id, status, plan, verified_at, user_id')
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

async function getQualityScore(companyId: string): Promise<number> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('profile_quality')
    .select('quality_score')
    .eq('company_id', companyId)
    .single();
  return data?.quality_score ? Number(data.quality_score) : 0;
}

async function getSectorRankings(companyId: string, sectors: { sector_id: string; is_primary: boolean; sectors: { id: string; name: string; slug: string } | null }[], marketCap: number | undefined): Promise<SectorRanking[]> {
  if (!marketCap || marketCap <= 0 || sectors.length === 0) return [];
  const supabase = getSupabase();
  const rankings: SectorRanking[] = [];

  // Only rank in top 2 sectors (primary first)
  const topSectors = sectors.filter(s => s.sectors).slice(0, 2);

  for (const s of topSectors) {
    if (!s.sectors) continue;
    // Count companies with higher market cap in this sector
    const { count } = await supabase
      .from('company_sectors')
      .select('company_id, companies!inner(valuation)', { count: 'exact', head: true })
      .eq('sector_id', s.sector_id)
      .gt('companies.valuation', marketCap);

    rankings.push({
      sector: s.sectors.name,
      sectorSlug: s.sectors.slug,
      rank: (count || 0) + 1,
    });
  }

  return rankings;
}

async function getEnhancedCompetitors(company: ReturnType<typeof dbRowToCompany>, sectors: { sector_id: string; sectors: { id: string; name: string; slug: string } | null }[]): Promise<CompetitorEntry[]> {
  const supabase = getSupabase();

  // Get the primary sector
  const primarySector = sectors.find(s => s.sectors);
  if (!primarySector?.sectors) return [];

  const marketCap = company.valuation || 0;
  // Find companies in the same primary sector, with closest market cap
  const { data } = await supabase
    .from('company_sectors')
    .select('companies(slug, name, logo_url, valuation, country)')
    .eq('sector_id', primarySector.sector_id)
    .neq('companies.slug', company.slug)
    .limit(50);

  if (!data || data.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidates = data.filter((r: any) => r.companies && !Array.isArray(r.companies)).map((r: any) => ({
    slug: r.companies.slug as string,
    name: r.companies.name as string,
    logoUrl: r.companies.logo_url as string | null,
    marketCap: r.companies.valuation as number | null,
    primarySector: primarySector.sectors!.name,
  }));

  // Sort by closest market cap (prefer companies with a market cap)
  candidates.sort((a: CompetitorEntry, b: CompetitorEntry) => {
    const aCap = a.marketCap || 0;
    const bCap = b.marketCap || 0;
    // Prefer companies that have market caps
    if (aCap > 0 && bCap === 0) return -1;
    if (aCap === 0 && bCap > 0) return 1;
    return Math.abs(aCap - marketCap) - Math.abs(bCap - marketCap);
  });

  return candidates.slice(0, 4);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTimelineEvents(company: ReturnType<typeof dbRowToCompany>, fundingRounds: any[], fdaApprovals: any[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Founded
  if (company.founded > 0) {
    const location = [company.city, company.country].filter(Boolean).join(', ');
    events.push({
      year: company.founded,
      label: 'Founded',
      detail: location ? `Founded in ${location}` : 'Company founded',
      type: 'founded',
    });
  }

  // IPO from funding rounds
  const ipoRound = fundingRounds.find((r: { round_type: string }) => r.round_type === 'IPO');
  if (ipoRound) {
    const year = ipoRound.announced_date ? new Date(ipoRound.announced_date).getFullYear() : null;
    if (year) {
      events.push({
        year,
        label: 'IPO',
        detail: ipoRound.amount_usd
          ? `IPO — ${formatMarketCap(ipoRound.amount_usd)}`
          : 'Initial Public Offering',
        type: 'ipo',
      });
    }
  }

  // Major funding rounds (non-IPO, take top 2 by amount)
  const majorRounds = fundingRounds
    .filter((r: { round_type: string; amount_usd: number | null; announced_date: string | null }) =>
      r.round_type !== 'IPO' && r.amount_usd && r.amount_usd > 0 && r.announced_date)
    .sort((a: { amount_usd: number }, b: { amount_usd: number }) => b.amount_usd - a.amount_usd)
    .slice(0, 2);

  for (const r of majorRounds) {
    const year = new Date(r.announced_date).getFullYear();
    events.push({
      year,
      label: r.round_type,
      detail: `${r.round_type}: ${formatMarketCap(r.amount_usd)}`,
      type: 'funding',
    });
  }

  // FDA approvals (first 3)
  const topFda = fdaApprovals
    .filter((a: { approval_date: string | null }) => a.approval_date)
    .slice(0, 3);
  for (const a of topFda) {
    const year = new Date(a.approval_date).getFullYear();
    events.push({
      year,
      label: 'FDA Approval',
      detail: `FDA Approval: ${a.drug_name}`,
      type: 'fda',
    });
  }

  // Sort by year, deduplicate, limit to 6
  events.sort((a, b) => a.year - b.year);
  return events.slice(0, 6);
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
      .select('date, close, adj_close, volume, market_cap_usd, currency')
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

  // Count data sections for tier detection
  let dataSectionCount = 0;
  if (pipelines.length > 0) dataSectionCount++;
  if (dbFundingRounds.length > 0 || companyFunding.length > 0) dataSectionCount++;
  if (fdaApprovals.length > 0) dataSectionCount++;
  if (patents.length > 0) dataSectionCount++;
  if (publications.length > 0) dataSectionCount++;
  if (priceHistory.length > 0) dataSectionCount++;

  // Fetch quality score for tier detection
  const qualityScore = await getQualityScore(companyId);
  const tier = getProfileTier(company, qualityScore, !!companyClaim, companyClaim?.plan || null, dataSectionCount);

  // Fetch enhanced data only for enhanced/premium tiers
  let sectorRankings: SectorRanking[] = [];
  let competitors: CompetitorEntry[] = [];
  let timelineEvents: TimelineEvent[] = [];

  if (tier === 'enhanced' || tier === 'premium') {
    [sectorRankings, competitors] = await Promise.all([
      getSectorRankings(companyId, sectors, company.valuation),
      getEnhancedCompetitors(company, sectors),
    ]);
    timelineEvents = buildTimelineEvents(company, dbFundingRounds, fdaApprovals);
  }

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
        claimUserId={companyClaim?.user_id || null}
        teamMembers={companyTeam}
        companyNews={companyNews}
        tier={tier}
        sectorRankings={sectorRankings}
        competitors={competitors}
        timelineEvents={timelineEvents}
      />
    </article>
  );
}
