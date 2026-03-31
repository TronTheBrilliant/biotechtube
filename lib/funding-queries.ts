import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Types ──

export interface FundingAnnualRow {
  year: number;
  rounds: number;
  total: number;
}

export interface FundingQuarterlyRow {
  year: number;
  quarter: number;
  rounds: number;
  total: number;
}

export interface FundingMonthlyRow {
  year: number;
  month: number;
  rounds: number;
  total: number;
}

export interface FundingRoundRow {
  company_name: string;
  round_type: string | null;
  amount_usd: number;
  lead_investor: string | null;
  announced_date: string;
  country: string | null;
  sector: string | null;
  confidence: string | null;
  source_name: string | null;
}

export interface FundingStats {
  totalTracked: number;
  largestRound: number;
  largestRoundCompany: string;
  totalRounds: number;
  totalCompanies: number;
}

export interface TopInvestorRow {
  investor_name: string;
  total_invested: number;
  deal_count: number;
  avg_deal_size: number;
  top_companies: string;
}

export interface InvestorStats {
  uniqueInvestors: number;
  largestInvestorName: string;
  largestInvestorTotal: number;
  mostActiveName: string;
  mostActiveDeals: number;
  avgDealSizeAll: number;
}

// ── Queries using SQL RPC functions ──

export async function getFundingAnnual(): Promise<FundingAnnualRow[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc("get_funding_annual" as any);
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    year: Number(r.year),
    rounds: Number(r.rounds),
    total: Number(r.total),
  }));
}

export async function getFundingQuarterly(): Promise<FundingQuarterlyRow[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc("get_funding_quarterly" as any);
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    year: Number(r.year),
    quarter: Number(r.quarter),
    rounds: Number(r.rounds),
    total: Number(r.total),
  }));
}

export async function getFundingMonthly(): Promise<FundingMonthlyRow[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc("get_funding_monthly" as any);
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    year: Number(r.year),
    month: Number(r.month),
    rounds: Number(r.rounds),
    total: Number(r.total),
  }));
}

export async function getFundingStats(): Promise<FundingStats> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc("get_funding_stats" as any);
  if (error || !data || (data as unknown[]).length === 0) {
    return { totalTracked: 0, largestRound: 0, largestRoundCompany: "", totalRounds: 0, totalCompanies: 0 };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = (data as any[])[0];
  return {
    totalTracked: Number(row.total_tracked),
    largestRound: Number(row.largest_round),
    largestRoundCompany: row.largest_round_company || "",
    totalRounds: Number(row.total_rounds),
    totalCompanies: Number(row.total_companies),
  };
}

export async function getFundingRounds(): Promise<FundingRoundRow[]> {
  const supabase = getSupabase();
  const allRows: FundingRoundRow[] = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: rows } = await supabase
      .from("funding_rounds")
      .select("company_name, round_type, amount_usd, lead_investor, announced_date, country, sector, confidence, source_name")
      .gt("amount_usd", 0)
      .order("announced_date", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (!rows || rows.length === 0) {
      hasMore = false;
    } else {
      allRows.push(...(rows as FundingRoundRow[]));
      offset += pageSize;
      if (rows.length < pageSize) hasMore = false;
    }
  }

  return allRows;
}

// ── Top investors query ──

export async function getTopInvestors(limit = 50): Promise<TopInvestorRow[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc("get_top_investors" as any, { p_limit: limit });
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    investor_name: r.investor_name,
    total_invested: Number(r.total_invested),
    deal_count: Number(r.deal_count),
    avg_deal_size: Number(r.avg_deal_size),
    top_companies: r.top_companies || "",
  }));
}

export async function getInvestorStats(): Promise<InvestorStats> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc("get_investor_stats" as any);
  if (error || !data || (data as unknown[]).length === 0) {
    return { uniqueInvestors: 0, largestInvestorName: "", largestInvestorTotal: 0, mostActiveName: "", mostActiveDeals: 0, avgDealSizeAll: 0 };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = (data as any[])[0];
  return {
    uniqueInvestors: Number(row.unique_investors),
    largestInvestorName: row.largest_investor_name || "",
    largestInvestorTotal: Number(row.largest_investor_total),
    mostActiveName: row.most_active_name || "",
    mostActiveDeals: Number(row.most_active_deals),
    avgDealSizeAll: Number(row.avg_deal_size_all),
  };
}

// ── Combined fetch for funding page ──

export async function getAllFundingData() {
  const [annualData, quarterlyData, monthlyData, rounds, stats, topInvestors, investorStats] =
    await Promise.all([
      getFundingAnnual(),
      getFundingQuarterly(),
      getFundingMonthly(),
      getFundingRounds(),
      getFundingStats(),
      getTopInvestors(50),
      getInvestorStats(),
    ]);

  return { annualData, quarterlyData, monthlyData, rounds, stats, topInvestors, investorStats };
}

// ── Homepage chart data ──

export async function getFundingAnnualForHomepage(): Promise<
  { year: number; amount: number; deals: number }[]
> {
  const annual = await getFundingAnnual();
  return annual.map((r) => ({
    year: r.year,
    amount: Math.round(r.total / 1_000_000),
    deals: r.rounds,
  }));
}
