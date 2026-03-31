#!/usr/bin/env npx tsx
/**
 * CIA — Continuous Improvement Agent for BiotechTube company profiles.
 *
 * Fetches the lowest-quality or due-for-recheck companies, researches them
 * via website scraping + DeepSeek, verifies data, optionally rewrites
 * descriptions, and updates quality scores.
 *
 * Usage:
 *   npx tsx scripts/cia-agent.ts                    # Process 50 companies (default)
 *   npx tsx scripts/cia-agent.ts --batch 200        # Process 200 companies
 *   npx tsx scripts/cia-agent.ts --company eli-lilly # Process single company by slug
 *   npx tsx scripts/cia-agent.ts --worst            # Process 50 worst-scored
 *   npx tsx scripts/cia-agent.ts --unscored         # Process companies without scores
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";
import { calculateScore as sharedCalculateScore } from "./lib/scoring";

// ── Configuration ──────────────────────────────────────────────────────────
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!DEEPSEEK_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing env vars (DEEPSEEK_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── CLI argument parsing ───────────────────────────────────────────────────
const args = process.argv.slice(2);
let BATCH_SIZE = 50;
let MODE: "default" | "worst" | "unscored" | "single" = "default";
let SINGLE_SLUG = "";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--batch" && args[i + 1]) {
    BATCH_SIZE = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === "--worst") {
    MODE = "worst";
  } else if (args[i] === "--unscored") {
    MODE = "unscored";
  } else if (args[i] === "--company" && args[i + 1]) {
    MODE = "single";
    SINGLE_SLUG = args[i + 1];
    i++;
  }
}

// ── Types ──────────────────────────────────────────────────────────────────
interface Company {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  country: string | null;
  city: string | null;
  founded: number | null;
  categories: string[] | null;
  ticker: string | null;
  valuation: number | null;
  profile_quality: ProfileQuality[] | null;
}

interface ProfileQuality {
  company_id: string;
  quality_score: number;
  last_checked_at: string | null;
  next_check_at: string | null;
  issues: string[];
  changes_log: any[];
  check_count: number;
  website_verified: boolean;
  description_source: string | null;
}

interface ResearchResults {
  websiteContent: string | null;
  websiteReachable: boolean;
  googleSnippet: string | null;
  currentHq: string | null;
  currentDescription: string | null;
  isOperating: boolean;
  latestNews: string | null;
}

interface Verification {
  websiteWorks: boolean;
  descriptionOutdated: boolean;
  cityMismatch: boolean;
  notOperating: boolean;
  hasWebsiteDescription: boolean;
}

interface ScoreResult {
  score: number;
  issues: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ── DeepSeek caller ────────────────────────────────────────────────────────
async function callDeepSeek(prompt: string): Promise<string> {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });
  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ── Step 1: Research ───────────────────────────────────────────────────────
async function researchCompany(company: Company): Promise<ResearchResults> {
  const results: ResearchResults = {
    websiteContent: null,
    websiteReachable: false,
    googleSnippet: null,
    currentHq: null,
    currentDescription: null,
    isOperating: true,
    latestNews: null,
  };

  // Try to fetch company website
  if (company.website) {
    try {
      const url = company.website.startsWith("http") ? company.website : `https://${company.website}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "BiotechTube/1.0 Research Bot" },
        redirect: "follow",
      });
      results.websiteReachable = response.ok;
      if (response.ok) {
        const html = await response.text();
        // Extract meta description
        const metaDesc =
          html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/) ||
          html.match(/<meta[^>]*content="([^"]*)"[^>]*name="description"/);
        results.websiteContent = metaDesc ? metaDesc[1] : null;
        // Extract title
        const title = html.match(/<title>([^<]*)<\/title>/);
        results.currentDescription = title ? title[1] : null;
      }
    } catch {
      results.websiteReachable = false;
    }
  }

  // Use DeepSeek for additional research
  try {
    const prompt = `You are a biotech research analyst. Provide factual information about this company:

Company: ${company.name}
${company.ticker ? `Ticker: ${company.ticker}` : ""}
${company.country ? `Country: ${company.country}` : ""}
${company.website ? `Website: ${company.website}` : ""}

Answer these questions concisely (1-2 sentences each). If you don't know, say "Unknown":
1. What does this company do? (their main business/products)
2. Where is their headquarters? (city, country)
3. Are they still operating as of 2025-2026?
4. What are their key products or pipeline drugs?
5. Any notable recent news or milestones?

Format: JSON with keys: business, headquarters, operating, products, news`;

    const response = await callDeepSeek(prompt);
    try {
      const cleaned = response
        .replace(/```json?\n?/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      results.googleSnippet = parsed.business || null;
      results.currentHq = parsed.headquarters || null;
      results.isOperating =
        parsed.operating !== "No" &&
        parsed.operating !== "Unknown" &&
        !parsed.operating?.toLowerCase().includes("acquired") &&
        !parsed.operating?.toLowerCase().includes("closed");
      results.latestNews = parsed.news || null;
    } catch {
      /* ignore parse errors */
    }
  } catch (e: any) {
    console.log(`  DeepSeek research failed: ${e.message}`);
  }

  return results;
}

// ── Step 2: Verify ─────────────────────────────────────────────────────────
function verifyData(company: Company, research: ResearchResults): Verification {
  return {
    websiteWorks: research.websiteReachable,
    descriptionOutdated: !company.description || company.description.length < 100,
    cityMismatch:
      !!research.currentHq &&
      !!company.city &&
      !research.currentHq.toLowerCase().includes(company.city.toLowerCase()),
    notOperating: !research.isOperating,
    hasWebsiteDescription: !!research.websiteContent,
  };
}

// ── Step 3: Write description ──────────────────────────────────────────────
async function writeDescription(company: Company, research: ResearchResults): Promise<string> {
  // Get pipeline and funding counts from DB
  const { count: pipelineCount } = await supabase
    .from("pipelines")
    .select("*", { count: "exact", head: true })
    .eq("company_id", company.id);

  const { count: fundingCount } = await supabase
    .from("funding_rounds")
    .select("*", { count: "exact", head: true })
    .eq("company_id", company.id);

  const prompt = `Write a professional 2-3 paragraph company description for a biotech intelligence platform. Use ONLY verified facts.

Company: ${company.name}
${company.ticker ? `Stock Ticker: ${company.ticker}` : "Private company"}
${company.country ? `Country: ${company.country}` : ""}
${company.city ? `City: ${company.city}` : ""}
${company.founded ? `Founded: ${company.founded}` : ""}
${company.website ? `Website: ${company.website}` : ""}
${research.googleSnippet ? `What they do: ${research.googleSnippet}` : ""}
${research.websiteContent ? `From their website: ${research.websiteContent}` : ""}
${pipelineCount ? `Pipeline: ${pipelineCount} drug candidates` : ""}
${fundingCount ? `Funding rounds: ${fundingCount}` : ""}
${company.categories ? `Sectors: ${company.categories.join(", ")}` : ""}

Rules:
- Be factual, professional, NOT promotional
- Mention their main business focus
- If public, mention the ticker
- Mention key therapeutic areas if known
- Do NOT make up facts
- Do NOT use phrases like "at the forefront" or "cutting-edge" or "innovative" — be specific
- 2-3 paragraphs, 150-300 words
- Write in third person`;

  const description = await callDeepSeek(prompt);
  return description.trim();
}

// ── Step 4: Calculate score ────────────────────────────────────────────────
function calculateScore(
  company: Company,
  research: ResearchResults,
  _verification: Verification
): ScoreResult {
  return sharedCalculateScore({
    description: company.description,
    website: company.website,
    logo_url: company.logo_url,
    country: company.country,
    city: company.city,
    founded: company.founded,
    categories: company.categories,
    ticker: company.ticker,
    websiteReachable: research.websiteReachable,
  });
}

// ── Step 5: Update profile ─────────────────────────────────────────────────
async function updateProfile(
  company: Company,
  research: ResearchResults,
  verification: Verification,
  newDescription: string | null,
  scoreResult: ScoreResult
): Promise<void> {
  const changes: any[] = [];
  const updates: Record<string, any> = {};

  // Update description if improved
  if (
    newDescription &&
    newDescription !== company.description &&
    newDescription.length > (company.description?.length || 0)
  ) {
    updates.description = newDescription;
    changes.push({
      date: new Date().toISOString(),
      field: "description",
      old_length: company.description?.length || 0,
      new_length: newDescription.length,
      reason: "CIA agent improvement",
    });
  }

  // Flag dead website
  if (!verification.websiteWorks && company.website) {
    changes.push({ date: new Date().toISOString(), field: "website", issue: "dead_website" });
  }

  // Update company if we have changes
  if (Object.keys(updates).length > 0) {
    await supabase.from("companies").update(updates).eq("id", company.id);
    console.log(`  Updated: ${Object.keys(updates).join(", ")}`);
  }

  // Calculate next check date based on score
  let nextCheck: Date;
  if (scoreResult.score < 3) nextCheck = addDays(new Date(), 3);
  else if (scoreResult.score < 5) nextCheck = addDays(new Date(), 7);
  else if (scoreResult.score < 7) nextCheck = addDays(new Date(), 14);
  else nextCheck = addDays(new Date(), 30);

  // Get existing changes_log
  const pq = company.profile_quality?.[0];
  const existingLog = pq?.changes_log || [];
  const existingCount = pq?.check_count || 0;

  // Upsert quality score
  const { error } = await supabase.from("profile_quality").upsert(
    {
      company_id: company.id,
      quality_score: scoreResult.score,
      last_checked_at: new Date().toISOString(),
      next_check_at: nextCheck.toISOString(),
      issues: scoreResult.issues,
      changes_log: [...existingLog, ...changes].slice(-50),
      check_count: existingCount + 1,
      website_verified: research.websiteReachable,
      description_source:
        newDescription && newDescription !== company.description
          ? "cia_verified"
          : pq?.description_source || "unknown",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" }
  );

  if (error) {
    console.error(`  Quality upsert error: ${error.message}`);
  }

  console.log(
    `  Score: ${scoreResult.score}/10 | Issues: ${scoreResult.issues.length} | Next: ${nextCheck.toISOString().split("T")[0]}`
  );
}

// ── Main workflow per company ──────────────────────────────────────────────
async function improveCompanyProfile(company: Company): Promise<{ improved: boolean; oldScore: number; newScore: number }> {
  const oldScore = company.profile_quality?.[0]?.quality_score || 0;
  console.log(`\nProcessing: ${company.name} (current score: ${oldScore})`);

  // Step 1: Research
  const research = await researchCompany(company);
  console.log(`  Website: ${research.websiteReachable ? "OK" : "unreachable"} | DeepSeek: ${research.googleSnippet ? "got data" : "no data"}`);

  // Step 2: Verify
  const verification = verifyData(company, research);

  // Step 3: Write description if needed
  let newDescription: string | null = company.description;
  if (!company.description || company.description.length < 100 || verification.descriptionOutdated) {
    try {
      newDescription = await writeDescription(company, research);
      if (newDescription && newDescription.length > (company.description?.length || 0)) {
        console.log(`  New description: ${newDescription.length} chars (was ${company.description?.length || 0})`);
      } else {
        newDescription = company.description; // keep existing if new one is shorter
      }
    } catch (e: any) {
      console.log(`  Description generation failed: ${e.message}`);
      newDescription = company.description;
    }
  }

  // Step 4: Score
  // Use the updated description for scoring
  const companyForScoring = { ...company, description: newDescription };
  const scoreResult = calculateScore(companyForScoring, research, verification);

  // Step 5: Update
  await updateProfile(company, research, verification, newDescription, scoreResult);

  return { improved: scoreResult.score > oldScore, oldScore, newScore: scoreResult.score };
}

// ── Fetch companies to improve ─────────────────────────────────────────────
async function getCompaniesToImprove(limit: number): Promise<Company[]> {
  if (MODE === "single") {
    const { data, error } = await supabase
      .from("companies")
      .select("id, slug, name, description, website, logo_url, country, city, founded, categories, ticker, valuation, profile_quality(*)")
      .eq("slug", SINGLE_SLUG)
      .limit(1);

    if (error || !data || data.length === 0) {
      console.error(`Company "${SINGLE_SLUG}" not found.`);
      process.exit(1);
    }
    return data as Company[];
  }

  if (MODE === "unscored") {
    // Companies that don't have a profile_quality entry at all
    const { data } = await supabase
      .from("companies")
      .select("id, slug, name, description, website, logo_url, country, city, founded, categories, ticker, valuation, profile_quality(*)")
      .is("profile_quality", null)
      .limit(limit);

    return (data || []) as Company[];
  }

  // Default & worst: fetch by lowest quality_score or next_check_at <= now
  const now = new Date().toISOString();

  if (MODE === "worst") {
    // Simply fetch by lowest score
    const { data } = await supabase
      .from("profile_quality")
      .select("company_id, quality_score")
      .order("quality_score", { ascending: true })
      .limit(limit);

    if (!data || data.length === 0) return [];

    const ids = data.map((d: any) => d.company_id);
    const { data: companies } = await supabase
      .from("companies")
      .select("id, slug, name, description, website, logo_url, country, city, founded, categories, ticker, valuation, profile_quality(*)")
      .in("id", ids);

    // Sort by quality score ascending
    return ((companies || []) as Company[]).sort((a, b) => {
      const sa = a.profile_quality?.[0]?.quality_score || 0;
      const sb = b.profile_quality?.[0]?.quality_score || 0;
      return sa - sb;
    });
  }

  // Default mode: mix of lowest-scored and due-for-recheck
  const { data: dueData } = await supabase
    .from("profile_quality")
    .select("company_id")
    .lte("next_check_at", now)
    .order("quality_score", { ascending: true })
    .limit(limit);

  if (!dueData || dueData.length === 0) {
    // Fallback: just get lowest-scored
    const { data: fallback } = await supabase
      .from("profile_quality")
      .select("company_id")
      .order("quality_score", { ascending: true })
      .limit(limit);

    if (!fallback || fallback.length === 0) return [];

    const ids = fallback.map((d: any) => d.company_id);
    const { data: companies } = await supabase
      .from("companies")
      .select("id, slug, name, description, website, logo_url, country, city, founded, categories, ticker, valuation, profile_quality(*)")
      .in("id", ids);

    return ((companies || []) as Company[]).sort((a, b) => {
      const sa = a.profile_quality?.[0]?.quality_score || 0;
      const sb = b.profile_quality?.[0]?.quality_score || 0;
      return sa - sb;
    });
  }

  const ids = dueData.map((d: any) => d.company_id);
  const { data: companies } = await supabase
    .from("companies")
    .select("id, slug, name, description, website, logo_url, country, city, founded, categories, ticker, valuation, profile_quality(*)")
    .in("id", ids);

  return ((companies || []) as Company[]).sort((a, b) => {
    const sa = a.profile_quality?.[0]?.quality_score || 0;
    const sb = b.profile_quality?.[0]?.quality_score || 0;
    return sa - sb;
  });
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const companies = await getCompaniesToImprove(BATCH_SIZE);

  if (companies.length === 0) {
    console.log("No companies to process. All up to date!");
    return;
  }

  console.log(`\nCIA Agent: Processing ${companies.length} companies (mode: ${MODE})\n`);
  console.log("─".repeat(60));

  let improved = 0;
  let failed = 0;
  let totalOldScore = 0;
  let totalNewScore = 0;
  const allIssues: Record<string, number> = {};

  for (const company of companies) {
    try {
      const result = await improveCompanyProfile(company);
      if (result.improved) improved++;
      totalOldScore += result.oldScore;
      totalNewScore += result.newScore;
    } catch (err: any) {
      console.error(`\n  FAILED ${company.name}: ${err.message}`);
      failed++;
    }
    // Rate limit: 2 second delay between companies
    await sleep(2000);
  }

  // Summary
  console.log("\n" + "─".repeat(60));
  console.log("\nCIA Agent — Run Summary");
  console.log("─".repeat(60));
  console.log(`  Companies processed:  ${companies.length}`);
  console.log(`  Improved:             ${improved}`);
  console.log(`  Failed:               ${failed}`);
  console.log(`  Avg score before:     ${(totalOldScore / companies.length).toFixed(1)}`);
  console.log(`  Avg score after:      ${(totalNewScore / companies.length).toFixed(1)}`);

  // Fetch overall distribution (count via SQL-like aggregation)
  const { count: totalCount } = await supabase
    .from("profile_quality")
    .select("*", { count: "exact", head: true });
  const { count: lowCount } = await supabase
    .from("profile_quality")
    .select("*", { count: "exact", head: true })
    .lt("quality_score", 3);
  const { count: highCount } = await supabase
    .from("profile_quality")
    .select("*", { count: "exact", head: true })
    .gte("quality_score", 7);
  const midCount = (totalCount || 0) - (lowCount || 0) - (highCount || 0);
  const dist = totalCount ? [{ low: lowCount, mid: midCount, high: highCount }] : null;

  if (dist) {
    console.log(`\n  Overall distribution (${totalCount} total):`);
    console.log(`    Low (0-3):   ${lowCount}`);
    console.log(`    Mid (3-7):   ${midCount}`);
    console.log(`    High (7-10): ${highCount}`);
  }
}

main().catch(console.error);
