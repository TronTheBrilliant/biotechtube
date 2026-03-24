#!/usr/bin/env npx tsx
/**
 * Parse FierceBiotech Fundraising Tracker pages and insert into funding_rounds
 *
 * Reads scraped markdown files from .firecrawl/ directory
 * Extracts company name, amount, round type, and date
 * Deduplicates against existing data
 */

import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ParsedRound {
  company_name: string;
  amount_usd: number;
  round_type: string;
  date: string;
  lead_investor: string;
}

function parseAmount(amountStr: string): number {
  // Handle "Nearly $100 million", "$165 million", "over $110 million", etc.
  const cleaned = amountStr.replace(/nearly|over|close to|about|approximately|more than/gi, "").trim();
  const match = cleaned.match(/\$?([\d,.]+)\s*(million|billion|m|b)/i);
  if (!match) return 0;

  const num = parseFloat(match[1].replace(/,/g, ""));
  const unit = match[2].toLowerCase();

  if (unit === "billion" || unit === "b") return num * 1_000_000_000;
  return num * 1_000_000; // million
}

function inferRoundType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("series a extension")) return "Series A";
  if (lower.includes("series a")) return "Series A";
  if (lower.includes("series b extension")) return "Series B";
  if (lower.includes("series b")) return "Series B";
  if (lower.includes("series c")) return "Series C";
  if (lower.includes("series d")) return "Series D";
  if (lower.includes("series e")) return "Series E";
  if (lower.includes("series f")) return "Series F";
  if (lower.includes("ipo")) return "IPO";
  if (lower.includes("pipe")) return "PIPE";
  if (lower.includes("public offering") || lower.includes("follow-on")) return "Public Offering";
  if (lower.includes("seed")) return "Seed";
  if (lower.includes("grant")) return "Grant";
  if (lower.includes("debt")) return "Debt";
  return "Venture";
}

function parseTracker(content: string, year: number): ParsedRound[] {
  const rounds: ParsedRound[] = [];

  // Split by date headers (e.g., "Dec. 18—" or "**Dec. 18**" or "## December")
  // The format is: Date — Company Name \n **Amount:** $X million \n description

  const lines = content.split("\n");
  let currentDate = "";
  let currentCompany = "";
  let currentAmount = 0;
  let currentRoundType = "";
  let currentDescription = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect date + company patterns like "Dec. 18—Syneron Bio" or "**Dec. 18—Company**"
    const dateCompanyMatch = line.match(/\*?\*?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z.]*\s+(\d{1,2})\s*[—–-]\s*(.+?)(?:\*\*)?$/i);
    if (dateCompanyMatch) {
      // Save previous round if we have one
      if (currentCompany && currentAmount > 0) {
        rounds.push({
          company_name: currentCompany.replace(/\*\*/g, "").replace(/\[.*?\]/g, "").trim(),
          amount_usd: currentAmount,
          round_type: currentRoundType || "Venture",
          date: currentDate,
          lead_investor: "Undisclosed",
        });
      }

      // Parse the date
      const monthStr = line.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)?.[1] || "Jan";
      const day = dateCompanyMatch[1];
      const months: Record<string, string> = {
        Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
        Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
      };
      currentDate = `${year}-${months[monthStr] || "01"}-${day.padStart(2, "0")}`;
      currentCompany = dateCompanyMatch[2].replace(/\*\*/g, "").replace(/\[.*?\]\(.*?\)/g, "").trim();
      currentAmount = 0;
      currentRoundType = "";
      currentDescription = "";
      continue;
    }

    // Detect standalone company name in bold: "**Company Name**" or "## Company"
    const boldCompanyMatch = line.match(/^\*\*([A-Z][^*]+)\*\*$/);
    if (boldCompanyMatch && !line.includes("Amount") && boldCompanyMatch[1].length > 3 && boldCompanyMatch[1].length < 80) {
      if (currentCompany && currentAmount > 0) {
        rounds.push({
          company_name: currentCompany.replace(/\*\*/g, "").replace(/\[.*?\]/g, "").trim(),
          amount_usd: currentAmount,
          round_type: currentRoundType || "Venture",
          date: currentDate,
          lead_investor: "Undisclosed",
        });
      }
      currentCompany = boldCompanyMatch[1].trim();
      currentAmount = 0;
      currentRoundType = "";
      currentDescription = "";
      continue;
    }

    // Detect amount: "**Amount:** $165 million" or "Amount: $55 million"
    const amountMatch = line.match(/\*?Amount:?\*?\*?\s*(.+)/i);
    if (amountMatch) {
      currentAmount = parseAmount(amountMatch[1]);
      continue;
    }

    // Also try to detect amounts inline: "$165 million series A"
    if (!currentAmount && currentCompany) {
      const inlineAmount = line.match(/\$([\d,.]+)\s*(million|billion)/i);
      if (inlineAmount) {
        currentAmount = parseAmount(`$${inlineAmount[1]} ${inlineAmount[2]}`);
      }
    }

    // Detect round type from description
    if (currentCompany && line.length > 20) {
      currentDescription += " " + line;
      if (!currentRoundType) {
        currentRoundType = inferRoundType(currentDescription);
        if (currentRoundType === "Venture") currentRoundType = ""; // reset if just default
      }
    }
  }

  // Don't forget the last one
  if (currentCompany && currentAmount > 0) {
    rounds.push({
      company_name: currentCompany.replace(/\*\*/g, "").replace(/\[.*?\]\(.*?\)/g, "").trim(),
      amount_usd: currentAmount,
      round_type: currentRoundType || "Venture",
      date: currentDate,
      lead_investor: "Undisclosed",
    });
  }

  return rounds;
}

async function main() {
  console.log("\n📰 Parsing FierceBiotech Fundraising Trackers\n");

  const files = [
    { path: ".firecrawl/fiercebiotech-tracker-2024.md", year: 2024 },
    { path: ".firecrawl/fiercebiotech-tracker-2025.md", year: 2025 },
    { path: ".firecrawl/fiercebiotech-tracker-2026.md", year: 2026 },
  ];

  let allRounds: ParsedRound[] = [];

  for (const file of files) {
    try {
      const content = readFileSync(resolve(__dirname, "..", file.path), "utf-8");
      const rounds = parseTracker(content, file.year);
      console.log(`${file.year}: Parsed ${rounds.length} rounds from FierceBiotech`);
      allRounds.push(...rounds);
    } catch (err) {
      console.error(`Could not read ${file.path}: ${err}`);
    }
  }

  console.log(`\nTotal parsed: ${allRounds.length} rounds`);

  // Get existing rounds for deduplication
  const { data: existing } = await supabase
    .from("funding_rounds")
    .select("company_name, round_type, amount_usd, announced_date")
    .gte("announced_date", "2024-01-01");

  // Build dedup index: company_name_lower -> [{amount, date}]
  const existingMap = new Map<string, Array<{ amount: number; date: string; type: string }>>();
  for (const r of existing || []) {
    const key = (r.company_name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const arr = existingMap.get(key) || [];
    arr.push({ amount: Number(r.amount_usd), date: r.announced_date, type: r.round_type || "" });
    existingMap.set(key, arr);
  }

  // Get company name -> id mapping
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .limit(20000);

  const nameToId = new Map<string, string>();
  for (const c of companies || []) {
    nameToId.set(c.name.toLowerCase(), c.id);
    // Also try simplified key
    nameToId.set(c.name.toLowerCase().replace(/[^a-z0-9]/g, ""), c.id);
  }

  function isDuplicate(round: ParsedRound): boolean {
    const key = round.company_name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const existingRounds = existingMap.get(key);
    if (!existingRounds) return false;

    for (const er of existingRounds) {
      // Same round type and amount within 20%
      const amtRatio = Math.abs(er.amount - round.amount_usd) / Math.max(er.amount, round.amount_usd, 1);
      if (amtRatio < 0.2 && er.type.toLowerCase() === round.round_type.toLowerCase()) return true;

      // Same amount within 5% regardless of type (could be mislabeled)
      if (amtRatio < 0.05) return true;
    }
    return false;
  }

  const newRounds: Array<Record<string, unknown>> = [];
  let dupeCount = 0;

  for (const round of allRounds) {
    if (isDuplicate(round)) {
      dupeCount++;
      continue;
    }

    const companyId = nameToId.get(round.company_name.toLowerCase())
      || nameToId.get(round.company_name.toLowerCase().replace(/[^a-z0-9]/g, ""));

    newRounds.push({
      company_id: companyId || null,
      company_name: round.company_name,
      round_type: round.round_type,
      amount: round.amount_usd,
      currency: "USD",
      amount_usd: round.amount_usd,
      lead_investor: round.lead_investor,
      announced_date: round.date,
      country: "United States", // FierceBiotech mostly covers US
      source_name: "fiercebiotech",
      confidence: "scraped",
    });
  }

  console.log(`\nDuplicates skipped: ${dupeCount}`);
  console.log(`New rounds to insert: ${newRounds.length}`);

  if (newRounds.length > 0) {
    // Insert in batches
    let inserted = 0;
    for (let i = 0; i < newRounds.length; i += 50) {
      const batch = newRounds.slice(i, i + 50);
      const { error } = await supabase.from("funding_rounds").insert(batch);
      if (error) {
        console.error(`Insert error: ${error.message}`);
      } else {
        inserted += batch.length;
      }
    }
    console.log(`Inserted: ${inserted} new rounds`);
  }

  // Final counts
  const { data: finalData } = await supabase.rpc("get_funding_annual" as never);
  const recent = (finalData as { year: number; rounds: number; total: number }[] || [])
    .filter((r: { year: number }) => r.year >= 2023);
  console.log("\nUpdated annual totals:");
  for (const r of recent) {
    console.log(`  ${r.year}: ${r.rounds} rounds, $${(Number(r.total) / 1e9).toFixed(1)}B`);
  }
}

main().catch(console.error);
