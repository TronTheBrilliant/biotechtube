/**
 * Scrape BioPharmGuy Additional Locations + Startups by Year
 * Only scrapes pages NOT in the original US+Europe batch.
 *
 * Usage: npx tsx scripts/scrape-bpg-additional.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";
import { parseBPGPage } from "./parse-bpg";
import { CompanyMatcher, loadCompanies } from "./lib/company-matcher";
import { createCompanyRecord, batchEnrichNewCompanies, extractDomain } from "./lib/company-discovery";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const LOGO_TOKEN = "pk_FNHUWoZORpiR_7j_vzFnmQ";

// Only the NEW pages (Additional Locations + Startups by Year)
const PAGES = [
  // Additional Locations
  { url: "https://biopharmguy.com/links/province-all-geo.php", country: "Canada" },
  { url: "https://biopharmguy.com/links/company-by-location-china.php", country: "China" },
  { url: "https://biopharmguy.com/links/company-by-location-japan.php", country: "Japan" },
  { url: "https://biopharmguy.com/links/company-by-location-india.php", country: "India" },
  { url: "https://biopharmguy.com/links/company-by-location-australia.php", country: "Australia" },
  { url: "https://biopharmguy.com/links/company-by-location-taiwan.php", country: "Taiwan" },
  { url: "https://biopharmguy.com/links/company-by-location-singapore.php", country: "Singapore" },
  { url: "https://biopharmguy.com/links/company-by-location-asia.php", country: "South Korea" }, // Asia-Other catches Korea, Thailand, etc.
  { url: "https://biopharmguy.com/links/company-by-location-middle-east.php", country: "Israel" },
  { url: "https://biopharmguy.com/links/company-by-location-brazil.php", country: "Brazil" },
  { url: "https://biopharmguy.com/links/company-by-location-argentina.php", country: "Argentina" },
  { url: "https://biopharmguy.com/links/company-by-location-mexico.php", country: "Mexico" },
  { url: "https://biopharmguy.com/links/company-by-location-south-america.php", country: "South America" },
  { url: "https://biopharmguy.com/links/company-by-location-africa.php", country: "Africa" },
  { url: "https://biopharmguy.com/links/company-by-location-south-africa.php", country: "South Africa" },
  { url: "https://biopharmguy.com/links/company-by-location-new-zealand.php", country: "New Zealand" },
  { url: "https://biopharmguy.com/links/company-by-location-russia.php", country: "Russia" },
  // Startups by Year
  { url: "https://biopharmguy.com/links/company-by-location-2025.php", country: "United States" },
  { url: "https://biopharmguy.com/links/company-by-location-2024.php", country: "United States" },
  { url: "https://biopharmguy.com/links/company-by-location-2023.php", country: "United States" },
  { url: "https://biopharmguy.com/links/company-by-location-2022.php", country: "United States" },
  { url: "https://biopharmguy.com/links/company-by-location-2021.php", country: "United States" },
];

async function main() {
  console.log("=== BioPharmGuy: Additional Locations + Startups by Year ===\n");

  // Load existing companies for dedup
  console.log("Loading existing companies for dedup...");
  const existing = await loadCompanies(supabase);
  const matcher = new CompanyMatcher(existing);
  const existingDomains = new Set<string>();
  for (const c of existing) {
    if (c.website) {
      const d = extractDomain(c.website);
      if (d) existingDomains.add(d);
    }
  }
  console.log(`Loaded ${existing.length} companies, ${existingDomains.size} domains\n`);

  const allNew: Array<{
    name: string; city: string; country: string;
    website: string; domain: string; sourceUrl: string;
  }> = [];
  const globalSeen = new Set<string>(); // dedup by domain across pages
  let totalScraped = 0;
  let totalSkipped = 0;

  for (const page of PAGES) {
    console.log(`📄 ${page.country} — ${page.url}`);

    try {
      const res = await fetch(page.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) {
        console.error(`   ✗ HTTP ${res.status}`);
        continue;
      }

      const html = await res.text();
      const parsed = parseBPGPage(html);
      totalScraped += parsed.length;

      let pageNew = 0;
      for (const company of parsed) {
        // Skip if already seen in this run
        if (globalSeen.has(company.domain)) continue;
        globalSeen.add(company.domain);

        // Skip if already in our DB (by name or domain)
        if (matcher.match(company.name)) { totalSkipped++; continue; }
        if (existingDomains.has(company.domain)) { totalSkipped++; continue; }

        pageNew++;
        allNew.push({
          name: company.name,
          city: company.city,
          country: page.country,
          website: company.website,
          domain: company.domain,
          sourceUrl: page.url,
        });
      }

      console.log(`   → ${parsed.length} found, ${pageNew} new`);
    } catch (err) {
      console.error(`   ✗ Error: ${(err as Error).message}`);
    }

    // Be polite to BPG servers
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\n=== Scraping Complete ===`);
  console.log(`Total scraped: ${totalScraped}`);
  console.log(`Already in DB: ${totalSkipped}`);
  console.log(`New companies: ${allNew.length}\n`);

  if (allNew.length === 0) {
    console.log("No new companies to add!");
    return;
  }

  // Create companies
  console.log(`Creating ${allNew.length} companies...\n`);
  const newIds: string[] = [];

  for (const co of allNew) {
    const companyId = await createCompanyRecord(supabase, {
      name: co.name,
      country: co.country,
      city: co.city || null,
      website: co.website,
      source: "biopharmguy",
      source_url: co.sourceUrl,
    });

    if (companyId) {
      newIds.push(companyId);

      // Also update domain and logo directly (BPG gives us the domain)
      await supabase.from("companies").update({
        domain: co.domain,
        logo_url: `https://img.logo.dev/${co.domain}?token=${LOGO_TOKEN}&size=64`,
      }).eq("id", companyId);
    }
  }

  console.log(`Created: ${newIds.length} companies\n`);

  // Enrich via DeepSeek
  if (newIds.length > 0) {
    console.log(`Enriching ${newIds.length} companies via DeepSeek...\n`);
    const enriched = await batchEnrichNewCompanies(supabase, newIds);
    console.log(`Enriched: ${enriched}\n`);
  }

  // Cross-reference: link to existing pipeline data
  console.log("Cross-referencing with existing pipeline data...");
  let pipelineLinked = 0;
  for (const id of newIds) {
    const { data: co } = await supabase.from("companies").select("name").eq("id", id).single();
    if (!co) continue;

    // Check if any pipelines mention this company
    const { data: pipes } = await supabase
      .from("pipelines")
      .select("id")
      .ilike("company_name", co.name)
      .is("company_id", null)
      .limit(50);

    if (pipes && pipes.length > 0) {
      await supabase
        .from("pipelines")
        .update({ company_id: id })
        .ilike("company_name", co.name)
        .is("company_id", null);
      pipelineLinked += pipes.length;
    }
  }
  console.log(`Linked ${pipelineLinked} pipeline programs to new companies\n`);

  // Cross-reference: link to existing funding rounds
  console.log("Cross-referencing with funding rounds...");
  let fundingLinked = 0;
  for (const id of newIds) {
    const { data: co } = await supabase.from("companies").select("name").eq("id", id).single();
    if (!co) continue;

    const { data: rounds } = await supabase
      .from("funding_rounds")
      .select("id")
      .ilike("company_name", co.name)
      .is("company_id", null)
      .limit(20);

    if (rounds && rounds.length > 0) {
      await supabase
        .from("funding_rounds")
        .update({ company_id: id })
        .ilike("company_name", co.name)
        .is("company_id", null);
      fundingLinked += rounds.length;
    }
  }
  console.log(`Linked ${fundingLinked} funding rounds to new companies\n`);

  // Log
  await supabase.from("scrape_log").insert({
    source_id: "biopharmguy-additional",
    companies_found: totalScraped,
    companies_new: newIds.length,
    companies_enriched: newIds.length,
  });

  console.log("=== Done ===");
  console.log(`New companies: ${newIds.length}`);
  console.log(`Pipeline programs linked: ${pipelineLinked}`);
  console.log(`Funding rounds linked: ${fundingLinked}`);
}

main().catch(console.error);
