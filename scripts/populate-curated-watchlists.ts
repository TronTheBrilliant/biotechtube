#!/usr/bin/env npx tsx
/**
 * Populate Curated Watchlists
 *
 * For each curated watchlist:
 * - SIZE watchlists: query pipelines joined with company market cap data
 * - SECTOR watchlists: query pipelines matching therapeutic area keywords
 * - Uses DeepSeek to generate a one-sentence reason for each pick
 * - Inserts top 25 per list into curated_watchlist_items
 *
 * Usage: npx tsx scripts/populate-curated-watchlists.ts
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
const TARGET_PER_LIST = 25;
const MAX_PER_COMPANY = 3;

// ── Sector keyword mappings ──

const SECTOR_KEYWORDS: Record<string, string[]> = {
  oncology: [
    "cancer", "tumor", "tumour", "carcinoma", "lymphoma", "leukemia", "leukaemia",
    "melanoma", "myeloma", "sarcoma", "glioblastoma", "glioma", "mesothelioma",
    "neuroblastoma", "oncology", "neoplasm", "malignant", "metastatic",
    "checkpoint inhibitor", "car-t", "car t", "adc", "antibody-drug conjugate",
    "immuno-oncology", "pd-1", "pd-l1", "ctla-4",
  ],
  neuroscience: [
    "alzheimer", "parkinson", "multiple sclerosis", "epilepsy", "seizure",
    "depression", "schizophrenia", "bipolar", "anxiety", "adhd",
    "huntington", "als", "amyotrophic", "neuropathy", "migraine",
    "dementia", "neurodegenerative", "cns", "brain", "neurological",
    "psychosis", "ptsd", "obsessive", "autism", "spinal muscular atrophy",
  ],
  "rare disease": [
    "orphan", "rare disease", "rare disorder", "ultra-rare",
    "duchenne", "sickle cell", "cystic fibrosis", "hemophilia", "haemophilia",
    "gaucher", "fabry", "pompe", "hunter syndrome", "hurler",
    "phenylketonuria", "pku", "thalassemia", "spinal muscular atrophy",
    "batten", "rett syndrome", "angelman", "prader-willi",
    "wilson disease", "niemann-pick", "lysosomal",
  ],
  "gene therapy": [
    "gene therapy", "gene editing", "crispr", "cas9", "cas13",
    "aav", "adeno-associated", "lentiviral", "viral vector",
    "cell therapy", "car-t", "car t", "tcr", "t-cell",
    "ex vivo", "in vivo gene", "base editing", "prime editing",
    "rna interference", "rnai", "sirna", "antisense", "mrna",
  ],
  metabolic: [
    "obesity", "diabetes", "diabetic", "glp-1", "glp1", "glucagon",
    "metabolic", "nafld", "nash", "fatty liver", "insulin",
    "weight loss", "weight management", "bmi", "bariatric",
    "dyslipidemia", "cholesterol", "triglyceride", "cardiovascular",
    "hypertension", "atherosclerosis", "heart failure",
    "tirzepatide", "semaglutide", "incretin",
  ],
};

// ── DeepSeek API call ──

async function callDeepSeek(prompt: string): Promise<string> {
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
          content:
            "You are a biotech analyst. Write concise, factual one-sentence explanations. Do not fabricate data.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function generateReason(pipeline: any): Promise<string> {
  const prompt = `Write ONE sentence (25-40 words) explaining why investors should watch this drug:
Drug: ${pipeline.product_name}
Company: ${pipeline.company_name}
Stage: ${pipeline.stage}
Indication: ${pipeline.indication || "Not specified"}
Trial Status: ${pipeline.trial_status || "Unknown"}
Mechanism: ${pipeline.mechanism_of_action || "Not specified"}

Return ONLY the sentence, no quotes, no prefix.`;

  try {
    return await callDeepSeek(prompt);
  } catch (err: any) {
    console.error(`  DeepSeek error for ${pipeline.product_name}: ${err.message}`);
    return `${pipeline.product_name} is a ${pipeline.stage} ${pipeline.indication || "therapeutic"} program by ${pipeline.company_name} currently ${(pipeline.trial_status || "in development").toLowerCase()}.`;
  }
}

// ── Batch generate reasons ──

async function generateReasonsBatch(pipelines: any[]): Promise<string[]> {
  // Build a batch prompt for up to 10 drugs at once
  if (pipelines.length === 0) return [];

  const drugList = pipelines
    .map(
      (p, i) =>
        `${i + 1}. ${p.product_name} (${p.company_name}) — ${p.stage} — ${p.indication || "N/A"} — ${p.trial_status || "Unknown"} — ${p.mechanism_of_action || "N/A"}`
    )
    .join("\n");

  const prompt = `For each drug below, write ONE concise sentence (25-40 words) explaining why investors should watch it. Focus on what makes the program notable (stage advancement, market opportunity, unmet need, novel mechanism).

${drugList}

Return ONLY a JSON array of strings, one per drug, in order. Example: ["sentence1", "sentence2"]`;

  try {
    const raw = await callDeepSeek(prompt);
    let jsonStr = raw.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed) && parsed.length === pipelines.length) {
      return parsed;
    }
  } catch (err: any) {
    console.error(`  Batch reason generation failed: ${err.message}`);
  }

  // Fallback: generate individually
  const reasons: string[] = [];
  for (const p of pipelines) {
    reasons.push(await generateReason(p));
    await new Promise((r) => setTimeout(r, 300));
  }
  return reasons;
}

// ── Populate SIZE watchlists ──

async function populateSizeWatchlist(watchlist: any): Promise<number> {
  console.log(`\n--- Populating: ${watchlist.name} ---`);
  console.log(`  Market cap range: $${(watchlist.market_cap_min / 1e9).toFixed(1)}B - ${watchlist.market_cap_max ? "$" + (watchlist.market_cap_max / 1e9).toFixed(1) + "B" : "unlimited"}`);

  // Get the latest price date
  const { data: latestDate } = await supabase
    .from("company_price_history")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (!latestDate) {
    console.error("  No price history data found");
    return 0;
  }

  // Build a market cap condition
  let mcapCondition = `cph.market_cap_usd >= ${watchlist.market_cap_min}`;
  if (watchlist.market_cap_max) {
    mcapCondition += ` AND cph.market_cap_usd < ${watchlist.market_cap_max}`;
  }

  // Step 1: Get company IDs with market cap in range (from latest price data)
  const recentDates = [latestDate.date];
  // Try a few recent dates in case some companies don't have the very latest
  for (let i = 1; i <= 5; i++) {
    const d = new Date(latestDate.date);
    d.setDate(d.getDate() - i);
    recentDates.push(d.toISOString().split("T")[0]);
  }

  // Get companies with market cap data
  const companyMcaps = new Map<string, number>();

  for (const date of recentDates) {
    const { data: priceData } = await supabase
      .from("company_price_history")
      .select("company_id, market_cap_usd")
      .eq("date", date)
      .not("market_cap_usd", "is", null)
      .gte("market_cap_usd", watchlist.market_cap_min)
      .order("market_cap_usd", { ascending: false })
      .limit(1000);

    if (priceData) {
      for (const row of priceData) {
        if (!companyMcaps.has(row.company_id)) {
          const mcap = Number(row.market_cap_usd);
          if (watchlist.market_cap_max && mcap >= watchlist.market_cap_max) continue;
          companyMcaps.set(row.company_id, mcap);
        }
      }
    }
  }

  // For small-cap, also query those < market_cap_max without the gte filter
  if (watchlist.market_cap_max && companyMcaps.size < 500) {
    for (const date of recentDates.slice(0, 2)) {
      const { data: smallData } = await supabase
        .from("company_price_history")
        .select("company_id, market_cap_usd")
        .eq("date", date)
        .not("market_cap_usd", "is", null)
        .lt("market_cap_usd", watchlist.market_cap_max)
        .gte("market_cap_usd", watchlist.market_cap_min)
        .order("market_cap_usd", { ascending: false })
        .limit(1000);

      if (smallData) {
        for (const row of smallData) {
          if (!companyMcaps.has(row.company_id)) {
            companyMcaps.set(row.company_id, Number(row.market_cap_usd));
          }
        }
      }
    }
  }

  console.log(`  Found ${companyMcaps.size} companies in market cap range`);

  if (companyMcaps.size === 0) return 0;

  // Step 2: Get Phase 2+ pipelines for these companies
  const companyIds = Array.from(companyMcaps.keys());
  const allPipelines: any[] = [];

  // Query in batches of 100 company IDs
  for (let i = 0; i < companyIds.length; i += 100) {
    const batch = companyIds.slice(i, i + 100);
    const { data: pipelines } = await supabase
      .from("pipelines")
      .select("id, product_name, company_name, company_id, indication, stage, trial_status, mechanism_of_action, slug")
      .in("company_id", batch)
      .in("stage", ["Phase 2", "Phase 2/3", "Phase 3", "Approved"])
      .in("trial_status", ["Recruiting", "Active"])
      .not("slug", "is", null)
      .limit(500);

    if (pipelines) allPipelines.push(...pipelines);
  }

  console.log(`  Found ${allPipelines.length} Phase 2+ active pipelines`);

  // Score and rank: Phase 3 > Phase 2/3 > Phase 2, higher market cap within range gets slight boost
  const scored = allPipelines.map((p) => {
    const stageScore =
      p.stage === "Phase 3" ? 40 :
      p.stage === "Approved" ? 35 :
      p.stage === "Phase 2/3" ? 30 :
      20;
    const statusScore = p.trial_status === "Recruiting" ? 10 : 5;
    const mcap = companyMcaps.get(p.company_id) || 0;
    // Normalize mcap within range to 0-10 score
    const range = (watchlist.market_cap_max || 100e9) - watchlist.market_cap_min;
    const mcapScore = Math.min(10, ((mcap - watchlist.market_cap_min) / range) * 10);

    return { ...p, score: stageScore + statusScore + mcapScore, mcap };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Diversify: max per company
  const companyCount = new Map<string, number>();
  const selected: typeof scored = [];

  for (const candidate of scored) {
    if (selected.length >= TARGET_PER_LIST) break;
    const key = candidate.company_id;
    const count = companyCount.get(key) || 0;
    if (count >= MAX_PER_COMPANY) continue;
    selected.push(candidate);
    companyCount.set(key, count + 1);
  }

  console.log(`  Selected ${selected.length} drugs for watchlist`);

  // Generate reasons in batches of 10
  const allReasons: string[] = [];
  for (let i = 0; i < selected.length; i += 10) {
    const batch = selected.slice(i, i + 10);
    console.log(`  Generating reasons batch ${Math.floor(i / 10) + 1}/${Math.ceil(selected.length / 10)}...`);
    const reasons = await generateReasonsBatch(batch);
    allReasons.push(...reasons);
    await new Promise((r) => setTimeout(r, 500));
  }

  // Insert into curated_watchlist_items
  let insertCount = 0;
  for (let i = 0; i < selected.length; i++) {
    const { error: insertErr } = await supabase.from("curated_watchlist_items").insert({
      watchlist_id: watchlist.id,
      pipeline_id: selected[i].id,
      rank: i + 1,
      reason: allReasons[i] || `Notable ${selected[i].stage} program for ${selected[i].indication || "various indications"}.`,
    });

    if (insertErr) {
      // Skip duplicates silently
      if (!insertErr.message.includes("duplicate")) {
        console.error(`  Insert error: ${insertErr.message}`);
      }
    } else {
      insertCount++;
    }
  }

  console.log(`  Inserted ${insertCount} items into ${watchlist.name}`);
  return insertCount;
}

// ── Populate SECTOR watchlists ──

async function populateSectorWatchlist(watchlist: any): Promise<number> {
  console.log(`\n--- Populating: ${watchlist.name} ---`);
  console.log(`  Therapeutic filter: ${watchlist.therapeutic_filter}`);

  const keywords = SECTOR_KEYWORDS[watchlist.therapeutic_filter];
  if (!keywords) {
    console.error(`  No keywords defined for: ${watchlist.therapeutic_filter}`);
    return 0;
  }

  // Query pipelines matching therapeutic keywords via indication or conditions
  // We'll search using ilike patterns on indication
  const allPipelines: any[] = [];
  const seenIds = new Set<string>();

  for (const keyword of keywords.slice(0, 15)) {
    // Use top keywords to avoid too many queries
    const { data: pipelines } = await supabase
      .from("pipelines")
      .select("id, product_name, company_name, company_id, indication, stage, trial_status, mechanism_of_action, conditions, slug")
      .in("stage", ["Phase 2", "Phase 2/3", "Phase 3", "Approved"])
      .in("trial_status", ["Recruiting", "Active"])
      .ilike("indication", `%${keyword}%`)
      .not("slug", "is", null)
      .limit(200);

    if (pipelines) {
      for (const p of pipelines) {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          allPipelines.push(p);
        }
      }
    }
  }

  // Also search conditions array via text matching
  for (const keyword of keywords.slice(0, 8)) {
    const { data: pipelines } = await supabase
      .from("pipelines")
      .select("id, product_name, company_name, company_id, indication, stage, trial_status, mechanism_of_action, conditions, slug")
      .in("stage", ["Phase 2", "Phase 2/3", "Phase 3", "Approved"])
      .in("trial_status", ["Recruiting", "Active"])
      .contains("conditions", [keyword])
      .not("slug", "is", null)
      .limit(100);

    if (pipelines) {
      for (const p of pipelines) {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          allPipelines.push(p);
        }
      }
    }
  }

  console.log(`  Found ${allPipelines.length} matching pipelines`);

  // Score: Phase 3 > Phase 2/3 > Phase 2, Recruiting > Active
  const scored = allPipelines.map((p) => {
    const stageScore =
      p.stage === "Phase 3" ? 40 :
      p.stage === "Approved" ? 35 :
      p.stage === "Phase 2/3" ? 30 :
      20;
    const statusScore = p.trial_status === "Recruiting" ? 10 : 5;
    // Count keyword matches for relevance
    const text = `${p.indication || ""} ${(p.conditions || []).join(" ")} ${p.mechanism_of_action || ""}`.toLowerCase();
    const matchCount = keywords.filter((kw) => text.includes(kw)).length;
    const relevanceScore = Math.min(15, matchCount * 3);

    return { ...p, score: stageScore + statusScore + relevanceScore };
  });

  scored.sort((a, b) => b.score - a.score);

  // Diversify by company
  const companyCount = new Map<string, number>();
  const selected: typeof scored = [];

  for (const candidate of scored) {
    if (selected.length >= TARGET_PER_LIST) break;
    const key = candidate.company_id || candidate.company_name;
    const count = companyCount.get(key) || 0;
    if (count >= MAX_PER_COMPANY) continue;
    selected.push(candidate);
    companyCount.set(key, count + 1);
  }

  console.log(`  Selected ${selected.length} drugs for watchlist`);

  // Generate reasons in batches
  const allReasons: string[] = [];
  for (let i = 0; i < selected.length; i += 10) {
    const batch = selected.slice(i, i + 10);
    console.log(`  Generating reasons batch ${Math.floor(i / 10) + 1}/${Math.ceil(selected.length / 10)}...`);
    const reasons = await generateReasonsBatch(batch);
    allReasons.push(...reasons);
    await new Promise((r) => setTimeout(r, 500));
  }

  // Insert
  let insertCount = 0;
  for (let i = 0; i < selected.length; i++) {
    const { error: insertErr } = await supabase.from("curated_watchlist_items").insert({
      watchlist_id: watchlist.id,
      pipeline_id: selected[i].id,
      rank: i + 1,
      reason: allReasons[i] || `Notable ${selected[i].stage} program for ${selected[i].indication || "various indications"}.`,
    });

    if (insertErr) {
      if (!insertErr.message.includes("duplicate")) {
        console.error(`  Insert error: ${insertErr.message}`);
      }
    } else {
      insertCount++;
    }
  }

  console.log(`  Inserted ${insertCount} items into ${watchlist.name}`);
  return insertCount;
}

// ── Main ──

async function main() {
  console.log("=== Populate Curated Watchlists ===\n");

  if (!DEEPSEEK_API_KEY) {
    console.error("DEEPSEEK_API_KEY not found in .env.local");
    process.exit(1);
  }

  // Get all active watchlists
  const { data: watchlists, error } = await supabase
    .from("curated_watchlists")
    .select("*")
    .eq("is_active", true)
    .order("category", { ascending: true });

  if (error || !watchlists) {
    console.error("Failed to fetch watchlists:", error?.message);
    process.exit(1);
  }

  console.log(`Found ${watchlists.length} active watchlists\n`);

  // Clear existing items
  const { error: clearErr } = await supabase
    .from("curated_watchlist_items")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all

  if (clearErr) {
    console.log("Note: Could not clear existing items (may be empty):", clearErr.message);
  }

  let totalInserted = 0;

  for (const watchlist of watchlists) {
    try {
      if (watchlist.category === "sector") {
        totalInserted += await populateSectorWatchlist(watchlist);
      } else if (watchlist.category === "size") {
        totalInserted += await populateSizeWatchlist(watchlist);
      }
    } catch (err: any) {
      console.error(`Error populating ${watchlist.name}: ${err.message}`);
    }
  }

  // Update timestamps
  await supabase
    .from("curated_watchlists")
    .update({ updated_at: new Date().toISOString() })
    .eq("is_active", true);

  console.log(`\n=== Complete ===`);
  console.log(`Total items inserted: ${totalInserted}`);
}

main().catch(console.error);
