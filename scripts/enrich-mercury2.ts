/**
 * Deep Company Enrichment via Inception Labs Mercury 2
 *
 * Crawls company websites and generates comprehensive company_reports
 * using Mercury 2's fast diffusion-based LLM. Targets new companies
 * that don't have reports yet.
 *
 * Usage:
 *   npx tsx scripts/enrich-mercury2.ts                    # All unenriched
 *   npx tsx scripts/enrich-mercury2.ts --limit 100        # First 100
 *   npx tsx scripts/enrich-mercury2.ts --dry-run           # Preview
 *   npx tsx scripts/enrich-mercury2.ts --source biopharmguy # Filter by source
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MERCURY_API_URL = "https://api.inceptionlabs.ai/v1/chat/completions";
const MERCURY_API_KEY = process.env.INCEPTION_API_KEY!;
const MODEL = "mercury-2";

const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT = parseInt(
  process.argv.find(a => a.startsWith("--limit="))?.split("=")[1]
  || (process.argv.includes("--limit") ? process.argv[process.argv.indexOf("--limit") + 1] : "0") || "0"
);
const SOURCE_FILTER = process.argv.find(a => a.startsWith("--source="))?.split("=")[1]
  || (process.argv.includes("--source") ? process.argv[process.argv.indexOf("--source") + 1] : undefined);

// ── Mercury 2 API Call ───

async function callMercury(system: string, prompt: string, maxTokens = 2000): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(MERCURY_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MERCURY_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.2,
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          await sleep(5000 * (attempt + 1));
          continue;
        }
        console.error(`  Mercury API ${res.status}: ${res.statusText}`);
        return null;
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (err) {
      if (attempt < 2) { await sleep(2000); continue; }
      console.error(`  Mercury error: ${(err as Error).message}`);
      return null;
    }
  }
  return null;
}

// ── Website Scraping ───

function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLinks(html: string, baseUrl: string): string[] {
  const re = /href=["']([^"']+)["']/gi;
  const links: string[] = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    if (href.startsWith("/") || href.startsWith(baseUrl)) {
      links.push(href.startsWith("/") ? `${baseUrl}${href}` : href);
    }
  }
  return Array.from(new Set(links));
}

function findRelevantPages(links: string[]): string[] {
  const kw = [/about/i, /team/i, /leadership/i, /pipeline/i, /science/i, /research/i,
    /programs/i, /clinical/i, /technology/i, /platform/i, /our-/i, /company/i];
  return links.filter(url => kw.some(k => k.test(url))).slice(0, 4);
}

async function scrapeWebsite(website: string): Promise<string> {
  if (!website) return "";
  const baseUrl = (website.startsWith("http") ? website : `https://${website}`).replace(/\/$/, "");

  try {
    const res = await fetch(baseUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BiotechTubeBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";

    const html = await res.text();
    const homepage = htmlToText(html).slice(0, 6000);

    // Fetch sub-pages
    const links = extractLinks(html, baseUrl);
    const relevant = findRelevantPages(links);

    const subPages = await Promise.all(
      relevant.map(async url => {
        try {
          const r = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; BiotechTubeBot/1.0)" },
            signal: AbortSignal.timeout(6000),
          });
          if (!r.ok) return "";
          const h = await r.text();
          const text = htmlToText(h).slice(0, 3000);
          return text.length > 100 ? `\n--- ${url} ---\n${text}` : "";
        } catch { return ""; }
      })
    );

    return `--- HOMEPAGE ---\n${homepage}${subPages.join("")}`.slice(0, 15000);
  } catch {
    return "";
  }
}

// ── Enrichment Prompt ───

function buildPrompt(company: { name: string; country: string | null; categories: string[] | null; website: string | null }, websiteContent: string): string {
  return `Analyze this biotech/pharma company and create a comprehensive profile.

COMPANY: ${company.name}
COUNTRY: ${company.country || "Unknown"}
CATEGORIES: ${(company.categories || []).join(", ") || "Unknown"}
WEBSITE: ${company.website || "Unknown"}

${websiteContent ? `WEBSITE CONTENT:\n${websiteContent}` : "No website content available — use your knowledge."}

Return a JSON object with ALL of these fields (use null if truly unknown):
{
  "description": "2-3 sentence company description (50-80 words). What they do, their key technology, and their therapeutic focus.",
  "summary": "One-sentence elevator pitch (max 25 words).",
  "deep_report": "4-6 paragraph detailed analysis (300-500 words) covering: company overview, technology platform, pipeline/products, market position, key milestones, and outlook. Write in professional analyst style.",
  "founded": 2020,
  "headquarters_city": "city name",
  "headquarters_country": "country name",
  "employee_estimate": "10-50" or "50-200" or "200-500" or "500-1000" or "1000+",
  "business_model": "biotech" or "pharma" or "platform" or "diagnostics" or "medtech" or "services",
  "revenue_status": "pre-revenue" or "early-revenue" or "revenue-generating" or "profitable",
  "stage": "preclinical" or "phase-1" or "phase-2" or "phase-3" or "commercial" or "platform",
  "company_type": "Public" or "Private",
  "ticker": "NASDAQ:MRNA" or null,
  "exchange": "NASDAQ" or "NYSE" or null,
  "therapeutic_areas": ["Oncology", "Immunology"],
  "technology_platform": "Brief description of their core technology (1-2 sentences)",
  "pipeline_programs": [{"name": "Drug-123", "indication": "Solid Tumors", "phase": "Phase 2", "status": "Active"}],
  "key_people": [{"name": "John Smith", "role": "CEO"}, {"name": "Jane Doe", "role": "CSO"}],
  "investors": ["Flagship Pioneering", "ARCH Venture Partners"],
  "partners": ["Pfizer", "Roche"],
  "total_raised_estimate": 150000000,
  "opportunities": "1-2 sentences on growth opportunities",
  "risks": "1-2 sentences on key risks",
  "competitive_landscape": "1-2 sentences on competitors and differentiation"
}

Be factual and specific. Use drug names, mechanism of action, and clinical trial details when known. No markdown fences — just the JSON.`;
}

// ── JSON Parsing ───

function parseResponse(text: string): Record<string, unknown> {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) cleaned = cleaned.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();

  try { return JSON.parse(cleaned); } catch { /* continue */ }

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { /* continue */ }
  }

  throw new Error("Failed to parse Mercury response");
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── Main ───

async function main() {
  console.log("=== Deep Enrichment via Mercury 2 ===\n");
  if (DRY_RUN) console.log("🔍 DRY RUN\n");
  if (!MERCURY_API_KEY) { console.error("Missing INCEPTION_API_KEY"); return; }

  // Find companies without reports
  const existingReportIds = new Set<string>();
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("company_reports")
      .select("company_id")
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    for (const r of data) existingReportIds.add(r.company_id);
    offset += 1000;
    if (data.length < 1000) break;
  }
  console.log(`Existing reports: ${existingReportIds.size}`);

  // Fetch companies needing reports
  let query = supabase
    .from("companies")
    .select("id, slug, name, description, website, country, city, categories, ticker, founded")
    .order("created_at", { ascending: false });

  if (SOURCE_FILTER) {
    query = query.eq("source", SOURCE_FILTER);
  }

  const allCompanies: Array<{
    id: string; slug: string; name: string; description: string | null;
    website: string | null; country: string | null; city: string | null;
    categories: string[] | null; ticker: string | null; founded: number | null;
  }> = [];

  let qOffset = 0;
  while (true) {
    const { data } = await query.range(qOffset, qOffset + 999);
    if (!data || data.length === 0) break;
    allCompanies.push(...data);
    qOffset += 1000;
    if (data.length < 1000) break;
  }

  const needsReport = allCompanies.filter(c => !existingReportIds.has(c.id));
  const toProcess = LIMIT > 0 ? needsReport.slice(0, LIMIT) : needsReport;

  console.log(`Companies without reports: ${needsReport.length}`);
  console.log(`Processing: ${toProcess.length}\n`);

  if (toProcess.length === 0) { console.log("Nothing to do!"); return; }

  let succeeded = 0;
  let failed = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const company = toProcess[i];
    const progress = `[${i + 1}/${toProcess.length}]`;

    if (DRY_RUN) {
      console.log(`  ${progress} Would enrich: ${company.name} (${company.website || "no website"})`);
      continue;
    }

    try {
      // Scrape website
      const websiteContent = await scrapeWebsite(company.website || "");

      // Generate report via Mercury 2
      const prompt = buildPrompt(company, websiteContent);
      const response = await callMercury(
        "You are a senior biotech industry analyst. Generate comprehensive, accurate company profiles based on website content and your knowledge. Always return valid JSON.",
        prompt,
        2500
      );

      if (!response) { failed++; console.log(`  ${progress} ✗ ${company.name} — no response`); continue; }

      const report = parseResponse(response);

      // Update company fields
      const companyUpdates: Record<string, unknown> = { enriched_at: new Date().toISOString() };
      if (report.description && typeof report.description === "string") companyUpdates.description = report.description;
      if (report.headquarters_city) companyUpdates.city = report.headquarters_city;
      if (report.headquarters_country) companyUpdates.country = report.headquarters_country;
      if (report.founded && typeof report.founded === "number" && report.founded > 1900) companyUpdates.founded = report.founded;
      if (report.therapeutic_areas && Array.isArray(report.therapeutic_areas)) companyUpdates.categories = report.therapeutic_areas;
      if (report.stage) companyUpdates.stage = report.stage;
      if (report.company_type) companyUpdates.company_type = report.company_type;
      if (report.ticker && typeof report.ticker === "string") companyUpdates.ticker = report.ticker;
      if (report.employee_estimate) companyUpdates.employee_range = report.employee_estimate;
      if (report.total_raised_estimate && typeof report.total_raised_estimate === "number") companyUpdates.total_raised = report.total_raised_estimate;

      await supabase.from("companies").update(companyUpdates).eq("id", company.id);

      // Insert/update company_report (flat schema — each field is a column)
      const reportRow: Record<string, unknown> = {
        company_id: company.id,
        report_slug: company.slug,
        summary: report.summary || report.description || null,
        deep_report: report.deep_report || null,
        founded: report.founded || company.founded || null,
        headquarters_city: report.headquarters_city || company.city || null,
        headquarters_country: report.headquarters_country || company.country || null,
        employee_estimate: report.employee_estimate || null,
        business_model: report.business_model || null,
        revenue_status: report.revenue_status || null,
        stage: report.stage || null,
        company_type: report.company_type || null,
        ticker: report.ticker || company.ticker || null,
        exchange: report.exchange || null,
        therapeutic_areas: report.therapeutic_areas || company.categories || null,
        technology_platform: report.technology_platform || null,
        pipeline_programs: report.pipeline_programs || null,
        key_people: report.key_people || null,
        investors: report.investors || null,
        partners: report.partners || null,
        total_raised_estimate: report.total_raised_estimate || null,
        opportunities: report.opportunities || null,
        risks: report.risks || null,
        competitive_landscape: report.competitive_landscape || null,
        analyzed_at: new Date().toISOString(),
      };

      const { error: reportError } = await supabase.from("company_reports").upsert(reportRow, { onConflict: "company_id" });
      if (reportError) {
        console.error(`    Report insert error: ${reportError.message}`);
        // Try without the complex fields
        delete reportRow.pipeline_programs;
        delete reportRow.key_people;
        const { error: retryError } = await supabase.from("company_reports").upsert(reportRow, { onConflict: "company_id" });
        if (retryError) console.error(`    Retry error: ${retryError.message}`);
      }

      succeeded++;
      const name = company.name.length > 35 ? company.name.substring(0, 35) + "…" : company.name;
      console.log(`  ${progress} ✓ ${name} — ${report.stage || "?"}, ${(report.therapeutic_areas as string[] || []).join(", ") || "?"}`);

    } catch (err) {
      failed++;
      console.log(`  ${progress} ✗ ${company.name} — ${(err as Error).message}`);
    }

    // Rate limit — Mercury 2 is fast, 500ms is enough
    await sleep(500);
  }

  // Estimate cost
  const inputCost = (totalInputTokens / 1_000_000) * 0.25;
  const outputCost = (totalOutputTokens / 1_000_000) * 0.75;

  console.log(`\n=== Done ===`);
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${succeeded + failed}`);
}

main().catch(console.error);
