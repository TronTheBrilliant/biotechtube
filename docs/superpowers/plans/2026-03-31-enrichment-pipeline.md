# Enrichment Pipeline Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone script that fills 9,978 empty company profiles with AI-generated expert reports in two passes: a fast bulk pass (DeepSeek) and a quality pass (Spider + Claude Haiku).

**Architecture:** Single entry-point script (`scripts/enrichment-pipeline.ts`) with two modes (`--pass1`, `--pass2`). Uses parallel workers (10 for Pass 1, 8 for Pass 2), direct Supabase + AI API calls (no Next.js server needed), resume support via progress file, and cost guardrails. A shared scoring utility is extracted from `scripts/cia-agent.ts` for reuse.

**Tech Stack:** TypeScript (tsx), Supabase JS client, OpenAI SDK (DeepSeek endpoint), Anthropic SDK (Claude Haiku 4.5), Spider.cloud REST API, dotenv

**Spec:** `docs/superpowers/specs/2026-03-31-enrichment-pipeline-design.md`

---

## File Structure

```
scripts/
  enrichment-pipeline.ts          # Main script — CLI, orchestration, workers
  lib/
    scoring.ts                    # calculateScore() extracted from cia-agent.ts
    company-matcher.ts            # (existing, unchanged)
```

**Why one main file:** All existing scripts in this codebase are single files (cia-agent.ts=629 lines, route.ts=444 lines). Splitting the pipeline into multiple files would break convention. The only extraction is `calculateScore()` which the spec explicitly requires as a shared utility.

**DB schema notes (verified against live DB):**
- `company_reports` column is `report_slug` (not `slug`)
- `companies` table has NO `employees` or `exchange` columns — those fields only exist in `company_reports`
- Backfill to `companies` is limited to: `description`, `city`, `founded`, `ticker`
- `profile_quality` PK is `company_id`, supports upsert via `onConflict: 'company_id'`

---

## Chunk 1: Foundation

### Task 1: Extract `calculateScore` to shared utility

**Files:**
- Create: `scripts/lib/scoring.ts`
- Modify: `scripts/cia-agent.ts:278-346` (import from shared utility instead of inline)

- [ ] **Step 1: Create `scripts/lib/scoring.ts`**

Extract the pure scoring function from cia-agent.ts. This function takes company data and returns a score + issues list. No DB calls, no side effects.

```typescript
/**
 * Shared profile quality scoring logic.
 * Extracted from cia-agent.ts for reuse by enrichment-pipeline.ts.
 */

export interface ScoreInput {
  description: string | null;
  website: string | null;
  logo_url: string | null;
  country: string | null;
  city: string | null;
  founded: number | null;
  categories: string[] | null;
  ticker: string | null;
  websiteReachable: boolean;
}

export interface ScoreResult {
  score: number;
  issues: string[];
}

export function calculateScore(input: ScoreInput): ScoreResult {
  let score = 0;
  const issues: string[] = [];

  // Description quality (0-3)
  if (input.description && input.description.length > 200) {
    score += 2;
  } else if (input.description && input.description.length > 50) {
    score += 1;
    issues.push("short_description");
  } else {
    issues.push("missing_description");
  }
  if (input.description && input.description.length > 500) score += 1;

  // Website (0-1.5)
  if (input.website) {
    score += 0.5;
  } else {
    issues.push("missing_website");
  }
  if (input.websiteReachable) {
    score += 1;
  } else if (input.website) {
    issues.push("dead_website");
  }

  // Logo (0-0.5)
  if (input.logo_url) {
    score += 0.5;
  } else {
    issues.push("missing_logo");
  }

  // Location (0-1)
  if (input.country) {
    score += 0.5;
  } else {
    issues.push("missing_country");
  }
  if (input.city) {
    score += 0.5;
  } else {
    issues.push("missing_city");
  }

  // Founded (0-0.5)
  if (input.founded) {
    score += 0.5;
  } else {
    issues.push("missing_founded");
  }

  // Categories (0-0.5)
  if (input.categories && input.categories.length > 0) {
    score += 0.5;
  } else {
    issues.push("missing_categories");
  }

  // Financial data (0-0.5)
  if (input.ticker) score += 0.5;

  return { score: Math.min(score, 10), issues };
}
```

- [ ] **Step 2: Update cia-agent.ts to import from shared utility**

Replace the inline `calculateScore` function in cia-agent.ts (lines 278-346) with an import:

```typescript
// At top of file, add:
import { calculateScore as sharedCalculateScore, ScoreInput } from "./lib/scoring";

// Replace the calculateScore function (lines 278-346) with:
function calculateScore(
  company: Company,
  research: ResearchResults,
  _verification: Verification
): { score: number; issues: string[] } {
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
```

- [ ] **Step 3: Verify cia-agent still compiles**

Run: `cd /Users/trondmariusbrilskattum/Desktop/Biotechtube/biotechtube && npx tsx --no-warnings scripts/cia-agent.ts --company eli-lilly 2>&1 | head -5`

Expected: Should start processing (or show "Company not found" if slug doesn't match). No TypeScript compilation errors.

- [ ] **Step 4: Commit**

```bash
git add scripts/lib/scoring.ts scripts/cia-agent.ts
git commit -m "refactor: extract calculateScore to shared utility for enrichment pipeline reuse"
```

---

### Task 2: Create enrichment-pipeline.ts skeleton

**Files:**
- Create: `scripts/enrichment-pipeline.ts`

This task creates the full file structure with all imports, types, config, CLI parsing, and placeholder functions that will be filled in subsequent tasks.

- [ ] **Step 1: Create the script skeleton**

```typescript
#!/usr/bin/env npx tsx
/**
 * Enrichment Pipeline — Fill all company profiles with expert reports.
 *
 * Two-pass approach:
 *   Pass 1 (--pass1): DeepSeek bulk — 9,978 companies without reports
 *   Pass 2 (--pass2): Spider + Claude Haiku — top ~1,500 by value
 *
 * Usage:
 *   npx tsx scripts/enrichment-pipeline.ts --pass1              # Full bulk run
 *   npx tsx scripts/enrichment-pipeline.ts --pass2              # Quality tier
 *   npx tsx scripts/enrichment-pipeline.ts --pass1 --limit 50   # Test run
 *   npx tsx scripts/enrichment-pipeline.ts --pass2 --limit 10   # Test run
 *   npx tsx scripts/enrichment-pipeline.ts --retry-failures     # Retry failed
 *   npx tsx scripts/enrichment-pipeline.ts --dry-run --pass1    # Preview only
 */

import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { calculateScore } from "./lib/scoring";

// ── Environment & Clients ─────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const SPIDER_API_KEY = process.env.SPIDER_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function getDeepSeek(): OpenAI {
  if (!DEEPSEEK_API_KEY) throw new Error("Missing DEEPSEEK_API_KEY");
  return new OpenAI({ baseURL: "https://api.deepseek.com", apiKey: DEEPSEEK_API_KEY });
}

function getAnthropic(): Anthropic {
  if (!ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");
  return new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

// ── Constants ─────────────────────────────────────────────────────────────

const PASS1_WORKERS = 10;
const PASS2_WORKERS = 8;
const PASS1_DELAY_MS = 2000;
const PASS2_DELAY_MS = 1000;
const PASS1_CONTENT_CAP = 6000;
const PASS2_CONTENT_CAP = 15000;
const PROGRESS_FILE = resolve(__dirname, ".enrichment-progress.json");
const FAILURES_FILE = resolve(__dirname, ".enrichment-failures.json");

// DeepSeek pricing per million tokens
const DEEPSEEK_INPUT_COST_PER_M = 0.14;
const DEEPSEEK_OUTPUT_COST_PER_M = 0.28;
// Haiku pricing per million tokens
const HAIKU_INPUT_COST_PER_M = 1.0;
const HAIKU_OUTPUT_COST_PER_M = 5.0;

// ── Types ─────────────────────────────────────────────────────────────────

interface CompanyRow {
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
  stage: string | null;
  total_raised: number | null;
}

interface PriceContext {
  latest_market_cap: number | null;
  high_52w: number | null;
  low_52w: number | null;
}

interface ReportJSON {
  description?: string;
  summary?: string;
  deep_report?: string;
  founded?: number;
  headquarters_city?: string;
  headquarters_country?: string;
  employee_estimate?: string;
  business_model?: string;
  revenue_status?: string;
  stage?: string;
  company_type?: string;
  ticker?: string;
  exchange?: string;
  therapeutic_areas?: string[];
  technology_platform?: string;
  pipeline_programs?: Array<{ name: string; indication: string; phase: string; status: string; trial_id?: string }>;
  key_people?: Array<{ name: string; role: string }>;
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
  funding_mentions?: string[];
  total_raised_estimate?: number;
  investors?: string[];
  partners?: string[];
  opportunities?: string;
  risks?: string;
  competitive_landscape?: string;
}

interface ProgressData {
  pass: "pass1" | "pass2";
  completed: string[];  // company IDs (serialized as array, loaded as Set)
  failed: string[];
  startedAt: string;
  lastUpdatedAt: string;
  totalProcessed: number;
  totalSucceeded: number;
  totalFailed: number;
  estimatedCostUSD: number;
}

interface ProgressState extends Omit<ProgressData, "completed"> {
  completed: Set<string>;  // O(1) lookup for 10K+ companies
}

interface FailureRecord {
  companyId: string;
  slug: string;
  name: string;
  error: string;
  pass: "pass1" | "pass2";
  timestamp: string;
  retryCount: number;
}

// ── CLI Parsing ───────────────────────────────────────────────────────────

interface CLIOptions {
  pass1: boolean;
  pass2: boolean;
  retryFailures: boolean;
  dryRun: boolean;
  limit: number;
  budget: number;  // USD hard-stop
}

function parseCLI(): CLIOptions {
  const args = process.argv.slice(2);
  const opts: CLIOptions = {
    pass1: false,
    pass2: false,
    retryFailures: false,
    dryRun: false,
    limit: 0,     // 0 = no limit
    budget: 0,    // 0 = no budget limit
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--pass1": opts.pass1 = true; break;
      case "--pass2": opts.pass2 = true; break;
      case "--retry-failures": opts.retryFailures = true; break;
      case "--dry-run": opts.dryRun = true; break;
      case "--limit":
        opts.limit = parseInt(args[++i], 10) || 0;
        break;
      case "--budget":
        opts.budget = parseFloat(args[++i]) || 0;
        break;
    }
  }

  if (!opts.pass1 && !opts.pass2 && !opts.retryFailures) {
    console.error("Usage: npx tsx scripts/enrichment-pipeline.ts --pass1|--pass2|--retry-failures [--limit N] [--budget N] [--dry-run]");
    process.exit(1);
  }

  return opts;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token
  return Math.ceil(text.length / 4);
}

// ── Progress Tracking ─────────────────────────────────────────────────────

function loadProgress(pass: "pass1" | "pass2"): ProgressState {
  if (existsSync(PROGRESS_FILE)) {
    try {
      const data = JSON.parse(readFileSync(PROGRESS_FILE, "utf-8")) as ProgressData;
      if (data.pass === pass) {
        return { ...data, completed: new Set(data.completed) };
      }
    } catch { /* start fresh */ }
  }
  return {
    pass,
    completed: new Set<string>(),
    failed: [],
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    totalProcessed: 0,
    totalSucceeded: 0,
    totalFailed: 0,
    estimatedCostUSD: 0,
  };
}

function saveProgress(state: ProgressState): void {
  state.lastUpdatedAt = new Date().toISOString();
  // Serialize Set back to array for JSON
  const data: ProgressData = { ...state, completed: Array.from(state.completed) };
  writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
}

function loadFailures(): FailureRecord[] {
  if (existsSync(FAILURES_FILE)) {
    try {
      return JSON.parse(readFileSync(FAILURES_FILE, "utf-8"));
    } catch { /* start fresh */ }
  }
  return [];
}

function saveFailures(failures: FailureRecord[]): void {
  writeFileSync(FAILURES_FILE, JSON.stringify(failures, null, 2));
}

function recordFailure(
  failures: FailureRecord[],
  company: CompanyRow,
  error: string,
  pass: "pass1" | "pass2"
): void {
  const existing = failures.find((f) => f.companyId === company.id);
  if (existing) {
    existing.error = error;
    existing.timestamp = new Date().toISOString();
    existing.retryCount++;
  } else {
    failures.push({
      companyId: company.id,
      slug: company.slug,
      name: company.name,
      error,
      pass,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    });
  }
  saveFailures(failures);
}

// ── JSON Parsing (with fallback chain) ────────────────────────────────────

function parseAIResponse(text: string): ReportJSON {
  // Try 1: Direct JSON parse
  try {
    return JSON.parse(text);
  } catch { /* continue */ }

  // Try 2: Extract from markdown code fence
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch { /* continue */ }
  }

  // Try 3: Find JSON object boundaries
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch { /* continue */ }
  }

  throw new Error("Failed to parse AI response as JSON");
}

// ── HTML to Text (reused from route.ts) ───────────────────────────────────

function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// ── Website Scraping (fetch-based, for Pass 1) ───────────────────────────

function extractLinks(html: string, baseUrl: string): string[] {
  const linkRegex = /href=["']([^"']+)["']/gi;
  const links: string[] = [];
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    if (href.startsWith("/") || href.startsWith(baseUrl)) {
      links.push(href.startsWith("/") ? `${baseUrl}${href}` : href);
    }
  }
  return Array.from(new Set(links));
}

function findRelevantPages(links: string[]): string[] {
  const keywords = [
    /about/i, /team/i, /leadership/i, /management/i, /people/i,
    /pipeline/i, /science/i, /research/i, /programs/i, /clinical/i,
    /therapeutic/i, /technology/i, /platform/i, /investors/i,
    /who-we-are/i, /our-team/i, /our-science/i, /our-pipeline/i,
    /board/i, /executives/i, /company/i,
  ];
  return links.filter((url) => keywords.some((kw) => kw.test(url))).slice(0, 5);
}

async function scrapePage(url: string, maxChars: number): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BiotechTubeBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    return htmlToText(html).slice(0, maxChars);
  } catch {
    return "";
  }
}

async function scrapeWebsiteFetch(
  website: string,
  contentCap: number
): Promise<{ content: string; pagesScraped: string[] }> {
  if (!website) return { content: "", pagesScraped: [] };

  const baseUrl = (website.startsWith("http") ? website : `https://${website}`).replace(/\/$/, "");
  const pagesScraped: string[] = [baseUrl];

  try {
    const res = await fetch(baseUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BiotechTubeBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { content: "", pagesScraped: [] };

    const html = await res.text();
    const homepageText = htmlToText(html).slice(0, contentCap);

    const links = extractLinks(html, baseUrl);
    const relevantPages = findRelevantPages(links);

    const subpageResults = await Promise.all(
      relevantPages.map(async (url) => {
        const text = await scrapePage(url, 4000);
        if (text.length > 100) {
          pagesScraped.push(url);
          return `\n\n--- PAGE: ${url} ---\n${text}`;
        }
        return "";
      })
    );

    const allContent = `--- HOMEPAGE ---\n${homepageText}${subpageResults.join("")}`;
    return { content: allContent.slice(0, contentCap), pagesScraped };
  } catch {
    return { content: "", pagesScraped: [] };
  }
}

// ── Spider.cloud Scraping (for Pass 2) ────────────────────────────────────

async function scrapeWithSpider(url: string): Promise<string> {
  if (!SPIDER_API_KEY) throw new Error("Missing SPIDER_API_KEY");

  const response = await fetch("https://api.spider.cloud/crawl", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SPIDER_API_KEY}`,
    },
    body: JSON.stringify({
      url,
      limit: 5,
      return_format: "markdown",
      request_timeout: 15,
    }),
  });

  if (!response.ok) {
    throw new Error(`Spider API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Spider returns an array of page results
  if (Array.isArray(data)) {
    return data
      .map((page: { url?: string; content?: string }) =>
        `--- PAGE: ${page.url || "unknown"} ---\n${page.content || ""}`
      )
      .join("\n\n");
  }

  return "";
}

// ── DB: Fetch Companies ───────────────────────────────────────────────────

async function fetchCompaniesForPass1(limit: number): Promise<CompanyRow[]> {
  // Get all company IDs that already have reports
  const existingReportIds = new Set<string>();
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const { data } = await supabase
      .from("company_reports")
      .select("company_id")
      .range(offset, offset + pageSize - 1);
    if (!data || data.length === 0) break;
    for (const r of data) existingReportIds.add(r.company_id);
    offset += pageSize;
    if (data.length < pageSize) break;
  }

  console.log(`  Found ${existingReportIds.size} companies with existing reports (skipping)`);

  // Fetch all companies, paginated
  const allCompanies: CompanyRow[] = [];
  offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("companies")
      .select("id, slug, name, description, website, logo_url, country, city, founded, categories, ticker, valuation, stage, total_raised")
      .order("valuation", { ascending: false, nullsFirst: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`DB error: ${error.message}`);
    if (!data || data.length === 0) break;
    allCompanies.push(...(data as CompanyRow[]));
    offset += pageSize;
    if (data.length < pageSize) break;
  }

  // Filter to companies without reports
  const needsReport = allCompanies.filter((c) => !existingReportIds.has(c.id));
  console.log(`  ${needsReport.length} companies need reports`);

  return limit > 0 ? needsReport.slice(0, limit) : needsReport;
}

async function fetchCompaniesForPass2(limit: number): Promise<CompanyRow[]> {
  // Pass 2 targets: all public (with ticker) + top private by valuation
  const allCompanies: CompanyRow[] = [];
  let offset = 0;
  const pageSize = 1000;

  // First: all public companies (ticker IS NOT NULL), ordered by valuation DESC
  while (true) {
    const { data, error } = await supabase
      .from("companies")
      .select("id, slug, name, description, website, logo_url, country, city, founded, categories, ticker, valuation, stage, total_raised")
      .not("ticker", "is", null)
      .order("valuation", { ascending: false, nullsFirst: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`DB error: ${error.message}`);
    if (!data || data.length === 0) break;
    allCompanies.push(...(data as CompanyRow[]));
    offset += pageSize;
    if (data.length < pageSize) break;
  }

  console.log(`  ${allCompanies.length} public companies (with ticker)`);

  // Then: top private by valuation (where valuation IS NOT NULL and ticker IS NULL)
  offset = 0;
  const privateCompanies: CompanyRow[] = [];
  while (true) {
    const { data, error } = await supabase
      .from("companies")
      .select("id, slug, name, description, website, logo_url, country, city, founded, categories, ticker, valuation, stage, total_raised")
      .is("ticker", null)
      .not("valuation", "is", null)
      .order("valuation", { ascending: false, nullsFirst: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`DB error: ${error.message}`);
    if (!data || data.length === 0) break;
    privateCompanies.push(...(data as CompanyRow[]));
    offset += pageSize;
    if (data.length < pageSize) break;
  }

  console.log(`  ${privateCompanies.length} private companies with valuation`);

  const combined = [...allCompanies, ...privateCompanies];
  return limit > 0 ? combined.slice(0, limit) : combined;
}

async function fetchPriceContext(companyId: string): Promise<PriceContext> {
  const { data } = await supabase
    .from("company_price_history")
    .select("close, market_cap")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(260); // ~1 year of trading days

  if (!data || data.length === 0) {
    return { latest_market_cap: null, high_52w: null, low_52w: null };
  }

  const closes = data.map((r: { close: number }) => r.close).filter(Boolean);
  return {
    latest_market_cap: data[0].market_cap || null,
    high_52w: closes.length > 0 ? Math.max(...closes) : null,
    low_52w: closes.length > 0 ? Math.min(...closes) : null,
  };
}

// ── Prompts ───────────────────────────────────────────────────────────────

function buildPass1Prompt(company: CompanyRow, websiteContent: string, priceCtx: PriceContext): string {
  const context = [
    `Company: ${company.name}`,
    company.country ? `Country: ${company.country}` : null,
    company.city ? `City: ${company.city}` : null,
    company.founded ? `Founded: ${company.founded}` : null,
    company.categories?.length ? `Sectors: ${company.categories.join(", ")}` : null,
    company.ticker ? `Ticker: ${company.ticker}` : null,
    company.valuation ? `Valuation: $${(company.valuation / 1e9).toFixed(2)}B` : null,
    company.description ? `Current description: ${company.description}` : null,
    company.website ? `Website: ${company.website}` : null,
    priceCtx.latest_market_cap ? `Market cap: $${(priceCtx.latest_market_cap / 1e9).toFixed(2)}B` : null,
    priceCtx.high_52w ? `52-week high: $${priceCtx.high_52w.toFixed(2)}` : null,
    priceCtx.low_52w ? `52-week low: $${priceCtx.low_52w.toFixed(2)}` : null,
  ].filter(Boolean).join("\n");

  return `You are a biotech analyst. Create a company intelligence report for this company.

## Company Data
${context}

## Website Content
${websiteContent || "No website content available."}

Return ONLY valid JSON with these fields:
{
  "description": "2-3 sentence company description",
  "summary": "3-4 sentence executive summary",
  "deep_report": "800-1200 word markdown report with sections: ## Company Overview, ## Technology Platform, ## Pipeline & Programs, ## Market Opportunity, ## Leadership, ## Financial Position, ## Key Risks, ## Outlook",
  "founded": year or null,
  "headquarters_city": "city" or null,
  "headquarters_country": "country" or null,
  "employee_estimate": "range" or null,
  "business_model": "Therapeutics|Platform|Services|Diagnostics" or null,
  "revenue_status": "Pre-revenue|Early Revenue|Revenue Generating" or null,
  "stage": "Pre-clinical|Phase 1|Phase 2|Phase 3|Approved|Commercial" or null,
  "company_type": "Public|Private" or null,
  "ticker": "symbol" or null,
  "exchange": "exchange name" or null,
  "therapeutic_areas": ["area1"] or null,
  "technology_platform": "description" or null,
  "pipeline_programs": [{"name":"","indication":"","phase":"","status":"Active"}] or null,
  "key_people": [{"name":"","role":""}] or null,
  "investors": ["name"] or null,
  "partners": ["name"] or null,
  "opportunities": "2-3 sentences" or null,
  "risks": "2-3 sentences" or null,
  "competitive_landscape": "2-3 sentences" or null
}

RULES: Return ONLY valid JSON. Be factual. No markdown fences.`;
}

function buildPass2Prompt(
  company: CompanyRow,
  spiderContent: string,
  priceCtx: PriceContext,
  existingReport: ReportJSON | null,
  sectorRank: string | null
): string {
  const context = [
    `Company: ${company.name}`,
    company.country ? `Country: ${company.country}` : null,
    company.city ? `City: ${company.city}` : null,
    company.founded ? `Founded: ${company.founded}` : null,
    company.categories?.length ? `Sectors: ${company.categories.join(", ")}` : null,
    company.ticker ? `Ticker: ${company.ticker} (${company.stage || "Public"})` : null,
    company.valuation ? `Valuation: $${(company.valuation / 1e9).toFixed(2)}B` : null,
    company.description ? `Current description: ${company.description}` : null,
    company.website ? `Website: ${company.website}` : null,
    priceCtx.latest_market_cap ? `Market cap: $${(priceCtx.latest_market_cap / 1e9).toFixed(2)}B` : null,
    priceCtx.high_52w ? `52-week high: $${priceCtx.high_52w.toFixed(2)}` : null,
    priceCtx.low_52w ? `52-week low: $${priceCtx.low_52w.toFixed(2)}` : null,
    sectorRank,
  ].filter(Boolean).join("\n");

  const existingSection = existingReport?.deep_report
    ? `\n## Existing Report (improve upon this)\n${existingReport.deep_report.slice(0, 2000)}`
    : "";

  return `You are a senior biotech analyst writing an authoritative company intelligence report.

## Company Data
${context}
${existingSection}

## Website Content (JS-rendered)
${spiderContent || "No website content available."}

Write a comprehensive, engaging analyst report. Return ONLY valid JSON:
{
  "description": "Compelling 2-3 sentence description for the company profile page",
  "summary": "3-4 sentence executive summary covering mission, achievements, strategy",
  "deep_report": "1500-2000 word markdown report. Use ## headings, bullet points, markdown tables for pipeline data. Sections: ## Company Overview, ## Technology Platform, ## Pipeline & Programs (table: Program | Indication | Phase | Status), ## Market Opportunity, ## Competitive Landscape, ## Leadership & Team, ## Financial Position, ## Key Risks, ## Outlook",
  "founded": year or null,
  "headquarters_city": "city" or null,
  "headquarters_country": "country" or null,
  "employee_estimate": "range" or null,
  "business_model": "Therapeutics|Platform|Services|Diagnostics" or null,
  "revenue_status": "Pre-revenue|Early Revenue|Revenue Generating" or null,
  "stage": "most advanced stage" or null,
  "company_type": "Public|Private" or null,
  "ticker": "symbol" or null,
  "exchange": "exchange" or null,
  "therapeutic_areas": ["area1", "area2"] or null,
  "technology_platform": "1-2 sentence description" or null,
  "pipeline_programs": [{"name":"Drug","indication":"Disease","phase":"Phase X","status":"Active","trial_id":"NCT..."}] or null,
  "key_people": [{"name":"Full Name","role":"Title"}] or null,
  "contact_email": "email" or null,
  "contact_phone": "phone" or null,
  "contact_address": "address" or null,
  "funding_mentions": ["funding event descriptions"] or null,
  "total_raised_estimate": number_usd or null,
  "investors": ["investor names"] or null,
  "partners": ["partner names"] or null,
  "opportunities": "2-3 sentences" or null,
  "risks": "2-3 sentences" or null,
  "competitive_landscape": "2-3 sentences" or null
}

RULES: Return ONLY valid JSON. Be factual and authoritative. Extract ALL people and pipeline programs you can find. No markdown fences around the JSON.`;
}

// ── AI Callers with Retry ─────────────────────────────────────────────────

async function callDeepSeek(prompt: string, retries: number = 3): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const client = getDeepSeek();
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
        temperature: 0.3,
      });
      return {
        text: completion.choices[0]?.message?.content || "",
        inputTokens: completion.usage?.prompt_tokens || estimateTokens(prompt),
        outputTokens: completion.usage?.completion_tokens || 0,
      };
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 429 || status === 529) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        console.log(`    Rate limited (${status}), retrying in ${delay / 1000}s...`);
        await sleep(delay);
        continue;
      }
      if (attempt === retries) throw err;
      await sleep(1000 * attempt);
    }
  }
  throw new Error("DeepSeek call failed after retries");
}

async function callHaiku(prompt: string, retries: number = 3): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const client = getAnthropic();
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });
      const text = message.content[0].type === "text" ? message.content[0].text : "";
      return {
        text,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      };
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 429 || status === 529) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        console.log(`    Rate limited (${status}), retrying in ${delay / 1000}s...`);
        await sleep(delay);
        continue;
      }
      if (attempt === retries) throw err;
      await sleep(1000 * attempt);
    }
  }
  throw new Error("Haiku call failed after retries");
}

// ── DB Writers ────────────────────────────────────────────────────────────

async function writeReport(
  company: CompanyRow,
  report: ReportJSON,
  pagesScraped: string[],
  sourceTag: string
): Promise<void> {
  const now = new Date().toISOString();

  // Tag pages_scraped with source
  const taggedPages = [sourceTag, ...pagesScraped];

  // 1. Delete existing report, then insert new one
  await supabase.from("company_reports").delete().eq("company_id", company.id);

  const reportRow: Record<string, unknown> = {
    company_id: company.id,
    report_slug: company.slug,
    summary: report.summary || null,
    deep_report: report.deep_report || null,
    founded: report.founded || null,
    headquarters_city: report.headquarters_city || null,
    headquarters_country: report.headquarters_country || null,
    employee_estimate: report.employee_estimate || null,
    business_model: report.business_model || null,
    revenue_status: report.revenue_status || null,
    stage: report.stage || null,
    company_type: report.company_type || null,
    ticker: report.ticker || null,
    exchange: report.exchange || null,
    therapeutic_areas: report.therapeutic_areas || null,
    technology_platform: report.technology_platform || null,
    pipeline_programs: report.pipeline_programs || null,
    key_people: report.key_people || null,
    contact_email: report.contact_email || null,
    contact_phone: report.contact_phone || null,
    contact_address: report.contact_address || null,
    funding_mentions: report.funding_mentions || null,
    total_raised_estimate: report.total_raised_estimate || null,
    investors: report.investors || null,
    partners: report.partners || null,
    opportunities: report.opportunities || null,
    risks: report.risks || null,
    competitive_landscape: report.competitive_landscape || null,
    pages_scraped: taggedPages.length > 0 ? taggedPages : null,
    scraped_at: now,
    analyzed_at: now,
  };

  const { error } = await supabase.from("company_reports").insert(reportRow);
  if (error) throw new Error(`Report insert failed: ${error.message}`);

  // 2. Backfill companies table (only missing/short fields)
  const companyUpdate: Record<string, unknown> = {};

  if (report.description && (!company.description || company.description.length < 200)) {
    companyUpdate.description = report.description;
  }
  if (report.headquarters_city && !company.city) {
    companyUpdate.city = report.headquarters_city;
  }
  if (report.founded && !company.founded) {
    companyUpdate.founded = report.founded;
  }
  if (report.ticker && !company.ticker) {
    companyUpdate.ticker = report.ticker;
  }

  if (Object.keys(companyUpdate).length > 0) {
    await supabase.from("companies").update(companyUpdate).eq("id", company.id);
  }

  // 3. Update profile_quality score
  const updatedCompany = { ...company, ...companyUpdate };
  const scoreResult = calculateScore({
    description: (updatedCompany.description as string) || null,
    website: company.website,
    logo_url: company.logo_url,
    country: (updatedCompany.city ? company.country : company.country) || null,
    city: (updatedCompany.city as string) || company.city,
    founded: (updatedCompany.founded as number) || company.founded,
    categories: company.categories,
    ticker: (updatedCompany.ticker as string) || company.ticker,
    websiteReachable: pagesScraped.length > 0,
  });

  await supabase.from("profile_quality").upsert(
    {
      company_id: company.id,
      quality_score: scoreResult.score,
      last_checked_at: now,
      issues: scoreResult.issues,
      website_verified: pagesScraped.length > 0,
      description_source: sourceTag.includes("pass2") ? "pass2_haiku" : "pass1_deepseek",
      updated_at: now,
    },
    { onConflict: "company_id" }
  );
}

// ── Process Single Company ────────────────────────────────────────────────

async function processCompanyPass1(
  company: CompanyRow
): Promise<{ costUSD: number }> {
  // 1. Scrape website
  const { content, pagesScraped } = await scrapeWebsiteFetch(
    company.website || "",
    PASS1_CONTENT_CAP
  );

  // 2. Fetch price context for public companies
  const priceCtx = company.ticker ? await fetchPriceContext(company.id) : { latest_market_cap: null, high_52w: null, low_52w: null };

  // 3. Build prompt and call DeepSeek
  const prompt = buildPass1Prompt(company, content, priceCtx);
  const { text, inputTokens, outputTokens } = await callDeepSeek(prompt);

  // 4. Parse response
  const report = parseAIResponse(text);

  // 5. Validate required fields
  if (!report.summary && !report.deep_report) {
    throw new Error("AI response missing both summary and deep_report");
  }

  // 6. Write to DB
  await writeReport(company, report, pagesScraped, "source:pass1_deepseek");

  // 7. Calculate cost
  const costUSD =
    (inputTokens / 1_000_000) * DEEPSEEK_INPUT_COST_PER_M +
    (outputTokens / 1_000_000) * DEEPSEEK_OUTPUT_COST_PER_M;

  return { costUSD };
}

async function processCompanyPass2(
  company: CompanyRow
): Promise<{ costUSD: number }> {
  // 1. Scrape with Spider (fall back to fetch)
  let spiderContent = "";
  let pagesScraped: string[] = [];

  if (company.website) {
    try {
      spiderContent = await scrapeWithSpider(company.website);
      pagesScraped = [company.website];
    } catch (err: unknown) {
      console.log(`    Spider failed, falling back to fetch: ${(err as Error).message}`);
      const result = await scrapeWebsiteFetch(company.website, PASS2_CONTENT_CAP);
      spiderContent = result.content;
      pagesScraped = result.pagesScraped;
    }
  }

  // Cap Spider content
  spiderContent = spiderContent.slice(0, PASS2_CONTENT_CAP);

  // 2. Fetch price context
  const priceCtx = company.ticker ? await fetchPriceContext(company.id) : { latest_market_cap: null, high_52w: null, low_52w: null };

  // 3. Fetch existing report (if Pass 1 created one)
  let existingReport: ReportJSON | null = null;
  const { data: existingRow } = await supabase
    .from("company_reports")
    .select("deep_report, summary")
    .eq("company_id", company.id)
    .limit(1)
    .maybeSingle();

  if (existingRow) {
    existingReport = existingRow as ReportJSON;
  }

  // 4. Get sector ranking context
  let sectorRank: string | null = null;
  if (company.ticker && company.categories?.length) {
    const sector = company.categories[0];
    const { count } = await supabase
      .from("companies")
      .select("*", { count: "exact", head: true })
      .contains("categories", [sector])
      .not("ticker", "is", null);
    if (count) {
      sectorRank = `Sector context: one of ${count} public companies in ${sector}`;
    }
  }

  // 5. Build prompt and call Haiku
  const prompt = buildPass2Prompt(company, spiderContent, priceCtx, existingReport, sectorRank);
  const { text, inputTokens, outputTokens } = await callHaiku(prompt);

  // 6. Parse and validate
  const report = parseAIResponse(text);
  if (!report.summary && !report.deep_report) {
    throw new Error("AI response missing both summary and deep_report");
  }

  // 7. Write to DB (overwrites Pass 1 report)
  await writeReport(company, report, pagesScraped, "source:pass2_haiku");

  // 8. Calculate cost
  const costUSD =
    (inputTokens / 1_000_000) * HAIKU_INPUT_COST_PER_M +
    (outputTokens / 1_000_000) * HAIKU_OUTPUT_COST_PER_M;

  return { costUSD };
}

// ── Worker Orchestration ──────────────────────────────────────────────────

async function runWorker(
  workerId: number,
  companies: CompanyRow[],
  pass: "pass1" | "pass2",
  state: ProgressState,
  failures: FailureRecord[],
  opts: CLIOptions,
  totalCount: number,
  delayMs: number
): Promise<void> {
  const processFn = pass === "pass1" ? processCompanyPass1 : processCompanyPass2;

  for (const company of companies) {
    // Check budget
    if (opts.budget > 0 && state.estimatedCostUSD >= opts.budget) {
      console.log(`  [W${workerId}] Budget limit reached (${formatCost(state.estimatedCostUSD)} / ${formatCost(opts.budget)}). Stopping.`);
      return;
    }

    // Skip already completed
    if (state.completed.has(company.id)) continue;

    state.totalProcessed++;
    const progress = `[W${workerId}] ${state.totalProcessed}/${totalCount}`;

    if (opts.dryRun) {
      console.log(`${progress} [DRY RUN] Would process: ${company.name} (${company.slug})`);
      await sleep(10);
      continue;
    }

    console.log(`${progress} Processing: ${company.name}`);

    try {
      const { costUSD } = await processFn(company);
      state.estimatedCostUSD += costUSD;
      state.totalSucceeded++;
      state.completed.add(company.id);
      console.log(`${progress}   OK (${formatCost(costUSD)}) | Total: ${formatCost(state.estimatedCostUSD)}`);
    } catch (err: unknown) {
      state.totalFailed++;
      state.failed.push(company.id);
      const msg = (err as Error).message || String(err);
      console.log(`${progress}   FAILED: ${msg.slice(0, 100)}`);
      recordFailure(failures, company, msg, pass);
    }

    // Save progress every company
    saveProgress(state);

    // Rate limit delay
    await sleep(delayMs);
  }
}

async function runPass(pass: "pass1" | "pass2", opts: CLIOptions): Promise<void> {
  const numWorkers = pass === "pass1" ? PASS1_WORKERS : PASS2_WORKERS;
  const delayMs = pass === "pass1" ? PASS1_DELAY_MS : PASS2_DELAY_MS;

  console.log(`\nEnrichment Pipeline — ${pass.toUpperCase()}`);
  console.log("=".repeat(60));
  console.log(`Workers: ${numWorkers} | Delay: ${delayMs}ms | Budget: ${opts.budget > 0 ? formatCost(opts.budget) : "unlimited"}`);
  if (opts.dryRun) console.log("*** DRY RUN — no API calls or DB writes ***");

  // Fetch companies
  console.log("\nFetching companies...");
  const companies = pass === "pass1"
    ? await fetchCompaniesForPass1(opts.limit)
    : await fetchCompaniesForPass2(opts.limit);

  if (companies.length === 0) {
    console.log("No companies to process.");
    return;
  }

  // Load progress (resume support)
  const state = loadProgress(pass);
  const failures = loadFailures();

  // Filter out already completed
  const remaining = companies.filter((c) => !state.completed.includes(c.id));
  console.log(`\nTotal: ${companies.length} | Already done: ${state.completed.size} | Remaining: ${remaining.length}\n`);

  if (remaining.length === 0) {
    console.log("All companies already processed. Use --retry-failures to retry failed ones.");
    return;
  }

  // Split across workers
  const chunks: CompanyRow[][] = Array.from({ length: numWorkers }, () => []);
  for (let i = 0; i < remaining.length; i++) {
    chunks[i % numWorkers].push(remaining[i]);
  }

  const startTime = Date.now();

  // Launch workers
  await Promise.all(
    chunks.map((chunk, i) => {
      if (chunk.length === 0) return Promise.resolve();
      return runWorker(i + 1, chunk, pass, state, failures, opts, remaining.length, delayMs);
    })
  );

  // Summary
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log("\n" + "=".repeat(60));
  console.log(`${pass.toUpperCase()} Complete`);
  console.log("=".repeat(60));
  console.log(`  Processed:  ${state.totalSucceeded + state.totalFailed}`);
  console.log(`  Succeeded:  ${state.totalSucceeded}`);
  console.log(`  Failed:     ${state.totalFailed}`);
  console.log(`  Cost:       ${formatCost(state.estimatedCostUSD)}`);
  console.log(`  Time:       ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`);
  if (state.totalSucceeded > 0) {
    console.log(`  Speed:      ${(state.totalSucceeded / (elapsed / 60)).toFixed(1)} companies/min`);
  }
}

async function runRetryFailures(opts: CLIOptions): Promise<void> {
  const failures = loadFailures();
  if (failures.length === 0) {
    console.log("No failures to retry.");
    return;
  }

  // Filter to retryable (< 3 attempts)
  const retryable = failures.filter((f) => f.retryCount < 3);
  console.log(`\nRetrying ${retryable.length} failed companies (${failures.length - retryable.length} exceeded max retries)`);

  // Fetch company data for retryable failures
  const ids = retryable.map((f) => f.companyId);
  const companies: CompanyRow[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const { data } = await supabase
      .from("companies")
      .select("id, slug, name, description, website, logo_url, country, city, founded, categories, ticker, valuation, stage, total_raised")
      .in("id", batch);
    if (data) companies.push(...(data as CompanyRow[]));
  }

  // Process sequentially
  for (const company of companies) {
    const failure = retryable.find((f) => f.companyId === company.id)!;
    const pass = failure.pass;
    console.log(`\nRetrying: ${company.name} (${pass}, attempt ${failure.retryCount + 1})`);

    try {
      if (pass === "pass1") {
        await processCompanyPass1(company);
      } else {
        await processCompanyPass2(company);
      }
      // Remove from failures on success
      const idx = failures.findIndex((f) => f.companyId === company.id);
      if (idx !== -1) failures.splice(idx, 1);
      saveFailures(failures);
      console.log(`  OK`);
    } catch (err: unknown) {
      const msg = (err as Error).message || String(err);
      console.log(`  FAILED again: ${msg.slice(0, 100)}`);
      recordFailure(failures, company, msg, pass);
    }

    await sleep(2000);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const opts = parseCLI();

  if (opts.pass1) {
    await runPass("pass1", opts);
  } else if (opts.pass2) {
    await runPass("pass2", opts);
  } else if (opts.retryFailures) {
    await runRetryFailures(opts);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Verify the script compiles**

Run: `cd /Users/trondmariusbrilskattum/Desktop/Biotechtube/biotechtube && npx tsx --no-warnings scripts/enrichment-pipeline.ts 2>&1 | head -3`

Expected: Usage message (since no --pass1/--pass2 flag provided):
```
Usage: npx tsx scripts/enrichment-pipeline.ts --pass1|--pass2|--retry-failures [--limit N] [--budget N] [--dry-run]
```

- [ ] **Step 3: Add npm script to package.json**

Add to the `"scripts"` section in `package.json`:

```json
"enrich:pass1": "tsx scripts/enrichment-pipeline.ts --pass1",
"enrich:pass2": "tsx scripts/enrichment-pipeline.ts --pass2"
```

- [ ] **Step 4: Commit**

```bash
git add scripts/enrichment-pipeline.ts package.json
git commit -m "feat: add enrichment pipeline script for bulk company profile generation"
```

---

### Task 3: Dry-run smoke test

**Files:**
- No changes — validation only

- [ ] **Step 1: Run Pass 1 dry-run with limit 5**

Run: `cd /Users/trondmariusbrilskattum/Desktop/Biotechtube/biotechtube && npx tsx scripts/enrichment-pipeline.ts --pass1 --dry-run --limit 5`

Expected output pattern:
```
Enrichment Pipeline — PASS1
============================================================
Workers: 10 | Delay: 2000ms | Budget: unlimited
*** DRY RUN — no API calls or DB writes ***

Fetching companies...
  Found 1111 companies with existing reports (skipping)
  9978 companies need reports

Total: 5 | Already done: 0 | Remaining: 5

[W1] 1/5 [DRY RUN] Would process: <company name> (<slug>)
...
```

Verify: No API calls made, no DB writes, correct company count.

- [ ] **Step 2: Run Pass 2 dry-run with limit 5**

Run: `cd /Users/trondmariusbrilskattum/Desktop/Biotechtube/biotechtube && npx tsx scripts/enrichment-pipeline.ts --pass2 --dry-run --limit 5`

Expected: Shows public companies first, no API calls.

- [ ] **Step 3: Clean up any progress files created by dry run**

Run: `rm -f /Users/trondmariusbrilskattum/Desktop/Biotechtube/biotechtube/scripts/.enrichment-progress.json /Users/trondmariusbrilskattum/Desktop/Biotechtube/biotechtube/scripts/.enrichment-failures.json`

---

### Task 4: Live test with limit 2

**Files:**
- No changes — validation only

- [ ] **Step 1: Run Pass 1 with limit 2**

Run: `cd /Users/trondmariusbrilskattum/Desktop/Biotechtube/biotechtube && npx tsx scripts/enrichment-pipeline.ts --pass1 --limit 2`

Expected: Two companies processed successfully. Each shows:
- Website scrape result
- AI call with cost
- "OK" status

- [ ] **Step 2: Verify data in Supabase**

Check that the two companies now have reports:
```sql
SELECT cr.report_slug, cr.summary IS NOT NULL as has_summary,
       cr.deep_report IS NOT NULL as has_report,
       cr.pages_scraped[1] as source_tag
FROM company_reports cr
ORDER BY cr.analyzed_at DESC
LIMIT 2;
```

Verify: `source_tag` is `source:pass1_deepseek`, both have summary and deep_report.

- [ ] **Step 3: Verify companies table was backfilled**

Check that descriptions were updated for companies that had short ones:
```sql
SELECT c.slug, length(c.description) as desc_length, c.city, c.founded
FROM companies c
WHERE c.id IN (
  SELECT company_id FROM company_reports
  ORDER BY analyzed_at DESC LIMIT 2
);
```

- [ ] **Step 4: Clean up progress file and commit**

```bash
rm -f /Users/trondmariusbrilskattum/Desktop/Biotechtube/biotechtube/scripts/.enrichment-progress.json
rm -f /Users/trondmariusbrilskattum/Desktop/Biotechtube/biotechtube/scripts/.enrichment-failures.json
git add -A && git commit -m "test: verify enrichment pipeline with live 2-company test"
```

---

### Task 5: Run full Pass 1

**Files:**
- No changes — execution only

**IMPORTANT:** This takes ~5-8 hours and costs ~$8-10 in DeepSeek credits. Confirm with user before running.

- [ ] **Step 1: Start full Pass 1**

Run: `cd /Users/trondmariusbrilskattum/Desktop/Biotechtube/biotechtube && npx tsx scripts/enrichment-pipeline.ts --pass1 --budget 16`

The script will:
- Process ~9,978 companies
- Use 10 parallel workers
- Save progress to `.enrichment-progress.json` after each company
- Stop if estimated cost exceeds $16
- Log failures to `.enrichment-failures.json`

If interrupted, re-run the same command — it will resume from where it stopped.

- [ ] **Step 2: After completion, check results**

```sql
SELECT
  COUNT(*) as total_reports,
  COUNT(*) FILTER (WHERE pages_scraped[1] = 'source:pass1_deepseek') as pass1_reports,
  AVG(length(deep_report)) as avg_report_length
FROM company_reports;
```

- [ ] **Step 3: Retry any failures**

Run: `npx tsx scripts/enrichment-pipeline.ts --retry-failures`

---

### Task 6: Run full Pass 2

**Files:**
- No changes — execution only

**IMPORTANT:** This costs ~$10-19 in Anthropic credits. Confirm with user before running.

- [ ] **Step 1: Test Pass 2 with limit 3 first**

Run: `cd /Users/trondmariusbrilskattum/Desktop/Biotechtube/biotechtube && npx tsx scripts/enrichment-pipeline.ts --pass2 --limit 3`

Verify: Spider scraping works, Haiku responses parse correctly, reports are written.

- [ ] **Step 2: Start full Pass 2 with budget cap**

Run: `cd /Users/trondmariusbrilskattum/Desktop/Biotechtube/biotechtube && npx tsx scripts/enrichment-pipeline.ts --pass2 --budget 14`

The script will:
- Process public companies first (highest SEO value), then top private by valuation
- Use 8 parallel workers
- Stop when budget reaches $14
- Overwrite Pass 1 reports with higher-quality Haiku reports

- [ ] **Step 3: Final verification**

```sql
SELECT
  pages_scraped[1] as source,
  COUNT(*) as count,
  AVG(length(deep_report)) as avg_length
FROM company_reports
GROUP BY pages_scraped[1];
```

Expected: pass2_haiku reports should have longer deep_reports than pass1_deepseek.

- [ ] **Step 4: Add .enrichment-progress.json and .enrichment-failures.json to .gitignore**

Add to `.gitignore`:
```
scripts/.enrichment-progress.json
scripts/.enrichment-failures.json
```

```bash
git add .gitignore
git commit -m "chore: gitignore enrichment pipeline progress files"
```
