#!/usr/bin/env npx tsx
/**
 * Generate realistic biotech funding round data using DeepSeek API.
 * Calls DeepSeek year-by-year (2020-2026) to get ~10-15 major rounds per quarter.
 * Outputs:
 *   data/funding-historical.json  – all individual rounds
 *   data/funding-quarterly.json   – quarterly totals for FundingChart
 *
 * Usage: npx tsx scripts/generate-funding-data.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { writeFileSync, mkdirSync } from "fs";

config({ path: resolve(__dirname, "../.env.local"), override: true });

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
if (!DEEPSEEK_API_KEY) {
  console.error("Missing DEEPSEEK_API_KEY in .env.local");
  process.exit(1);
}

const API_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";

interface FundingRound {
  company: string;
  companySlug: string;
  type: string;
  amount: number;
  currency: "USD";
  date: string;
  leadInvestor: string;
  quarter: string;
}

interface QuarterlySummary {
  label: string;
  amount: number;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fetchFundingForYear(year: number): Promise<FundingRound[]> {
  const isEstimate = year >= 2025;
  const estimateNote = isEstimate
    ? " For this year, provide realistic estimated/projected rounds based on known pipeline companies, trends, and likely fundraising activity."
    : "";

  const prompt = `You are a biotech industry financial data expert. Provide REAL major biotech and pharmaceutical funding rounds for the year ${year}.${estimateNote}

For each quarter (Q1-Q4) of ${year}, provide 10-15 significant funding rounds. Focus on:
- Real biotech/biopharma companies (Moderna, BioNTech, 10x Genomics, Recursion, Ginkgo Bioworks, Sana Biotechnology, Relay Therapeutics, etc.)
- Real investors (ARCH Venture Partners, Flagship Pioneering, OrbiMed, RA Capital, Sofinnova, a16z bio, etc.)
- Realistic amounts for the round type
- Types: Seed, Series A, Series B, Series C, Series D, IPO, Public Offering

Return ONLY a JSON array of objects with these exact fields:
{
  "company": "Company Name",
  "type": "Series B",
  "amount": 150,
  "date": "YYYY-MM-DD",
  "leadInvestor": "Investor Name",
  "quarter": "Q1 ${year}"
}

Rules:
- amount is in millions USD (just the number, no dollar sign)
- date should be a realistic date within the quarter
- Q1 = Jan-Mar, Q2 = Apr-Jun, Q3 = Jul-Sep, Q4 = Oct-Dec
- Include a good mix of round types (Seed rounds $5-30M, Series A $30-100M, Series B $100-300M, Series C+ $200-500M, IPOs $200-800M)
- Use real company names and real investor names when possible
- For ${year >= 2025 ? "projected" : "actual"} data, be as accurate as possible

Return ONLY the JSON array, no markdown, no explanation.`;

  console.log(`  Calling DeepSeek for year ${year}...`);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a biotech industry data provider. Return only valid JSON arrays. No markdown fences, no explanation text.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";

  // Strip markdown fences if present
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let rounds: any[];
  try {
    rounds = JSON.parse(cleaned);
  } catch (e) {
    console.error(`  Failed to parse JSON for ${year}. Raw response (first 500 chars):`);
    console.error(cleaned.slice(0, 500));
    throw e;
  }

  // Normalize and add slugs
  return rounds.map((r: any) => ({
    company: r.company,
    companySlug: slugify(r.company),
    type: r.type,
    amount: Number(r.amount),
    currency: "USD" as const,
    date: r.date,
    leadInvestor: r.leadInvestor,
    quarter: r.quarter,
  }));
}

function buildQuarterlySummary(rounds: FundingRound[]): QuarterlySummary[] {
  const map = new Map<string, number>();

  // Initialize all quarters 2020-2026
  for (let y = 2020; y <= 2026; y++) {
    for (let q = 1; q <= 4; q++) {
      map.set(`Q${q} ${y}`, 0);
    }
  }

  for (const r of rounds) {
    const existing = map.get(r.quarter) ?? 0;
    map.set(r.quarter, existing + r.amount);
  }

  // Sort chronologically
  const sorted = [...map.entries()].sort((a, b) => {
    const [qa, ya] = [parseInt(a[0][1]), parseInt(a[0].split(" ")[1])];
    const [qb, yb] = [parseInt(b[0][1]), parseInt(b[0].split(" ")[1])];
    return ya !== yb ? ya - yb : qa - qb;
  });

  return sorted.map(([label, amount]) => ({
    label,
    amount: Math.round(amount),
  }));
}

async function main() {
  console.log("Generating biotech funding data via DeepSeek API...\n");

  const allRounds: FundingRound[] = [];
  const years = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

  for (const year of years) {
    try {
      const rounds = await fetchFundingForYear(year);
      console.log(`  Got ${rounds.length} rounds for ${year}`);
      allRounds.push(...rounds);
    } catch (err) {
      console.error(`  Error fetching ${year}:`, err);
    }

    // Small delay between calls to be polite
    if (year < 2026) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  console.log(`\nTotal rounds collected: ${allRounds.length}`);

  // Sort by date
  allRounds.sort((a, b) => a.date.localeCompare(b.date));

  // Build quarterly summary
  const quarterly = buildQuarterlySummary(allRounds);

  // Write output files
  const dataDir = resolve(__dirname, "../data");
  mkdirSync(dataDir, { recursive: true });

  const historicalPath = resolve(dataDir, "funding-historical.json");
  writeFileSync(historicalPath, JSON.stringify(allRounds, null, 2));
  console.log(`Wrote ${allRounds.length} rounds to ${historicalPath}`);

  const quarterlyPath = resolve(dataDir, "funding-quarterly.json");
  writeFileSync(quarterlyPath, JSON.stringify(quarterly, null, 2));
  console.log(`Wrote ${quarterly.length} quarterly summaries to ${quarterlyPath}`);

  // Print summary
  console.log("\nQuarterly totals (millions USD):");
  for (const q of quarterly) {
    const bar = "█".repeat(Math.round(q.amount / 200));
    console.log(`  ${q.label}: $${q.amount.toLocaleString()}M ${bar}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
