/**
 * Layer 1: Recover orphan companies from funding_rounds.
 *
 * Finds company names in funding_rounds that have no matching company record,
 * creates them, enriches via DeepSeek, and links the orphan rounds back.
 *
 * Usage: npx tsx scripts/recover-orphan-companies.ts
 *        npx tsx scripts/recover-orphan-companies.ts --dry-run
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";
import { CompanyMatcher, loadCompanies } from "./lib/company-matcher";
import { createCompanyRecord, batchEnrichNewCompanies, normalizeCompanyName } from "./lib/company-discovery";

const DRY_RUN = process.argv.includes("--dry-run");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log("=== Layer 1: Orphan Company Recovery ===\n");
  if (DRY_RUN) console.log("🔍 DRY RUN — no changes will be made\n");

  // 1. Find orphan company names
  const orphanNames = new Map<string, { count: number; totalUsd: number; country: string | null }>();
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("funding_rounds")
      .select("company_name, amount_usd, country")
      .is("company_id", null)
      .gt("amount_usd", 0)
      .range(offset, offset + 999);

    if (!data || data.length === 0) break;
    for (const r of data) {
      const existing = orphanNames.get(r.company_name) || { count: 0, totalUsd: 0, country: null };
      existing.count++;
      existing.totalUsd += Number(r.amount_usd || 0);
      if (r.country && !existing.country) existing.country = r.country;
      orphanNames.set(r.company_name, existing);
    }
    offset += 1000;
    if (data.length < 1000) break;
  }

  console.log(`Found ${orphanNames.size} unique orphan company names\n`);

  // 2. Load existing companies for matching
  console.log("Loading existing companies...");
  const existingCompanies = await loadCompanies(supabase);
  const matcher = new CompanyMatcher(existingCompanies);
  console.log(`Loaded ${existingCompanies.length} companies for matching\n`);

  // 3. Try to match orphans to existing companies
  const matched: Array<{ name: string; companyId: string }> = [];
  const unmatched: Array<{ name: string; country: string | null; totalUsd: number }> = [];

  for (const [name, info] of orphanNames) {
    const companyId = matcher.match(name);
    if (companyId) {
      matched.push({ name, companyId });
    } else {
      unmatched.push({ name, country: info.country, totalUsd: info.totalUsd });
    }
  }

  console.log(`Matched to existing companies: ${matched.length}`);
  console.log(`Need new company records: ${unmatched.length}\n`);

  // 4. Link matched orphans
  let linkedMatched = 0;
  for (const m of matched) {
    if (DRY_RUN) {
      console.log(`  [DRY] Would link "${m.name}" → ${m.companyId}`);
      continue;
    }
    const { error } = await supabase
      .from("funding_rounds")
      .update({ company_id: m.companyId })
      .is("company_id", null)
      .eq("company_name", m.name);

    if (!error) {
      linkedMatched++;
    }
  }
  console.log(`Linked matched orphans: ${linkedMatched}\n`);

  // 5. Create new company records for unmatched
  // Sort by total funding (largest first — most important)
  unmatched.sort((a, b) => b.totalUsd - a.totalUsd);

  const newCompanyIds: string[] = [];
  const nameToId = new Map<string, string>();
  let created = 0;

  for (const u of unmatched) {
    if (DRY_RUN) {
      console.log(`  [DRY] Would create: ${u.name} (${u.country || "US"}) — $${Math.round(u.totalUsd / 1e6)}M total`);
      continue;
    }

    const companyId = await createCompanyRecord(supabase, {
      name: u.name,
      country: u.country || null,
      source: "funding_recovery",
    });

    if (companyId) {
      created++;
      newCompanyIds.push(companyId);
      nameToId.set(u.name, companyId);
      console.log(`  ✓ Created: ${u.name}`);
    }
  }

  console.log(`\nCreated ${created} new companies\n`);

  // 6. Link new companies to their orphan rounds
  let linkedNew = 0;
  for (const [name, companyId] of nameToId) {
    const { error } = await supabase
      .from("funding_rounds")
      .update({ company_id: companyId })
      .is("company_id", null)
      .eq("company_name", name);

    if (!error) linkedNew++;
  }
  console.log(`Linked new company rounds: ${linkedNew}\n`);

  // 7. Enrich new companies via DeepSeek
  if (newCompanyIds.length > 0 && !DRY_RUN) {
    console.log(`Enriching ${newCompanyIds.length} new companies via DeepSeek...\n`);
    const enriched = await batchEnrichNewCompanies(supabase, newCompanyIds);
    console.log(`Enriched: ${enriched} companies\n`);
  }

  // 8. Update total_raised for new companies
  if (!DRY_RUN && nameToId.size > 0) {
    console.log("Updating total_raised...");
    let updatedRaised = 0;
    for (const [, companyId] of nameToId) {
      const { data: rounds } = await supabase
        .from("funding_rounds")
        .select("amount_usd")
        .eq("company_id", companyId)
        .gt("amount_usd", 0);

      if (rounds && rounds.length > 0) {
        const total = rounds.reduce((s, r) => s + Number(r.amount_usd || 0), 0);
        await supabase.from("companies").update({ total_raised: total }).eq("id", companyId);
        updatedRaised++;
      }
    }
    console.log(`Updated total_raised for ${updatedRaised} companies\n`);
  }

  // Summary
  console.log("=== Summary ===");
  console.log(`Orphan company names found: ${orphanNames.size}`);
  console.log(`Matched to existing companies: ${matched.length} (${linkedMatched} rounds linked)`);
  console.log(`New companies created: ${created}`);
  console.log(`New company rounds linked: ${linkedNew}`);
  console.log(`Total orphan rounds resolved: ${linkedMatched + linkedNew}`);
}

main().catch(console.error);
