import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { ArticleEngine } from "@/lib/article-engine";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 270_000; // stop before 300s Vercel limit
const RATE_LIMIT_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Schedule helpers ──

function shouldRunToday(schedule: string): boolean {
  if (schedule === "daily") return true;
  const day = new Date().getUTCDay(); // 0=Sun, 3=Wed
  if (schedule === "sunday") return day === 0;
  if (schedule === "wednesday") return day === 3;
  return true;
}

// ── Source functions ──

interface PipelineCandidate {
  id: string;
  data: Record<string, any>;
}

async function getUnprocessedRSSItems(): Promise<PipelineCandidate[]> {
  const supabase = createServerClient();
  const { data } = await (supabase.from as any)("rss_items")
    .select("id, title, url, source_name, summary, published_at, category, company_names")
    .eq("processed_for_article", false)
    .neq("category", "funding")
    .neq("category", "trial")
    .order("published_at", { ascending: false })
    .limit(5);

  return (data || []).map((item: any) => ({ id: item.id, data: item }));
}

async function getNewFundingRounds(): Promise<PipelineCandidate[]> {
  const supabase = createServerClient();
  const engine = new ArticleEngine();

  const { data: rounds } = await supabase
    .from("funding_rounds")
    .select("id, company_name, round_type, amount_usd, announced_date")
    .gte("amount_usd", 10_000_000)
    .neq("confidence", "filing_only")
    .order("announced_date", { ascending: false })
    .limit(10);

  if (!rounds) return [];

  const candidates: PipelineCandidate[] = [];
  for (const round of rounds) {
    const isDuplicate = await engine.checkDuplicate("funding_round", round.id);
    if (!isDuplicate) {
      candidates.push({ id: round.id, data: round });
    }
    if (candidates.length >= 5) break;
  }
  return candidates;
}

async function getClinicalTrialCandidates(): Promise<PipelineCandidate[]> {
  const supabase = createServerClient();

  const { data: rssItems } = await (supabase.from as any)("rss_items")
    .select("id, title, url, source_name, summary, published_at, category, company_names")
    .eq("category", "trial")
    .eq("processed_for_article", false)
    .order("published_at", { ascending: false })
    .limit(5);

  if (!rssItems || rssItems.length === 0) return [];

  // Try to match companies for each item
  const results: PipelineCandidate[] = [];
  for (const item of rssItems) {
    let companyId: string | null = null;
    if (item.company_names && item.company_names.length > 0) {
      const { data: match } = await supabase
        .from("companies")
        .select("id")
        .ilike("name", item.company_names[0])
        .limit(1)
        .single();
      if (match) companyId = match.id;
    }
    results.push({
      id: item.id,
      data: { ...item, matched_company_id: companyId },
    });
  }

  return results;
}

async function getMarketAnalysisCandidates(): Promise<PipelineCandidate[]> {
  const supabase = createServerClient();

  // Check if a market_analysis article was already published today
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const { data: existing } = await (supabase.from as any)("articles")
    .select("id")
    .eq("type", "market_analysis")
    .gte("published_at", todayStart.toISOString())
    .limit(1);

  if (existing && existing.length > 0) return [];

  // Find sectors with significant 7-day change
  const { data: sectors } = await (supabase.from as any)("sector_market_data")
    .select("*")
    .order("date", { ascending: false })
    .limit(50);

  if (!sectors || sectors.length === 0) return [];

  // Group by sector, compute 7-day change
  const sectorMap = new Map<string, any[]>();
  for (const row of sectors) {
    const key = row.sector || row.name;
    if (!key) continue;
    if (!sectorMap.has(key)) sectorMap.set(key, []);
    sectorMap.get(key)!.push(row);
  }

  const movers: PipelineCandidate[] = [];
  for (const [sector, rows] of sectorMap) {
    if (rows.length < 2) continue;
    const latest = rows[0];
    const weekAgo = rows.find(
      (r: any) => new Date(r.date).getTime() <= Date.now() - 6 * 86_400_000
    );
    if (!weekAgo) continue;

    const latestCap = latest.total_market_cap || latest.market_cap;
    const weekAgoCap = weekAgo.total_market_cap || weekAgo.market_cap;
    if (!latestCap || !weekAgoCap) continue;

    const changePct = ((latestCap - weekAgoCap) / weekAgoCap) * 100;
    if (Math.abs(changePct) > 5) {
      movers.push({
        id: sector,
        data: { sector, change_pct: changePct, latest, weekAgo },
      });
    }
  }

  return movers.slice(0, 3);
}

async function getWeeklyRoundupData(): Promise<PipelineCandidate[]> {
  const supabase = createServerClient();

  // Calculate current week range (Monday-Sunday)
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() + mondayOffset);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  // Check if roundup already exists for this week
  const { data: existing } = await (supabase.from as any)("articles")
    .select("id")
    .eq("type", "weekly_roundup")
    .gte("published_at", weekStart.toISOString())
    .lte("published_at", weekEnd.toISOString())
    .limit(1);

  if (existing && existing.length > 0) return [];

  return [
    {
      id: `roundup-${weekStart.toISOString().slice(0, 10)}`,
      data: {
        week_start: weekStart.toISOString(),
        week_end: weekEnd.toISOString(),
      },
    },
  ];
}

async function getCompanyDeepDiveCandidate(): Promise<PipelineCandidate[]> {
  const supabase = createServerClient();

  // Find companies with reports, valuation > $500M, no deep dive in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  // Get companies that have reports and high valuation
  const { data: candidates } = await supabase
    .from("companies")
    .select("id, name, valuation")
    .gt("valuation", 500_000_000)
    .order("valuation", { ascending: false })
    .limit(20);

  if (!candidates || candidates.length === 0) return [];

  // Filter to ones that have a company_reports row
  for (const company of candidates) {
    const { data: report } = await (supabase.from as any)("company_reports")
      .select("id")
      .eq("company_id", company.id)
      .limit(1);

    if (!report || report.length === 0) continue;

    // Check no deep dive in last 30 days
    const { data: recentArticle } = await (supabase.from as any)("articles")
      .select("id")
      .eq("type", "company_deep_dive")
      .contains("metadata", { company_id: company.id })
      .gte("published_at", thirtyDaysAgo.toISOString())
      .limit(1);

    if (recentArticle && recentArticle.length > 0) continue;

    return [{ id: company.id, data: company }];
  }

  return [];
}

// ── Pipeline config ──

interface PipelineConfig {
  type: string;
  source: () => Promise<PipelineCandidate[]>;
  limit: number;
  schedule: string;
  markProcessed?: boolean;
}

const PIPELINES: PipelineConfig[] = [
  // Priority 1: Breaking news (non-funding, non-trial RSS items)
  { type: "breaking_news", source: getUnprocessedRSSItems, limit: 3, schedule: "daily", markProcessed: true },

  // Priority 2: Funding deals ($10M+)
  { type: "funding_deal", source: getNewFundingRounds, limit: 3, schedule: "daily" },

  // Priority 3: Clinical trial updates
  { type: "clinical_trial", source: getClinicalTrialCandidates, limit: 2, schedule: "daily", markProcessed: true },

  // Priority 4: Market analysis (one per day)
  { type: "market_analysis", source: getMarketAnalysisCandidates, limit: 1, schedule: "daily" },

  // Priority 5: Weekly roundup (Sundays only)
  { type: "weekly_roundup", source: getWeeklyRoundupData, limit: 1, schedule: "sunday" },

  // Priority 6: Company deep dive (Wednesdays only)
  { type: "company_deep_dive", source: getCompanyDeepDiveCandidate, limit: 1, schedule: "wednesday" },
];

// ── Main handler ──

export async function GET(req: Request) {
  // Verify CRON_SECRET
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const supabase = createServerClient();
  const engine = new ArticleEngine();

  const results: Record<string, { attempted: number; generated: number; errors: string[] }> = {};

  for (const pipeline of PIPELINES) {
    // Initialize results entry
    results[pipeline.type] = { attempted: 0, generated: 0, errors: [] };

    // Check schedule
    if (!shouldRunToday(pipeline.schedule)) {
      continue;
    }

    // Check timeout
    if (Date.now() - startTime > TIMEOUT_MS) break;

    // Fetch candidates
    let candidates: PipelineCandidate[];
    try {
      candidates = await pipeline.source();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      results[pipeline.type].errors.push(`source_fetch: ${msg}`);
      continue;
    }

    // Process candidates up to limit
    let generated = 0;
    for (const candidate of candidates) {
      if (Date.now() - startTime > TIMEOUT_MS) break;
      if (generated >= pipeline.limit) break;

      results[pipeline.type].attempted++;
      try {
        // Build the source input based on type
        const sourceInput = buildSourceInput(pipeline.type, candidate);

        await engine.generateAndPublish({
          type: pipeline.type as any,
          source: sourceInput,
        });
        results[pipeline.type].generated++;
        generated++;

        // Mark RSS items as processed if applicable
        if (pipeline.markProcessed) {
          await (supabase.from as any)("rss_items")
            .update({ processed_for_article: true })
            .eq("id", candidate.id);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        results[pipeline.type].errors.push(`${candidate.id}: ${msg}`);
      }

      await sleep(RATE_LIMIT_MS);
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  return NextResponse.json({
    ok: true,
    elapsed_seconds: elapsed,
    results,
  });
}

// ── Helper: build source input for each pipeline type ──

function buildSourceInput(type: string, candidate: PipelineCandidate): Record<string, any> {
  switch (type) {
    case "breaking_news":
      return { rss_item_id: candidate.id };
    case "funding_deal":
      return { funding_round_id: candidate.id };
    case "clinical_trial":
      return {
        rss_item_id: candidate.id,
        company_id: candidate.data.matched_company_id || undefined,
      };
    case "market_analysis":
      return {
        sector: candidate.data.sector,
        change_pct: candidate.data.change_pct,
        sector_data: candidate.data,
      };
    case "weekly_roundup":
      return {
        week_start: candidate.data.week_start,
        week_end: candidate.data.week_end,
      };
    case "company_deep_dive":
      return { company_id: candidate.id };
    default:
      return candidate.data;
  }
}
