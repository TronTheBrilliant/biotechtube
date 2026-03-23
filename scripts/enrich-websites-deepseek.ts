#!/usr/bin/env npx tsx
/**
 * Enrich missing company websites using DeepSeek API
 * Finds companies with tickers but no website, asks DeepSeek for their domain,
 * then updates the database with website, domain, and logo_url.
 *
 * Usage: npx tsx scripts/enrich-websites-deepseek.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DEEPSEEK_API_KEY) {
  console.error("Missing DEEPSEEK_API_KEY in .env.local");
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface CompanyRow {
  id: string;
  name: string;
  ticker: string;
  country: string | null;
}

async function askDeepSeek(companies: CompanyRow[]): Promise<Record<string, string>> {
  const prompt = companies
    .map((c) => `${c.name} (${c.ticker}${c.country ? ", " + c.country : ""})`)
    .join("\n");

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
          content:
            "You are a biotech/pharma company domain lookup assistant. Given company names and tickers, return their primary website domain (e.g. lilly.com, roche.com). Return ONLY a JSON object mapping company name to domain. No explanations. If you don't know a domain, omit it.",
        },
        {
          role: "user",
          content: `Return the website domains for these biotech/pharma companies as JSON:\n\n${prompt}`,
        },
      ],
      temperature: 0,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`DeepSeek API error: ${response.status} ${text}`);
    return {};
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Extract JSON from response (might be wrapped in ```json ... ```)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Could not parse JSON from DeepSeek response:", content.slice(0, 200));
    return {};
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error("JSON parse error:", jsonMatch[0].slice(0, 200));
    return {};
  }
}

async function main() {
  console.log("\n🔍 Company Website Enrichment (DeepSeek)");
  console.log("=========================================\n");

  // Fetch all companies missing website
  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, ticker, country")
    .is("website", null)
    .not("ticker", "is", null)
    .order("name");

  if (error) {
    console.error("Supabase error:", error.message);
    process.exit(1);
  }

  if (!companies || companies.length === 0) {
    console.log("No companies need enrichment!");
    return;
  }

  console.log(`Found ${companies.length} companies missing websites\n`);

  // Process in batches of 20 (to fit in DeepSeek context)
  const BATCH_SIZE = 20;
  let enriched = 0;
  let failed = 0;

  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, i + BATCH_SIZE) as CompanyRow[];
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(companies.length / BATCH_SIZE);

    console.log(`[${batchNum}/${totalBatches}] Processing ${batch.length} companies...`);

    const domains = await askDeepSeek(batch);
    const domainCount = Object.keys(domains).length;

    if (domainCount === 0) {
      console.log(`  ⚠️ No domains returned for this batch`);
      failed += batch.length;
      continue;
    }

    // Update each company
    for (const company of batch) {
      const domain = domains[company.name];
      if (!domain || typeof domain !== "string" || !domain.includes(".")) {
        failed++;
        continue;
      }

      // Clean domain
      const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
      const website = `https://${cleanDomain}`;
      const logoUrl = `https://img.logo.dev/${cleanDomain}?token=pk_FNHUWoZORpiR_7j_vzFnmQ`;

      const { error: updateError } = await supabase
        .from("companies")
        .update({
          website,
          domain: cleanDomain,
          logo_url: logoUrl,
        })
        .eq("id", company.id);

      if (updateError) {
        console.error(`  ❌ ${company.name}: ${updateError.message}`);
        failed++;
      } else {
        enriched++;
      }
    }

    console.log(`  ✅ ${domainCount} domains found, ${enriched} total enriched`);

    // Rate limit: wait 1 second between batches
    if (i + BATCH_SIZE < companies.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`\n=========================================`);
  console.log(`🏁 Enrichment Complete`);
  console.log(`Enriched: ${enriched}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${companies.length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
