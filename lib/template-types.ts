import type { Company, CompanyReport, FundingRound } from "./types";

export interface PipelineRow {
  id: string;
  slug: string | null;
  product_name: string;
  indication: string;
  stage: string;
  nct_id: string | null;
  trial_status: string | null;
  conditions: string | null;
  start_date: string | null;
  completion_date: string | null;
}

export interface DbFundingRound {
  id: string;
  round_type: string;
  amount_usd: number | null;
  lead_investor: string | null;
  announced_date: string | null;
  source_name: string | null;
  confidence: string | null;
}

export interface FdaApproval {
  id: string;
  drug_name: string;
  active_ingredient: string | null;
  application_number: string | null;
  application_type: string | null;
  approval_date: string | null;
  dosage_form: string | null;
  route: string | null;
}

export interface PublicationRow {
  id: string;
  pmid: string | null;
  title: string;
  journal: string | null;
  publication_date: string | null;
  authors: string | null;
}

export interface PatentRow {
  id: string;
  patent_number: string | null;
  title: string;
  filing_date: string | null;
  grant_date: string | null;
  abstract: string | null;
}

export interface PricePoint {
  date: string;
  close: number;
  adj_close: number | null;
  volume: number | null;
  market_cap_usd: number | null;
  currency: string | null;
}

export interface CompanySector {
  sector_id: string;
  is_primary: boolean;
  confidence: number | null;
  sectors: { id: string; name: string; slug: string } | null;
}

export interface ClaimedTeamMember {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  display_order: number;
}

export interface TimelineEvent {
  year: number;
  label: string;
  detail: string;
  type: "founded" | "funding" | "ipo" | "fda";
}

export interface TemplateNewsItem {
  id: string;
  title: string;
  source_name: string | null;
  source_url: string | null;
  summary: string | null;
  published_date: string | null;
}

export interface TemplateProps {
  company: Company;
  companyId: string | null;
  companyFunding: FundingRound[];
  similar: Company[];
  report: CompanyReport | null;
  sectors: CompanySector[];
  pipelines: PipelineRow[];
  dbFundingRounds: DbFundingRound[];
  fdaApprovals: FdaApproval[];
  publications: PublicationRow[];
  patents: PatentRow[];
  priceHistory: PricePoint[];
  teamMembers: ClaimedTeamMember[];
  timelineEvents: TimelineEvent[];
  followerCount: number;
  brandColor: string;
  heroTagline: string | null;
  news: TemplateNewsItem[];
}
