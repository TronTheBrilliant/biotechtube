/**
 * Monthly Index Rebalance
 *
 * Adds newly public companies (with tickers) to the index constituent list.
 * Run this on the 1st of each month to keep the index current without
 * causing mid-month spikes from data additions.
 *
 * Usage: npx tsx scripts/rebalance-index.ts
 *        npx tsx scripts/rebalance-index.ts --dry-run
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log("=== Monthly Index Rebalance ===\n");
  if (DRY_RUN) console.log("🔍 DRY RUN\n");

  // Get current constituents
  const { data: current } = await supabase
    .from("index_constituents")
    .select("company_id")
    .eq("is_active", true);
  const currentIds = new Set((current || []).map(r => r.company_id));
  console.log(`Current constituents: ${currentIds.size}`);

  // Get all companies with tickers (public companies)
  const allPublic: string[] = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("companies")
      .select("id")
      .not("ticker", "is", null)
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allPublic.push(...data.map(r => r.id));
    offset += 1000;
    if (data.length < 1000) break;
  }
  console.log(`Total public companies: ${allPublic.length}`);

  // Find new companies not in the index
  const newIds = allPublic.filter(id => !currentIds.has(id));
  console.log(`New companies to add: ${newIds.length}\n`);

  if (newIds.length === 0) {
    console.log("Index is up to date!");
    return;
  }

  if (DRY_RUN) {
    // Show sample of new companies
    const { data: sample } = await supabase
      .from("companies")
      .select("name, ticker, country")
      .in("id", newIds.slice(0, 20));
    for (const c of sample || []) {
      console.log(`  [NEW] ${c.name} (${c.ticker}) — ${c.country}`);
    }
    console.log(`\n🔍 DRY RUN: ${newIds.length} companies would be added to the index.`);
    return;
  }

  // Add new constituents
  const today = new Date().toISOString().split("T")[0];
  let added = 0;
  for (let i = 0; i < newIds.length; i += 100) {
    const batch = newIds.slice(i, i + 100).map(id => ({
      company_id: id,
      added_at: today,
      is_active: true,
    }));
    const { error } = await supabase.from("index_constituents").insert(batch);
    if (!error) added += batch.length;
    else console.error(`Batch error: ${error.message}`);
  }

  console.log(`Added ${added} companies to the index.`);
  console.log(`New constituent count: ${currentIds.size + added}`);
}

main().catch(console.error);
