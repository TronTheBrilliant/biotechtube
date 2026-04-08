/**
 * Fast batch enrichment — 5 companies per DeepSeek call, no website crawling.
 * Generates company_reports from DeepSeek knowledge only.
 *
 * Usage: npx tsx scripts/enrich-batch-fast.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const API_KEY = process.env.DEEPSEEK_API_KEY!;

interface Company {
  id: string; slug: string; name: string; description: string | null;
  website: string | null; country: string | null; categories: string[] | null;
  ticker: string | null; founded: number | null;
}

async function enrichBatch(companies: Company[]): Promise<Record<string, Record<string, unknown>>> {
  const list = companies.map(c => {
    const parts = [c.name];
    if (c.ticker) parts.push(`(${c.ticker})`);
    if (c.country) parts.push(`— ${c.country}`);
    if (c.categories?.length) parts.push(`[${c.categories.join(", ")}]`);
    return parts.join(" ");
  }).join("\n");

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "You are a biotech analyst. Generate company profiles as JSON." },
        { role: "user", content: `For each company, provide a JSON object with these fields:
- description: 2-3 sentences (50-80 words)
- summary: one-sentence elevator pitch (max 25 words)
- deep_report: 3-4 paragraph analysis (200-300 words) covering: overview, technology, pipeline, market position
- stage: preclinical/phase-1/phase-2/phase-3/commercial/platform
- company_type: Public or Private
- employee_estimate: 1-50/50-200/200-500/500-1000/1000+
- therapeutic_areas: array of 1-3 areas
- technology_platform: 1-2 sentence description
- key_people: [{name, role}] (CEO, CSO if known)
- investors: array of known investor names
- competitive_landscape: 1-2 sentences
- opportunities: 1 sentence
- risks: 1 sentence

Companies:
${list}

Return JSON: {"Company Name": {...}, "Company Name": {...}}
No markdown fences.` },
      ],
      temperature: 0.2,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) return {};
  const data = await res.json();
  let content = data.choices?.[0]?.message?.content || "";
  if (content.startsWith("```")) content = content.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();

  try {
    return JSON.parse(content);
  } catch {
    // Try to find JSON object
    const match = content.match(/\{[\s\S]*\}/);
    if (match) try { return JSON.parse(match[0]); } catch { /* */ }
    return {};
  }
}

async function main() {
  console.log("=== Fast Batch Enrichment (5 per call, no scraping) ===\n");

  // Get companies without reports
  const existingIds = new Set<string>();
  let offset = 0;
  while (true) {
    const { data } = await supabase.from("company_reports").select("company_id").range(offset, offset + 999);
    if (!data?.length) break;
    for (const r of data) existingIds.add(r.company_id);
    offset += 1000;
    if (data.length < 1000) break;
  }

  const allCompanies: Company[] = [];
  offset = 0;
  while (true) {
    const { data } = await supabase
      .from("companies")
      .select("id, slug, name, description, website, country, categories, ticker, founded")
      .order("created_at", { ascending: false })
      .range(offset, offset + 999);
    if (!data?.length) break;
    allCompanies.push(...data);
    offset += 1000;
    if (data.length < 1000) break;
  }

  const toProcess = allCompanies.filter(c => !existingIds.has(c.id));
  console.log(`Companies without reports: ${toProcess.length}\n`);

  let succeeded = 0;
  let failed = 0;
  const BATCH = 5;

  for (let i = 0; i < toProcess.length; i += BATCH) {
    const batch = toProcess.slice(i, i + BATCH);
    const progress = `[${i + 1}-${Math.min(i + BATCH, toProcess.length)}/${toProcess.length}]`;

    try {
      const results = await enrichBatch(batch);

      for (const company of batch) {
        const report = results[company.name];
        if (!report) { failed++; continue; }

        // Update company fields
        const updates: Record<string, unknown> = { enriched_at: new Date().toISOString() };
        if (report.description) updates.description = report.description;
        if (report.stage) updates.stage = report.stage;
        if (report.company_type) updates.company_type = report.company_type;
        if (report.employee_estimate) updates.employee_range = report.employee_estimate;
        if (report.therapeutic_areas && Array.isArray(report.therapeutic_areas)) updates.categories = report.therapeutic_areas;
        await supabase.from("companies").update(updates).eq("id", company.id);

        // Insert report
        const { error } = await supabase.from("company_reports").upsert({
          company_id: company.id,
          report_slug: company.slug,
          summary: report.summary || report.description || null,
          deep_report: report.deep_report || null,
          stage: report.stage || null,
          company_type: report.company_type || null,
          employee_estimate: report.employee_estimate || null,
          therapeutic_areas: report.therapeutic_areas || null,
          technology_platform: report.technology_platform || null,
          pipeline_programs: report.pipeline_programs || null,
          key_people: report.key_people || null,
          investors: report.investors || null,
          competitive_landscape: report.competitive_landscape || null,
          opportunities: report.opportunities || null,
          risks: report.risks || null,
          analyzed_at: new Date().toISOString(),
        }, { onConflict: "company_id" });

        if (!error) succeeded++;
        else failed++;
      }

      const names = batch.map(c => c.name.length > 25 ? c.name.substring(0, 25) + "…" : c.name).join(", ");
      console.log(`  ${progress} ✓ ${names}`);
    } catch (err) {
      failed += batch.length;
      console.log(`  ${progress} ✗ ${(err as Error).message}`);
    }

    // Minimal rate limit
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n=== Done ===`);
  console.log(`Succeeded: ${succeeded} | Failed: ${failed}`);
}

main().catch(console.error);
