#!/usr/bin/env npx tsx
/**
 * Daily Score Recalculation Script
 *
 * Recalculates hype scores for all pipeline products using the
 * community-driven formula. Runs a single efficient SQL UPDATE.
 *
 * Components (when community data exists):
 *   watchlist_count (30%) + view_count_7d (25%) + clinical_score (15%)
 *   + view_velocity (15%) + company_score (10%) + news_score (5%)
 *
 * Bootstrap mode (no community data yet):
 *   Uses clinical stage + company strength to generate meaningful
 *   baseline scores. Community signals will naturally take over
 *   as users join and start watching/viewing products.
 *
 * Usage:  npx tsx scripts/recalculate-scores.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function execSql(query: string): Promise<unknown[]> {
  const { data, error } = await supabase.rpc("execute_sql", { query });
  if (error) {
    console.error("  SQL error:", error.message);
    return [];
  }
  return (data as unknown[]) ?? [];
}

async function main() {
  console.log("=== Daily Hype Score Recalculation ===\n");
  const startTime = Date.now();

  // Step 1: Check if we have community data
  const communityStats = (await execSql(`
    SELECT
      (SELECT count(*)::int FROM product_views WHERE viewed_at > now() - interval '7 days') as views_7d,
      (SELECT count(*)::int FROM user_pipeline_watchlist) as watchlist_total
  `)) as Array<{ views_7d: number; watchlist_total: number }>;

  const hasViews = communityStats[0]?.views_7d > 0;
  const hasWatchlists = communityStats[0]?.watchlist_total > 0;
  console.log(`Community data: ${communityStats[0]?.views_7d ?? 0} views (7d), ${communityStats[0]?.watchlist_total ?? 0} watchlist saves`);

  if (hasViews || hasWatchlists) {
    console.log("Mode: Community-driven scoring\n");
    await runCommunityScoring();
  } else {
    console.log("Mode: Bootstrap scoring (stage + company strength)\n");
    await runBootstrapScoring();
  }

  // Step 2: Refresh materialized view (with extended timeout)
  console.log("Refreshing unified_products materialized view...");
  try {
    await execSql("SET statement_timeout = '120s'");
    await execSql("REFRESH MATERIALIZED VIEW unified_products");
    console.log("  Done\n");
  } catch {
    console.log("  Skipped (timeout or insufficient privileges)\n");
    console.log("  Note: Refresh the matview manually via Supabase SQL editor if needed.\n");
  } finally {
    await execSql("SET statement_timeout = '30s'");
  }

  // Step 3: Print summary
  const dist = (await execSql(`
    SELECT
      count(*) FILTER (WHERE hype_score >= 80) as hot,
      count(*) FILTER (WHERE hype_score >= 60 AND hype_score < 80) as rising,
      count(*) FILTER (WHERE hype_score >= 40 AND hype_score < 60) as active,
      count(*) FILTER (WHERE hype_score < 40) as quiet,
      count(*) as total,
      min(hype_score) as min_score,
      max(hype_score) as max_score,
      round(avg(hype_score)) as avg_score
    FROM product_scores
  `)) as Array<Record<string, number>>;

  if (dist[0]) {
    const d = dist[0];
    console.log("Score Distribution:");
    console.log(`  Hot (80+):    ${d.hot}`);
    console.log(`  Rising (60+): ${d.rising}`);
    console.log(`  Active (40+): ${d.active}`);
    console.log(`  Quiet (<40):  ${d.quiet}`);
    console.log(`  Total:        ${d.total}`);
    console.log(`  Range:        ${d.min_score} - ${d.max_score} (avg ${d.avg_score})`);
  }

  // Top 10
  const top10 = (await execSql(`
    SELECT product_name, hype_score, clinical_score, activity_score, company_score, novelty_score, community_score, trending_direction
    FROM product_scores ORDER BY hype_score DESC LIMIT 10
  `)) as Array<Record<string, unknown>>;

  if (top10.length > 0) {
    console.log("\nTop 10 by Hype Score:");
    console.log("-".repeat(100));
    for (const row of top10) {
      console.log(
        `  ${String(row.hype_score).padStart(3)} | ${String(row.product_name).substring(0, 45).padEnd(45)} | Clin:${row.clinical_score} View:${row.activity_score} Vel:${row.novelty_score} Co:${row.company_score} WL:${row.community_score} | ${row.trending_direction}`
      );
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s`);
}

/**
 * Bootstrap scoring: generates meaningful scores from clinical stage
 * and company strength when no community data exists yet.
 */
async function runBootstrapScoring() {
  console.log("Running bootstrap score calculation...");
  await execSql(`
    WITH company_percentiles AS (
      SELECT
        id,
        CASE
          WHEN percent_rank() OVER (ORDER BY valuation DESC) <= 0.05 THEN 10
          WHEN percent_rank() OVER (ORDER BY valuation DESC) <= 0.10 THEN 9
          WHEN percent_rank() OVER (ORDER BY valuation DESC) <= 0.25 THEN 7
          WHEN percent_rank() OVER (ORDER BY valuation DESC) <= 0.50 THEN 5
          ELSE 2
        END as comp_score
      FROM companies
      WHERE valuation IS NOT NULL AND valuation > 0
    ),
    pipeline_data AS (
      SELECT
        p.id as pipeline_id,
        CASE p.stage
          WHEN 'Approved' THEN 30 WHEN 'Phase 3' THEN 27 WHEN 'Phase 2/3' THEN 22
          WHEN 'Phase 2' THEN 17 WHEN 'Phase 1/2' THEN 13 WHEN 'Phase 1' THEN 10
          WHEN 'Pre-clinical' THEN 5 ELSE 5
        END as clinical_score,
        COALESCE(cp.comp_score, 2) as company_score,
        CASE p.stage
          WHEN 'Approved' THEN 20 WHEN 'Phase 3' THEN 18 WHEN 'Phase 2/3' THEN 15
          WHEN 'Phase 2' THEN 12 WHEN 'Phase 1/2' THEN 8 WHEN 'Phase 1' THEN 5
          WHEN 'Pre-clinical' THEN 2 ELSE 2
        END as activity_score,
        CASE p.stage
          WHEN 'Approved' THEN 10 WHEN 'Phase 3' THEN 9 WHEN 'Phase 2/3' THEN 7
          WHEN 'Phase 2' THEN 5 WHEN 'Phase 1/2' THEN 4 WHEN 'Phase 1' THEN 3
          WHEN 'Pre-clinical' THEN 2 ELSE 2
        END as velocity_score,
        CASE p.stage
          WHEN 'Approved' THEN 12 WHEN 'Phase 3' THEN 10 WHEN 'Phase 2/3' THEN 8
          WHEN 'Phase 2' THEN 5 WHEN 'Phase 1/2' THEN 3 WHEN 'Phase 1' THEN 2
          WHEN 'Pre-clinical' THEN 1 ELSE 1
        END as community_score,
        3 as news_score
      FROM pipelines p
      LEFT JOIN company_percentiles cp ON cp.id = p.company_id
    )
    UPDATE product_scores ps SET
      clinical_score = pd.clinical_score,
      company_score = pd.company_score,
      activity_score = pd.activity_score,
      novelty_score = pd.velocity_score,
      community_score = pd.community_score,
      hype_score = LEAST(100, pd.clinical_score + pd.company_score + pd.activity_score + pd.velocity_score + pd.community_score + pd.news_score),
      trending_direction = CASE
        WHEN LEAST(100, pd.clinical_score + pd.company_score + pd.activity_score + pd.velocity_score + pd.community_score + pd.news_score) - ps.hype_score >= 10 THEN 'up'
        WHEN LEAST(100, pd.clinical_score + pd.company_score + pd.activity_score + pd.velocity_score + pd.community_score + pd.news_score) - ps.hype_score <= -10 THEN 'down'
        ELSE 'stable'
      END,
      view_count_7d = 0,
      view_count_30d = 0,
      watchlist_count = 0,
      last_calculated = now()
    FROM pipeline_data pd
    WHERE ps.pipeline_id = pd.pipeline_id
  `);
  console.log("  Bootstrap scores applied\n");
}

/**
 * Community-driven scoring: uses real engagement data.
 * watchlist (30%) + views (25%) + clinical (15%) + velocity (15%) + company (10%) + news (5%)
 */
async function runCommunityScoring() {
  console.log("Running community-driven score calculation...");
  await execSql(`
    WITH company_percentiles AS (
      SELECT
        id,
        CASE
          WHEN percent_rank() OVER (ORDER BY valuation DESC) <= 0.05 THEN 10
          WHEN percent_rank() OVER (ORDER BY valuation DESC) <= 0.10 THEN 9
          WHEN percent_rank() OVER (ORDER BY valuation DESC) <= 0.25 THEN 7
          WHEN percent_rank() OVER (ORDER BY valuation DESC) <= 0.50 THEN 5
          ELSE 2
        END as comp_score
      FROM companies
      WHERE valuation IS NOT NULL AND valuation > 0
    ),
    watchlist_counts AS (
      SELECT pipeline_id, count(*)::int as cnt FROM user_pipeline_watchlist GROUP BY pipeline_id
    ),
    max_watchlist AS (
      SELECT GREATEST(max(cnt), 1) as val FROM watchlist_counts
    ),
    views_7d AS (
      SELECT pipeline_id, count(*)::int as cnt FROM product_views WHERE viewed_at > now() - interval '7 days' GROUP BY pipeline_id
    ),
    views_prev_7d AS (
      SELECT pipeline_id, count(*)::int as cnt FROM product_views WHERE viewed_at > now() - interval '14 days' AND viewed_at <= now() - interval '7 days' GROUP BY pipeline_id
    ),
    views_30d AS (
      SELECT pipeline_id, count(*)::int as cnt FROM product_views WHERE viewed_at > now() - interval '30 days' GROUP BY pipeline_id
    ),
    max_views AS (
      SELECT GREATEST(max(cnt), 1) as val FROM views_7d
    ),
    pipeline_data AS (
      SELECT
        p.id as pipeline_id,
        -- Watchlist score (max 30 points)
        ROUND(COALESCE(wl.cnt, 0)::numeric / mw.val * 30) as watchlist_score,
        -- View score (max 25 points)
        ROUND(COALESCE(v7.cnt, 0)::numeric / mv.val * 25) as view_score,
        -- Clinical score (max 15 points)
        ROUND(CASE p.stage
          WHEN 'Approved' THEN 30 WHEN 'Phase 3' THEN 27 WHEN 'Phase 2/3' THEN 22
          WHEN 'Phase 2' THEN 17 WHEN 'Phase 1/2' THEN 13 WHEN 'Phase 1' THEN 10
          WHEN 'Pre-clinical' THEN 5 ELSE 5
        END::numeric / 30.0 * 15.0) as clinical_score,
        -- Velocity score (max 15 points)
        CASE
          WHEN COALESCE(vp.cnt, 0) = 0 AND COALESCE(v7.cnt, 0) > 0 THEN 15
          WHEN COALESCE(vp.cnt, 0) = 0 THEN 3
          WHEN COALESCE(v7.cnt, 0)::numeric / GREATEST(vp.cnt, 1) > 3 THEN 15
          WHEN COALESCE(v7.cnt, 0)::numeric / GREATEST(vp.cnt, 1) > 2 THEN 12
          WHEN COALESCE(v7.cnt, 0)::numeric / GREATEST(vp.cnt, 1) > 1.5 THEN 9
          WHEN COALESCE(v7.cnt, 0)::numeric / GREATEST(vp.cnt, 1) > 1 THEN 6
          ELSE 3
        END as velocity_score,
        -- Company score (max 10 points)
        COALESCE(cp.comp_score, 2) as company_score,
        -- News placeholder (max 5 points)
        3 as news_score,
        -- Raw counts for columns
        COALESCE(v7.cnt, 0) as raw_views_7d,
        COALESCE(v30.cnt, 0) as raw_views_30d,
        COALESCE(wl.cnt, 0) as raw_watchlist
      FROM pipelines p
      LEFT JOIN company_percentiles cp ON cp.id = p.company_id
      LEFT JOIN watchlist_counts wl ON wl.pipeline_id = p.id
      LEFT JOIN views_7d v7 ON v7.pipeline_id = p.id
      LEFT JOIN views_prev_7d vp ON vp.pipeline_id = p.id
      LEFT JOIN views_30d v30 ON v30.pipeline_id = p.id
      CROSS JOIN max_watchlist mw
      CROSS JOIN max_views mv
    )
    UPDATE product_scores ps SET
      clinical_score = pd.clinical_score,
      company_score = pd.company_score,
      activity_score = pd.view_score,
      novelty_score = pd.velocity_score,
      community_score = pd.watchlist_score,
      hype_score = LEAST(100, pd.watchlist_score + pd.view_score + pd.clinical_score + pd.velocity_score + pd.company_score + pd.news_score),
      trending_direction = CASE
        WHEN LEAST(100, pd.watchlist_score + pd.view_score + pd.clinical_score + pd.velocity_score + pd.company_score + pd.news_score) - ps.hype_score >= 10 THEN 'up'
        WHEN LEAST(100, pd.watchlist_score + pd.view_score + pd.clinical_score + pd.velocity_score + pd.company_score + pd.news_score) - ps.hype_score <= -10 THEN 'down'
        ELSE 'stable'
      END,
      view_count_7d = pd.raw_views_7d,
      view_count_30d = pd.raw_views_30d,
      watchlist_count = pd.raw_watchlist,
      last_calculated = now()
    FROM pipeline_data pd
    WHERE ps.pipeline_id = pd.pipeline_id
  `);
  console.log("  Community scores applied\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
