/**
 * Company Discovery — Core module for finding, creating, and enriching companies.
 * Used by all three discovery layers (orphan recovery, directory scraping, news auto-create).
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { callDeepSeek, parseDeepSeekJSON } from "./deepseek-client";

// ─── Slug Generation ───

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/**
 * Generate a unique slug, appending suffix on collision.
 */
export async function uniqueSlug(supabase: SupabaseClient, name: string, city?: string | null): Promise<string> {
  let slug = slugify(name);

  const { data } = await supabase.from("companies").select("id").eq("slug", slug).limit(1);
  if (!data || data.length === 0) return slug;

  // Try with city
  if (city) {
    const slugWithCity = slugify(`${name} ${city}`);
    const { data: d2 } = await supabase.from("companies").select("id").eq("slug", slugWithCity).limit(1);
    if (!d2 || d2.length === 0) return slugWithCity;
  }

  // Append counter
  for (let i = 2; i <= 10; i++) {
    const candidate = `${slug}-${i}`;
    const { data: d3 } = await supabase.from("companies").select("id").eq("slug", candidate).limit(1);
    if (!d3 || d3.length === 0) return candidate;
  }

  return `${slug}-${Date.now() % 10000}`;
}

// ─── Name Normalization ───

const STRIP_SUFFIXES = [
  /,?\s*(inc\.?|corp\.?|corporation|ltd\.?|limited|llc|lp|plc|ag|sa|se|ab|nv|gmbh|co\.?|company)$/i,
  /,?\s*(therapeutics?|pharmaceuticals?|pharma|biosciences?|biotech(nology)?|biopharmaceuticals?|biologics?|biopharma|sciences?|medical|health|healthcare|genomics|diagnostics|devices)$/i,
];

export function normalizeCompanyName(name: string): string {
  let n = name.trim().toLowerCase();
  for (let i = 0; i < 3; i++) {
    for (const re of STRIP_SUFFIXES) {
      n = n.replace(re, "").trim();
    }
  }
  return n.replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

// ─── Domain Extraction ───

export function extractDomain(url: string): string {
  try {
    const hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.toLowerCase();
    return hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// ─── Logo URL ───

export function logoUrl(domain: string): string {
  if (!domain) return "";
  return `https://img.logo.dev/${domain}?token=pk_mBbMEHj5R1qxyOb4VNLsAQ&size=64`;
}

// ─── Company Creation ───

export interface NewCompanyInput {
  name: string;
  country?: string | null;
  city?: string | null;
  website?: string | null;
  description?: string | null;
  categories?: string[] | null;
  founded?: number | null;
  stage?: string | null;
  company_type?: string | null;
  source: string;
  source_url?: string | null;
}

/**
 * Create a new company record in the database.
 * Returns the new company's ID, or null on error.
 */
export async function createCompanyRecord(
  supabase: SupabaseClient,
  input: NewCompanyInput
): Promise<string | null> {
  const domain = input.website ? extractDomain(input.website) : "";
  const slug = await uniqueSlug(supabase, input.name, input.city);

  const record: Record<string, unknown> = {
    slug,
    name: input.name,
    country: input.country || "United States",
    city: input.city || null,
    website: input.website || null,
    domain: domain || null,
    description: input.description || null,
    categories: input.categories || [],
    founded: input.founded || null,
    stage: input.stage || null,
    company_type: input.company_type || "Private",
    logo_url: domain ? logoUrl(domain) : null,
    source: input.source,
    source_url: input.source_url || null,
    is_estimated: true,
  };

  const { data, error } = await supabase
    .from("companies")
    .insert(record)
    .select("id")
    .single();

  if (error) {
    // Might be a slug collision or constraint violation
    console.error(`  ✗ Failed to create ${input.name}: ${error.message}`);
    return null;
  }

  return data?.id || null;
}

// ─── Batch Enrichment ───

const CATEGORIES = [
  "Oncology", "Immunology", "Neuroscience", "Rare Disease", "Cardiovascular",
  "Infectious Disease", "Metabolic", "Ophthalmology", "Dermatology", "Respiratory",
  "Hematology", "Genetics & Genomics", "Cell Therapy", "Gene Therapy",
  "RNA Therapeutics", "Diagnostics", "Drug Delivery", "Digital Health",
  "AI / Machine Learning", "Vaccines", "Microbiome", "Proteomics",
  "Antibodies", "Biologics", "Small Molecules", "Medical Devices",
  "CRISPR", "Regenerative Medicine", "Synthetic Biology",
];

interface CompanyForEnrichment {
  id: string;
  name: string;
  country: string | null;
  website: string | null;
}

interface EnrichmentData {
  description?: string;
  categories?: string[];
  country?: string;
  city?: string;
  founded?: number;
  stage?: string;
  website?: string;
  company_type?: string;
}

/**
 * Enrich companies in batches of 10 via DeepSeek.
 * Updates description, categories, country, city, founded, stage.
 */
export async function batchEnrichNewCompanies(
  supabase: SupabaseClient,
  companyIds: string[]
): Promise<number> {
  if (companyIds.length === 0) return 0;

  // Fetch companies needing enrichment
  const companies: CompanyForEnrichment[] = [];
  for (let i = 0; i < companyIds.length; i += 100) {
    const batch = companyIds.slice(i, i + 100);
    const { data } = await supabase
      .from("companies")
      .select("id, name, country, website")
      .in("id", batch);
    if (data) companies.push(...(data as CompanyForEnrichment[]));
  }

  let enriched = 0;
  const BATCH_SIZE = 10;

  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, i + BATCH_SIZE);

    const companyList = batch.map((c) => {
      const parts = [c.name];
      if (c.country) parts.push(`— ${c.country}`);
      if (c.website) parts.push(`[${c.website}]`);
      return parts.join(" ");
    }).join("\n");

    const content = await callDeepSeek({
      system: `You are a biotech/pharma company data enrichment assistant. Return a JSON object keyed by company name.`,
      prompt: `For each biotech company below, provide the following fields:
- "description": ONE sentence (max 40 words) about what the company does
- "categories": array of 1-3 therapeutic areas from: ${CATEGORIES.join(", ")}
- "country": headquarters country
- "city": headquarters city
- "founded": year founded as integer
- "stage": one of "preclinical", "phase-1", "phase-2", "phase-3", "commercial", "platform"
- "website": company website URL (only if not already provided)
- "company_type": "Public" or "Private"

Companies:
${companyList}

Return JSON: {"Company Name": {"description": "...", "categories": [...], ...}}
No markdown fences. Only confident data.`,
      temperature: 0,
      maxTokens: 2000,
    });

    if (!content) continue;
    const results = parseDeepSeekJSON<Record<string, EnrichmentData>>(content);
    if (!results) continue;

    for (const company of batch) {
      const data = results[company.name];
      if (!data) continue;

      const updates: Record<string, unknown> = {};
      if (data.description) updates.description = data.description;
      if (data.categories && data.categories.length > 0) updates.categories = data.categories;
      if (data.country) updates.country = data.country;
      if (data.city) updates.city = data.city;
      if (data.founded && data.founded > 1900 && data.founded <= new Date().getFullYear()) updates.founded = data.founded;
      if (data.stage) updates.stage = data.stage;
      if (data.website && !company.website) updates.website = data.website;
      if (data.company_type) updates.company_type = data.company_type;

      // Update domain and logo if we got a website
      if (updates.website) {
        const domain = extractDomain(updates.website as string);
        if (domain) {
          updates.domain = domain;
          updates.logo_url = logoUrl(domain);
        }
      }

      if (Object.keys(updates).length > 0) {
        updates.enriched_at = new Date().toISOString();
        const { error } = await supabase.from("companies").update(updates).eq("id", company.id);
        if (!error) enriched++;
      }
    }

    // Rate limit
    if (i + BATCH_SIZE < companies.length) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  return enriched;
}
