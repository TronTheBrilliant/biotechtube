/**
 * Enrich commercial products for companies that likely have marketed products
 * but don't have any in our commercial_products table yet.
 *
 * Targets: public companies + large private companies without commercial products.
 * Uses DeepSeek API for cost-effective bulk enrichment.
 *
 * Usage: npx tsx scripts/enrich-commercial-products.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface ProductResult {
  brand_name: string;
  generic_name: string | null;
  product_type: string;
  therapeutic_area: string | null;
  indication_primary: string | null;
  mechanism_of_action: string | null;
  commercial_status: string;
  first_approval_year: number | null;
  description: string | null;
}

async function callDeepSeek(prompt: string): Promise<string> {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are a pharmaceutical industry expert. When asked about a biotech/pharma company, list their approved/marketed commercial products. Return ONLY valid JSON array. If the company has no marketed products (pre-revenue, development stage), return an empty array [].

Each product object must have:
{
  "brand_name": "PRODUCT NAME®",
  "generic_name": "generic name" or null,
  "product_type": "drug"|"biologic"|"vaccine"|"biosimilar"|"generic"|"device"|"diagnostic",
  "therapeutic_area": "Oncology"|"Infectious Diseases"|"Rare Diseases"|"CNS"|"Cardiovascular"|"Immunology"|"Dermatology"|"Ophthalmology"|"Metabolic"|"Respiratory"|"Hematology"|"Other",
  "indication_primary": "main approved indication",
  "mechanism_of_action": "brief mechanism" or null,
  "commercial_status": "marketed"|"mature"|"declining",
  "first_approval_year": 2020 or null,
  "description": "One sentence description of the product and its significance" or null
}

RULES:
- Only include products that are CURRENTLY marketed/sold (not discontinued)
- Include products approved by ANY major regulator (FDA, EMA, PMDA, etc.)
- Maximum 10 products per company (focus on most important ones)
- Return ONLY the JSON array, no markdown fences, no explanation`
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "[]";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[®™©]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+$/g, "")
    .replace(/^-+/, "");
}

async function enrichCompany(company: { id: string; name: string; ticker: string | null; country: string | null; description: string | null }) {
  const prompt = `Company: ${company.name}${company.ticker ? ` (${company.ticker})` : ""}${company.country ? `, ${company.country}` : ""}
${company.description ? `Description: ${company.description.substring(0, 200)}` : ""}

List all currently marketed/approved commercial products for this company.`;

  try {
    const responseText = await callDeepSeek(prompt);

    // Parse JSON, handling potential markdown fences
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    const products: ProductResult[] = JSON.parse(cleanJson);

    if (!Array.isArray(products) || products.length === 0) {
      return 0;
    }

    let inserted = 0;
    for (const product of products.slice(0, 10)) {
      if (!product.brand_name) continue;

      const slug = slugify(product.brand_name) + "-" + slugify(company.name).substring(0, 20);

      const { error } = await supabase
        .from("commercial_products")
        .upsert({
          slug,
          brand_name: product.brand_name,
          generic_name: product.generic_name || null,
          company_id: company.id,
          company_name: company.name,
          product_type: product.product_type || "drug",
          therapeutic_area: product.therapeutic_area || null,
          indication_primary: product.indication_primary || null,
          indications: product.indication_primary ? [product.indication_primary] : null,
          mechanism_of_action: product.mechanism_of_action || null,
          commercial_status: product.commercial_status || "marketed",
          first_approval_date: product.first_approval_year ? `${product.first_approval_year}-01-01` : null,
          description: product.description || null,
          source: "deepseek",
          confidence: "medium",
          enriched_at: new Date().toISOString(),
        }, { onConflict: "slug" });

      if (!error) inserted++;
    }

    return inserted;
  } catch (err) {
    console.error(`  Error for ${company.name}:`, (err as Error).message);
    return 0;
  }
}

async function main() {
  console.log("=== Commercial Products Enrichment ===\n");

  // Fetch companies that need enrichment
  // Priority 1: Public companies without commercial products
  const { data: publicCompanies } = await supabase
    .from("companies")
    .select("id, name, ticker, country, description")
    .not("ticker", "is", null)
    .eq("commercial_product_count", 0)
    .order("valuation", { ascending: false, nullsFirst: false })
    .limit(1300);

  // Priority 2: Large private companies
  const { data: largePrivate } = await supabase
    .from("companies")
    .select("id, name, ticker, country, description")
    .is("ticker", null)
    .eq("commercial_product_count", 0)
    .gt("valuation", 1000000000)
    .order("valuation", { ascending: false })
    .limit(50);

  const companies = [...(publicCompanies || []), ...(largePrivate || [])];
  console.log(`Found ${companies.length} companies to enrich`);
  console.log(`  ${publicCompanies?.length || 0} public companies`);
  console.log(`  ${largePrivate?.length || 0} large private companies\n`);

  let totalProducts = 0;
  let companiesWithProducts = 0;
  let processed = 0;
  const startTime = Date.now();

  // Process in batches of 5 with rate limiting
  const BATCH_SIZE = 5;
  const DELAY_MS = 1200; // 1.2 seconds between batches

  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map((company) => enrichCompany(company))
    );

    for (let j = 0; j < results.length; j++) {
      processed++;
      const count = results[j];
      if (count > 0) {
        totalProducts += count;
        companiesWithProducts++;
        console.log(`  ✓ ${batch[j].name}: ${count} products`);
      }

      if (processed % 50 === 0) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const rate = processed / (elapsed || 1);
        const remaining = Math.round((companies.length - processed) / rate);
        console.log(`\n--- Progress: ${processed}/${companies.length} (${companiesWithProducts} with products, ${totalProducts} total) | ${elapsed}s elapsed | ~${remaining}s remaining ---\n`);
      }
    }

    // Rate limit
    if (i + BATCH_SIZE < companies.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  // Update company commercial_product_count
  console.log("\nUpdating company product counts...");
  await supabase.rpc("execute_sql" as never, {
    query: `UPDATE companies c SET commercial_product_count = (
      SELECT COUNT(*) FROM commercial_products cp WHERE cp.company_id = c.id
    ) WHERE id IN (SELECT DISTINCT company_id FROM commercial_products WHERE company_id IS NOT NULL)`
  });

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n=== Done ===`);
  console.log(`Processed: ${processed} companies`);
  console.log(`Companies with products: ${companiesWithProducts}`);
  console.log(`Total products added: ${totalProducts}`);
  console.log(`Time: ${elapsed}s`);
}

main().catch(console.error);
