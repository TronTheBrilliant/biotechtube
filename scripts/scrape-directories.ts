/**
 * Master Directory Scraper — Layer 2
 *
 * Scrapes biotech companies from 30+ directories, VC portfolios,
 * accelerators, and clinical trial databases worldwide.
 *
 * Usage:
 *   npx tsx scripts/scrape-directories.ts                     # All enabled sources
 *   npx tsx scripts/scrape-directories.ts --source yc          # Single source
 *   npx tsx scripts/scrape-directories.ts --region europe      # Region filter
 *   npx tsx scripts/scrape-directories.ts --type vc            # Type filter
 *   npx tsx scripts/scrape-directories.ts --dry-run            # Preview only
 *   npx tsx scripts/scrape-directories.ts --limit 50           # Max companies per source
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";
import { CompanyMatcher, loadCompanies } from "./lib/company-matcher";
import { createCompanyRecord, batchEnrichNewCompanies, extractDomain } from "./lib/company-discovery";
import { getSources, ScraperSource } from "./lib/scraper-registry";
import { scrapeYC } from "./lib/scrapers/yc-api";
import { scrapeClinicalTrials } from "./lib/scrapers/clinicaltrials-api";
import { scrapePortfolioPage, ScrapedCompany } from "./lib/scrapers/generic-portfolio";

const DRY_RUN = process.argv.includes("--dry-run");
const sourceArg = process.argv.find((a) => a.startsWith("--source="))?.split("=")[1]
  || (process.argv.includes("--source") ? process.argv[process.argv.indexOf("--source") + 1] : undefined);
const regionArg = process.argv.find((a) => a.startsWith("--region="))?.split("=")[1]
  || (process.argv.includes("--region") ? process.argv[process.argv.indexOf("--region") + 1] : undefined);
const typeArg = process.argv.find((a) => a.startsWith("--type="))?.split("=")[1]
  || (process.argv.includes("--type") ? process.argv[process.argv.indexOf("--type") + 1] : undefined);
const limitArg = parseInt(
  process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1]
  || (process.argv.includes("--limit") ? process.argv[process.argv.indexOf("--limit") + 1] : "0")
  || "0"
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function scrapeSource(source: ScraperSource): Promise<ScrapedCompany[]> {
  switch (source.parser) {
    case "yc-api":
      return scrapeYC();
    case "clinicaltrials-api":
      return scrapeClinicalTrials(limitArg || 2000);
    case "generic-portfolio":
      return scrapePortfolioPage({ url: source.url, css: source.css });
    case "custom-html":
      // For custom sources, use the generic portfolio scraper with AI extraction
      return scrapePortfolioPage({ url: source.url });
    default:
      console.warn(`  Unknown parser: ${source.parser}`);
      return [];
  }
}

async function main() {
  console.log("=== Layer 2: Biotech Directory Scraper ===\n");
  if (DRY_RUN) console.log("🔍 DRY RUN — no changes will be made\n");

  // Get sources based on filters
  const sources = getSources({
    id: sourceArg,
    region: regionArg,
    type: typeArg,
    enabled: true,
  });

  if (sources.length === 0) {
    console.log("No matching sources found.");
    return;
  }

  console.log(`Sources to scrape: ${sources.length}`);
  for (const s of sources) console.log(`  • ${s.name} (${s.region}, ~${s.estimated_companies} companies)`);
  console.log();

  // Load existing companies for dedup
  console.log("Loading existing companies for deduplication...");
  const existingCompanies = await loadCompanies(supabase);
  const matcher = new CompanyMatcher(existingCompanies);

  // Also build a domain set for dedup
  const existingDomains = new Set<string>();
  for (const c of existingCompanies) {
    if (c.website) {
      const domain = extractDomain(c.website);
      if (domain) existingDomains.add(domain);
    }
  }
  console.log(`Loaded ${existingCompanies.length} companies, ${existingDomains.size} domains\n`);

  const totalStats = { sources: 0, scraped: 0, matched: 0, created: 0, enriched: 0, errors: 0 };

  for (const source of sources) {
    console.log(`\n── ${source.name} ──`);
    totalStats.sources++;

    try {
      const companies = await scrapeSource(source);
      console.log(`  Scraped: ${companies.length} companies`);

      if (companies.length === 0) {
        // Log to scrape_log
        if (!DRY_RUN) {
          await supabase.from("scrape_log").insert({
            source_id: source.id,
            companies_found: 0,
            companies_new: 0,
            companies_enriched: 0,
          });
        }
        continue;
      }

      const limit = limitArg > 0 ? limitArg : companies.length;
      const toProcess = companies.slice(0, limit);
      let sourceMatched = 0;
      let sourceCreated = 0;
      const newIds: string[] = [];

      for (const company of toProcess) {
        totalStats.scraped++;

        // Dedup: check by name
        const existingId = matcher.match(company.name);
        if (existingId) {
          sourceMatched++;
          totalStats.matched++;
          continue;
        }

        // Dedup: check by domain
        if (company.website) {
          const domain = extractDomain(company.website);
          if (domain && existingDomains.has(domain)) {
            sourceMatched++;
            totalStats.matched++;
            continue;
          }
        }

        if (DRY_RUN) {
          console.log(`  [NEW] ${company.name}${company.website ? ` (${company.website})` : ""}`);
          sourceCreated++;
          totalStats.created++;
          continue;
        }

        // Create company
        const companyId = await createCompanyRecord(supabase, {
          name: company.name,
          country: company.country,
          city: company.city,
          website: company.website,
          description: company.description,
          source: source.id,
          source_url: company.source_url,
        });

        if (companyId) {
          sourceCreated++;
          totalStats.created++;
          newIds.push(companyId);

          // Add domain to dedup set
          if (company.website) {
            const domain = extractDomain(company.website);
            if (domain) existingDomains.add(domain);
          }
        }
      }

      console.log(`  Already known: ${sourceMatched} | New: ${sourceCreated}`);

      // Enrich new companies
      if (newIds.length > 0 && !DRY_RUN) {
        console.log(`  Enriching ${newIds.length} new companies...`);
        const enriched = await batchEnrichNewCompanies(supabase, newIds);
        totalStats.enriched += enriched;
        console.log(`  Enriched: ${enriched}`);
      }

      // Log to scrape_log
      if (!DRY_RUN) {
        await supabase.from("scrape_log").insert({
          source_id: source.id,
          companies_found: companies.length,
          companies_new: sourceCreated,
          companies_enriched: newIds.length,
        });
      }
    } catch (err) {
      totalStats.errors++;
      console.error(`  ✗ Error scraping ${source.name}:`, (err as Error).message);
      if (!DRY_RUN) {
        await supabase.from("scrape_log").insert({
          source_id: source.id,
          companies_found: 0,
          companies_new: 0,
          companies_enriched: 0,
          error: (err as Error).message,
        });
      }
    }

    // Pause between sources
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("\n=== Summary ===");
  console.log(`Sources scraped: ${totalStats.sources}`);
  console.log(`Companies found: ${totalStats.scraped}`);
  console.log(`Already in DB: ${totalStats.matched}`);
  console.log(`New companies: ${totalStats.created}`);
  console.log(`Enriched: ${totalStats.enriched}`);
  console.log(`Errors: ${totalStats.errors}`);
}

main().catch(console.error);
