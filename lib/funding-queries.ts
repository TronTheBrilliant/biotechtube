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
}

export interface FundingStats {
  totalTracked: number;
  largestRound: number;
  largestRoundCompany: string;
  totalRounds: number;
  totalCompanies: number;
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
      .select("company_name, round_type, amount_usd, lead_investor, announced_date, country, sector")
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

// ── Combined fetch for funding page ──

export async function getAllFundingData() {
  const [annualData, quarterlyData, monthlyData, rounds, stats] =
    await Promise.all([
      getFundingAnnual(),
      getFundingQuarterly(),
      getFundingMonthly(),
      getFundingRounds(),
      getFundingStats(),
    ]);

  return { annualData, quarterlyData, monthlyData, rounds, stats };
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
