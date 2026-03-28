#!/usr/bin/env npx tsx
/**
 * Fetch FDA Calendar — PDUFA dates and upcoming FDA decisions
 *
 * Uses DeepSeek to generate known upcoming PDUFA dates for 2026-2027,
 * then matches them to companies and pipelines in our database.
 *
 * Usage: npx tsx scripts/fetch-fda-calendar.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import {
  CompanyMatcher,
  loadCompanies,
} from "./lib/company-matcher";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;

interface FDAEvent {
  drug_name: string;
  company_name: string;
  decision_date: string; // YYYY-MM-DD
  decision_type: string;
  indication: string;
  notes: string;
}

// ── DeepSeek API call ──

async function callDeepSeek(prompt: string, systemPrompt: string): Promise<string> {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ── Generate FDA calendar via DeepSeek ──

async function fetchPDUFADates(): Promise<FDAEvent[]> {
  const systemPrompt = `You are a pharmaceutical regulatory expert with deep knowledge of FDA PDUFA action dates and advisory committee meetings.
You must provide REAL, publicly announced PDUFA dates and FDA decision dates.
Only include dates that have been officially announced by the FDA or disclosed by the companies in press releases or SEC filings.
If you are unsure about an exact date, provide the announced month and use the last day of that month.
The current date is March 28, 2026.`;

  const prompt = `List ALL known upcoming FDA PDUFA action dates and advisory committee (AdCom) meetings from April 2026 through December 2027.

Include:
- PDUFA target action dates (NDA/BLA/sNDA/sBLA decisions)
- FDA Advisory Committee meetings for drug approvals
- CRL response dates if re-submitted
- Major FDA decisions on breakthrough therapy designations

For each, provide:
1. Drug name (brand name and/or generic name)
2. Company name
3. Decision date (YYYY-MM-DD format, use last day of month if only month known)
4. Decision type (PDUFA, AdCom, CRL Response, sNDA, sBLA)
5. Indication being reviewed
6. Brief notes about the significance

Return ONLY a JSON array of objects with these exact fields:
[{
  "drug_name": "...",
  "company_name": "...",
  "decision_date": "YYYY-MM-DD",
  "decision_type": "PDUFA",
  "indication": "...",
  "notes": "..."
}]

Focus on the most significant upcoming FDA decisions. Target at least 25-30 entries.
Return ONLY the JSON array, no markdown formatting.`;

  console.log("Fetching PDUFA dates from DeepSeek...");
  const raw = await callDeepSeek(prompt, systemPrompt);

  let jsonStr = raw.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      throw new Error("Response is not an array");
    }
    return parsed as FDAEvent[];
  } catch (e: any) {
    console.error("Failed to parse DeepSeek response:", e.message);
    console.error("Raw response (first 500 chars):", jsonStr.slice(0, 500));
    return [];
  }
}

// ── Second batch to get more dates ──

async function fetchAdditionalDates(): Promise<FDAEvent[]> {
  const systemPrompt = `You are a pharmaceutical regulatory expert. Provide REAL, publicly announced FDA decision dates.
The current date is March 28, 2026.`;

  const prompt = `List additional known upcoming FDA PDUFA dates and decisions from April 2026 through December 2027 that focus on:

1. Oncology drugs (checkpoint inhibitors, ADCs, CAR-T, targeted therapies)
2. Rare disease / orphan drug approvals
3. Gene therapy and cell therapy approvals
4. GLP-1 and metabolic disease drugs
5. Neuroscience drugs (Alzheimer's, depression, etc.)

Only include REAL announced dates from company disclosures or FDA announcements.
Do NOT repeat any drugs from a previous list.

Return ONLY a JSON array:
[{
  "drug_name": "...",
  "company_name": "...",
  "decision_date": "YYYY-MM-DD",
  "decision_type": "PDUFA",
  "indication": "...",
  "notes": "..."
}]

Target 10-15 additional entries. Return ONLY the JSON array.`;

  console.log("Fetching additional FDA dates...");
  const raw = await callDeepSeek(prompt, systemPrompt);

  let jsonStr = raw.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];
    return parsed as FDAEvent[];
  } catch {
    console.error("Failed to parse additional dates");
    return [];
  }
}

// ── Match to database ──

async function matchToDatabase(
  events: FDAEvent[],
  companyMatcher: CompanyMatcher
): Promise<void> {
  console.log(`\nMatching ${events.length} FDA events to database...\n`);

  let insertCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const event of events) {
    // Validate date
    const dateMatch = event.decision_date?.match(/^\d{4}-\d{2}-\d{2}$/);
    if (!dateMatch) {
      console.log(`  Skipping ${event.drug_name}: invalid date "${event.decision_date}"`);
      skipCount++;
      continue;
    }

    // Match company
    const companyId = companyMatcher.match(event.company_name);

    // Try to match pipeline
    let pipelineId: string | null = null;
    if (companyId) {
      // Search for pipeline by drug name and company
      const { data: pipelines } = await supabase
        .from("pipelines")
        .select("id, product_name")
        .eq("company_id", companyId)
        .ilike("product_name", `%${event.drug_name.split(" ")[0]}%`)
        .limit(5);

      if (pipelines && pipelines.length > 0) {
        // Find best match
        const drugLower = event.drug_name.toLowerCase();
        const match = pipelines.find((p) =>
          p.product_name.toLowerCase().includes(drugLower) ||
          drugLower.includes(p.product_name.toLowerCase())
        );
        pipelineId = match?.id || pipelines[0].id;
      }
    }

    // Insert
    const { error: insertErr } = await supabase.from("fda_calendar").insert({
      drug_name: event.drug_name,
      company_name: event.company_name,
      company_id: companyId,
      pipeline_id: pipelineId,
      decision_date: event.decision_date,
      decision_type: event.decision_type || "PDUFA",
      indication: event.indication,
      status: "pending",
      notes: event.notes,
    });

    if (insertErr) {
      if (insertErr.message.includes("duplicate")) {
        console.log(`  Duplicate: ${event.drug_name} (${event.decision_date})`);
        skipCount++;
      } else {
        console.error(`  Insert error for ${event.drug_name}: ${insertErr.message}`);
        errorCount++;
      }
    } else {
      const matchInfo = companyId
        ? pipelineId
          ? "matched company+pipeline"
          : "matched company"
        : "no match";
      console.log(`  Inserted: ${event.drug_name} (${event.company_name}) — ${event.decision_date} [${matchInfo}]`);
      insertCount++;
    }
  }

  console.log(`\nInserted: ${insertCount} | Skipped: ${skipCount} | Errors: ${errorCount}`);
}

// ── Main ──

async function main() {
  console.log("=== FDA Calendar Builder ===\n");

  if (!DEEPSEEK_API_KEY) {
    console.error("DEEPSEEK_API_KEY not found in .env.local");
    process.exit(1);
  }

  // Load companies for matching
  console.log("Loading companies for matching...");
  const companies = await loadCompanies(supabase);
  const companyMatcher = new CompanyMatcher(companies);
  console.log(`Loaded ${companies.length} companies\n`);

  // Fetch PDUFA dates from DeepSeek
  const mainEvents = await fetchPDUFADates();
  console.log(`Got ${mainEvents.length} events from primary query`);

  await new Promise((r) => setTimeout(r, 1000));

  const additionalEvents = await fetchAdditionalDates();
  console.log(`Got ${additionalEvents.length} events from secondary query`);

  // Deduplicate
  const allEvents = [...mainEvents];
  const seenDrugs = new Set(mainEvents.map((e) => `${e.drug_name}|${e.decision_date}`));
  for (const event of additionalEvents) {
    const key = `${event.drug_name}|${event.decision_date}`;
    if (!seenDrugs.has(key)) {
      allEvents.push(event);
      seenDrugs.add(key);
    }
  }

  console.log(`\nTotal unique FDA events: ${allEvents.length}`);

  // Match and insert
  await matchToDatabase(allEvents, companyMatcher);

  // Summary
  const { data: inserted } = await supabase
    .from("fda_calendar")
    .select("id")
    .gte("decision_date", "2026-04-01");

  console.log(`\n=== Complete ===`);
  console.log(`Total FDA calendar entries (from Apr 2026): ${inserted?.length || 0}`);
}

main().catch(console.error);
