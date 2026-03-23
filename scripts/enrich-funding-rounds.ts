#!/usr/bin/env npx tsx
/**
 * Funding Rounds Enrichment — Extract funding history for all companies
 *
 * Uses DeepSeek API to find funding round data for each company.
 * Stores results in the funding_rounds table in Supabase.
 * Processes in batches of 5 companies per API call.
 *
 * Usage: npx tsx scripts/enrich-funding-rounds.ts
 * Options: --offset=N  Start from company N (for resuming)
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DEEPSEEK_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface CompanyRow {
  id: string;
  name: string;
  ticker: string | null;
  country: string | null;
  website: string | null;
  company_type: string | null;
}

interface FundingRound {
  round_type: string;
  amount_millions: number;
  currency: string;
  date: string;
  lead_investor: string;
  co_investors?: string[];
}

async function fetchFundingForBatch(companies: CompanyRow[]): Promise<Record<string, FundingRound[]>> {
  const companyList = companies.map((c) => {
    const parts = [c.name];
    if (c.ticker) parts.push(`(${c.ticker})`);
    if (c.country) parts.push(`— ${c.country}`);
    if (c.company_type) parts.push(`[${c.company_type}]`);
    return parts.join(" ");
  }).join("\n");

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are a biotech funding data analyst. Given company names, return their known funding rounds as JSON.

For each company, return an array of funding rounds. Each round:
- "round_type": "Seed", "Series A", "Series B", "Series C", "Series D", "Series E", "IPO", "PIPE", "Grant", "Debt", or "Undisclosed"
- "amount_millions": number in millions USD (e.g. 50 for $50M). Use 0 if unknown.
- "currency": "USD" (convert if needed)
- "date": "YYYY-MM-DD" or "YYYY-MM" or "YYYY" if exact date unknown
- "lead_investor": lead investor name, or "Undisclosed" if unknown
- "co_investors": optional array of other investors

Return ONLY a JSON object mapping company name to array of rounds.
If a company has no known funding, map it to an empty array [].
Only include rounds you're confident about. Quality over quantity.`,
        },
        {
          role: "user",
          content: `Return the funding history for these biotech/pharma companies:\n\n${companyList}`,
        },
      ],
      temperature: 0,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`  API error: ${response.status} ${text.slice(0, 200)}`);
    return {};
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error(`  Could not parse JSON`);
    return {};
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error(`  JSON parse error`);
    return {};
  }
}

function normalizeDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  // Handle "YYYY" -> "YYYY-06-15"
  if (/^\d{4}$/.test(dateStr)) return `${dateStr}-06-15`;
  // Handle "YYYY-MM" -> "YYYY-MM-15"
  if (/^\d{4}-\d{2}$/.test(dateStr)) return `${dateStr}-15`;
  // Handle "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return null;
}

function getYear(dateStr: string): number | null {
  const match = dateStr.match(/^(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

function getQuarter(dateStr: string): string | null {
  const normalized = normalizeDate(dateStr);
  if (!normalized) return null;
  const month = parseInt(normalized.split("-")[1]);
  const year = normalized.split("-")[0];
  const q = month <= 3 ? "Q1" : month <= 6 ? "Q2" : month <= 9 ? "Q3" : "Q4";
  return `${q} ${year}`;
}

async function main() {
  const startOffset = parseInt(process.argv.find(a => a.startsWith("--offset="))?.split("=")[1] || "0");

  console.log("\n💰 Funding Rounds Enrichment (DeepSeek)");
  console.log("========================================\n");

  // Fetch all companies
  const PAGE_SIZE = 1000;
  let allCompanies: CompanyRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("companies")
      .select("id, name, ticker, country, website, company_type")
      .order("valuation", { ascending: false, nullsFirst: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error || !data || data.length === 0) break;
    allCompanies.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  console.log(`Total companies: ${allCompanies.length}`);
  console.log(`Starting from offset: ${startOffset}\n`);

  const companies = allCompanies.slice(startOffset);
  const BATCH_SIZE = 5;
  let totalRoundsInserted = 0;
  let companiesWithFunding = 0;
  const totalBatches = Math.ceil(companies.length / BATCH_SIZE);
  const startTime = Date.now();

  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const rate = totalRoundsInserted > 0 ? (totalRoundsInserted / elapsed * 60).toFixed(0) : "—";

    console.log(`[${batchNum}/${totalBatches}] Processing ${batch.map(c => c.name.slice(0, 20)).join(", ")}... (${totalRoundsInserted} rounds, ${rate}/min)`);

    let results: Record<string, FundingRound[]>;
    try {
      results = await fetchFundingForBatch(batch);
    } catch (err) {
      console.error(`  Batch failed:`, err);
      continue;
    }

    for (const company of batch) {
      const rounds = results[company.name];
      if (!rounds || !Array.isArray(rounds) || rounds.length === 0) continue;

      companiesWithFunding++;

      for (const round of rounds) {
        if (!round.round_type) continue;

        const normalizedDate = normalizeDate(round.date);
        const amountUsd = round.amount_millions ? Math.round(round.amount_millions * 1_000_000) : null;

        const { error: insertError } = await supabase
          .from("funding_rounds")
          .insert({
            company_id: company.id,
            company_name: company.name,
            round_type: round.round_type,
            amount: amountUsd,
            amount_usd: amountUsd,
            currency: round.currency || "USD",
            announced_date: normalizedDate,
            lead_investor: round.lead_investor || null,
            investors: round.co_investors || null,
            country: company.country || null,
            source_name: "deepseek",
            confidence: "estimated",
          });

        if (insertError) {
          // Likely duplicate, skip
          if (!insertError.message.includes("duplicate")) {
            console.error(`  Insert error: ${insertError.message}`);
          }
        } else {
          totalRoundsInserted++;
        }
      }
    }

    // Rate limit
    if (i + BATCH_SIZE < companies.length) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  // Update total_raised on companies table
  console.log("\nUpdating total_raised on companies...");
  const { data: roundSums } = await supabase
    .from("funding_rounds")
    .select("company_id, amount_usd")
    .not("amount_usd", "is", null);

  if (roundSums) {
    const companyTotals = new Map<string, number>();
    for (const row of roundSums) {
      const current = companyTotals.get(row.company_id) || 0;
      companyTotals.set(row.company_id, current + (row.amount_usd || 0));
    }

    let updated = 0;
    for (const [companyId, total] of companyTotals) {
      const { error } = await supabase
        .from("companies")
        .update({ total_raised: total })
        .eq("id", companyId);
      if (!error) updated++;
    }
    console.log(`Updated total_raised for ${updated} companies`);
  }

  const totalElapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n========================================`);
  console.log(`🏁 Funding Enrichment Complete`);
  console.log(`========================================`);
  console.log(`Rounds inserted: ${totalRoundsInserted}`);
  console.log(`Companies with funding: ${companiesWithFunding}`);
  console.log(`Time: ${Math.floor(totalElapsed / 60)}m ${totalElapsed % 60}s`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
