#!/usr/bin/env npx tsx
/**
 * Generate monthly biotech VC funding data from 1995-2026 using DeepSeek.
 *
 * Strategy:
 * 1. Call DeepSeek for each 5-year block (1995-1999, 2000-2004, 2005-2009, 2010-2014, 2015-2019)
 *    to distribute annual totals across 12 months with realistic seasonal patterns.
 * 2. Keep existing 2020-2026 monthly data as-is.
 * 3. Merge into funding-monthly.json.
 * 4. Regenerate funding-quarterly.json and funding-weekly.json.
 *
 * Usage: npx tsx scripts/generate-funding-monthly-longhistory.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

config({ path: resolve(__dirname, "../.env.local"), override: true });

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
if (!DEEPSEEK_API_KEY) {
  console.error("Missing DEEPSEEK_API_KEY in .env.local");
  process.exit(1);
}

const API_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";
const DATA_DIR = resolve(__dirname, "../data");

interface MonthlyEntry {
  time: string;
  value: number;
}

interface AnnualEntry {
  year: number;
  amount: number;
  deals: number;
}

interface QuarterlyEntry {
  label: string;
  amount: number;
}

interface WeeklyEntry {
  time: string;
  value: number;
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
      temperature: 0.7,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function extractJSON(text: string): string {
  // Try to find JSON array in the response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) return jsonMatch[0];
  throw new Error("No JSON array found in response:\n" + text.slice(0, 500));
}

async function generateMonthlyForBlock(
  annualData: AnnualEntry[],
  blockLabel: string
): Promise<MonthlyEntry[]> {
  const yearLines = annualData
    .map((d) => `${d.year}: $${d.amount}M`)
    .join(", ");

  const systemPrompt = `You are a data analyst specializing in biotech venture capital funding.
Return ONLY a valid JSON array with no markdown formatting, no code fences, no explanation.`;

  const userPrompt = `Given these annual biotech VC funding totals (millions USD):
${yearLines}

Distribute each year's total across 12 months with realistic seasonal patterns.
Biotech VC funding typically has: slower Q1 (budget cycles), moderate Q2/Q3, stronger Q4 (year-end deployments).
Also add realistic month-to-month variation (plus or minus 15%).

IMPORTANT: The sum of all 12 months for each year MUST equal the annual total exactly (within rounding).

Return a JSON array of objects with "time" (format "YYYY-MM-01") and "value" (number, millions USD, rounded to nearest integer).
Example format: [{"time": "1995-01-01", "value": 120}, {"time": "1995-02-01", "value": 135}, ...]

Return the complete array for all ${annualData.length} years (${annualData.length * 12} entries total).`;

  console.log(`  Calling DeepSeek for block: ${blockLabel}...`);
  const raw = await callDeepSeek(systemPrompt, userPrompt);
  const jsonStr = extractJSON(raw);
  const parsed: MonthlyEntry[] = JSON.parse(jsonStr);

  // Validate: check each year sums correctly
  for (const annual of annualData) {
    const yearEntries = parsed.filter((m) =>
      m.time.startsWith(`${annual.year}-`)
    );
    if (yearEntries.length !== 12) {
      console.warn(
        `  WARNING: Year ${annual.year} has ${yearEntries.length} months instead of 12`
      );
    }
    const sum = yearEntries.reduce((s, m) => s + m.value, 0);
    const diff = Math.abs(sum - annual.amount);
    if (diff > 5) {
      console.warn(
        `  WARNING: Year ${annual.year} sum=${sum} vs expected=${annual.amount} (diff=${diff})`
      );
      // Adjust to match annual total
      const factor = annual.amount / sum;
      for (const entry of yearEntries) {
        entry.value = Math.round(entry.value * factor);
      }
      // Fix rounding residual
      const newSum = yearEntries.reduce((s, m) => s + m.value, 0);
      if (newSum !== annual.amount) {
        yearEntries[yearEntries.length - 1].value += annual.amount - newSum;
      }
      console.log(`  Adjusted year ${annual.year} to match annual total.`);
    }
  }

  return parsed;
}

function generateQuarterly(monthly: MonthlyEntry[]): QuarterlyEntry[] {
  const quarterMap = new Map<string, number>();

  for (const m of monthly) {
    const date = new Date(m.time);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed
    const q = Math.floor(month / 3) + 1;
    const label = `Q${q} ${year}`;
    quarterMap.set(label, (quarterMap.get(label) || 0) + m.value);
  }

  // Sort by year then quarter
  const entries = Array.from(quarterMap.entries()).sort((a, b) => {
    const [qa, ya] = [parseInt(a[0][1]), parseInt(a[0].slice(3))];
    const [qb, yb] = [parseInt(b[0][1]), parseInt(b[0].slice(3))];
    return ya !== yb ? ya - yb : qa - qb;
  });

  return entries.map(([label, amount]) => ({
    label,
    amount: Math.round(amount),
  }));
}

function generateWeekly(monthly: MonthlyEntry[]): WeeklyEntry[] {
  const weekly: WeeklyEntry[] = [];

  for (const m of monthly) {
    const date = new Date(m.time);
    const year = date.getFullYear();
    const month = date.getMonth();

    // Determine number of weeks in this month (approx)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeksInMonth = Math.round(daysInMonth / 7);
    const numWeeks = Math.max(4, Math.min(5, weeksInMonth));

    // Distribute monthly value across weeks with variation
    const baseWeekly = m.value / numWeeks;
    let remaining = m.value;

    for (let w = 0; w < numWeeks; w++) {
      // Find the Monday of this week
      const firstDay = new Date(year, month, 1);
      const firstMonday = new Date(firstDay);
      const dayOfWeek = firstMonday.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
      firstMonday.setDate(firstMonday.getDate() + daysUntilMonday + w * 7);

      // If this Monday falls in the next month, skip
      if (firstMonday.getMonth() !== month) break;

      const isLast = w === numWeeks - 1 || new Date(year, month, firstMonday.getDate() + 7).getMonth() !== month;

      let weekValue: number;
      if (isLast) {
        weekValue = Math.round(remaining);
      } else {
        // Add +-20% variation
        const variation = 0.8 + Math.random() * 0.4;
        weekValue = Math.round(baseWeekly * variation);
        remaining -= weekValue;
      }

      const timeStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        firstMonday.getDate()
      ).padStart(2, "0")}`;
      weekly.push({ time: timeStr, value: Math.max(1, weekValue) });
    }
  }

  return weekly;
}

async function main() {
  console.log("=== Generate Monthly Funding Long History (1995-2026) ===\n");

  // Read annual data
  const annualData: AnnualEntry[] = JSON.parse(
    readFileSync(resolve(DATA_DIR, "funding-annual.json"), "utf-8")
  );

  // Read existing monthly data (2020-2026)
  const existingMonthly: MonthlyEntry[] = JSON.parse(
    readFileSync(resolve(DATA_DIR, "funding-monthly.json"), "utf-8")
  );

  // Define 5-year blocks to generate
  const blocks = [
    { start: 1995, end: 1999, label: "1995-1999" },
    { start: 2000, end: 2004, label: "2000-2004" },
    { start: 2005, end: 2009, label: "2005-2009" },
    { start: 2010, end: 2014, label: "2010-2014" },
    { start: 2015, end: 2019, label: "2015-2019" },
  ];

  let generatedMonthly: MonthlyEntry[] = [];

  for (const block of blocks) {
    const blockAnnual = annualData.filter(
      (d) => d.year >= block.start && d.year <= block.end
    );
    if (blockAnnual.length === 0) {
      console.warn(`No annual data for block ${block.label}, skipping.`);
      continue;
    }

    const monthlyBlock = await generateMonthlyForBlock(blockAnnual, block.label);
    generatedMonthly = generatedMonthly.concat(monthlyBlock);

    // Small delay between API calls
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(
    `\n  Generated ${generatedMonthly.length} monthly entries for 1995-2019.`
  );
  console.log(
    `  Keeping ${existingMonthly.length} existing monthly entries for 2020-2026.`
  );

  // Merge: generated (1995-2019) + existing (2020-2026)
  const allMonthly = [...generatedMonthly, ...existingMonthly].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  console.log(`  Total monthly entries: ${allMonthly.length}`);

  // Write monthly
  writeFileSync(
    resolve(DATA_DIR, "funding-monthly.json"),
    JSON.stringify(allMonthly, null, 2)
  );
  console.log("\n  Wrote data/funding-monthly.json");

  // Generate quarterly
  const quarterly = generateQuarterly(allMonthly);
  writeFileSync(
    resolve(DATA_DIR, "funding-quarterly.json"),
    JSON.stringify(quarterly, null, 2)
  );
  console.log(`  Wrote data/funding-quarterly.json (${quarterly.length} quarters)`);

  // Generate weekly
  const weekly = generateWeekly(allMonthly);
  writeFileSync(
    resolve(DATA_DIR, "funding-weekly.json"),
    JSON.stringify(weekly, null, 2)
  );
  console.log(`  Wrote data/funding-weekly.json (${weekly.length} weeks)`);

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
