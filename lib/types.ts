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
