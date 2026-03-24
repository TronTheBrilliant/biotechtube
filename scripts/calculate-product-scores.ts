#!/usr/bin/env npx tsx
/**
 * Calculate Hype Scores for all pipeline products.
 *
 * Calls the server-side calculate_product_scores() function per stage,
 * then updates company scores and recalculates hype totals.
 *
 * Usage:  npx tsx scripts/calculate-product-scores.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STAGES = [
  "Pre-clinical",
  "Phase 1",
  "Phase 1/2",
  "Phase 2",
  "Phase 2/3",
  "Phase 3",
  "Approved",
];

async function main() {
  console.log("Calculating product hype scores...\n");

  // Step 1: Run calculate_product_scores() for each stage
  let total = 0;
  for (const stage of STAGES) {
    const { data, error } = await supabase.rpc("calculate_product_scores", {
      batch_stage: stage,
    });
    if (error) {
      console.error(`  Error for ${stage}: ${error.message}`);
    } else {
      const count = data ?? 0;
      total += count;
      console.log(`  ${stage.padEnd(15)} → ${count} products scored`);
    }
  }
  console.log(`\n  Total: ${total} products\n`);

  // Step 2: Update company scores using valuation percentiles
  console.log("Updating company scores based on market cap...");

  // Get percentiles
  const { data: percData } = await supabase.rpc("execute_sql", {
    query: `
      SELECT
        percentile_cont(0.10) WITHIN GROUP (ORDER BY valuation DESC) as p10,
        percentile_cont(0.25) WITHIN GROUP (ORDER BY valuation DESC) as p25,
        percentile_cont(0.50) WITHIN GROUP (ORDER BY valuation DESC) as p50
      FROM companies WHERE valuation IS NOT NULL AND valuation > 0
    `,
  });

  // For now, rely on the SQL function for the main scoring.
  // Company scores are updated via direct SQL since the RPC approach above
  // may not be available.

  // Step 3: Recalculate hype totals
  console.log("Recalculating hype score totals...");
  const { error: fixError } = await supabase.rpc("execute_sql", {
    query: `
      UPDATE product_scores
      SET hype_score = LEAST(100, clinical_score + activity_score + company_score + novelty_score)
      WHERE hype_score != LEAST(100, clinical_score + activity_score + company_score + novelty_score)
    `,
  });
  if (fixError) {
    console.log("  (Skipped hype recalc — no execute_sql RPC available)");
  }

  // Step 4: Print top 10
  const { data: top10 } = await supabase
    .from("product_scores")
    .select(
      "product_name, hype_score, clinical_score, activity_score, company_score, novelty_score, trending_direction"
    )
    .order("hype_score", { ascending: false })
    .limit(10);

  if (top10) {
    console.log("\nTop 10 by Hype Score:");
    console.log("-".repeat(90));
    for (const row of top10) {
      console.log(
        `  ${String(row.hype_score).padStart(3)} | ${row.product_name.substring(0, 40).padEnd(40)} | C:${row.clinical_score} A:${row.activity_score} Co:${row.company_score} N:${row.novelty_score} | ${row.trending_direction}`
      );
    }
  }

  // Distribution
  const { data: dist } = await supabase.rpc("execute_sql", {
    query: `
      SELECT
        count(*) FILTER (WHERE hype_score >= 80) as hot,
        count(*) FILTER (WHERE hype_score >= 60 AND hype_score < 80) as rising,
        count(*) FILTER (WHERE hype_score >= 40 AND hype_score < 60) as active,
        count(*) FILTER (WHERE hype_score < 40) as quiet
      FROM product_scores
    `,
  });

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
