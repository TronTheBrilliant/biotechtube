#!/usr/bin/env npx tsx
/**
 * Tier 1 Data Enrichment — Categories, Description, City, Founded Year
 *
 * Uses DeepSeek API to enrich companies missing key data fields.
 * Processes companies that are missing ANY of: categories, description, city, founded.
 * Batches of 10 companies per API call for quality responses.
 *
 * Usage: npx tsx scripts/enrich-tier1-deepseek.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DEEPSEEK_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing env vars (DEEPSEEK_API_KEY, SUPABASE_URL, SUPABASE_KEY)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface CompanyRow {
  id: string;
  name: string;
  ticker: string | null;
  country: string | null;
  website: string | null;
  categories: string[] | null;
  description: string | null;
  city: string | null;
  founded: number | null;
}

interface EnrichmentResult {
  categories?: string[];
  description?: string;
  city?: string;
  founded?: number;
}

async function enrichBatch(companies: CompanyRow[]): Promise<Record<string, EnrichmentResult>> {
  const companyList = companies.map((c) => {
    const parts = [c.name];
    if (c.ticker) parts.push(`(${c.ticker})`);
    if (c.country) parts.push(`— ${c.country}`);
    if (c.website) parts.push(`[${c.website}]`);

    const missing: string[] = [];
    if (!c.categories || c.categories.length === 0) missing.push("categories");
    if (!c.description) missing.push("description");
    if (!c.city) missing.push("city");
    if (!c.founded) missing.push("founded");

    return `${parts.join(" ")} — NEEDS: ${missing.join(", ")}`;
  }).join("\n");

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
          content: `You are a biotech/pharma company data enrichment assistant. Given company names and what data they need, return a JSON object.

For each company, provide ONLY the missing fields:
- "categories": array of 1-3 therapeutic areas from this list: Oncology, Immunology, Neuroscience, Rare Disease, Cardiovascular, Infectious Disease, Metabolic, Ophthalmology, Dermatology, Respiratory, Hematology, Genetics & Genomics, Cell Therapy, Gene Therapy, RNA Therapeutics, Diagnostics, Drug Delivery, Digital Health, AI / Machine Learning, Vaccines, Microbiome, Proteomics, Antibodies, Biologics, Small Molecules, Medical Devices, CRISPR, Regenerative Medicine, Synthetic Biology
- "description": ONE sentence (max 30 words) about what the company does
- "city": headquarters city name only (e.g. "Cambridge", "San Francisco", "Basel")
- "founded": year as integer (e.g. 2015)

Return ONLY a JSON object mapping company name to their enrichment data. No explanations. If you don't know a field with confidence, omit it.`,
        },
        {
          role: "user",
          content: `Enrich these biotech/pharma companies:\n\n${companyList}`,
        },
      ],
      temperature: 0,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`  API error: ${response.status} ${text.slice(0, 200)}`);
    return {};
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error(`  Could not parse JSON from response`);
    return {};
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error(`  JSON parse error`);
    return {};
  }
}

async function main() {
  console.log("\n🧬 Tier 1 Data Enrichment (DeepSeek)");
  console.log("=====================================\n");

  // Fetch companies missing ANY of the tier 1 fields
  // Process in pages since there could be 10,000+
  const PAGE_SIZE = 1000;
  let allCompanies: CompanyRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("companies")
      .select("id, name, ticker, country, website, categories, description, city, founded")
      .or("categories.is.null,description.is.null,city.is.null,founded.is.null")
      .order("name")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("Supabase fetch error:", error.message);
      break;
    }
    if (!data || data.length === 0) break;

    // Filter to companies actually missing at least one field
    const needsEnrichment = data.filter((c: CompanyRow) => {
      return (!c.categories || c.categories.length === 0) ||
             !c.description ||
             !c.city ||
             !c.founded;
    });

    allCompanies.push(...needsEnrichment);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  console.log(`Found ${allCompanies.length} companies needing enrichment\n`);

  if (allCompanies.length === 0) {
    console.log("Nothing to enrich!");
    return;
  }

  // Process in batches of 10
  const BATCH_SIZE = 10;
  let enrichedCount = 0;
  let updatedFields = { categories: 0, description: 0, city: 0, founded: 0 };
  const totalBatches = Math.ceil(allCompanies.length / BATCH_SIZE);
  const startTime = Date.now();

  for (let i = 0; i < allCompanies.length; i += BATCH_SIZE) {
    const batch = allCompanies.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const rate = enrichedCount > 0 ? (enrichedCount / elapsed * 60).toFixed(0) : "—";
    console.log(`[${batchNum}/${totalBatches}] Processing ${batch.length} companies... (${enrichedCount} enriched, ${rate}/min)`);

    let results: Record<string, EnrichmentResult>;
    try {
      results = await enrichBatch(batch);
    } catch (err) {
      console.error(`  Batch failed:`, err);
      continue;
    }

    // Update each company
    for (const company of batch) {
      const enrichment = results[company.name];
      if (!enrichment) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {};

      if (enrichment.categories && Array.isArray(enrichment.categories) && enrichment.categories.length > 0) {
        if (!company.categories || company.categories.length === 0) {
          updateData.categories = enrichment.categories;
          updatedFields.categories++;
        }
      }

      if (enrichment.description && typeof enrichment.description === "string" && enrichment.description.length > 10) {
        if (!company.description) {
          updateData.description = enrichment.description;
          updatedFields.description++;
        }
      }

      if (enrichment.city && typeof enrichment.city === "string" && enrichment.city.length > 1) {
        if (!company.city) {
          updateData.city = enrichment.city;
          updatedFields.city++;
        }
      }

      if (enrichment.founded && typeof enrichment.founded === "number" && enrichment.founded > 1900 && enrichment.founded <= 2026) {
        if (!company.founded) {
          updateData.founded = enrichment.founded;
          updatedFields.founded++;
        }
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from("companies")
          .update(updateData)
          .eq("id", company.id);

        if (error) {
          console.error(`  ❌ ${company.name}: ${error.message}`);
        } else {
          enrichedCount++;
        }
      }
    }

    // Rate limit: 500ms between batches
    if (i + BATCH_SIZE < allCompanies.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  const totalElapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n=====================================`);
  console.log(`🏁 Tier 1 Enrichment Complete`);
  console.log(`=====================================`);
  console.log(`Companies enriched: ${enrichedCount}/${allCompanies.length}`);
  console.log(`Fields updated:`);
  console.log(`  Categories: ${updatedFields.categories}`);
  console.log(`  Descriptions: ${updatedFields.description}`);
  console.log(`  Cities: ${updatedFields.city}`);
  console.log(`  Founded years: ${updatedFields.founded}`);
  console.log(`Time: ${Math.floor(totalElapsed / 60)}m ${totalElapsed % 60}s`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
