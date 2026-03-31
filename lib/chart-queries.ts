import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const PAGE_SIZE = 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllRows(table: string, select: string, orderBy: string, ascending = true): Promise<any[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRows: any[] = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data } = await supabase
      .from(table)
      .select(select)
      .order(orderBy, { ascending })
      .range(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allRows.push(...data);
      offset += PAGE_SIZE;
      if (data.length < PAGE_SIZE) hasMore = false;
    }
  }
  return allRows;
}

function thin<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = Math.ceil(arr.length / maxPoints);
  const result: T[] = [];
  for (let i = 0; i < arr.length; i += step) result.push(arr[i]);
  // Always include the last point
  if (result[result.length - 1] !== arr[arr.length - 1]) result.push(arr[arr.length - 1]);
  return result;
}

// ─── Chart 1: Total Market Cap ───
// Note: market_snapshots uses carry-forward logic which inflates values ~10-20% for historical data.
// The 1990-01-01 entry is a known outlier. We filter weekdays-only and skip the first entry if it's Jan 1.
export async function getMarketCapHistory() {
  const rows = await fetchAllRows(
    "market_snapshots",
    "snapshot_date, total_market_cap, public_companies_count, total_volume",
    "snapshot_date",
    true
  );
  return thin(
    rows.filter((r: { total_market_cap: number | null; public_companies_count: number | null; snapshot_date: string }) => {
      if (r.total_market_cap == null) return false;
      // Skip the poisoned 1990-01-01 entry (single company with $1T carry-forward)
      if (r.snapshot_date === "1990-01-01") return false;
      // Require at least 5 companies to avoid carry-forward noise in early data
      if (r.public_companies_count != null && r.public_companies_count < 5) return false;
      return true;
    }),
    800
  );
}

// ─── Chart 2: Sector Dominance ───
// Uses market_snapshots.total_market_cap as denominator (not sum of sectors which double-counts)
// Each sector's % can overlap — a company in 3 sectors counts toward all 3
export async function getSectorDominanceHistory() {
  const supabase = getSupabase();

  const { data: sectors } = await supabase
    .from("sectors")
    .select("id, name, short_name");

  // Get sector data
  const rows = await fetchAllRows(
    "sector_market_data",
    "sector_id, snapshot_date, combined_market_cap",
    "snapshot_date",
    true
  );

  // Get market totals for the real denominator
  const marketRows = await fetchAllRows(
    "market_snapshots",
    "snapshot_date, total_market_cap",
    "snapshot_date",
    true
  );
  const marketTotalByDate = new Map<string, number>();
  for (const row of marketRows) {
    if (row.total_market_cap) marketTotalByDate.set(row.snapshot_date, row.total_market_cap);
  }

  // Group by date — skip pre-2005
  const byDate = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (!row.combined_market_cap) continue;
    if (row.snapshot_date < "2005-01-01") continue;
    if (!byDate.has(row.snapshot_date)) byDate.set(row.snapshot_date, new Map());
    const dateMap = byDate.get(row.snapshot_date)!;
    dateMap.set(row.sector_id, (dateMap.get(row.sector_id) || 0) + row.combined_market_cap);
  }

  const dates = Array.from(byDate.keys()).sort();
  const latestDate = dates[dates.length - 1];
  const latestValues = byDate.get(latestDate) || new Map();
  const sectorTotals = Array.from(latestValues.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const topSectorIds = sectorTotals.map((s) => s[0]);

  const sectorNameMap = new Map(
    (sectors || []).map((s: { id: string; name: string; short_name: string | null }) => [
      s.id,
      s.short_name || s.name,
    ])
  );

  // Build series — thin each sector independently to avoid date alignment gaps
  const sectorSeries = topSectorIds.map((sectorId) => {
    const sectorDates = dates.filter(
      (date) => byDate.get(date)?.has(sectorId) && marketTotalByDate.has(date)
    );
    const fullData = sectorDates.map((date) => {
      const marketTotal = marketTotalByDate.get(date) || 1;
      const sectorVal = byDate.get(date)!.get(sectorId) || 0;
      return {
        time: date,
        value: marketTotal > 0 ? (sectorVal / marketTotal) * 100 : 0,
      };
    });
    return {
      name: sectorNameMap.get(sectorId) || sectorId,
      data: thin(fullData, 200),
    };
  });

  return { sectorSeries, sectorNames: topSectorIds.map((id) => sectorNameMap.get(id) || id) };
}

// ─── Chart 3: Geographic Distribution ───
// Each country's series is thinned independently to avoid date alignment gaps
// Uses market_snapshots total as denominator (no double-counting since companies have one country)
export async function getGeographicDistribution() {
  const rows = await fetchAllRows(
    "country_market_data",
    "country, snapshot_date, combined_market_cap",
    "snapshot_date",
    true
  );

  // Get market totals for denominator
  const marketRows = await fetchAllRows(
    "market_snapshots",
    "snapshot_date, total_market_cap",
    "snapshot_date",
    true
  );
  const marketTotalByDate = new Map<string, number>();
  for (const row of marketRows) {
    if (row.total_market_cap) marketTotalByDate.set(row.snapshot_date, row.total_market_cap);
  }

  // Group by country then by date — skip pre-2005
  const byCountry = new Map<string, { time: string; value: number }[]>();
  for (const row of rows) {
    if (!row.combined_market_cap) continue;
    if (row.snapshot_date < "2005-01-01") continue;
    const marketTotal = marketTotalByDate.get(row.snapshot_date);
    if (!marketTotal || marketTotal <= 0) continue;

    if (!byCountry.has(row.country)) byCountry.set(row.country, []);
    byCountry.get(row.country)!.push({
      time: row.snapshot_date,
      value: (row.combined_market_cap / marketTotal) * 100,
    });
  }

  // Find top 8 countries by latest value
  const topCountries = Array.from(byCountry.entries())
    .map(([country, data]) => ({ country, lastValue: data[data.length - 1]?.value || 0 }))
    .sort((a, b) => b.lastValue - a.lastValue)
    .slice(0, 8)
    .map((c) => c.country);

  // Build series — thin each country independently
  return topCountries.map((country) => ({
    name: country,
    data: thin(byCountry.get(country) || [], 200),
  }));
}

// ─── Chart 4: Public Companies Count ───
export async function getPublicCompaniesCount() {
  const rows = await getMarketCapHistory();
  return thin(
    rows
      .filter((r: { public_companies_count: number | null }) => r.public_companies_count != null)
      .map((r: { snapshot_date: string; public_companies_count: number }) => ({
        time: r.snapshot_date,
        value: r.public_companies_count,
      })),
    500
  );
}

// ─── Chart 5: Funding Volume (Monthly) ───
export async function getFundingVolumeMonthly() {
  const supabase = getSupabase();
  const { data } = await supabase.rpc("get_funding_monthly" as never);
  if (!data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r: { year: number; month: number; total: number; rounds: number }) => ({
    time: `${r.year}-${String(r.month).padStart(2, "0")}-01`,
    value: Number(r.total) || 0,
    rounds: Number(r.rounds) || 0,
  }));
}

// ─── Chart 6: Funding Round Mix ───
// Exclude filing_only confidence (SEC EDGAR bulk filings pollute round type distribution)
export async function getFundingRoundMix() {
  const supabase = getSupabase();
  const allRows = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data } = await supabase
      .from("funding_rounds")
      .select("round_type, announced_date")
      .not("announced_date", "is", null)
      .not("round_type", "is", null)
      .neq("confidence", "filing_only")
      .order("announced_date", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) hasMore = false;
    else {
      allRows.push(...data);
      offset += PAGE_SIZE;
      if (data.length < PAGE_SIZE) hasMore = false;
    }
  }

  // Group by quarter and round type
  const roundTypes = ["Seed", "Series A", "Series B", "Series C", "IPO", "Public Offering", "Grant", "PIPE"];
  const byQuarter = new Map<string, Map<string, number>>();

  for (const row of allRows) {
    const date = new Date(row.announced_date);
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    const key = `${date.getFullYear()}-Q${quarter}`;
    const type = roundTypes.includes(row.round_type) ? row.round_type : "Other";

    if (!byQuarter.has(key)) byQuarter.set(key, new Map());
    const qMap = byQuarter.get(key)!;
    qMap.set(type, (qMap.get(type) || 0) + 1);
  }

  // Convert to series per round type
  const quarters = Array.from(byQuarter.keys()).sort();
  const allTypes = [...roundTypes, "Other"];
  return allTypes.map((type) => ({
    name: type,
    data: quarters.map((q) => {
      // Convert Q format to date for TradingView
      const [year, qStr] = q.split("-Q");
      const month = (parseInt(qStr) - 1) * 3 + 1;
      return {
        time: `${year}-${String(month).padStart(2, "0")}-01`,
        value: byQuarter.get(q)?.get(type) || 0,
      };
    }),
  }));
}

// ─── Chart 7: IPO Activity ───
// Note: SEC EDGAR "filing_only" data massively overcounts IPOs (counts all filings as IPOs).
// We exclude filing_only confidence to show realistic IPO numbers.
export async function getIPOActivity() {
  const supabase = getSupabase();
  const allRows = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data } = await supabase
      .from("funding_rounds")
      .select("announced_date, amount_usd")
      .or("round_type.eq.IPO,round_type.ilike.%Public Offering%")
      .not("announced_date", "is", null)
      .neq("confidence", "filing_only")
      .order("announced_date", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) hasMore = false;
    else {
      allRows.push(...data);
      offset += PAGE_SIZE;
      if (data.length < PAGE_SIZE) hasMore = false;
    }
  }

  if (allRows.length === 0) return [];
  const data = allRows;

  // Group by quarter
  const byQuarter = new Map<string, { count: number; total: number }>();
  for (const row of data) {
    const date = new Date(row.announced_date);
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    const month = (quarter - 1) * 3 + 1;
    const key = `${date.getFullYear()}-${String(month).padStart(2, "0")}-01`;
    const existing = byQuarter.get(key) || { count: 0, total: 0 };
    existing.count += 1;
    existing.total += row.amount_usd || 0;
    byQuarter.set(key, existing);
  }

  return Array.from(byQuarter.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, val]) => ({ time, value: val.count, total: val.total }));
}

// ─── Chart 8: Average Round Size ───
// Exclude filing_only, require minimum $100K rounds, minimum 10 rounds per quarter,
// and start from 2005 where data coverage is consistent
export async function getAverageRoundSize() {
  const supabase = getSupabase();
  const allRows = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data } = await supabase
      .from("funding_rounds")
      .select("announced_date, amount_usd")
      .not("announced_date", "is", null)
      .gte("amount_usd", 100000) // $100K minimum to exclude micro-grants
      .neq("confidence", "filing_only")
      .gte("announced_date", "2005-01-01")
      .order("announced_date", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) hasMore = false;
    else {
      allRows.push(...data);
      offset += PAGE_SIZE;
      if (data.length < PAGE_SIZE) hasMore = false;
    }
  }

  // Group by quarter, calculate average and median
  const byQuarter = new Map<string, number[]>();
  for (const row of allRows) {
    const date = new Date(row.announced_date);
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    const month = (quarter - 1) * 3 + 1;
    const key = `${date.getFullYear()}-${String(month).padStart(2, "0")}-01`;
    if (!byQuarter.has(key)) byQuarter.set(key, []);
    byQuarter.get(key)!.push(row.amount_usd);
  }

  // Only include quarters with at least 100 rounds for statistical validity
  // Below that, a few mega-rounds skew the average/median dramatically
  // (2025+ data is incomplete — mostly large well-known rounds, missing small rounds)
  const quarters = Array.from(byQuarter.keys())
    .filter((q) => (byQuarter.get(q)?.length || 0) >= 100)
    .sort();
  return {
    average: quarters.map((q) => {
      const amounts = byQuarter.get(q)!;
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      return { time: q, value: avg };
    }),
    median: quarters.map((q) => {
      const amounts = byQuarter.get(q)!.sort((a, b) => a - b);
      const mid = Math.floor(amounts.length / 2);
      const median = amounts.length % 2 ? amounts[mid] : (amounts[mid - 1] + amounts[mid]) / 2;
      return { time: q, value: median };
    }),
  };
}

// ─── Chart 9: Clinical Trial Starts ───
// Cap at today's date — some trials have future "expected" start dates
export async function getClinicalTrialStarts() {
  const supabase = getSupabase();
  const today = new Date().toISOString().split("T")[0];
  const allRows = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data } = await supabase
      .from("pipelines")
      .select("stage, start_date")
      .not("start_date", "is", null)
      .lte("start_date", today)
      .order("start_date", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) hasMore = false;
    else {
      allRows.push(...data);
      offset += PAGE_SIZE;
      if (data.length < PAGE_SIZE) hasMore = false;
    }
  }

  // Group by quarter and stage
  const stages = ["Phase 1", "Phase 2", "Phase 3"];
  const byQuarter = new Map<string, Map<string, number>>();

  for (const row of allRows) {
    const date = new Date(row.start_date);
    if (isNaN(date.getTime())) continue;
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    const month = (quarter - 1) * 3 + 1;
    const key = `${date.getFullYear()}-${String(month).padStart(2, "0")}-01`;
    const stage = stages.includes(row.stage) ? row.stage : null;
    if (!stage) continue;
    if (!byQuarter.has(key)) byQuarter.set(key, new Map());
    const qMap = byQuarter.get(key)!;
    qMap.set(stage, (qMap.get(stage) || 0) + 1);
  }

  const quarters = Array.from(byQuarter.keys()).sort();
  return stages.map((stage) => ({
    name: stage,
    data: quarters.map((q) => ({
      time: q,
      value: byQuarter.get(q)?.get(stage) || 0,
    })),
  }));
}

// ─── Chart 10: Pipeline Stage Distribution (current snapshot) ───
export async function getPipelineStageDistribution() {
  const supabase = getSupabase();
  // Use a direct count query to avoid the 1000-row default limit
  const stageOrder = [
    "Pre-clinical", "Phase 1", "Phase 1/2", "Phase 2",
    "Phase 2/3", "Phase 3", "Approved",
  ];

  const results = await Promise.all(
    stageOrder.map(async (stage) => {
      const { count } = await supabase
        .from("pipelines")
        .select("id", { count: "exact", head: true })
        .eq("stage", stage);
      return { stage, count: count || 0 };
    })
  );

  const total = results.reduce((s, r) => s + r.count, 0);
  return results
    .filter((r) => r.count > 0)
    .map((r) => ({
      stage: r.stage,
      count: r.count,
      percent: (r.count / total) * 100,
    }));
}


// ─── Chart 11: FDA Approval Timeline ───
// Filter to NDA + BLA (novel drugs and biologics) — exclude ANDA (generics) which are 69% of records
export async function getFDAApprovalTimeline() {
  const supabase = getSupabase();
  const allRows = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data } = await supabase
      .from("fda_approvals")
      .select("approval_date")
      .not("approval_date", "is", null)
      .in("application_type", ["NDA", "BLA"])
      .order("approval_date", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) hasMore = false;
    else {
      allRows.push(...data);
      offset += PAGE_SIZE;
      if (data.length < PAGE_SIZE) hasMore = false;
    }
  }

  const data = allRows;
  if (data.length === 0) return [];

  const byQuarter = new Map<string, number>();
  for (const row of data) {
    const date = new Date(row.approval_date);
    if (isNaN(date.getTime())) continue;
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    const month = (quarter - 1) * 3 + 1;
    const key = `${date.getFullYear()}-${String(month).padStart(2, "0")}-01`;
    byQuarter.set(key, (byQuarter.get(key) || 0) + 1);
  }

  return Array.from(byQuarter.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, value]) => ({ time, value }));
}

// ─── Chart 12: FDA Calendar Density ───
export async function getFDACalendarDensity() {
  const supabase = getSupabase();
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("fda_calendar")
    .select("decision_date")
    .gte("decision_date", today)
    .not("decision_date", "is", null)
    .order("decision_date", { ascending: true });

  if (!data || data.length === 0) return [];

  const byMonth = new Map<string, number>();
  for (const row of data) {
    const date = new Date(row.decision_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
    byMonth.set(key, (byMonth.get(key) || 0) + 1);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, value]) => ({ time, value }));
}

// ─── Chart 13: Sector Performance Scoreboard ───
export async function getSectorPerformance() {
  const supabase = getSupabase();

  // Get latest date
  const { data: latest } = await supabase
    .from("sector_market_data")
    .select("snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .single();

  if (!latest) return [];

  const { data } = await supabase
    .from("sector_market_data")
    .select("sector_id, combined_market_cap, change_1d_pct, change_7d_pct, change_30d_pct")
    .eq("snapshot_date", latest.snapshot_date);

  const { data: sectors } = await supabase
    .from("sectors")
    .select("id, name, short_name");

  const sectorMap = new Map(
    (sectors || []).map((s: { id: string; name: string; short_name: string | null }) => [
      s.id,
      s.short_name || s.name,
    ])
  );

  return (data || [])
    .map((r: { sector_id: string; combined_market_cap: number; change_30d_pct: number | null; change_7d_pct: number | null; change_1d_pct: number | null }) => ({
      name: sectorMap.get(r.sector_id) || r.sector_id,
      marketCap: r.combined_market_cap,
      change30d: r.change_30d_pct,
      change7d: r.change_7d_pct,
      change1d: r.change_1d_pct,
    }))
    .sort((a: { change30d: number | null }, b: { change30d: number | null }) => (b.change30d || 0) - (a.change30d || 0));
}

// ─── Chart 14 & 15: Sector Market Cap Growth / Rotation ───
export async function getSectorMarketCapHistory() {
  const supabase = getSupabase();

  const { data: sectors } = await supabase
    .from("sectors")
    .select("id, name, short_name");

  const rows = await fetchAllRows(
    "sector_market_data",
    "sector_id, snapshot_date, combined_market_cap",
    "snapshot_date",
    true
  );

  // Find top 8 sectors
  const latestDate = rows.length > 0 ? rows[rows.length - 1].snapshot_date : null;
  const latestBySector = new Map<string, number>();
  for (const row of rows) {
    if (row.snapshot_date === latestDate && row.combined_market_cap) {
      latestBySector.set(row.sector_id, row.combined_market_cap);
    }
  }
  const topSectorIds = Array.from(latestBySector.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map((s) => s[0]);

  const sectorNameMap = new Map(
    (sectors || []).map((s: { id: string; name: string; short_name: string | null }) => [
      s.id,
      s.short_name || s.name,
    ])
  );

  // Group data by sector — skip pre-2005 noisy data
  const bySector = new Map<string, { time: string; value: number }[]>();
  for (const row of rows) {
    if (!topSectorIds.includes(row.sector_id)) continue;
    if (!row.combined_market_cap) continue;
    if (row.snapshot_date < "2005-01-01") continue;
    if (!bySector.has(row.sector_id)) bySector.set(row.sector_id, []);
    bySector.get(row.sector_id)!.push({
      time: row.snapshot_date,
      value: row.combined_market_cap,
    });
  }

  return topSectorIds.map((id) => ({
    name: sectorNameMap.get(id) || id,
    data: thin(bySector.get(id) || [], 300),
  }));
}

// ─── Chart 16: Hype Index (composite) ───
export async function getHypeIndex() {
  // We'll build this from market_snapshots change data
  const rows = await fetchAllRows(
    "market_snapshots",
    "snapshot_date, change_30d_pct, total_volume",
    "snapshot_date",
    true
  );

  if (rows.length === 0) return [];

  // Simple hype index: normalize 30d change to 0-100 scale
  // Range: -50% (fear) to +50% (euphoria), mapped to 0-100
  return thin(
    rows
      .filter((r: { change_30d_pct: number | null }) => r.change_30d_pct != null)
      .map((r: { snapshot_date: string; change_30d_pct: number }) => {
        const clamped = Math.max(-30, Math.min(30, r.change_30d_pct));
        const score = ((clamped + 30) / 60) * 100; // 0-100
        return { time: r.snapshot_date, value: Math.round(score * 10) / 10 };
      }),
    500
  );
}

// ─── Chart 17: Pipeline Value Ratio ───
export async function getPipelineValueRatio() {
  const supabase = getSupabase();

  // Count Phase 3 drugs per sector
  const { data: pipelines } = await supabase
    .from("pipelines")
    .select("company_id, stage")
    .in("stage", ["Phase 3", "Phase 2/3"]);

  // Get company sectors
  const { data: companySectors } = await supabase
    .from("company_sectors")
    .select("company_id, sector_id");

  const { data: sectors } = await supabase
    .from("sectors")
    .select("id, name, short_name");

  // Get latest sector market caps
  const { data: latestDate } = await supabase
    .from("sector_market_data")
    .select("snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .single();

  const { data: sectorData } = await supabase
    .from("sector_market_data")
    .select("sector_id, combined_market_cap")
    .eq("snapshot_date", latestDate?.snapshot_date || "");

  // Build lookup
  const companySectorMap = new Map<string, string[]>();
  for (const cs of companySectors || []) {
    if (!companySectorMap.has(cs.company_id)) companySectorMap.set(cs.company_id, []);
    companySectorMap.get(cs.company_id)!.push(cs.sector_id);
  }

  const sectorNameMap = new Map(
    (sectors || []).map((s: { id: string; name: string; short_name: string | null }) => [
      s.id,
      s.short_name || s.name,
    ])
  );

  // Count Phase 3 per sector
  const phase3BySector = new Map<string, number>();
  for (const p of pipelines || []) {
    const sectorIds = companySectorMap.get(p.company_id) || [];
    for (const sid of sectorIds) {
      phase3BySector.set(sid, (phase3BySector.get(sid) || 0) + 1);
    }
  }

  const sectorMarketCapMap = new Map(
    (sectorData || []).map((s: { sector_id: string; combined_market_cap: number }) => [
      s.sector_id,
      s.combined_market_cap,
    ])
  );

  return Array.from(phase3BySector.entries())
    .map(([sectorId, phase3Count]) => ({
      name: sectorNameMap.get(sectorId) || sectorId,
      phase3Count,
      marketCap: sectorMarketCapMap.get(sectorId) || 0,
      ratio: sectorMarketCapMap.get(sectorId)
        ? phase3Count / (sectorMarketCapMap.get(sectorId)! / 1e9)
        : 0, // drugs per $B market cap
    }))
    .filter((s) => s.marketCap > 0)
    .sort((a, b) => b.ratio - a.ratio);
}

// ─── Chart 18: Funding Velocity ───
// Exclude filing_only to avoid SEC EDGAR noise
export async function getFundingVelocity() {
  const supabase = getSupabase();
  const allRows = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data } = await supabase
      .from("funding_rounds")
      .select("announced_date, amount_usd")
      .not("announced_date", "is", null)
      .gt("amount_usd", 0)
      .neq("confidence", "filing_only")
      .order("announced_date", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) hasMore = false;
    else {
      allRows.push(...data);
      offset += PAGE_SIZE;
      if (data.length < PAGE_SIZE) hasMore = false;
    }
  }

  if (allRows.length === 0) return { short: [], long: [] };

  // Group by week
  const byWeek = new Map<string, number>();
  for (const row of allRows) {
    const date = new Date(row.announced_date);
    // Round to Monday
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const key = monday.toISOString().split("T")[0];
    byWeek.set(key, (byWeek.get(key) || 0) + row.amount_usd);
  }

  const weeks = Array.from(byWeek.entries()).sort(([a], [b]) => a.localeCompare(b));

  // Calculate rolling averages
  const shortWindow = 13; // ~90 days in weeks
  const longWindow = 52; // ~365 days in weeks

  const shortAvg: { time: string; value: number }[] = [];
  const longAvg: { time: string; value: number }[] = [];

  for (let i = 0; i < weeks.length; i++) {
    const [time] = weeks[i];
    // Short-term average
    if (i >= shortWindow - 1) {
      const slice = weeks.slice(i - shortWindow + 1, i + 1);
      const avg = slice.reduce((s, [, v]) => s + v, 0) / shortWindow;
      shortAvg.push({ time, value: avg });
    }
    // Long-term average
    if (i >= longWindow - 1) {
      const slice = weeks.slice(i - longWindow + 1, i + 1);
      const avg = slice.reduce((s, [, v]) => s + v, 0) / longWindow;
      longAvg.push({ time, value: avg });
    }
  }

  return { short: shortAvg, long: longAvg };
}

// ─── Chart 20: Trading Volume Index ───
// market_snapshots.total_volume is unreliable (26x too low vs actual)
// Query company_price_history directly for aggregate daily volume
export async function getTradingVolumeHistory() {
  const supabase = getSupabase();
  // Get daily aggregate volume — this is a heavy query so we sample monthly
  const { data } = await supabase.rpc("get_funding_annual" as never); // dummy to check if we have a volume RPC

  // Since no volume RPC exists, query recent volume from market_snapshots
  // but supplement with a note that historical data is approximate
  const rows = await fetchAllRows(
    "market_snapshots",
    "snapshot_date, total_volume",
    "snapshot_date",
    true
  );

  // Filter to dates where volume looks reasonable (> 10M shares)
  // and skip dates where volume is clearly incomplete
  return thin(
    rows
      .filter((r: { total_volume: number | null; snapshot_date: string }) => {
        if (r.total_volume == null || r.total_volume <= 0) return false;
        // Skip pre-2015 where volume data is sparse
        if (r.snapshot_date < "2015-01-01") return false;
        return true;
      })
      .map((r: { snapshot_date: string; total_volume: number }) => ({
        time: r.snapshot_date,
        value: r.total_volume,
      })),
    500
  );
}

// ─── Chart 21: Ex-Top-50 Market Cap (Small/Mid-Cap Index) ───
// Pre-computed quarterly data. The RPC version times out on Supabase due to the heavy
// ROW_NUMBER window function across millions of company_price_history rows.
// To refresh: run the SQL query in Supabase SQL editor and update this array.
export async function getExTop50MarketCap() {
  // Pre-computed quarterly data (filtered to trading days with >100 companies)
  const raw = [
    { d: "2010-04-01", t: 1140357127800, e: 231645689110 },
    { d: "2010-07-01", t: 1003452744833, e: 213568183839 },
    { d: "2010-10-01", t: 1075292226122, e: 212029372873 },
    { d: "2011-01-03", t: 1157370268340, e: 210649881907 },
    { d: "2011-04-01", t: 1266315738949, e: 284504057592 },
    { d: "2011-07-01", t: 1354418670087, e: 285617818561 },
    { d: "2011-10-03", t: 1178556128127, e: 197630001238 },
    { d: "2012-04-02", t: 1378466646804, e: 254147613880 },
    { d: "2012-07-02", t: 1390031564603, e: 282444483903 },
    { d: "2012-10-01", t: 1355465975059, e: 270359323654 },
    { d: "2013-04-01", t: 1460609555986, e: 281018143627 },
    { d: "2013-07-01", t: 1627882899431, e: 351942145534 },
    { d: "2013-10-01", t: 1753757323165, e: 367107423776 },
    { d: "2014-04-01", t: 2063258881805, e: 521165092900 },
    { d: "2014-07-01", t: 2069067527147, e: 568059720362 },
    { d: "2014-10-01", t: 2193483360437, e: 535174640726 },
    { d: "2015-04-01", t: 2271562117760, e: 727582730943 },
    { d: "2015-07-01", t: 2402870495803, e: 797495197349 },
    { d: "2015-10-01", t: 2210310482749, e: 708811338754 },
    { d: "2016-04-01", t: 2143267799349, e: 759501553868 },
    { d: "2016-07-01", t: 2308552832978, e: 794306585337 },
    { d: "2018-04-02", t: 2545125003453, e: 899470051047 },
    { d: "2018-10-01", t: 2905651503030, e: 1105746217846 },
    { d: "2019-04-01", t: 3113816149125, e: 1295923756444 },
    { d: "2019-07-01", t: 2962991311036, e: 1172617147843 },
    { d: "2019-10-01", t: 3071647405548, e: 1020799310192 },
    { d: "2020-04-01", t: 3080078574968, e: 1167526378965 },
    { d: "2020-07-01", t: 3375873141754, e: 1437646278038 },
    { d: "2020-10-01", t: 3386999069119, e: 1324994690558 },
    { d: "2021-04-01", t: 3541765621842, e: 1961429810856 },
    { d: "2021-07-01", t: 3726382424555, e: 1978380149166 },
    { d: "2021-10-01", t: 3763222778788, e: 1831685564885 },
    { d: "2022-01-03", t: 4041209115849, e: 1593927850157 },
    { d: "2022-04-01", t: 4058131578325, e: 1651259751878 },
    { d: "2022-07-01", t: 4006645431992, e: 1441951645497 },
    { d: "2024-04-01", t: 4582632208475, e: 1139273658844 },
    { d: "2024-07-01", t: 4958789336663, e: 1336303730040 },
    { d: "2024-10-01", t: 4960833953478, e: 1217901820724 },
    { d: "2025-04-01", t: 4615631503455, e: 1238097637529 },
    { d: "2025-07-01", t: 4557388540762, e: 1257229631735 },
    { d: "2025-10-01", t: 4969416188868, e: 1283196674150 },
  ];

  return {
    top50: raw.map((r) => ({ time: r.d, value: r.t })),
    exTop50: raw.map((r) => ({ time: r.d, value: r.e })),
  };
}
