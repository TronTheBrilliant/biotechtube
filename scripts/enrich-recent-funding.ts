#!/usr/bin/env npx tsx
/**
 * Recent Funding Enrichment — Focus on 2024-2026 rounds
 *
 * Targets companies that likely have recent funding but we're missing it.
 * Uses DeepSeek to find 2024-2026 funding rounds specifically.
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
}

interface FundingRound {
  round_type: string;
  amount_millions: number;
  currency: string;
  date: string;
  lead_investor: string;
}

async function fetchRecentFunding(companies: CompanyRow[]): Promise<Record<string, FundingRound[]>> {
  const companyList = companies.map((c) => {
    const parts = [c.name];
    if (c.ticker) parts.push(`(${c.ticker})`);
    if (c.country) parts.push(`— ${c.country}`);
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
          content: `You are a biotech funding data analyst. Given company names, return ONLY their funding rounds from 2024, 2025, and 2026 as JSON.

For each company, return an array of funding rounds from 2024-2026 ONLY. Each round:
- "round_type": "Seed", "Series A", "Series B", "Series C", "Series D", "IPO", "PIPE", "Public Offering", "Follow-on Offering", "Grant", "Debt", "Private Equity", "Acquisition", or "Placement"
- "amount_millions": number in millions USD (e.g. 50 for $50M). Use 0 if unknown.
- "currency": "USD" (convert if needed)
- "date": "YYYY-MM-DD" or "YYYY-MM" if exact day unknown
- "lead_investor": lead investor name, or "Undisclosed"

Return ONLY a JSON object mapping company name to array of rounds.
If a company has no known 2024-2026 funding, map it to [].
Only include rounds you are confident about. Quality over quantity.`,
        },
        {
          role: "user",
          content: `Return the 2024-2026 funding rounds for these biotech/pharma companies:\n\n${companyList}`,
        },
      ],
      temperature: 0,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    console.error(`  API error: ${response.status}`);
    return {};
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return {};

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error(`  JSON parse error`);
    return {};
  }
}

function normalizeDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  if (/^\d{4}$/.test(dateStr)) return `${dateStr}-06-15`;
  if (/^\d{4}-\d{2}$/.test(dateStr)) return `${dateStr}-15`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return null;
}

async function main() {
  console.log("\n🔄 Recent Funding Enrichment (2024-2026)\n");

  // Get all companies — prioritize those with tickers (public, more likely to have recent rounds)
  // and recently founded companies
  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, ticker, country")
    .order("valuation", { ascending: false, nullsFirst: false });

  if (error || !companies) {
    console.error("Failed to fetch companies:", error);
    return;
  }

  console.log(`Total companies: ${companies.length}`);

  // Get existing 2024+ rounds to avoid duplicates
  const { data: existingRounds } = await supabase
    .from("funding_rounds")
    .select("company_id, round_type, announced_date")
    .gte("announced_date", "2024-01-01");

  const existingKeys = new Set(
    (existingRounds || []).map((r) => `${r.company_id}|${r.round_type}|${r.announced_date}`)
  );

  console.log(`Existing 2024+ rounds: ${existingKeys.size}`);

  const BATCH_SIZE = 5;
  let totalInserted = 0;
  let batchNum = 0;
  const totalBatches = Math.ceil(companies.length / BATCH_SIZE);
  const startTime = Date.now();

  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    batchNum++;
    const batch = companies.slice(i, i + BATCH_SIZE);
    const elapsed = (Date.now() - startTime) / 60000;
    const rate = totalInserted / Math.max(elapsed, 0.1);

    process.stdout.write(
      `\r[${batchNum}/${totalBatches}] Processing ${batch.map((c) => c.name.slice(0, 20)).join(", ")}... (${totalInserted} rounds, ${rate.toFixed(0)}/min)`
    );

    try {
      const result = await fetchRecentFunding(batch);
      const rows: Array<Record<string, unknown>> = [];

      for (const company of batch) {
        const rounds = result[company.name] || [];
        for (const round of rounds) {
          if (!round.date || round.amount_millions <= 0) continue;
          const normalized = normalizeDate(round.date);
          if (!normalized) continue;

          const year = parseInt(normalized.split("-")[0]);
          if (year < 2024 || year > 2026) continue;

          const key = `${company.id}|${round.round_type}|${normalized}`;
          if (existingKeys.has(key)) continue;

          rows.push({
            company_id: company.id,
            company_name: company.name,
            round_type: round.round_type,
            amount: Math.round(round.amount_millions * 1_000_000),
            currency: "USD",
            amount_usd: Math.round(round.amount_millions * 1_000_000),
            lead_investor: round.lead_investor || "Undisclosed",
            announced_date: normalized,
            country: company.country,
            confidence: "ai_enriched",
          });

          existingKeys.add(key);
        }
      }

      if (rows.length > 0) {
        const { error: insertErr } = await supabase
          .from("funding_rounds")
          .insert(rows);
        if (insertErr) {
          console.error(`\n  Insert error: ${String(insertErr.message || insertErr).slice(0, 100)}`);
        } else {
          totalInserted += rows.length;
        }
      }
    } catch (err) {
      console.error(`\n  Error: ${String(err).slice(0, 100)}`);
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 1200));
  }

  console.log(`\n\n✅ Done! Inserted ${totalInserted} new rounds for 2024-2026`);

  // Show final counts
  const { data: finalCounts } = await supabase
    .from("funding_rounds")
    .select("announced_date")
    .gte("announced_date", "2024-01-01")
    .gt("amount_usd", 0);

  console.log(`Total 2024+ rounds now: ${finalCounts?.length || 0}`);
}

main().catch(console.error);
