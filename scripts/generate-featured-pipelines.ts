#!/usr/bin/env npx tsx
/**
 * Generate Featured Pipelines — "BiotechTube 100" curated watchlist
 *
 * Selects 50 high-quality pipeline programs and uses DeepSeek to generate
 * rich analysis for each one.
 *
 * Usage: npx tsx scripts/generate-featured-pipelines.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const FEATURED_MONTH = "2026-03";
const TARGET_COUNT = 50;
const MAX_PER_COMPANY = 3;

interface PipelineCandidate {
  id: string;
  product_name: string;
  company_name: string;
  company_id: string;
  indication: string | null;
  stage: string;
  trial_status: string | null;
  mechanism_of_action: string | null;
  nct_id: string | null;
  conditions: string[] | null;
  start_date: string | null;
  completion_date: string | null;
  slug: string | null;
}

interface DeepSeekAnalysis {
  reason: string;
  ai_summary: string;
  competitive_landscape: string;
  investment_thesis: string;
  risk_factors: string;
  key_facts: { label: string; value: string }[];
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
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function generateAnalysis(pipeline: PipelineCandidate): Promise<DeepSeekAnalysis> {
  const systemPrompt = `You are a senior biotech analyst writing for BiotechTube, a biotech intelligence platform.
Your analysis must be factual and grounded in publicly available information.
Do NOT fabricate clinical trial results, approval dates, or financial projections.
Focus on what is known and verifiable from the pipeline data provided.
Write in a professional but accessible tone.`;

  const prompt = `Analyze this drug pipeline program and return a JSON object with the following fields:

Drug: ${pipeline.product_name}
Company: ${pipeline.company_name}
Stage: ${pipeline.stage}
Trial Status: ${pipeline.trial_status || "Unknown"}
Indication: ${pipeline.indication || "Not specified"}
Mechanism of Action: ${pipeline.mechanism_of_action || "Not specified"}
NCT ID: ${pipeline.nct_id || "N/A"}
Conditions: ${pipeline.conditions?.join(", ") || "Not specified"}
Start Date: ${pipeline.start_date || "N/A"}
Expected Completion: ${pipeline.completion_date || "N/A"}

Return ONLY a valid JSON object with these exact fields:
{
  "reason": "One sentence (30-50 words) explaining why this drug is worth watching right now",
  "ai_summary": "Detailed analysis (500-800 words) covering: mechanism of action, clinical trial details, what makes this program notable, market opportunity, and current status. Use paragraphs separated by \\n\\n.",
  "competitive_landscape": "2-3 paragraphs on who else is targeting this indication and how this drug compares (200-300 words)",
  "investment_thesis": "2-3 paragraphs on why this matters financially — market size, unmet need, commercial potential (200-300 words)",
  "risk_factors": "Bullet-point list of 4-6 key risks that could prevent success, each 1-2 sentences",
  "key_facts": [
    {"label": "Indication", "value": "the primary indication"},
    {"label": "Phase", "value": "current development phase"},
    {"label": "Trial Status", "value": "current trial status"},
    {"label": "Mechanism", "value": "mechanism of action if known, otherwise 'Under investigation'"},
    {"label": "NCT ID", "value": "trial ID if available"},
    {"label": "Company", "value": "company name"},
    {"label": "Expected Completion", "value": "expected completion date if available"}
  ]
}

IMPORTANT: Return ONLY the JSON object, no markdown formatting, no code blocks.`;

  const raw = await callDeepSeek(prompt, systemPrompt);

  // Parse JSON — handle potential markdown wrapping
  let jsonStr = raw.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return parsed as DeepSeekAnalysis;
  } catch (e) {
    console.error(`Failed to parse JSON for ${pipeline.product_name}:`, jsonStr.slice(0, 200));
    // Return a minimal valid analysis
    return {
      reason: `${pipeline.product_name} is a ${pipeline.stage} program by ${pipeline.company_name} for ${pipeline.indication || "various indications"} that warrants close monitoring.`,
      ai_summary: `${pipeline.product_name} is currently in ${pipeline.stage} development by ${pipeline.company_name}. The program targets ${pipeline.indication || "various conditions"} and is ${pipeline.trial_status?.toLowerCase() || "in development"}.`,
      competitive_landscape: "Competitive landscape analysis is being updated.",
      investment_thesis: "Investment analysis is being updated.",
      risk_factors: "Standard clinical development risks apply including trial failure, regulatory delays, and market competition.",
      key_facts: [
        { label: "Indication", value: pipeline.indication || "Various" },
        { label: "Phase", value: pipeline.stage },
        { label: "Trial Status", value: pipeline.trial_status || "Unknown" },
        { label: "Company", value: pipeline.company_name },
      ],
    };
  }
}

// ── Select candidates ──

async function selectCandidates(): Promise<PipelineCandidate[]> {
  console.log("Selecting pipeline candidates...");

  // Get Phase 3 and Approved drugs that are recruiting or active
  const { data: phase3Recruiting, error: e1 } = await supabase
    .from("pipelines")
    .select("id, product_name, company_name, company_id, indication, stage, trial_status, mechanism_of_action, nct_id, conditions, start_date, completion_date, slug")
    .eq("stage", "Phase 3")
    .in("trial_status", ["Recruiting", "Active"])
    .not("slug", "is", null)
    .order("start_date", { ascending: false })
    .limit(500);

  const { data: approvedRecruiting, error: e2 } = await supabase
    .from("pipelines")
    .select("id, product_name, company_name, company_id, indication, stage, trial_status, mechanism_of_action, nct_id, conditions, start_date, completion_date, slug")
    .eq("stage", "Approved")
    .in("trial_status", ["Recruiting", "Active"])
    .not("slug", "is", null)
    .order("start_date", { ascending: false })
    .limit(200);

  const { data: phase2_3, error: e3 } = await supabase
    .from("pipelines")
    .select("id, product_name, company_name, company_id, indication, stage, trial_status, mechanism_of_action, nct_id, conditions, start_date, completion_date, slug")
    .eq("stage", "Phase 2/3")
    .in("trial_status", ["Recruiting", "Active"])
    .not("slug", "is", null)
    .order("start_date", { ascending: false })
    .limit(100);

  if (e1) console.error("Error fetching Phase 3:", e1.message);
  if (e2) console.error("Error fetching Approved:", e2.message);
  if (e3) console.error("Error fetching Phase 2/3:", e3.message);

  const allCandidates: PipelineCandidate[] = [
    ...(phase3Recruiting || []),
    ...(approvedRecruiting || []),
    ...(phase2_3 || []),
  ] as PipelineCandidate[];

  console.log(`Found ${allCandidates.length} raw candidates`);

  // Filter: short product names, no combo drugs with too many components
  const filtered = allCandidates.filter((c) => {
    if (!c.product_name) return false;
    if (c.product_name.length > 40) return false;
    // Skip names with too many slashes (combo drugs)
    if ((c.product_name.match(/\//g) || []).length > 1) return false;
    // Skip names that are just codes like "ABC-1234"
    if (/^[A-Z]{2,5}-?\d{3,}$/.test(c.product_name)) return false;
    return true;
  });

  console.log(`After filtering: ${filtered.length} candidates`);

  // Diversify by company (max 3 per company) and indication
  const companyCount = new Map<string, number>();
  const seenIndications = new Map<string, number>();
  const selected: PipelineCandidate[] = [];

  // Shuffle to avoid bias toward alphabetical order
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);

  for (const candidate of shuffled) {
    if (selected.length >= TARGET_COUNT) break;

    const companyKey = candidate.company_name.toLowerCase();
    const currentCompanyCount = companyCount.get(companyKey) || 0;
    if (currentCompanyCount >= MAX_PER_COMPANY) continue;

    // Limit indication diversity — max 5 drugs per similar indication
    const indicKey = (candidate.indication || "unknown").toLowerCase().split(/[\s,]+/)[0];
    const indicCount = seenIndications.get(indicKey) || 0;
    if (indicCount >= 5) continue;

    selected.push(candidate);
    companyCount.set(companyKey, currentCompanyCount + 1);
    seenIndications.set(indicKey, indicCount + 1);
  }

  console.log(`Selected ${selected.length} candidates for featuring`);
  return selected;
}

// ── Main ──

async function main() {
  console.log("=== BiotechTube Featured Pipelines Generator ===");
  console.log(`Month: ${FEATURED_MONTH} | Target: ${TARGET_COUNT} drugs\n`);

  if (!DEEPSEEK_API_KEY) {
    console.error("DEEPSEEK_API_KEY not found in .env.local");
    process.exit(1);
  }

  // Check if we already have featured pipelines for this month
  const { data: existing } = await supabase
    .from("featured_pipelines")
    .select("id")
    .eq("featured_month", FEATURED_MONTH)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`Already have featured pipelines for ${FEATURED_MONTH}. Delete them first to regenerate.`);
    console.log("Run: DELETE FROM featured_pipelines WHERE featured_month = '2026-03';");
    process.exit(0);
  }

  const candidates = await selectCandidates();

  if (candidates.length === 0) {
    console.error("No candidates found!");
    process.exit(1);
  }

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    console.log(`\n[${i + 1}/${candidates.length}] Analyzing: ${candidate.product_name} (${candidate.company_name})`);

    try {
      const analysis = await generateAnalysis(candidate);

      const { error: insertErr } = await supabase.from("featured_pipelines").insert({
        pipeline_id: candidate.id,
        rank: i + 1,
        featured_month: FEATURED_MONTH,
        reason: analysis.reason,
        ai_summary: analysis.ai_summary,
        key_facts: analysis.key_facts,
        competitive_landscape: analysis.competitive_landscape,
        investment_thesis: analysis.investment_thesis,
        risk_factors: analysis.risk_factors,
      });

      if (insertErr) {
        console.error(`  Insert error: ${insertErr.message}`);
        errorCount++;
      } else {
        console.log(`  Inserted rank #${i + 1}: ${candidate.product_name}`);
        successCount++;
      }

      // Rate limit: wait 500ms between API calls
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err: any) {
      console.error(`  Error analyzing ${candidate.product_name}: ${err.message}`);
      errorCount++;

      // On API error, wait longer
      if (err.message.includes("429")) {
        console.log("  Rate limited, waiting 10s...");
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`Success: ${successCount} | Errors: ${errorCount}`);
}

main().catch(console.error);
