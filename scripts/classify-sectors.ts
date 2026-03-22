#!/usr/bin/env npx tsx
/**
 * AI Sector Classification Script
 *
 * Uses Claude API to classify all companies into 1-3 of the 20 defined sectors.
 * Sends companies in batches of 50, inserts into company_sectors table.
 *
 * Usage:
 *   npx tsx scripts/classify-sectors.ts
 *   npx tsx scripts/classify-sectors.ts --limit 100
 *   npx tsx scripts/classify-sectors.ts --batch-size 30
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const BATCH_SIZE = 50;
const DELAY_MS = 500;
const DEFAULT_LIMIT = 12000;
const CONFIDENCE_THRESHOLD = 0.5;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  return createClient(url, key);
}

function getClaude() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error("Missing ANTHROPIC_API_KEY in .env.local");
    process.exit(1);
  }
  return new Anthropic({ apiKey: key });
}

function parseArgs(): { limit: number; batchSize: number } {
  const args = process.argv.slice(2);
  let limit = DEFAULT_LIMIT;
  let batchSize = BATCH_SIZE;

  const limitIdx = args.indexOf("--limit");
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    const p = parseInt(args[limitIdx + 1], 10);
    if (!isNaN(p) && p > 0) limit = p;
  }

  const batchIdx = args.indexOf("--batch-size");
  if (batchIdx !== -1 && args[batchIdx + 1]) {
    const p = parseInt(args[batchIdx + 1], 10);
    if (!isNaN(p) && p > 0 && p <= 100) batchSize = p;
  }

  return { limit, batchSize };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface Sector {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  description: string | null;
}

interface CompanyForClassification {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  categories: string[] | null;
}

interface ReportData {
  company_id: string;
  therapeutic_areas: string[] | null;
  technology_platform: string | null;
  summary: string | null;
}

interface ClassificationResult {
  company_slug: string;
  sectors: {
    sector_slug: string;
    is_primary: boolean;
    confidence: number;
  }[];
}

async function fetchAllCompanies(supabase: ReturnType<typeof getSupabase>, limit: number) {
  const allCompanies: CompanyForClassification[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (offset < limit) {
    const { data, error } = await supabase
      .from("companies")
      .select("id, slug, name, description, categories")
      .order("valuation", { ascending: false, nullsFirst: false })
      .range(offset, offset + pageSize - 1);

    if (error) { console.error("Error fetching companies:", error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    allCompanies.push(...data);
    offset += pageSize;
    if (data.length < pageSize) break;
  }

  return allCompanies.slice(0, limit);
}

async function fetchAlreadyClassified(supabase: ReturnType<typeof getSupabase>): Promise<Set<string>> {
  const classified = new Set<string>();
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("company_sectors")
      .select("company_id")
      .range(offset, offset + pageSize - 1);

    if (error) { console.error("Error fetching classifications:", error.message); break; }
    if (!data || data.length === 0) break;
    data.forEach((r: { company_id: string }) => classified.add(r.company_id));
    offset += pageSize;
    if (data.length < pageSize) break;
  }

  return classified;
}

async function fetchReportData(supabase: ReturnType<typeof getSupabase>): Promise<Map<string, ReportData>> {
  const reports = new Map<string, ReportData>();
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("company_reports")
      .select("company_id, therapeutic_areas, technology_platform, summary")
      .range(offset, offset + pageSize - 1);

    if (error) break;
    if (!data || data.length === 0) break;
    data.forEach((r: ReportData) => reports.set(r.company_id, r));
    offset += pageSize;
    if (data.length < pageSize) break;
  }

  return reports;
}

function buildSystemPrompt(sectors: Sector[]): string {
  const sectorList = sectors
    .map((s) => `- ${s.slug}: ${s.name}${s.description ? ' — ' + s.description : ''}`)
    .join("\n");

  return `You are a biotech industry classifier. Given a list of biotech companies with their descriptions, classify each into 1-3 of these sectors:

${sectorList}

Rules:
- Each company gets 1-3 sector assignments
- Exactly ONE must be marked is_primary: true
- Confidence is 0.0-1.0 (how certain you are)
- Only include assignments with confidence >= ${CONFIDENCE_THRESHOLD}
- If a company doesn't clearly fit any sector, pick the closest match with lower confidence
- Use the sector slugs exactly as listed above

Respond with ONLY a JSON array, no markdown fences:
[{"company_slug": "company-slug", "sectors": [{"sector_slug": "sector-slug", "is_primary": true, "confidence": 0.95}]}]`;
}

function buildBatchPrompt(
  companies: CompanyForClassification[],
  reports: Map<string, ReportData>
): string {
  const items = companies.map((c) => {
    const report = reports.get(c.id);
    let info = `slug: ${c.slug}\nname: ${c.name}`;
    if (c.description) info += `\ndescription: ${c.description.slice(0, 200)}`;
    if (c.categories && c.categories.length > 0) info += `\ncategories: ${c.categories.join(", ")}`;
    if (report?.therapeutic_areas?.length) info += `\ntherapeutic_areas: ${report.therapeutic_areas.join(", ")}`;
    if (report?.technology_platform) info += `\ntechnology: ${report.technology_platform}`;
    return info;
  });

  return `Classify these ${companies.length} companies:\n\n${items.join("\n---\n")}`;
}

async function classifyBatch(
  claude: Anthropic,
  systemPrompt: string,
  companies: CompanyForClassification[],
  reports: Map<string, ReportData>,
  sectorMap: Map<string, string>,
  companySlugToId: Map<string, string>
): Promise<{ insertions: { company_id: string; sector_id: string; is_primary: boolean; confidence: number }[]; errors: string[] }> {
  const insertions: { company_id: string; sector_id: string; is_primary: boolean; confidence: number }[] = [];
  const errors: string[] = [];

  const userPrompt = buildBatchPrompt(companies, reports);

  let responseText: string;
  try {
    const msg = await claude.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    responseText = msg.content[0].type === "text" ? msg.content[0].text : "";
  } catch (err) {
    errors.push(`API error: ${err instanceof Error ? err.message : String(err)}`);
    return { insertions, errors };
  }

  // Parse JSON response
  let results: ClassificationResult[];
  try {
    // Strip markdown fences if present
    const cleaned = responseText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    results = JSON.parse(cleaned);
  } catch {
    errors.push(`Invalid JSON response for batch`);
    return { insertions, errors };
  }

  for (const result of results) {
    const companyId = companySlugToId.get(result.company_slug);
    if (!companyId) {
      errors.push(`Unknown company slug: ${result.company_slug}`);
      continue;
    }

    for (const sector of result.sectors) {
      const sectorId = sectorMap.get(sector.sector_slug);
      if (!sectorId) {
        errors.push(`Unknown sector slug: ${sector.sector_slug} for company ${result.company_slug}`);
        continue;
      }
      if (sector.confidence < CONFIDENCE_THRESHOLD) continue;

      insertions.push({
        company_id: companyId,
        sector_id: sectorId,
        is_primary: sector.is_primary,
        confidence: Math.round(sector.confidence * 100) / 100,
      });
    }
  }

  return { insertions, errors };
}

async function main() {
  const { limit, batchSize } = parseArgs();
  const supabase = getSupabase();
  const claude = getClaude();

  console.log("\n🏷️  Sector Classification Script");
  console.log("================================");
  console.log(`Batch size: ${batchSize}`);
  console.log(`Limit: ${limit}`);
  console.log(`Confidence threshold: ${CONFIDENCE_THRESHOLD}\n`);

  // Fetch sectors
  const { data: sectors, error: sErr } = await supabase.from("sectors").select("id, slug, name, short_name, description");
  if (sErr || !sectors) { console.error("Failed to fetch sectors:", sErr?.message); process.exit(1); }
  console.log(`Loaded ${sectors.length} sectors`);

  const sectorMap = new Map<string, string>();
  sectors.forEach((s: Sector) => sectorMap.set(s.slug, s.id));

  const systemPrompt = buildSystemPrompt(sectors);

  // Fetch companies
  console.log("Fetching companies...");
  const allCompanies = await fetchAllCompanies(supabase, limit);
  console.log(`  Found ${allCompanies.length} companies`);

  // Fetch already classified
  console.log("Checking existing classifications...");
  const alreadyClassified = await fetchAlreadyClassified(supabase);
  console.log(`  ${alreadyClassified.size} already classified`);

  const toClassify = allCompanies.filter((c) => !alreadyClassified.has(c.id));
  console.log(`  ${toClassify.length} companies to classify\n`);

  if (toClassify.length === 0) {
    console.log("✅ All companies already classified. Nothing to do.");
    process.exit(0);
  }

  // Fetch report data for enrichment
  console.log("Fetching report data...");
  const reports = await fetchReportData(supabase);
  console.log(`  ${reports.size} reports loaded\n`);

  // Build slug→id lookup
  const companySlugToId = new Map<string, string>();
  toClassify.forEach((c) => companySlugToId.set(c.slug, c.id));

  // Process in batches
  const totalBatches = Math.ceil(toClassify.length / batchSize);
  let totalInserted = 0;
  let totalErrors = 0;
  const startTime = Date.now();

  for (let i = 0; i < toClassify.length; i += batchSize) {
    const batch = toClassify.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    console.log(`[${batchNum}/${totalBatches}] Classifying ${batch.length} companies...`);

    let result = await classifyBatch(claude, systemPrompt, batch, reports, sectorMap, companySlugToId);

    // Retry once on failure
    if (result.insertions.length === 0 && result.errors.length > 0) {
      console.log(`  ⚠️  Batch failed, retrying...`);
      await sleep(1000);
      result = await classifyBatch(claude, systemPrompt, batch, reports, sectorMap, companySlugToId);
    }

    if (result.insertions.length > 0) {
      const { error: insertErr } = await supabase
        .from("company_sectors")
        .upsert(result.insertions, { onConflict: "company_id,sector_id" });

      if (insertErr) {
        console.log(`  ❌ Insert error: ${insertErr.message}`);
        totalErrors += result.insertions.length;
      } else {
        console.log(`  ✅ Inserted ${result.insertions.length} mappings`);
        totalInserted += result.insertions.length;
      }
    }

    if (result.errors.length > 0) {
      result.errors.forEach((e) => console.log(`  ⚠️  ${e}`));
      totalErrors += result.errors.length;
    }

    await sleep(DELAY_MS);
  }

  // Update sectors table denormalized counts
  console.log("\nUpdating sector counts...");
  for (const sector of sectors) {
    const { count: totalCount } = await supabase
      .from("company_sectors")
      .select("*", { count: "exact", head: true })
      .eq("sector_id", sector.id);

    // Count public companies (with ticker) in this sector
    const { data: publicCompanies } = await supabase
      .from("company_sectors")
      .select("company_id, companies!inner(ticker)")
      .eq("sector_id", sector.id)
      .not("companies.ticker", "is", null)
      .neq("companies.ticker", "");

    const publicCount = publicCompanies?.length || 0;

    await supabase
      .from("sectors")
      .update({
        company_count: totalCount || 0,
        public_company_count: publicCount,
      })
      .eq("id", sector.id);

    console.log(`  ${sector.name}: ${totalCount || 0} companies (${publicCount} public)`);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n================================`);
  console.log(`🏁 Classification Complete`);
  console.log(`================================`);
  console.log(`Mappings inserted: ${totalInserted}`);
  console.log(`Errors: ${totalErrors}`);
  console.log(`Time: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
