export type Stage =
  | "Pre-clinical"
  | "Phase 1"
  | "Phase 1/2"
  | "Phase 2"
  | "Phase 3"
  | "Approved";

export type CompanyType = "Public" | "Private";

export type RoundType =
  | "Seed"
  | "Series A"
  | "Series B"
  | "Series C"
  | "Grant"
  | "Public"
  | "Follow-on";

export interface Company {
  slug: string;
  name: string;
  country: string;
  city: string;
  founded: number;
  stage: Stage;
  type: CompanyType;
  ticker?: string;
  focus: string[];
  employees: string;
  totalRaised: number;
  valuation?: number;
  isEstimated?: boolean;
  description: string;
  website: string;
  logoUrl?: string;
  trending?: number | null;
  profileViews?: number;
}

export interface FundingRound {
  companySlug: string;
  type: RoundType;
  amount: number;
  currency: "USD" | "EUR" | "NOK";
  date: string;
  leadInvestor?: string;
  investors?: string[];
  daysAgo?: number;
}

export interface PipelineProgram {
  companySlug: string;
  name: string;
  indication: string;
  stage: Stage;
  mechanism?: string;
  nextCatalyst?: string;
  nctId?: string;
}

export interface BiotechEvent {
  name: string;
  date: string;
  endDate?: string;
  location: string;
}

export interface TeamMember {
  name: string;
  role: string;
  initials: string;
}

export interface Publication {
  title: string;
  journal: string;
  date: string;
  doi?: string;
  isPdf?: boolean;
}

export interface ReportPipelineProgram {
  name: string;
  indication: string;
  phase: string;
  status: string;
  trial_id?: string;
}

export interface ReportKeyPerson {
  name: string;
  role: string;
  email?: string;
}

export interface CompanyReport {
  id: string;
  company_id: string;
  report_slug: string;
  summary: string | null;
  deep_report: string | null;
  founded: number | null;
  headquarters_city: string | null;
  headquarters_country: string | null;
  employee_estimate: string | null;
  business_model: string | null;
  revenue_status: string | null;
  stage: string | null;
  company_type: string | null;
  ticker: string | null;
  exchange: string | null;
  therapeutic_areas: string[] | null;
  technology_platform: string | null;
  pipeline_programs: ReportPipelineProgram[] | null;
  key_people: ReportKeyPerson[] | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_address: string | null;
  funding_mentions: string[] | null;
  total_raised_estimate: number | null;
  investors: string[] | null;
  partners: string[] | null;
  opportunities: string | null;
  risks: string | null;
  competitive_landscape: string | null;
  pages_scraped: string[] | null;
  scraped_at: string | null;
  analyzed_at: string | null;
}
