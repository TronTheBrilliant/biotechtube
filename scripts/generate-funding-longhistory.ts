#!/usr/bin/env npx tsx
/**
 * Generate annual biotech VC funding totals (1990-2026) plus era narratives
 * using the DeepSeek API.
 *
 * Outputs:
 *   data/funding-annual.json    – yearly totals [{year, amount, deals}]
 *   data/funding-narrative.json – era narratives [{era, title, description}]
 *
 * Usage: npx tsx scripts/generate-funding-longhistory.ts
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

interface AnnualFunding {
  year: number;
  amount: number;
  deals: number;
}

interface EraNarrative {
  era: string;
  title: string;
  description: string;
}

async function callDeepSeek(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
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
  return cleaned;
}

async function fetchAnnualFunding(): Promise<AnnualFunding[]> {
  console.log("Fetching annual biotech VC funding data (1990-2026)...");

  const prompt = `You are a biotech industry financial data expert with deep knowledge of venture capital funding history.

Provide the ANNUAL global biotech/biopharma venture capital funding totals for every year from 1990 to 2026 inclusive.

This is well-known public data tracked by BioCentury, PitchBook, NVCA, and EY. Use realistic figures based on known industry data:

Key benchmarks to calibrate your estimates:
- Early 1990s: biotech VC was small, ~$1-2B/year, <100 deals
- Late 1990s: genomics hype pushed funding up toward $3-5B/year
- 2000-2001: dot-com era peak then crash affected biotech too
- 2003-2007: steady recovery, Human Genome Project completion in 2003 catalyzed growth
- 2008-2009: financial crisis caused sharp decline
- 2010-2012: gradual recovery
- 2013-2017: rapid growth driven by immuno-oncology, gene therapy, CRISPR
- 2018: record year at the time, ~$15-17B
- 2019: slight pullback
- 2020: COVID pandemic drove massive biotech investment surge, ~$25-28B
- 2021: all-time peak, ~$30-38B
- 2022: significant pullback as markets corrected, ~$18-22B
- 2023: continued downturn, ~$15-18B
- 2024: early recovery signs, ~$16-20B
- 2025-2026: modest recovery expected

Return ONLY a JSON array of objects with these exact fields:
[
  { "year": 1990, "amount": 1200, "deals": 45 },
  ...
]

Where:
- "amount" is total VC funding in millions USD (just the number)
- "deals" is approximate number of VC deals that year

Return ONLY the JSON array, no markdown, no explanation.`;

  const raw = await callDeepSeek(
    "You are a biotech industry data provider. Return only valid JSON arrays. No markdown fences, no explanation text.",
    prompt
  );

  let parsed: any[];
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse annual funding JSON. Raw (first 800 chars):");
    console.error(raw.slice(0, 800));
    throw e;
  }

  return parsed.map((r: any) => ({
    year: Number(r.year),
    amount: Number(r.amount),
    deals: Number(r.deals),
  }));
}

async function fetchNarratives(): Promise<EraNarrative[]> {
  console.log("Fetching era narratives...");

  const prompt = `You are a biotech industry historian. Provide brief narratives for each major era of biotech venture capital funding.

For each era below, provide a title and a 2-3 sentence description explaining the key drivers, trends, and notable events that shaped biotech VC funding during that period.

Eras:
1. 1990-1999: The early biotech/genomics era
2. 2000-2007: Post-genome boom, including the dot-com crash impact and recovery
3. 2008-2012: Financial crisis impact and recovery
4. 2013-2019: Immunotherapy, gene therapy, and CRISPR revolution
5. 2020-2026: COVID pandemic, mRNA breakthroughs, and market correction

Return ONLY a JSON array:
[
  {
    "era": "1990-1999",
    "title": "The Early Biotech Era",
    "description": "..."
  },
  ...
]

Make each description 2-3 sentences, informative but concise. Return ONLY the JSON array.`;

  const raw = await callDeepSeek(
    "You are a biotech industry historian. Return only valid JSON arrays. No markdown fences, no explanation text.",
    prompt
  );

  let parsed: any[];
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse narrative JSON. Raw (first 800 chars):");
    console.error(raw.slice(0, 800));
    throw e;
  }

  return parsed.map((r: any) => ({
    era: String(r.era),
    title: String(r.title),
    description: String(r.description),
  }));
}

async function main() {
  console.log("Generating long-history biotech funding data via DeepSeek API...\n");

  // Fetch annual data and narratives in parallel
  const [annualData, narratives] = await Promise.all([
    fetchAnnualFunding(),
    fetchNarratives(),
  ]);

  console.log(`\nGot ${annualData.length} years of annual data`);
  console.log(`Got ${narratives.length} era narratives`);

  // Sort annual data by year
  annualData.sort((a, b) => a.year - b.year);

  // Write output files
  const dataDir = resolve(__dirname, "../data");
  mkdirSync(dataDir, { recursive: true });

  const annualPath = resolve(dataDir, "funding-annual.json");
  writeFileSync(annualPath, JSON.stringify(annualData, null, 2));
  console.log(`\nWrote ${annualData.length} yearly records to ${annualPath}`);

  const narrativePath = resolve(dataDir, "funding-narrative.json");
  writeFileSync(narrativePath, JSON.stringify(narratives, null, 2));
  console.log(`Wrote ${narratives.length} era narratives to ${narrativePath}`);

  // Print summary table
  console.log("\nAnnual Biotech VC Funding (millions USD):");
  console.log("─".repeat(55));
  for (const row of annualData) {
    const bar = "█".repeat(Math.round(row.amount / 1000));
    console.log(
      `  ${row.year}:  $${String(row.amount).padStart(6)}M  (${String(row.deals).padStart(4)} deals)  ${bar}`
    );
  }

  console.log("\nEra Narratives:");
  console.log("─".repeat(55));
  for (const n of narratives) {
    console.log(`\n  ${n.era}: ${n.title}`);
    console.log(`  ${n.description}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
