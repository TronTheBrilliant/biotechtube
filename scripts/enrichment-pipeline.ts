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
  completed: string[];
  failed: string[];
  startedAt: string;
  lastUpdatedAt: string;
  totalProcessed: number;
  totalSucceeded: number;
  totalFailed: number;
  estimatedCostUSD: number;
}

interface ProgressState extends Omit<ProgressData, "completed"> {
  completed: Set<string>;
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
  useDeepseek: boolean;
  limit: number;
  budget: number;
}

function parseCLI(): CLIOptions {
  const args = process.argv.slice(2);
  const opts: CLIOptions = {
    pass1: false,
    pass2: false,
    retryFailures: false,
    dryRun: false,
    useDeepseek: false,
    limit: 0,
    budget: 0,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--pass1": opts.pass1 = true; break;
      case "--pass2": opts.pass2 = true; break;
      case "--retry-failures": opts.retryFailures = true; break;
      case "--dry-run": opts.dryRun = true; break;
      case "--use-deepseek": opts.useDeepseek = true; break;
      case "--limit":
        opts.limit = parseInt(args[++i], 10) || 0;
        break;
      case "--budget":
        opts.budget = parseFloat(args[++i]) || 0;
        break;
    }
  }

  if (!opts.pass1 && !opts.pass2 && !opts.retryFailures) {
    console.error("Usage: npx tsx scripts/enrichment-pipeline.ts --pass1|--pass2|--retry-failures [--limit N] [--budget N] [--dry-run] [--use-deepseek]");
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

// ── JSON Parsing (with robust fallback chain) ────────────────────────────

function cleanJsonString(text: string): string {
  // Remove common AI response artifacts that break JSON parsing
  return text
    // Remove control characters except newline/tab
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
    // Fix trailing commas before } or ]
    .replace(/,\s*([}\]])/g, "$1")
    // Fix unescaped newlines inside JSON string values
    .replace(/(?<=: "(?:[^"\\]|\\.)*)(?:\r?\n)(?=(?:[^"\\]|\\.)*")/g, "\\n");
}

function parseAIResponse(text: string): ReportJSON {
  // Pre-clean the text
  const cleaned = cleanJsonString(text.trim());

  // Try 1: Direct JSON parse
  try {
    return JSON.parse(cleaned);
  } catch { /* continue */ }

  // Try 2: Extract from markdown code fence (greedy — handle nested fences)
  const fencePatterns = [
    /```json\s*([\s\S]*?)```/,
    /```\s*([\s\S]*?)```/,
  ];
  for (const pattern of fencePatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      try {
        return JSON.parse(cleanJsonString(match[1].trim()));
      } catch { /* continue */ }
    }
  }

  // Try 3: Find outermost JSON object boundaries
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const jsonCandidate = cleaned.slice(start, end + 1);
    try {
      return JSON.parse(jsonCandidate);
    } catch { /* continue */ }

    // Try 3b: Clean the extracted JSON more aggressively
    try {
      return JSON.parse(cleanJsonString(jsonCandidate));
    } catch { /* continue */ }

    // Try 3c: Attempt to fix truncated JSON by closing open braces/brackets
    try {
      let fixed = jsonCandidate;
      // Count unmatched braces/brackets
      let braces = 0, brackets = 0;
      let inString = false, escape = false;
      for (const ch of fixed) {
        if (escape) { escape = false; continue; }
        if (ch === "\\") { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === "{") braces++;
        else if (ch === "}") braces--;
        else if (ch === "[") brackets++;
        else if (ch === "]") brackets--;
      }
      // Close any unclosed structures
      while (brackets > 0) { fixed += "]"; brackets--; }
      while (braces > 0) { fixed += "}"; braces--; }
      return JSON.parse(fixed);
    } catch { /* continue */ }
  }

  throw new Error("Failed to parse AI response as JSON");
}

// ── HTML to Text ──────────────────────────────────────────────────────────

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

  // Ensure URL has protocol
  const fullUrl = url.startsWith("http") ? url : `https://${url}`;

  const response = await fetch("https://api.spider.cloud/crawl", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SPIDER_API_KEY}`,
    },
    body: JSON.stringify({
      url: fullUrl,
      limit: 5,
      return_format: "markdown",
      request_timeout: 15,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Spider API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

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

const COMPANY_SELECT = "id, slug, name, description, website, logo_url, country, city, founded, categories, ticker, valuation, stage, total_raised";

async function fetchAllPaginated<T>(
  table: string,
  select: string,
  filters?: (query: ReturnType<ReturnType<typeof createClient>["from"]>) => ReturnType<ReturnType<typeof createClient>["from"]>
): Promise<T[]> {
  const results: T[] = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    let query = supabase.from(table).select(select).range(offset, offset + pageSize - 1) as ReturnType<ReturnType<typeof createClient>["from"]>;
    if (filters) query = filters(query);
    const { data, error } = await (query as unknown as Promise<{ data: T[] | null; error: { message: string } | null }>);
    if (error) throw new Error(`DB error fetching ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    results.push(...data);
    offset += pageSize;
    if (data.length < pageSize) break;
  }
  return results;
}

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
      .select(COMPANY_SELECT)
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
  const allCompanies: CompanyRow[] = [];
  let offset = 0;
  const pageSize = 1000;

  // First: all public companies (ticker IS NOT NULL)
  while (true) {
    const { data, error } = await supabase
      .from("companies")
      .select(COMPANY_SELECT)
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

  // Then: top private by valuation
  offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("companies")
      .select(COMPANY_SELECT)
      .is("ticker", null)
      .not("valuation", "is", null)
      .order("valuation", { ascending: false, nullsFirst: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`DB error: ${error.message}`);
    if (!data || data.length === 0) break;
    allCompanies.push(...(data as CompanyRow[]));
    offset += pageSize;
    if (data.length < pageSize) break;
  }

  const publicCount = allCompanies.filter((c) => c.ticker).length;
  console.log(`  ${allCompanies.length - publicCount} private companies with valuation`);
  console.log(`  ${allCompanies.length} total Pass 2 candidates`);

  return limit > 0 ? allCompanies.slice(0, limit) : allCompanies;
}

async function fetchPriceContext(companyId: string): Promise<PriceContext> {
  const { data } = await supabase
    .from("company_price_history")
    .select("close, market_cap")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(260);

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
        max_tokens: 6144,
        system: "You are a JSON API. You MUST respond with ONLY a valid JSON object. No markdown fences, no commentary, no text before or after the JSON. Start your response with { and end with }.",
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
    country: company.country,
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

async function processCompanyPass1(company: CompanyRow): Promise<{ costUSD: number }> {
  // 1. Scrape website
  const { content, pagesScraped } = await scrapeWebsiteFetch(company.website || "", PASS1_CONTENT_CAP);

  // 2. Fetch price context for public companies
  const priceCtx = company.ticker
    ? await fetchPriceContext(company.id)
    : { latest_market_cap: null, high_52w: null, low_52w: null };

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

async function processCompanyPass2(company: CompanyRow, useDeepseek: boolean = false): Promise<{ costUSD: number }> {
  // 1. Scrape with Spider (fall back to fetch), or skip Spider if using DeepSeek
  let spiderContent = "";
  let pagesScraped: string[] = [];

  if (company.website) {
    if (useDeepseek) {
      // Skip Spider entirely — use fetch (faster, no timeouts)
      const result = await scrapeWebsiteFetch(company.website, PASS2_CONTENT_CAP);
      spiderContent = result.content;
      pagesScraped = result.pagesScraped;
    } else {
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
  }

  // Cap Spider content
  spiderContent = spiderContent.slice(0, PASS2_CONTENT_CAP);

  // 2. Fetch price context
  const priceCtx = company.ticker
    ? await fetchPriceContext(company.id)
    : { latest_market_cap: null, high_52w: null, low_52w: null };

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

  // 5. Build prompt and call AI (Haiku or DeepSeek)
  const prompt = buildPass2Prompt(company, spiderContent, priceCtx, existingReport, sectorRank);
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let report: ReportJSON | null = null;
  const aiSource = useDeepseek ? "deepseek" : "haiku";

  for (let jsonAttempt = 1; jsonAttempt <= 2; jsonAttempt++) {
    const { text, inputTokens, outputTokens } = useDeepseek
      ? await callDeepSeek(prompt)
      : await callHaiku(prompt);
    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;

    try {
      report = parseAIResponse(text);
      break;
    } catch {
      if (jsonAttempt === 2) {
        throw new Error("Failed to parse AI response as JSON after 2 attempts");
      }
      console.log(`    JSON parse failed, retrying ${aiSource} call...`);
      await sleep(500);
    }
  }

  // 6. Validate
  if (!report || (!report.summary && !report.deep_report)) {
    throw new Error("AI response missing both summary and deep_report");
  }

  // 7. Write to DB (overwrites Pass 1 report)
  const sourceTag = useDeepseek ? "source:pass2_deepseek" : "source:pass2_haiku";
  await writeReport(company, report, pagesScraped, sourceTag);

  // 8. Calculate cost
  const inputCostPerM = useDeepseek ? DEEPSEEK_INPUT_COST_PER_M : HAIKU_INPUT_COST_PER_M;
  const outputCostPerM = useDeepseek ? DEEPSEEK_OUTPUT_COST_PER_M : HAIKU_OUTPUT_COST_PER_M;
  const costUSD =
    (totalInputTokens / 1_000_000) * inputCostPerM +
    (totalOutputTokens / 1_000_000) * outputCostPerM;

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
  const processFn = pass === "pass1"
    ? (c: CompanyRow) => processCompanyPass1(c)
    : (c: CompanyRow) => processCompanyPass2(c, opts.useDeepseek);

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

  const aiLabel = pass === "pass2" && opts.useDeepseek ? " (DeepSeek mode)" : "";
  console.log(`\nEnrichment Pipeline — ${pass.toUpperCase()}${aiLabel}`);
  console.log("=".repeat(60));
  console.log(`Workers: ${numWorkers} | Delay: ${delayMs}ms | Budget: ${opts.budget > 0 ? formatCost(opts.budget) : "unlimited"}`);
  if (opts.useDeepseek && pass === "pass2") console.log("Using DeepSeek instead of Haiku (--use-deepseek)");
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
  const remaining = companies.filter((c) => !state.completed.has(c.id));
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

  const retryable = failures.filter((f) => f.retryCount < 3);
  console.log(`\nRetrying ${retryable.length} failed companies (${failures.length - retryable.length} exceeded max retries)`);

  const ids = retryable.map((f) => f.companyId);
  const companies: CompanyRow[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const { data } = await supabase
      .from("companies")
      .select(COMPANY_SELECT)
      .in("id", batch);
    if (data) companies.push(...(data as CompanyRow[]));
  }

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
