/**
 * Scrape biotech startups from user-provided directory URLs.
 * Handles static HTML pages directly + JS-rendered pages via AI extraction.
 *
 * Usage: npx tsx scripts/scrape-startup-directories.ts
 *        npx tsx scripts/scrape-startup-directories.ts --dry-run
 *        npx tsx scripts/scrape-startup-directories.ts --source growthlist
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";
import { CompanyMatcher, loadCompanies } from "./lib/company-matcher";
import { createCompanyRecord, batchEnrichNewCompanies, extractDomain } from "./lib/company-discovery";
import { callDeepSeek, parseDeepSeekJSON } from "./lib/deepseek-client";

const DRY_RUN = process.argv.includes("--dry-run");
const SOURCE_FILTER = process.argv.find(a => a.startsWith("--source="))?.split("=")[1]
  || (process.argv.includes("--source") ? process.argv[process.argv.indexOf("--source") + 1] : undefined);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ScrapedCompany {
  name: string;
  website: string | null;
  description: string | null;
  country: string | null;
  city: string | null;
  founded: number | null;
  funding_amount: string | null;
  funding_round: string | null;
  source: string;
  source_url: string;
}

// ─── Fetch HTML helper ───
async function fetchHTML(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) { console.error(`  HTTP ${res.status} for ${url}`); return null; }
    return await res.text();
  } catch (err) {
    console.error(`  Fetch error for ${url}:`, (err as Error).message);
    return null;
  }
}

// ─── Strip HTML to text ───
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── AI extraction for any page ───
async function extractCompaniesWithAI(html: string, sourceUrl: string, sourceName: string, hint: string): Promise<ScrapedCompany[]> {
  const text = htmlToText(html).substring(0, 12000);
  if (text.length < 100) return [];

  const content = await callDeepSeek({
    system: "You extract biotech/pharma startup data from web pages. Return ONLY a JSON array.",
    prompt: `Extract ALL biotech/pharma company names and data from this ${hint} page.

URL: ${sourceUrl}
Page text (truncated):
${text}

For each company, extract what's available:
- name: company name (REQUIRED)
- website: URL if shown
- description: one-liner if available
- country: HQ country
- city: HQ city
- founded: year as integer
- funding_amount: e.g. "$50M" or "€10M"
- funding_round: e.g. "Series A", "Seed"

Return JSON array: [{"name":"...", "website":null, "description":null, "country":null, "city":null, "founded":null, "funding_amount":null, "funding_round":null}]
ONLY include actual biotech/pharma companies. Skip navigation, headers, ads, investors, service providers.
No markdown fences. Just the JSON array.`,
    temperature: 0,
    maxTokens: 4000,
  });

  if (!content) return [];
  const parsed = parseDeepSeekJSON<Array<Record<string, string | number | null>>>(content);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(c => c.name && typeof c.name === "string" && c.name.length > 1 && c.name.length < 100)
    .map(c => ({
      name: (c.name as string).trim(),
      website: (c.website as string) || null,
      description: (c.description as string) || null,
      country: (c.country as string) || null,
      city: (c.city as string) || null,
      founded: typeof c.founded === "number" ? c.founded : null,
      funding_amount: (c.funding_amount as string) || null,
      funding_round: (c.funding_round as string) || null,
      source: sourceName,
      source_url: sourceUrl,
    }));
}

// ─── Source scrapers ───

async function scrapeGrowthlist(): Promise<ScrapedCompany[]> {
  console.log("\n── growthlist.co (100 recently funded biotechs) ──");
  const html = await fetchHTML("https://growthlist.co/biotech-startups/");
  if (!html) return [];
  return extractCompaniesWithAI(html, "https://growthlist.co/biotech-startups/", "growthlist", "biotech startup funding table");
}

async function scrapeEuropeanBiotech(): Promise<ScrapedCompany[]> {
  console.log("\n── european-biotechnology.com (10 European startups to watch) ──");
  const html = await fetchHTML("https://european-biotechnology.com/background/10-european-startups-to-watch-in-2026/");
  if (!html) return [];
  return extractCompaniesWithAI(html, "https://european-biotechnology.com/background/10-european-startups-to-watch-in-2026/", "european-biotech", "European biotech startups article");
}

async function scrapeEIT(): Promise<ScrapedCompany[]> {
  console.log("\n── eit.europa.eu (6 EU biotech startups) ──");
  const html = await fetchHTML("https://www.eit.europa.eu/news-events/news/6-biotech-start-ups-developing-life-changing-innovations");
  if (!html) return [];
  return extractCompaniesWithAI(html, "https://www.eit.europa.eu/news-events/news/6-biotech-start-ups-developing-life-changing-innovations", "eit-europa", "EU biotech innovation article");
}

async function scrapeTopStartups(): Promise<ScrapedCompany[]> {
  console.log("\n── topstartups.io (biotech startups with funding data) ──");
  const html = await fetchHTML("https://topstartups.io/?industries=Biotech");
  if (!html) return [];
  return extractCompaniesWithAI(html, "https://topstartups.io/?industries=Biotech", "topstartups", "biotech startup directory with funding, investors, and valuations");
}

async function scrapeYCBiotech(): Promise<ScrapedCompany[]> {
  console.log("\n── Y Combinator biotech companies ──");
  const html = await fetchHTML("https://www.ycombinator.com/companies/industry/biotech");
  if (!html) return [];
  return extractCompaniesWithAI(html, "https://www.ycombinator.com/companies/industry/biotech", "yc-biotech", "Y Combinator biotech company directory");
}

async function scrapeYCHealthTech(): Promise<ScrapedCompany[]> {
  console.log("\n── Y Combinator health-tech companies ──");
  const html = await fetchHTML("https://www.ycombinator.com/companies/industry/health-tech");
  if (!html) return [];
  return extractCompaniesWithAI(html, "https://www.ycombinator.com/companies/industry/health-tech", "yc-healthtech", "Y Combinator health-tech company directory");
}

async function scrapeStartupMag(): Promise<ScrapedCompany[]> {
  console.log("\n── startupmag.co.uk (UK biotech startups) ──");
  const html = await fetchHTML("https://www.startupmag.co.uk/startups/biotech/");
  if (!html) return [];
  return extractCompaniesWithAI(html, "https://www.startupmag.co.uk/startups/biotech/", "startupmag-uk", "UK biotech startup directory with funding and location data");
}

async function scrapeBuiltIn(): Promise<ScrapedCompany[]> {
  console.log("\n── builtin.com (biotech companies, page 1) ──");
  const html = await fetchHTML("https://builtin.com/companies/type/biotech-companies");
  if (!html) return [];
  return extractCompaniesWithAI(html, "https://builtin.com/companies/type/biotech-companies", "builtin", "biotech company listings from a tech jobs platform");
}

// ─── Source map ───
const SOURCES: Record<string, () => Promise<ScrapedCompany[]>> = {
  growthlist: scrapeGrowthlist,
  "european-biotech": scrapeEuropeanBiotech,
  eit: scrapeEIT,
  topstartups: scrapeTopStartups,
  "yc-biotech": scrapeYCBiotech,
  "yc-healthtech": scrapeYCHealthTech,
  "startupmag": scrapeStartupMag,
  builtin: scrapeBuiltIn,
};

// ─── Main ───
async function main() {
  console.log("=== Biotech Startup Directory Scraper ===\n");
  if (DRY_RUN) console.log("🔍 DRY RUN — no changes\n");

  // Load existing companies for dedup
  console.log("Loading existing companies for dedup...");
  const existingCompanies = await loadCompanies(supabase);
  const matcher = new CompanyMatcher(existingCompanies);
  const existingDomains = new Set<string>();
  for (const c of existingCompanies) {
    if (c.website) {
      const d = extractDomain(c.website);
      if (d) existingDomains.add(d);
    }
  }
  console.log(`Loaded ${existingCompanies.length} companies, ${existingDomains.size} domains\n`);

  // Determine which sources to scrape
  const sourcesToRun = SOURCE_FILTER
    ? Object.entries(SOURCES).filter(([k]) => k === SOURCE_FILTER)
    : Object.entries(SOURCES);

  if (sourcesToRun.length === 0) {
    console.log(`Unknown source: ${SOURCE_FILTER}`);
    console.log(`Available: ${Object.keys(SOURCES).join(", ")}`);
    return;
  }

  const allNew: ScrapedCompany[] = [];
  let totalScraped = 0;
  let totalMatched = 0;

  for (const [name, scraper] of sourcesToRun) {
    try {
      const companies = await scraper();
      console.log(`  Found: ${companies.length} companies`);
      totalScraped += companies.length;

      for (const co of companies) {
        // Dedup by name
        if (matcher.match(co.name)) {
          totalMatched++;
          continue;
        }
        // Dedup by domain
        if (co.website) {
          const domain = extractDomain(co.website);
          if (domain && existingDomains.has(domain)) {
            totalMatched++;
            continue;
          }
        }
        // Dedup within this run
        if (allNew.some(n => n.name.toLowerCase() === co.name.toLowerCase())) continue;

        allNew.push(co);
      }
    } catch (err) {
      console.error(`  Error scraping ${name}:`, (err as Error).message);
    }

    // Rate limit between sources
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n=== Dedup Results ===`);
  console.log(`Total scraped: ${totalScraped}`);
  console.log(`Already in DB: ${totalMatched}`);
  console.log(`New companies: ${allNew.length}\n`);

  if (allNew.length === 0) {
    console.log("No new companies to add!");
    return;
  }

  // Print new companies
  for (const co of allNew) {
    console.log(`  [NEW] ${co.name}${co.country ? ` (${co.country})` : ""}${co.funding_amount ? ` — ${co.funding_amount}` : ""} [${co.source}]`);
  }

  if (DRY_RUN) {
    console.log(`\n🔍 DRY RUN complete. ${allNew.length} companies would be created.`);
    return;
  }

  // Create companies
  console.log(`\nCreating ${allNew.length} companies...`);
  const newIds: string[] = [];
  for (const co of allNew) {
    const companyId = await createCompanyRecord(supabase, {
      name: co.name,
      country: co.country,
      city: co.city,
      website: co.website,
      description: co.description,
      founded: co.founded,
      source: co.source,
      source_url: co.source_url,
    });
    if (companyId) {
      newIds.push(companyId);
      console.log(`  ✓ ${co.name}`);
    }
  }
  console.log(`\nCreated: ${newIds.length} companies`);

  // Enrich via DeepSeek
  if (newIds.length > 0) {
    console.log(`\nEnriching ${newIds.length} companies via DeepSeek...`);
    const enriched = await batchEnrichNewCompanies(supabase, newIds);
    console.log(`Enriched: ${enriched}`);
  }

  // Log to scrape_log
  await supabase.from("scrape_log").insert({
    source_id: "startup-directories",
    companies_found: totalScraped,
    companies_new: newIds.length,
    companies_enriched: newIds.length,
  });

  console.log("\n=== Done ===");
}

main().catch(console.error);
