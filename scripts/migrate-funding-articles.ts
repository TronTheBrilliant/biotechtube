/**
 * One-time migration: funding_articles → articles table
 *
 * Converts plain-text funding articles into TipTap JSON format
 * and upserts them into the new unified articles table.
 *
 * Usage:
 *   npx tsx scripts/migrate-funding-articles.ts
 *   npx tsx scripts/migrate-funding-articles.ts --dry-run
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DRY_RUN = process.argv.includes("--dry-run");

// ── Article styles matching the generate-articles cron rotation ──

const STYLE_ROTATION: Array<
  "investor_lens" | "market_analyst" | "editorial_narrative" | "deal_spotlight" | "data_digest"
> = [
  "investor_lens",
  "market_analyst",
  "investor_lens",
  "editorial_narrative",
  "deal_spotlight",
];

// ── Placeholder styles per deal size ──

function getPlaceholderStyle(dealSize: string) {
  const styles: Record<string, { pattern: string; accentColor: string; icon: string }> = {
    mega: { pattern: "burst", accentColor: "#EF4444", icon: "trending-up" },
    growth: { pattern: "bars", accentColor: "#10B981", icon: "trending-up" },
    early: { pattern: "grid", accentColor: "#3B82F6", icon: "trending-up" },
    seed: { pattern: "hexgrid", accentColor: "#06B6D4", icon: "trending-up" },
    micro: { pattern: "circles", accentColor: "#8B5CF6", icon: "trending-up" },
  };
  return styles[dealSize] || styles.early;
}

// ── Deal size helper ──

function dealSizeCategory(amount: number | null): string {
  if (!amount) return "micro";
  if (amount >= 500_000_000) return "mega";
  if (amount >= 100_000_000) return "growth";
  if (amount >= 30_000_000) return "early";
  if (amount >= 10_000_000) return "seed";
  return "micro";
}

// ── Convert plain text body to TipTap JSON ──

function bodyToTipTap(body: string): object {
  const paragraphs = body
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const content = paragraphs.map((text) => {
    // Handle **bold** markers
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    const textNodes: any[] = [];

    for (const part of parts) {
      if (!part) continue;
      if (part.startsWith("**") && part.endsWith("**")) {
        textNodes.push({
          type: "text",
          text: part.slice(2, -2),
          marks: [{ type: "bold" }],
        });
      } else {
        textNodes.push({ type: "text", text: part });
      }
    }

    if (textNodes.length === 0) {
      textNodes.push({ type: "text", text: "" });
    }

    return { type: "paragraph", content: textNodes };
  });

  if (content.length === 0) {
    content.push({
      type: "paragraph",
      content: [{ type: "text", text: "Article content unavailable." }],
    });
  }

  return { type: "doc", content };
}

// ── Generate hero image prompt ──

function generateImagePrompt(companyName: string, sector: string | null, roundType: string | null): string {
  const sectorHint = sector ? ` Subtle visual nods to ${sector} sector.` : "";
  return `A premium editorial illustration for a biotech market intelligence article. Navy blue (#0A1628) background with subtle emerald green (#10B981) accents. Bloomberg Businessweek aesthetic — clean, geometric, sophisticated. Abstract and conceptual. NO text, NO words, NO letters, NO numbers rendered in the image. Professional, data-driven feel.\n\nTopic context: ${companyName} ${roundType || "funding"} deal\n\nVisual direction: Abstract representation of capital flow — geometric shapes suggesting growth, upward momentum, interconnected nodes representing investor networks. Golden accent highlights.${sectorHint}`;
}

// ── Main ──

async function main() {
  console.log(`\n=== Migrate funding_articles → articles ===`);
  if (DRY_RUN) console.log("  (dry run — no writes)\n");

  // 1. Fetch all funding_articles
  const { data: articles, error } = await supabase
    .from("funding_articles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch funding_articles:", error.message);
    process.exit(1);
  }

  if (!articles || articles.length === 0) {
    console.log("No funding_articles found. Nothing to migrate.");
    return;
  }

  console.log(`Found ${articles.length} funding articles to migrate.\n`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < articles.length; i++) {
    const fa = articles[i];

    // Convert body to TipTap
    const tipTapBody = bodyToTipTap(fa.body || "");

    // Generate summary from first 200 chars of body
    const rawBody = fa.body || "";
    const summary = rawBody.length > 200 ? rawBody.substring(0, 200).trim() + "..." : rawBody;

    // Pick article style from rotation
    const articleStyle = STYLE_ROTATION[i % STYLE_ROTATION.length];

    // Deal size
    const dealSize = dealSizeCategory(fa.amount_usd);

    // Image prompt and placeholder
    const heroImagePrompt = generateImagePrompt(
      fa.company_name || "Biotech company",
      fa.sector,
      fa.round_type
    );
    const heroPlaceholderStyle = getPlaceholderStyle(dealSize);

    // Build the articles table row
    const row: Record<string, any> = {
      slug: fa.slug,
      type: "funding_deal",
      status: "published",
      confidence: "high",
      headline: fa.headline,
      subtitle: fa.subtitle || null,
      body: tipTapBody,
      summary,
      hero_image_prompt: heroImagePrompt,
      hero_placeholder_style: heroPlaceholderStyle,
      company_id: fa.company_id || null,
      company_ids: fa.company_id ? [fa.company_id] : [],
      sector: fa.sector || null,
      article_style: articleStyle,
      metadata: {
        amount_usd: fa.amount_usd,
        round_type: fa.round_type,
        lead_investor: fa.lead_investor,
        funding_round_id: fa.funding_round_id,
        deal_size_category: dealSize,
        migrated_from: "funding_articles",
      },
      published_at: fa.published_at || fa.created_at,
      created_at: fa.created_at || fa.published_at,
      edited_by: "ai",
      reading_time_min: Math.max(1, Math.ceil((rawBody.split(/\s+/).length || 0) / 200)),
      sources: [],
    };

    if (DRY_RUN) {
      console.log(`[${i + 1}/${articles.length}] Would migrate: ${fa.slug}`);
      migrated++;
      continue;
    }

    // Upsert — on conflict with slug, skip
    const { error: insertError } = await (supabase.from as any)("articles").upsert(row, {
      onConflict: "slug",
      ignoreDuplicates: true,
    });

    if (insertError) {
      console.error(`[${i + 1}/${articles.length}] ERROR ${fa.slug}: ${insertError.message}`);
      errors++;
    } else {
      migrated++;
      if ((i + 1) % 10 === 0 || i === articles.length - 1) {
        console.log(`Migrated ${i + 1} of ${articles.length} articles`);
      }
    }
  }

  console.log(`\n=== Migration complete ===`);
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Errors:   ${errors}`);
  console.log(`  Total:    ${articles.length}\n`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
