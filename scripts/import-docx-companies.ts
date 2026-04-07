/**
 * Import companies from the user's curated biotech_companies_v2.docx
 * Uses the human-written descriptions (higher quality than AI-generated).
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";
import { CompanyMatcher, loadCompanies } from "./lib/company-matcher";
import { createCompanyRecord, extractDomain } from "./lib/company-discovery";
import * as fs from "fs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Country normalization
const COUNTRY_MAP: Record<string, string> = {
  "UK": "United Kingdom", "US": "United States", "USA": "United States",
  "South Korea": "South Korea", "Korea": "South Korea",
};

// Category to our categories mapping
function mapCategories(category: string): string[] {
  const cats: string[] = [];
  const lower = category.toLowerCase();
  if (lower.includes("oncology") || lower.includes("cancer") || lower.includes("tumor")) cats.push("Oncology");
  if (lower.includes("immun")) cats.push("Immunology");
  if (lower.includes("neuro") || lower.includes("cns")) cats.push("Neuroscience");
  if (lower.includes("gene therap") || lower.includes("gene edit") || lower.includes("crispr")) cats.push("Gene Therapy");
  if (lower.includes("cell therap") || lower.includes("car-t") || lower.includes("stem cell")) cats.push("Cell Therapy");
  if (lower.includes("rare") || lower.includes("orphan")) cats.push("Rare Disease");
  if (lower.includes("cardiovascular") || lower.includes("heart")) cats.push("Cardiovascular");
  if (lower.includes("infect") || lower.includes("antimicrobial") || lower.includes("antiviral")) cats.push("Infectious Disease");
  if (lower.includes("metaboli") || lower.includes("obesity") || lower.includes("diabetes")) cats.push("Metabolic");
  if (lower.includes("vaccine")) cats.push("Vaccines");
  if (lower.includes("ai") || lower.includes("machine learning") || lower.includes("computational")) cats.push("AI / Machine Learning");
  if (lower.includes("antibod") || lower.includes("adc")) cats.push("Antibodies");
  if (lower.includes("small molecule")) cats.push("Small Molecules");
  if (lower.includes("rna") || lower.includes("rnai") || lower.includes("mrna")) cats.push("RNA Therapeutics");
  if (lower.includes("diagnos")) cats.push("Diagnostics");
  if (lower.includes("drug delivery") || lower.includes("formulation")) cats.push("Drug Delivery");
  if (lower.includes("microbiome") || lower.includes("gut")) cats.push("Microbiome");
  if (lower.includes("radio") || lower.includes("nuclear")) cats.push("Radiopharmaceuticals");
  if (lower.includes("ophthalm") || lower.includes("eye") || lower.includes("retina")) cats.push("Ophthalmology");
  if (lower.includes("dermat") || lower.includes("skin")) cats.push("Dermatology");
  if (lower.includes("respirat") || lower.includes("lung") || lower.includes("pulmon")) cats.push("Respiratory");
  if (lower.includes("biolog")) cats.push("Biologics");
  if (lower.includes("genom") || lower.includes("genetic")) cats.push("Genetics & Genomics");
  if (lower.includes("proteom") || lower.includes("protein")) cats.push("Proteomics");
  if (lower.includes("synthetic bio")) cats.push("Synthetic Biology");
  if (lower.includes("regen")) cats.push("Regenerative Medicine");
  if (cats.length === 0) cats.push("Biotech");
  return cats.slice(0, 3);
}

async function main() {
  console.log("=== Import from biotech_companies_v2.docx ===\n");

  // Read the extracted JSON
  const raw = fs.readFileSync("/tmp/docx_companies.json", "utf-8");
  const companies: Array<{
    name: string; website: string; country: string;
    category: string; status: string; founded: string;
    stage: string; funding: string; description: string;
  }> = JSON.parse(raw);

  console.log(`Loaded ${companies.length} companies from document\n`);

  // Load existing for dedup
  const existing = await loadCompanies(supabase);
  const matcher = new CompanyMatcher(existing);
  const existingDomains = new Set<string>();
  for (const c of existing) {
    if (c.website) {
      const d = extractDomain(c.website);
      if (d) existingDomains.add(d);
    }
  }
  console.log(`Loaded ${existing.length} existing companies for dedup\n`);

  let matched = 0;
  let created = 0;
  let updated = 0;

  for (const co of companies) {
    if (!co.name) continue;

    const website = co.website ? (co.website.startsWith("http") ? co.website : `https://${co.website}`) : null;
    const domain = website ? extractDomain(website) : "";
    const country = COUNTRY_MAP[co.country] || co.country;
    const categories = mapCategories(co.category || "");
    const founded = parseInt(co.founded) || null;

    // Check if already exists
    const existingId = matcher.match(co.name);
    if (existingId) {
      // Update with the better description from the doc if current one is missing or shorter
      const { data: current } = await supabase.from("companies").select("description").eq("id", existingId).single();
      if (current && (!current.description || current.description.length < co.description.length)) {
        await supabase.from("companies").update({
          description: co.description,
          categories: categories,
          ...(founded ? { founded } : {}),
          ...(co.status === "Public" ? { company_type: "Public" } : {}),
        }).eq("id", existingId);
        updated++;
        console.log(`  ↑ Updated: ${co.name} (better description)`);
      } else {
        matched++;
      }
      continue;
    }

    // Check domain dedup
    if (domain && existingDomains.has(domain)) {
      matched++;
      continue;
    }

    // Create new company with the curated description
    const companyId = await createCompanyRecord(supabase, {
      name: co.name,
      country: country,
      website: website,
      description: co.description,
      categories: categories,
      founded: founded,
      company_type: co.status === "Public" ? "Public" : "Private",
      source: "curated-docx",
      source_url: null,
    });

    if (companyId) {
      created++;
      existingDomains.add(domain);
      console.log(`  ✓ Created: ${co.name} (${country}) — ${co.funding || "?"}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total in document: ${companies.length}`);
  console.log(`Already in DB: ${matched}`);
  console.log(`Updated with better descriptions: ${updated}`);
  console.log(`New companies created: ${created}`);
}

main().catch(console.error);
