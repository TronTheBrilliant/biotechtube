#!/usr/bin/env npx tsx
/**
 * Initialize profile_quality scores for all companies.
 *
 * Calculates an initial quality score based on existing data completeness
 * and upserts into the profile_quality table.
 *
 * Usage: npx tsx scripts/init-profile-quality.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

interface CompanyRow {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  country: string | null;
  city: string | null;
  founded: number | null;
  categories: string[] | null;
  ticker: string | null;
}

function calculateInitialScore(company: CompanyRow): { score: number; issues: string[] } {
  let score = 0;
  const issues: string[] = [];

  // Has description? (+2)
  if (company.description && company.description.length > 0) {
    score += 2;
    // Description > 200 chars? (+1)
    if (company.description.length > 200) {
      score += 1;
    } else {
      issues.push("short_description");
    }
  } else {
    issues.push("missing_description");
  }

  // Has website? (+1)
  if (company.website && company.website.trim() !== "") {
    score += 1;
  } else {
    issues.push("missing_website");
  }

  // Has logo_url? (+0.5)
  if (company.logo_url) {
    score += 0.5;
  } else {
    issues.push("missing_logo");
  }

  // Has country AND city? (+1)
  if (company.country) {
    score += 0.5;
  } else {
    issues.push("missing_country");
  }
  if (company.city) {
    score += 0.5;
  } else {
    issues.push("missing_city");
  }

  // Has founded year? (+0.5)
  if (company.founded) {
    score += 0.5;
  } else {
    issues.push("missing_founded");
  }

  // Has categories/sectors? (+0.5)
  if (company.categories && company.categories.length > 0) {
    score += 0.5;
  } else {
    issues.push("missing_categories");
  }

  // Has ticker (public company)? (+0.5)
  if (company.ticker) {
    score += 0.5;
  }

  return { score: Math.min(score, 10), issues };
}

async function main() {
  console.log("Initializing profile quality scores...\n");

  // Fetch companies in batches
  const PAGE_SIZE = 1000;
  let offset = 0;
  let totalProcessed = 0;
  let totalUpserted = 0;
  const scoreBuckets = { low: 0, mid: 0, high: 0 };

  while (true) {
    const { data: companies, error } = await supabase
      .from("companies")
      .select("id, name, description, website, logo_url, country, city, founded, categories, ticker")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching companies:", error.message);
      break;
    }
    if (!companies || companies.length === 0) break;

    const rows = companies.map((c: CompanyRow) => {
      const { score, issues } = calculateInitialScore(c);
      let nextCheck: Date;
      if (score <= 3) {
        nextCheck = new Date(); // immediate
        scoreBuckets.low++;
      } else if (score <= 6) {
        nextCheck = addDays(new Date(), 7);
        scoreBuckets.mid++;
      } else {
        nextCheck = addDays(new Date(), 30);
        scoreBuckets.high++;
      }

      return {
        company_id: c.id,
        quality_score: score,
        last_checked_at: new Date().toISOString(),
        next_check_at: nextCheck.toISOString(),
        issues,
        changes_log: [],
        check_count: 1,
        website_verified: false,
        logo_verified: false,
        description_source: c.description ? "deepseek_initial" : null,
        updated_at: new Date().toISOString(),
      };
    });

    // Upsert in chunks of 500
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error: upsertError } = await supabase
        .from("profile_quality")
        .upsert(chunk, { onConflict: "company_id" });

      if (upsertError) {
        console.error(`Upsert error at offset ${offset + i}:`, upsertError.message);
      } else {
        totalUpserted += chunk.length;
      }
    }

    totalProcessed += companies.length;
    process.stdout.write(`\r  Processed: ${totalProcessed} companies`);

    if (companies.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  console.log(`\n\nDone! Upserted ${totalUpserted} profile quality records.`);
  console.log(`\nScore distribution:`);
  console.log(`  Low (0-3):  ${scoreBuckets.low} companies — immediate priority`);
  console.log(`  Mid (4-6):  ${scoreBuckets.mid} companies — check in 7 days`);
  console.log(`  High (7-10): ${scoreBuckets.high} companies — check in 30 days`);

  // Print sample scores
  const { data: samples } = await supabase
    .from("profile_quality")
    .select("company_id, quality_score, issues")
    .order("quality_score", { ascending: true })
    .limit(5);

  if (samples && samples.length > 0) {
    console.log("\nLowest-scored companies:");
    for (const s of samples) {
      console.log(`  Score ${s.quality_score}: issues=[${s.issues.join(", ")}]`);
    }
  }
}

main().catch(console.error);
