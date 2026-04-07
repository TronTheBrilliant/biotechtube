/**
 * Generate AI articles for recent funding rounds.
 * Creates short, insightful articles about biotech funding activity.
 * Targets rounds $10M+ that don't have articles yet.
 *
 * Usage: npx tsx scripts/generate-funding-articles.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/g, "").replace(/^-+/, "").substring(0, 80);
}

function dealSizeCategory(amount: number): string {
  if (amount >= 500_000_000) return "mega";
  if (amount >= 100_000_000) return "growth";
  if (amount >= 30_000_000) return "early";
  if (amount >= 10_000_000) return "seed";
  return "micro";
}

interface RoundWithCompany {
  id: string;
  company_id: string;
  company_name: string;
  round_type: string;
  amount_usd: number;
  lead_investor: string | null;
  announced_date: string;
  country: string | null;
  sector: string | null;
  company_slug: string | null;
  company_description: string | null;
  company_categories: string[] | null;
}

async function generateArticle(round: RoundWithCompany): Promise<{ headline: string; subtitle: string; body: string; sector?: string } | null> {
  const amountStr = round.amount_usd >= 1e9
    ? `$${(round.amount_usd / 1e9).toFixed(1)}B`
    : `$${(round.amount_usd / 1e6).toFixed(0)}M`;

  const prompt = `Write a short, professional biotech funding article (250-350 words) about this funding round:

Company: ${round.company_name}
Round: ${round.round_type}
Amount: ${amountStr}
Lead Investor: ${round.lead_investor || "Undisclosed"}
Date: ${round.announced_date}
Country: ${round.country || "Unknown"}
Sector: ${round.sector || (round.company_categories?.[0]) || "Biotech"}
Company Description: ${round.company_description || "A biotechnology company."}

Write in a professional financial news style. Structure:
1. Opening paragraph: the news (who raised how much, from whom, when)
2. Middle paragraph: what the company does and why this funding matters (what they'll use it for, pipeline significance)
3. Closing paragraph: market context (how this fits the broader biotech funding landscape)

Be factual, concise, and insightful. Write like a senior biotech analyst at a top financial publication.

Also provide:
- A compelling headline (max 80 chars)
- A subtitle (max 120 chars, captures the key angle)
- A sector classification (one of: Oncology, Immunology, Neuroscience, Gene Therapy, Cell Therapy, Rare Diseases, Infectious Diseases, Vaccines, Cardiovascular, Metabolic, Respiratory, Ophthalmology, Dermatology, Diagnostics, Drug Delivery, Digital Health, Small Molecules, Antibodies, RNA Therapeutics, Radiopharmaceuticals, or "Biotech" as fallback)

Return as JSON:
{"headline": "...", "subtitle": "...", "body": "...", "sector": "..."}

No markdown fences. Just the JSON object.`;

  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You are a senior biotech industry journalist. Write concise, factual funding articles." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    let content = data.choices[0]?.message?.content || "";
    if (content.startsWith("```")) content = content.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();

    return JSON.parse(content);
  } catch (err) {
    console.error(`  Error generating article for ${round.company_name}:`, (err as Error).message);
    return null;
  }
}

async function main() {
  console.log("=== Funding Article Generator ===\n");

  // Get recent funding rounds $10M+ without articles
  const { data: rounds } = await supabase
    .from("funding_rounds")
    .select(`
      id, company_id, company_name, round_type, amount_usd,
      lead_investor, announced_date, country, sector
    `)
    .gt("amount_usd", 10_000_000)
    .order("announced_date", { ascending: false })
    .limit(100);

  if (!rounds || rounds.length === 0) {
    console.log("No qualifying rounds found.");
    return;
  }

  // Filter out rounds that already have articles
  const { data: existingArticles } = await supabase
    .from("funding_articles")
    .select("funding_round_id")
    .not("funding_round_id", "is", null);

  const existingRoundIds = new Set((existingArticles || []).map((a) => a.funding_round_id));
  const newRounds = rounds.filter((r) => !existingRoundIds.has(r.id));

  console.log(`${rounds.length} qualifying rounds, ${newRounds.length} need articles\n`);

  // Get company details for context
  const companyIds = [...new Set(newRounds.map((r) => r.company_id).filter(Boolean))];
  const companyMap = new Map<string, { slug: string; description: string; categories: string[] }>();

  if (companyIds.length > 0) {
    for (let i = 0; i < companyIds.length; i += 100) {
      const batch = companyIds.slice(i, i + 100);
      const { data: companies } = await supabase
        .from("companies")
        .select("id, slug, description, categories")
        .in("id", batch);
      if (companies) {
        for (const c of companies) {
          companyMap.set(c.id, { slug: c.slug, description: c.description, categories: c.categories });
        }
      }
    }
  }

  let generated = 0;
  const startTime = Date.now();

  for (const round of newRounds.slice(0, 50)) { // Max 50 articles per run
    const company = round.company_id ? companyMap.get(round.company_id) : null;
    const enrichedRound: RoundWithCompany = {
      ...round,
      company_slug: company?.slug || null,
      company_description: company?.description || null,
      company_categories: company?.categories || null,
    };

    const article = await generateArticle(enrichedRound);
    if (!article) continue;

    const amountStr = round.amount_usd >= 1e9
      ? `${(round.amount_usd / 1e9).toFixed(1)}b`
      : `${(round.amount_usd / 1e6).toFixed(0)}m`;
    const slug = slugify(`${round.company_name}-${round.round_type}-${amountStr}-${round.announced_date}`);

    const { error } = await supabase.from("funding_articles").insert({
      slug,
      funding_round_id: round.id,
      company_id: round.company_id,
      company_name: round.company_name,
      company_slug: company?.slug || null,
      headline: article.headline,
      subtitle: article.subtitle,
      body: article.body,
      round_type: round.round_type,
      amount_usd: round.amount_usd,
      lead_investor: round.lead_investor,
      round_date: round.announced_date,
      sector: round.sector || article.sector || company?.categories?.[0] || null,
      country: round.country,
      deal_size_category: dealSizeCategory(round.amount_usd),
      article_type: "funding_round",
      is_featured: round.amount_usd >= 100_000_000,
    });

    if (!error) {
      generated++;
      console.log(`  ✓ ${article.headline}`);
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 800));
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n=== Done (${elapsed}s) ===`);
  console.log(`Generated: ${generated} articles`);
}

main().catch(console.error);
