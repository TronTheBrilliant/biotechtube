import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Types ──

export interface FundingPulse {
  monthTotal: number;
  monthCount: number;
  prevMonthTotal: number;
  prevMonthCount: number;
  avgRoundSize: number;
  prevAvgRoundSize: number;
  ytdTotal: number;
  prevYtdTotal: number;
  latestDealCompany: string | null;
  latestDealAmount: number | null;
  latestDealType: string | null;
  latestDealDate: string | null;
  latestDealSlug: string | null;
  hottestSector: string | null;
}

export interface FundingByRoundType {
  year: number;
  roundType: string;
  total: number;
  rounds: number;
}

export interface FundingBySector {
  sector: string;
  total: number;
  rounds: number;
}

export interface FundingByCountry {
  country: string;
  total: number;
  rounds: number;
}

export interface DealVelocityWeek {
  weekStart: string;
  dealCount: number;
  totalAmount: number;
}

export interface CoInvestorPair {
  investorA: string;
  investorB: string;
  sharedCompanies: number;
}

// ── Queries ──

export async function getFundingPulse(): Promise<FundingPulse> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc("get_funding_pulse" as any);
  if (error || !data || (data as unknown[]).length === 0) {
    return {
      monthTotal: 0, monthCount: 0, prevMonthTotal: 0, prevMonthCount: 0,
      avgRoundSize: 0, prevAvgRoundSize: 0, ytdTotal: 0, prevYtdTotal: 0,
      latestDealCompany: null, latestDealAmount: null, latestDealType: null,
      latestDealDate: null, latestDealSlug: null, hottestSector: null,
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = (data as any[])[0];
  return {
    monthTotal: Number(r.month_total),
    monthCount: Number(r.month_count),
    prevMonthTotal: Number(r.prev_month_total),
    prevMonthCount: Number(r.prev_month_count),
    avgRoundSize: Number(r.avg_round_size),
    prevAvgRoundSize: Number(r.prev_avg_round_size),
    ytdTotal: Number(r.ytd_total),
    prevYtdTotal: Number(r.prev_ytd_total),
    latestDealCompany: r.latest_deal_company || null,
    latestDealAmount: r.latest_deal_amount ? Number(r.latest_deal_amount) : null,
    latestDealType: r.latest_deal_type || null,
    latestDealDate: r.latest_deal_date || null,
    latestDealSlug: r.latest_deal_slug || null,
    hottestSector: r.hottest_sector || null,
  };
}

export async function getFundingByRoundType(): Promise<FundingByRoundType[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc("get_funding_by_round_type" as any);
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    year: Number(r.year),
    roundType: r.round_type,
    total: Number(r.total),
    rounds: Number(r.rounds),
  }));
}

export async function getFundingBySector(limit = 10): Promise<FundingBySector[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc("get_funding_by_sector" as any, { p_limit: limit });
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    sector: r.sector,
    total: Number(r.total),
    rounds: Number(r.rounds),
  }));
}

export async function getFundingByCountry(limit = 15): Promise<FundingByCountry[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc("get_funding_by_country" as any, { p_limit: limit });
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    country: r.country,
    total: Number(r.total),
    rounds: Number(r.rounds),
  }));
}

export async function getDealVelocity(): Promise<DealVelocityWeek[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc("get_deal_velocity" as any);
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    weekStart: r.week_start,
    dealCount: Number(r.deal_count),
    totalAmount: Number(r.total_amount),
  }));
}

export async function getCoInvestors(limit = 5): Promise<CoInvestorPair[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc("get_co_investors" as any, { p_limit: limit });
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    investorA: r.investor_a,
    investorB: r.investor_b,
    sharedCompanies: Number(r.shared_companies),
  }));
}

// ── Combined fetch ──

export async function getAllIntelligenceData() {
  const [pulse, byRoundType, bySector, byCountry, dealVelocity, coInvestors] =
    await Promise.all([
      getFundingPulse(),
      getFundingByRoundType(),
      getFundingBySector(10),
      getFundingByCountry(15),
      getDealVelocity(),
      getCoInvestors(5),
    ]);

  return { pulse, byRoundType, bySector, byCountry, dealVelocity, coInvestors };
}
