#!/usr/bin/env npx tsx
/**
 * Daily Integrity Check for BiotechTube
 *
 * Runs automated checks across the platform data and inserts findings
 * into the integrity_checks table for admin review.
 *
 * Checks:
 * 1. Price anomalies: >50% market cap change in a day
 * 2. Stale data: Top 100 companies with no price update in 7+ days
 * 3. Dead tickers: Tickers with no Yahoo data in 30+ days
 * 4. Watchlist integrity: Curated watchlist drugs that are Terminated/Withdrawn
 * 5. Description quality: Top 500 companies with description < 100 chars
 *
 * Usage:
 *   npx tsx scripts/daily-integrity-check.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface Finding {
  check_type: string;
  severity: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  description: string;
}

async function checkPriceAnomalies(): Promise<Finding[]> {
  console.log("\n--- Check 1: Price anomalies (>50% market cap change) ---");
  const findings: Finding[] = [];

  // Get yesterday and day before
  const { data: recentDates } = await supabase
    .from("company_price_history")
    .select("price_date")
    .order("price_date", { ascending: false })
    .limit(2);

  if (!recentDates || recentDates.length < 2) {
    console.log("Not enough price data to check anomalies");
    return findings;
  }

  const [latestDate, prevDate] = [recentDates[0].price_date, recentDates[1].price_date];
  console.log(`Comparing ${latestDate} vs ${prevDate}`);

  // Get latest prices
  const { data: latestPrices } = await supabase
    .from("company_price_history")
    .select("company_id, market_cap_usd")
    .eq("price_date", latestDate)
    .not("market_cap_usd", "is", null)
    .gt("market_cap_usd", 0);

  const { data: prevPrices } = await supabase
    .from("company_price_history")
    .select("company_id, market_cap_usd")
    .eq("price_date", prevDate)
    .not("market_cap_usd", "is", null)
    .gt("market_cap_usd", 0);

  if (!latestPrices || !prevPrices) return findings;

  const prevMap = new Map(prevPrices.map((p) => [p.company_id, p.market_cap_usd]));

  const anomalies: Array<{ company_id: string; pctChange: number; oldCap: number; newCap: number }> = [];

  for (const lp of latestPrices) {
    const oldCap = prevMap.get(lp.company_id);
    if (!oldCap || oldCap === 0) continue;
    const pctChange = Math.abs((lp.market_cap_usd - oldCap) / oldCap) * 100;
    if (pctChange > 50) {
      anomalies.push({ company_id: lp.company_id, pctChange, oldCap, newCap: lp.market_cap_usd });
    }
  }

  if (anomalies.length > 0) {
    // Get company names
    const ids = anomalies.map((a) => a.company_id);
    const { data: companies } = await supabase.from("companies").select("id, name").in("id", ids);
    const nameMap = new Map((companies || []).map((c) => [c.id, c.name]));

    for (const a of anomalies) {
      const name = nameMap.get(a.company_id) || "Unknown";
      const direction = a.newCap > a.oldCap ? "increased" : "decreased";
      findings.push({
        check_type: "price_anomaly",
        severity: a.pctChange > 90 ? "critical" : "warning",
        entity_type: "company",
        entity_id: a.company_id,
        entity_name: name,
        description: `Market cap ${direction} ${a.pctChange.toFixed(1)}% in one day ($${(a.oldCap / 1e6).toFixed(1)}M -> $${(a.newCap / 1e6).toFixed(1)}M)`,
      });
    }
  }

  console.log(`Found ${findings.length} price anomalies`);
  return findings;
}

async function checkStaleData(): Promise<Finding[]> {
  console.log("\n--- Check 2: Stale data (top 100 by market cap, no update in 7+ days) ---");
  const findings: Finding[] = [];

  // Get top 100 companies by latest market cap
  const { data: latestDate } = await supabase
    .from("company_price_history")
    .select("price_date")
    .order("price_date", { ascending: false })
    .limit(1);

  if (!latestDate?.[0]) return findings;
  const currentDate = latestDate[0].price_date;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoffDate = sevenDaysAgo.toISOString().split("T")[0];

  // Get companies with market cap data on the latest date
  const { data: topCompanies } = await supabase
    .from("company_price_history")
    .select("company_id, market_cap_usd")
    .eq("price_date", currentDate)
    .not("market_cap_usd", "is", null)
    .order("market_cap_usd", { ascending: false })
    .limit(100);

  if (!topCompanies) return findings;

  // For each top company, check if they have recent data
  for (const tc of topCompanies) {
    const { data: recent } = await supabase
      .from("company_price_history")
      .select("price_date")
      .eq("company_id", tc.company_id)
      .gte("price_date", cutoffDate)
      .limit(1);

    if (!recent || recent.length === 0) {
      const { data: comp } = await supabase.from("companies").select("name").eq("id", tc.company_id).single();
      findings.push({
        check_type: "stale_data",
        severity: "warning",
        entity_type: "company",
        entity_id: tc.company_id,
        entity_name: comp?.name || "Unknown",
        description: `Top company (market cap $${((tc.market_cap_usd || 0) / 1e9).toFixed(2)}B) has no price update in 7+ days`,
      });
    }
  }

  console.log(`Found ${findings.length} stale data issues`);
  return findings;
}

async function checkDeadTickers(): Promise<Finding[]> {
  console.log("\n--- Check 3: Dead tickers (no Yahoo data in 30+ days) ---");
  const findings: Finding[] = [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString().split("T")[0];

  // Get all public companies with tickers
  const { data: publicCompanies } = await supabase
    .from("companies")
    .select("id, name, ticker")
    .eq("type", "Public")
    .not("ticker", "is", null)
    .limit(2000);

  if (!publicCompanies) return findings;

  // Check in batches
  const batchSize = 50;
  for (let i = 0; i < publicCompanies.length; i += batchSize) {
    const batch = publicCompanies.slice(i, i + batchSize);
    const ids = batch.map((c) => c.id);

    const { data: recentPrices } = await supabase
      .from("company_price_history")
      .select("company_id")
      .in("company_id", ids)
      .gte("price_date", cutoffDate);

    const hasRecentData = new Set((recentPrices || []).map((p) => p.company_id));

    for (const comp of batch) {
      if (!hasRecentData.has(comp.id)) {
        findings.push({
          check_type: "dead_ticker",
          severity: "info",
          entity_type: "company",
          entity_id: comp.id,
          entity_name: comp.name,
          description: `Ticker ${comp.ticker} has returned no price data in 30+ days`,
        });
      }
    }
  }

  console.log(`Found ${findings.length} dead tickers`);
  // Limit to avoid inserting thousands
  return findings.slice(0, 100);
}

async function checkWatchlistIntegrity(): Promise<Finding[]> {
  console.log("\n--- Check 4: Watchlist integrity (terminated/withdrawn drugs) ---");
  const findings: Finding[] = [];

  const { data: watchlistItems } = await supabase
    .from("curated_watchlist_items")
    .select("id, watchlist_id, pipeline_id")
    .not("pipeline_id", "is", null);

  if (!watchlistItems || watchlistItems.length === 0) return findings;

  const pipelineIds = watchlistItems.map((w) => w.pipeline_id).filter(Boolean);

  const { data: pipelines } = await supabase
    .from("pipelines")
    .select("id, product_name, trial_status, company_id")
    .in("id", pipelineIds)
    .in("trial_status", ["Terminated", "Withdrawn"]);

  if (!pipelines || pipelines.length === 0) return findings;

  for (const p of pipelines) {
    const { data: comp } = await supabase.from("companies").select("name").eq("id", p.company_id).single();
    findings.push({
      check_type: "watchlist_integrity",
      severity: "warning",
      entity_type: "pipeline",
      entity_id: p.id,
      entity_name: `${p.product_name} (${comp?.name || "Unknown"})`,
      description: `Curated watchlist drug "${p.product_name}" has trial_status = '${p.trial_status}'`,
    });
  }

  console.log(`Found ${findings.length} watchlist integrity issues`);
  return findings;
}

async function checkDescriptionQuality(): Promise<Finding[]> {
  console.log("\n--- Check 5: Description quality (top 500, description < 100 chars) ---");
  const findings: Finding[] = [];

  // Get top 500 companies by market cap from latest snapshot
  const { data: latestDate } = await supabase
    .from("company_price_history")
    .select("price_date")
    .order("price_date", { ascending: false })
    .limit(1);

  if (!latestDate?.[0]) return findings;

  const { data: topCompanies } = await supabase
    .from("company_price_history")
    .select("company_id")
    .eq("price_date", latestDate[0].price_date)
    .not("market_cap_usd", "is", null)
    .order("market_cap_usd", { ascending: false })
    .limit(500);

  if (!topCompanies) return findings;

  const ids = topCompanies.map((c) => c.company_id);

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, description")
    .in("id", ids);

  for (const c of companies || []) {
    if (!c.description || c.description.length < 100) {
      findings.push({
        check_type: "description_quality",
        severity: "info",
        entity_type: "company",
        entity_id: c.id,
        entity_name: c.name,
        description: `Top company has ${c.description ? `short description (${c.description.length} chars)` : "no description"}`,
      });
    }
  }

  console.log(`Found ${findings.length} description quality issues`);
  return findings;
}

async function main() {
  console.log("=== BiotechTube Daily Integrity Check ===");
  console.log(`Started at ${new Date().toISOString()}`);

  const allFindings: Finding[] = [];

  try {
    const [priceAnomalies, staleData, deadTickers, watchlistIssues, descriptionIssues] = await Promise.all([
      checkPriceAnomalies(),
      checkStaleData(),
      checkDeadTickers(),
      checkWatchlistIntegrity(),
      checkDescriptionQuality(),
    ]);

    allFindings.push(...priceAnomalies, ...staleData, ...deadTickers, ...watchlistIssues, ...descriptionIssues);

    console.log(`\n=== Summary ===`);
    console.log(`Price anomalies: ${priceAnomalies.length}`);
    console.log(`Stale data: ${staleData.length}`);
    console.log(`Dead tickers: ${deadTickers.length}`);
    console.log(`Watchlist issues: ${watchlistIssues.length}`);
    console.log(`Description quality: ${descriptionIssues.length}`);
    console.log(`Total findings: ${allFindings.length}`);

    if (allFindings.length > 0) {
      // Insert in batches of 100
      for (let i = 0; i < allFindings.length; i += 100) {
        const batch = allFindings.slice(i, i + 100).map((f) => ({
          ...f,
          status: "open",
        }));
        const { error } = await supabase.from("integrity_checks").insert(batch);
        if (error) {
          console.error(`Error inserting batch ${i}:`, error.message);
        }
      }
      console.log(`\nInserted ${allFindings.length} findings into integrity_checks`);
    } else {
      console.log("\nNo issues found. Platform data looks healthy!");
    }
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }

  console.log(`\nCompleted at ${new Date().toISOString()}`);
}

main();
