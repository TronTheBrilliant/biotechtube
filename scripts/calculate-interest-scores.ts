#!/usr/bin/env npx tsx
/**
 * Calculate Interest Scores for all pipeline products.
 *
 * Replaces the old hype score with a news-based Interest Score (0-100).
 *
 * Formula:
 *   News Velocity   (30%): count of drug_mentions in last 7 days, normalized 0-30
 *   Clinical Stage  (20%): Approved=20, Phase 3=17, Phase 2/3=15, Phase 2=12, Phase 1/2=9, Phase 1=6, Preclinical=3
 *   Trial Activity  (15%): Recruiting=15, Active=12, Completed=8, Not yet recruiting=10, Terminated=0
 *   Company Health  (15%): Based on parent company market cap percentile
 *   Recency         (10%): Days since last news mention
 *   Community       (10%): view_count_7d + watchlist_count, normalized 0-10
 *
 * Updates product_scores table with new scores.
 *
 * Usage: npx tsx scripts/calculate-interest-scores.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

/* ─── Score Component Functions ─── */

function clinicalStageScore(stage: string | null): number {
  if (!stage) return 0;
  const s = stage.toLowerCase().trim();
  if (s.includes("approved")) return 20;
  if (s === "phase 3" || s === "phase iii") return 17;
  if (s === "phase 2/3" || s === "phase ii/iii") return 15;
  if (s === "phase 2" || s === "phase ii") return 12;
  if (s === "phase 1/2" || s === "phase i/ii") return 9;
  if (s === "phase 1" || s === "phase i") return 6;
  if (s.includes("pre-clinical") || s.includes("preclinical")) return 3;
  return 0;
}

function trialActivityScore(status: string | null): number {
  if (!status) return 0;
  const s = status.toLowerCase().trim();
  if (s === "recruiting") return 15;
  if (s.includes("active") || s === "enrolling by invitation") return 12;
  if (s === "not yet recruiting") return 10;
  if (s === "completed") return 8;
  if (s === "suspended") return 3;
  if (s === "terminated" || s === "withdrawn") return 0;
  return 4; // unknown status
}

function companyHealthScore(
  companyValuation: number | null,
  p10: number,
  p25: number,
  p50: number
): number {
  if (!companyValuation || companyValuation <= 0) return 5;
  if (companyValuation >= p10) return 15;
  if (companyValuation >= p25) return 12;
  if (companyValuation >= p50) return 9;
  return 5;
}

function recencyScore(daysSinceLastMention: number | null): number {
  if (daysSinceLastMention === null) return 0;
  if (daysSinceLastMention <= 1) return 10;
  if (daysSinceLastMention <= 7) return 8;
  if (daysSinceLastMention <= 30) return 5;
  return 2;
}

function communityScore(views7d: number, watchlistCount: number): number {
  const raw = views7d + watchlistCount * 3; // Watchlist is higher intent
  // Normalize: 0 -> 0, 1-5 -> 3, 6-20 -> 5, 21-50 -> 7, 50+ -> 10
  if (raw === 0) return 0;
  if (raw <= 5) return 3;
  if (raw <= 20) return 5;
  if (raw <= 50) return 7;
  return 10;
}

/* ─── Main ─── */

async function main() {
  console.log("=== Interest Score Calculator ===\n");

  // Step 1: Get company valuation percentiles
  console.log("Fetching company valuation percentiles...");
  const { data: percData } = await supabase
    .rpc("execute_sql", {
      query: `
        SELECT
          percentile_cont(0.10) WITHIN GROUP (ORDER BY valuation DESC) as p10,
          percentile_cont(0.25) WITHIN GROUP (ORDER BY valuation DESC) as p25,
          percentile_cont(0.50) WITHIN GROUP (ORDER BY valuation DESC) as p50
        FROM companies WHERE valuation IS NOT NULL AND valuation > 0
      `,
    });

  // Parse percentile values - the RPC might not exist, so use fallback defaults
  let p10 = 10_000_000_000; // $10B
  let p25 = 2_000_000_000;  // $2B
  let p50 = 500_000_000;    // $500M

  if (percData && Array.isArray(percData) && percData.length > 0) {
    p10 = Number(percData[0].p10) || p10;
    p25 = Number(percData[0].p25) || p25;
    p50 = Number(percData[0].p50) || p50;
    console.log(`  Percentiles: P10=$${(p10 / 1e9).toFixed(1)}B, P25=$${(p25 / 1e9).toFixed(1)}B, P50=$${(p50 / 1e6).toFixed(0)}M`);
  } else {
    // Try direct SQL as fallback
    const { data: directPerc } = await supabase
      .from("companies")
      .select("valuation")
      .not("valuation", "is", null)
      .gt("valuation", 0)
      .order("valuation", { ascending: false });

    if (directPerc && directPerc.length > 0) {
      const vals = directPerc.map((r: any) => Number(r.valuation)).filter((v: number) => v > 0).sort((a: number, b: number) => b - a);
      if (vals.length > 0) {
        p10 = vals[Math.floor(vals.length * 0.10)] || p10;
        p25 = vals[Math.floor(vals.length * 0.25)] || p25;
        p50 = vals[Math.floor(vals.length * 0.50)] || p50;
        console.log(`  Percentiles (direct): P10=$${(p10 / 1e9).toFixed(1)}B, P25=$${(p25 / 1e9).toFixed(1)}B, P50=$${(p50 / 1e6).toFixed(0)}M`);
      }
    } else {
      console.log("  Using default percentile thresholds");
    }
  }

  // Step 2: Load company valuations into a lookup map
  console.log("\nLoading company valuations...");
  const companyValuations = new Map<string, number>();
  let compOffset = 0;
  while (true) {
    const { data } = await supabase
      .from("companies")
      .select("name, valuation")
      .not("valuation", "is", null)
      .gt("valuation", 0)
      .range(compOffset, compOffset + 999);

    if (!data || data.length === 0) break;
    for (const c of data) {
      companyValuations.set(c.name.toLowerCase(), Number(c.valuation));
    }
    compOffset += 1000;
    if (data.length < 1000) break;
  }
  console.log(`  Loaded ${companyValuations.size} company valuations`);

  // Step 3: Count drug mentions in last 7 days
  console.log("\nCounting drug mentions (last 7 days)...");
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const mentionCounts = new Map<string, number>(); // pipeline_id -> count
  const lastMentionDate = new Map<string, string>(); // pipeline_id -> date

  let mentionOffset = 0;
  while (true) {
    const { data } = await supabase
      .from("drug_mentions")
      .select("pipeline_id, mentioned_at")
      .gte("mentioned_at", sevenDaysAgo)
      .not("pipeline_id", "is", null)
      .range(mentionOffset, mentionOffset + 999);

    if (!data || data.length === 0) break;
    for (const m of data) {
      if (!m.pipeline_id) continue;
      mentionCounts.set(m.pipeline_id, (mentionCounts.get(m.pipeline_id) || 0) + 1);
      const existing = lastMentionDate.get(m.pipeline_id);
      if (!existing || m.mentioned_at > existing) {
        lastMentionDate.set(m.pipeline_id, m.mentioned_at);
      }
    }
    mentionOffset += 1000;
    if (data.length < 1000) break;
  }
  console.log(`  Found mentions for ${mentionCounts.size} pipelines`);

  // Also get last mention dates for older mentions (for recency score)
  let olderOffset = 0;
  while (true) {
    const { data } = await supabase
      .from("drug_mentions")
      .select("pipeline_id, mentioned_at")
      .lt("mentioned_at", sevenDaysAgo)
      .not("pipeline_id", "is", null)
      .order("mentioned_at", { ascending: false })
      .range(olderOffset, olderOffset + 999);

    if (!data || data.length === 0) break;
    for (const m of data) {
      if (!m.pipeline_id) continue;
      // Only set if not already set (we want the most recent)
      if (!lastMentionDate.has(m.pipeline_id)) {
        lastMentionDate.set(m.pipeline_id, m.mentioned_at);
      }
    }
    olderOffset += 1000;
    if (data.length < 1000) break;
  }

  // Step 4: Load existing product_scores for community data
  console.log("\nLoading existing product scores (community data)...");
  const communityData = new Map<string, { views7d: number; watchlist: number }>();
  let scoreOffset = 0;
  while (true) {
    const { data } = await supabase
      .from("product_scores")
      .select("pipeline_id, view_count_7d, watchlist_count")
      .range(scoreOffset, scoreOffset + 999);

    if (!data || data.length === 0) break;
    for (const s of data) {
      if (s.pipeline_id) {
        communityData.set(s.pipeline_id, {
          views7d: s.view_count_7d || 0,
          watchlist: s.watchlist_count || 0,
        });
      }
    }
    scoreOffset += 1000;
    if (data.length < 1000) break;
  }
  console.log(`  Loaded community data for ${communityData.size} products`);

  // Step 5: Load all pipelines and calculate scores
  console.log("\nCalculating interest scores for all pipelines...");
  const today = new Date();
  let totalProcessed = 0;
  let totalUpserted = 0;
  let pipelineOffset = 0;

  // Determine max mention count for normalization
  const maxMentions = Math.max(1, ...Array.from(mentionCounts.values()));

  while (true) {
    const { data: pipelines } = await supabase
      .from("pipelines")
      .select("id, product_name, company_name, stage, trial_status")
      .range(pipelineOffset, pipelineOffset + 999);

    if (!pipelines || pipelines.length === 0) break;

    const scoreRows: any[] = [];

    for (const p of pipelines) {
      // News Velocity (0-30)
      const mentions = mentionCounts.get(p.id) || 0;
      const newsVelocity = Math.min(30, Math.round((mentions / maxMentions) * 30));

      // Clinical Stage (0-20)
      const clinical = clinicalStageScore(p.stage);

      // Trial Activity (0-15)
      const activity = trialActivityScore(p.trial_status);

      // Company Health (0-15)
      const compVal = p.company_name ? companyValuations.get(p.company_name.toLowerCase()) || null : null;
      const compHealth = companyHealthScore(compVal, p10, p25, p50);

      // Recency (0-10)
      const lastDate = lastMentionDate.get(p.id);
      let daysSince: number | null = null;
      if (lastDate) {
        daysSince = Math.floor((today.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
      }
      const recency = recencyScore(daysSince);

      // Community (0-10)
      const comm = communityData.get(p.id);
      const community = comm ? communityScore(comm.views7d, comm.watchlist) : 0;

      // Total Interest Score (0-100)
      const interestScore = Math.min(100, newsVelocity + clinical + activity + compHealth + recency + community);

      // Trending direction
      let trending = "stable";
      if (mentions >= 3) trending = "up";
      else if (mentions >= 1) trending = "rising";
      else if (daysSince !== null && daysSince > 30) trending = "down";

      scoreRows.push({
        pipeline_id: p.id,
        product_name: p.product_name,
        company_id: null, // We don't have company_id in pipelines
        hype_score: interestScore,
        clinical_score: clinical,
        activity_score: activity,
        company_score: compHealth,
        novelty_score: newsVelocity, // repurpose novelty_score for news velocity
        community_score: community,
        trending_direction: trending,
        last_calculated: new Date().toISOString(),
        view_count_7d: comm?.views7d || 0,
        watchlist_count: comm?.watchlist || 0,
      });
    }

    // Upsert in batches of 200
    for (let i = 0; i < scoreRows.length; i += 200) {
      const batch = scoreRows.slice(i, i + 200);
      const { error } = await supabase
        .from("product_scores")
        .upsert(batch, { onConflict: "pipeline_id" });

      if (error) {
        // Fall back to individual upserts
        for (const row of batch) {
          const { data: existing } = await supabase
            .from("product_scores")
            .select("id")
            .eq("pipeline_id", row.pipeline_id)
            .limit(1);

          if (existing && existing.length > 0) {
            const { error: updateErr } = await supabase
              .from("product_scores")
              .update(row)
              .eq("pipeline_id", row.pipeline_id);
            if (!updateErr) totalUpserted++;
          } else {
            const { error: insertErr } = await supabase
              .from("product_scores")
              .insert(row);
            if (!insertErr) totalUpserted++;
          }
        }
      } else {
        totalUpserted += batch.length;
      }
    }

    totalProcessed += pipelines.length;
    if (totalProcessed % 5000 === 0) {
      console.log(`  Processed ${totalProcessed} pipelines...`);
    }

    pipelineOffset += 1000;
    if (pipelines.length < 1000) break;
  }

  console.log(`\n  Processed ${totalProcessed} pipelines total`);
  console.log(`  Upserted ${totalUpserted} product scores`);

  // Step 6: Print top 20 by interest score
  const { data: top20 } = await supabase
    .from("product_scores")
    .select("product_name, hype_score, clinical_score, activity_score, company_score, novelty_score, community_score, trending_direction")
    .order("hype_score", { ascending: false })
    .limit(20);

  if (top20 && top20.length > 0) {
    console.log("\nTop 20 by Interest Score:");
    console.log("-".repeat(110));
    console.log(
      "  Score | Product".padEnd(55) +
      "| Clinical | Activity | Company | News | Community | Trend"
    );
    console.log("-".repeat(110));
    for (const row of top20) {
      console.log(
        `  ${String(row.hype_score).padStart(3)}   | ${(row.product_name || "").substring(0, 40).padEnd(45)} | ${String(row.clinical_score).padStart(8)} | ${String(row.activity_score).padStart(8)} | ${String(row.company_score).padStart(7)} | ${String(row.novelty_score).padStart(4)} | ${String(row.community_score || 0).padStart(9)} | ${row.trending_direction}`
      );
    }
  }

  // Distribution
  const { data: allScores } = await supabase
    .from("product_scores")
    .select("hype_score");

  if (allScores && allScores.length > 0) {
    const hot = allScores.filter((s: any) => s.hype_score >= 80).length;
    const rising = allScores.filter((s: any) => s.hype_score >= 60 && s.hype_score < 80).length;
    const active = allScores.filter((s: any) => s.hype_score >= 40 && s.hype_score < 60).length;
    const quiet = allScores.filter((s: any) => s.hype_score < 40).length;

    console.log("\nScore Distribution:");
    console.log(`  Hot (80-100):    ${hot}`);
    console.log(`  Rising (60-79):  ${rising}`);
    console.log(`  Active (40-59):  ${active}`);
    console.log(`  Quiet (0-39):    ${quiet}`);
  }

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
