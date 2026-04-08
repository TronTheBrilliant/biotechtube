import { createServerClient } from "@/lib/supabase";
import { ArticleEngine } from "@/lib/article-engine";
import { discoverTrendingTopics } from "@/lib/article-engine/sources/pubmed";
import {
  discoverEssayTopics,
  discoverSpotlightTopics,
} from "@/lib/article-engine/sources/topic-discovery";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 270_000;
const RATE_LIMIT_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Schedule helpers ──

function shouldRunToday(schedule: string): boolean {
  if (schedule === "daily") return true;
  const now = new Date();
  const day = now.getUTCDay();
  if (schedule === "sunday") return day === 0;
  if (schedule === "wednesday") return day === 3;
  if (schedule === "friday") return day === 5;
  if (schedule === "bimonthly") {
    const date = now.getUTCDate();
    return date === 1 || date === 15;
  }
  return true;
}

// ── Source functions (same as cron route) ──

interface PipelineCandidate {
  id: string;
  data: Record<string, any>;
}

async function getUnprocessedRSSItems(): Promise<PipelineCandidate[]> {
  const supabase = createServerClient();
  const { data } = await (supabase.from as any)("rss_items")
    .select(
      "id, title, url, source_name, summary, published_at, category, company_names"
    )
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
    .select(
      "id, title, url, source_name, summary, published_at, category, company_names"
    )
    .eq("category", "trial")
    .eq("processed_for_article", false)
    .order("published_at", { ascending: false })
    .limit(5);

  if (!rssItems || rssItems.length === 0) return [];

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

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const { data: existing } = await (supabase.from as any)("articles")
    .select("id")
    .eq("type", "market_analysis")
    .gte("published_at", todayStart.toISOString())
    .limit(1);

  if (existing && existing.length > 0) return [];

  const { data: sectors } = await (supabase.from as any)("sector_market_data")
    .select("*")
    .order("date", { ascending: false })
    .limit(50);

  if (!sectors || sectors.length === 0) return [];

  const sectorMap = new Map<string, any[]>();
  for (const row of sectors) {
    const key = row.sector || row.name;
    if (!key) continue;
    if (!sectorMap.has(key)) sectorMap.set(key, []);
    sectorMap.get(key)!.push(row);
  }

  const movers: PipelineCandidate[] = [];
  for (const [sector, rows] of Array.from(sectorMap)) {
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

  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() + mondayOffset);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

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

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const { data: candidates } = await supabase
    .from("companies")
    .select("id, name, valuation")
    .gt("valuation", 500_000_000)
    .order("valuation", { ascending: false })
    .limit(20);

  if (!candidates || candidates.length === 0) return [];

  for (const company of candidates) {
    const { data: report } = await (supabase.from as any)("company_reports")
      .select("id")
      .eq("company_id", company.id)
      .limit(1);

    if (!report || report.length === 0) continue;

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

async function getScienceEssayTopic(): Promise<PipelineCandidate[]> {
  const supabase = createServerClient();

  const sixDaysAgo = new Date();
  sixDaysAgo.setUTCDate(sixDaysAgo.getUTCDate() - 6);

  const { data: existing } = await (supabase.from as any)("articles")
    .select("id, metadata")
    .eq("type", "science_essay")
    .gte("published_at", sixDaysAgo.toISOString())
    .limit(5);

  if (existing && existing.length > 0) return [];

  try {
    const suggestions = await discoverEssayTopics();
    if (suggestions.length > 0) {
      const top = suggestions[0];
      const pmids = top.sources.pubmedPapers.map((p: any) => p.pmid);
      return [
        {
          id: top.topic,
          data: {
            topic: top.topic,
            angle: top.angle,
            pubmedPmids: pmids,
          },
        },
      ];
    }
  } catch {
    // Fall back to simple trending topics
  }

  const topics = await discoverTrendingTopics();
  const freshTopic = topics[0] || "CRISPR gene therapy";

  return [{ id: freshTopic, data: { topic: freshTopic } }];
}

async function getInnovationSpotlightTopic(): Promise<PipelineCandidate[]> {
  const supabase = createServerClient();

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 14);

  const { data: existing } = await (supabase.from as any)("articles")
    .select("id")
    .eq("type", "innovation_spotlight")
    .gte("published_at", fourteenDaysAgo.toISOString())
    .limit(1);

  if (existing && existing.length > 0) return [];

  try {
    const suggestions = await discoverSpotlightTopics();
    if (suggestions.length > 0) {
      const top = suggestions[0];
      return [
        {
          id: "spotlight",
          data: {
            focus: top.topic,
            theme: top.topic,
            angle: top.angle,
          },
        },
      ];
    }
  } catch {
    // Fall back to generic spotlight
  }

  return [{ id: "spotlight", data: {} }];
}

// ── Pipeline config ──

interface PipelineConfig {
  type: string;
  label: string;
  source: () => Promise<PipelineCandidate[]>;
  limit: number;
  schedule: string;
  markProcessed?: boolean;
}

const PIPELINES: PipelineConfig[] = [
  {
    type: "breaking_news",
    label: "Breaking News",
    source: getUnprocessedRSSItems,
    limit: 3,
    schedule: "daily",
    markProcessed: true,
  },
  {
    type: "funding_deal",
    label: "Funding Deals",
    source: getNewFundingRounds,
    limit: 3,
    schedule: "daily",
  },
  {
    type: "clinical_trial",
    label: "Clinical Trials",
    source: getClinicalTrialCandidates,
    limit: 2,
    schedule: "daily",
    markProcessed: true,
  },
  {
    type: "market_analysis",
    label: "Market Analysis",
    source: getMarketAnalysisCandidates,
    limit: 1,
    schedule: "daily",
  },
  {
    type: "weekly_roundup",
    label: "Weekly Roundup",
    source: getWeeklyRoundupData,
    limit: 1,
    schedule: "sunday",
  },
  {
    type: "company_deep_dive",
    label: "Company Deep Dive",
    source: getCompanyDeepDiveCandidate,
    limit: 1,
    schedule: "wednesday",
  },
  {
    type: "science_essay",
    label: "Science Essay",
    source: getScienceEssayTopic,
    limit: 1,
    schedule: "friday",
  },
  {
    type: "innovation_spotlight",
    label: "Innovation Spotlight",
    source: getInnovationSpotlightTopic,
    limit: 1,
    schedule: "bimonthly",
  },
];

// ── Helper: build source input for each pipeline type ──

function buildSourceInput(
  type: string,
  candidate: PipelineCandidate
): Record<string, any> {
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
    case "science_essay":
      return {
        topic: candidate.data.topic,
        angle: candidate.data.angle,
        pubmedPmids: candidate.data.pubmedPmids,
        id: candidate.id,
      };
    case "innovation_spotlight":
      return {
        focus: candidate.data.focus,
        theme: candidate.data.theme,
        angle: candidate.data.angle,
        id: candidate.id,
      };
    default:
      return candidate.data;
  }
}

// ── SSE streaming handler ──

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: Record<string, any>) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      const startTime = Date.now();
      const supabase = createServerClient();
      const engine = new ArticleEngine();
      let totalGenerated = 0;
      let totalErrors = 0;

      try {
        send("log", { text: "Starting article generation...", type: "info" });

        for (const pipeline of PIPELINES) {
          // Check schedule
          if (!shouldRunToday(pipeline.schedule)) {
            send("log", {
              text: `-- ${pipeline.label}: skipped (not scheduled today)`,
              type: "dim",
            });
            continue;
          }

          // Check timeout
          if (Date.now() - startTime > TIMEOUT_MS) {
            send("log", {
              text: "Timeout approaching, stopping generation",
              type: "warning",
            });
            break;
          }

          send("log", {
            text: `\u25CF Checking ${pipeline.label}...`,
            type: "info",
          });

          // Fetch candidates
          let candidates: PipelineCandidate[];
          try {
            candidates = await pipeline.source();
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            send("log", {
              text: `\u2717 ${pipeline.label}: source error - ${msg}`,
              type: "error",
            });
            totalErrors++;
            continue;
          }

          if (candidates.length === 0) {
            send("log", {
              text: `-- ${pipeline.label}: no candidates`,
              type: "dim",
            });
            continue;
          }

          send("log", {
            text: `\u2713 Found ${candidates.length} candidate${candidates.length > 1 ? "s" : ""}`,
            type: "success",
          });

          // Process candidates up to limit
          let generated = 0;
          for (const candidate of candidates) {
            if (Date.now() - startTime > TIMEOUT_MS) break;
            if (generated >= pipeline.limit) break;

            try {
              const sourceInput = buildSourceInput(pipeline.type, candidate);

              send("log", {
                text: `  Generating ${pipeline.label} article...`,
                type: "info",
              });

              const result = await engine.generateAndPublish({
                type: pipeline.type as any,
                source: sourceInput,
              });

              generated++;
              totalGenerated++;

              // Send article event
              send("article", {
                headline: result.article.headline,
                type: pipeline.type,
                confidence: result.article.confidence,
                slug: result.slug,
                body: result.article.body,
                sources: result.article.sources,
              });

              send("log", {
                text: `\u2713 Generated: "${result.article.headline.substring(0, 60)}${result.article.headline.length > 60 ? "..." : ""}"`,
                type: "success",
              });

              // Mark RSS items as processed if applicable
              if (pipeline.markProcessed) {
                await (supabase.from as any)("rss_items")
                  .update({ processed_for_article: true })
                  .eq("id", candidate.id);
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : "Unknown error";
              send("log", {
                text: `\u2717 ${pipeline.label} error: ${msg.substring(0, 100)}`,
                type: "error",
              });
              totalErrors++;
            }

            await sleep(RATE_LIMIT_MS);
          }
        }

        const elapsed = Math.round((Date.now() - startTime) / 1000);
        send("log", { text: "", type: "dim" });
        send("log", {
          text: "\u2550".repeat(40),
          type: "separator",
        });
        send("log", {
          text: `\u2713 Complete: ${totalGenerated} article${totalGenerated !== 1 ? "s" : ""} generated${totalErrors > 0 ? `, ${totalErrors} error${totalErrors !== 1 ? "s" : ""}` : ""} in ${elapsed}s`,
          type: "success",
        });
        send("log", {
          text: "\u2550".repeat(40),
          type: "separator",
        });
        send("done", { total: totalGenerated, errors: totalErrors, elapsed });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        send("error", { message: msg });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
