/**
 * Generate AI articles for recent funding rounds.
 * Creates varied, insightful articles — NOT cookie-cutter press releases.
 * Uses different article styles/angles to keep content fresh.
 * Targets rounds $10M+ that don't have articles yet.
 *
 * Usage: npx tsx scripts/generate-funding-articles.ts
 * Regen: npx tsx scripts/generate-funding-articles.ts --regenerate
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const REGENERATE = process.argv.includes("--regenerate");

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
  investors: string[] | null;
  announced_date: string;
  country: string | null;
  sector: string | null;
  company_slug: string | null;
  company_description: string | null;
  company_categories: string[] | null;
  pipeline_count: number;
  pipeline_drugs: string[];
}

// Different article styles to avoid cookie-cutter content
const ARTICLE_STYLES = [
  {
    name: "analyst_take",
    system: "You are a sharp biotech equity analyst writing a deal commentary. You have strong opinions about whether this is a smart investment and why. You use specifics — drug names, mechanism of action, competitive landscape. Never generic filler.",
    structure: `Write an analyst-style deal commentary (300-400 words). Structure:
1. LEAD with the most interesting angle — NOT "Company X has raised $Y". Instead, lead with WHY this matters. What's the drug? What disease? Why now?
2. THE DEAL — amount, investors, round type woven naturally into the narrative
3. PIPELINE SIGNIFICANCE — what specific drugs or programs this funds, what stage they're at, what the clinical data looks like
4. SMART MONEY ANGLE — what the investor's involvement signals (their track record, portfolio fit)
5. MARKET CONTEXT — one sharp observation about what this means for the sector`,
  },
  {
    name: "market_intelligence",
    system: "You are a biotech market intelligence analyst writing a deal brief. You focus on competitive dynamics, market sizing, and strategic implications. Your writing is dense with insight, zero fluff.",
    structure: `Write a market intelligence brief (300-400 words). Structure:
1. OPEN with the strategic significance — what therapeutic area or technology platform is being bet on
2. THE TRANSACTION — deal details woven into analysis, not as a dry announcement
3. COMPETITIVE LANDSCAPE — who else is working in this space, how does this company differentiate
4. MARKET OPPORTUNITY — what's the addressable market, what unmet medical need exists
5. OUTLOOK — what milestones to watch for, what this capital enables`,
  },
  {
    name: "investor_lens",
    system: "You are a veteran biotech VC writing an investment thesis note. You explain why capital is flowing to this company and what the return thesis is. You are specific about science and market dynamics.",
    structure: `Write an investor-perspective article (300-400 words). Structure:
1. THESIS — open with the investment thesis in one punchy sentence
2. THE SCIENCE — explain what the company actually does in plain but precise language. Name specific drugs, targets, mechanisms
3. WHY NOW — what inflection point justifies this capital raise (clinical data readout, regulatory milestone, market shift)
4. THE CAPITAL — deal specifics including who invested and what this says about validation
5. RISK/REWARD — one honest assessment of the key risk and the potential upside`,
  },
  {
    name: "industry_narrative",
    system: "You are a senior biotech journalist at STAT News. You write compelling narratives that connect individual deals to broader industry trends. Your prose is vivid but precise.",
    structure: `Write a narrative-style article (300-400 words). Structure:
1. HOOK — start with a vivid, specific detail about the company's mission or science (NOT the funding amount)
2. THE NEWS — the funding round, naturally integrated into the story
3. THE BACKSTORY — company origins, key people, what problem they're solving and for whom
4. BIGGER PICTURE — connect this to a trend in biotech (AI drug discovery, cell therapy manufacturing, obesity drugs, etc.)
5. WHAT'S NEXT — upcoming catalysts or milestones`,
  },
  {
    name: "deal_spotlight",
    system: "You are a deals reporter at BioPharma Dive. You write crisp, fact-dense deal coverage that respects the reader's time. Every sentence carries information.",
    structure: `Write a deal spotlight article (250-350 words). Structure:
1. LEAD — the deal in one information-rich sentence (company, amount, investors, purpose)
2. COMPANY PROFILE — what they do, key drug candidates by name, development stage
3. USE OF PROCEEDS — specifically what this money will fund (Phase 2 trial for Drug X, manufacturing buildout, etc.)
4. INVESTOR CONTEXT — who led, their biotech track record, any notable co-investors
5. SECTOR SNAPSHOT — one line connecting to broader deal activity in this therapeutic area`,
  },
];

function getArticleStyle(index: number) {
  return ARTICLE_STYLES[index % ARTICLE_STYLES.length];
}

async function generateArticle(
  round: RoundWithCompany,
  styleIndex: number
): Promise<{ headline: string; subtitle: string; body: string; sector?: string } | null> {
  const amountStr = round.amount_usd >= 1e9
    ? `$${(round.amount_usd / 1e9).toFixed(1)}B`
    : `$${(round.amount_usd / 1e6).toFixed(0)}M`;

  const style = getArticleStyle(styleIndex);

  const investorInfo = round.lead_investor && round.lead_investor !== "Undisclosed"
    ? `Lead Investor: ${round.lead_investor}`
    : round.investors && round.investors.length > 0
      ? `Investors: ${round.investors.join(", ")}`
      : "Investors: Not publicly disclosed";

  const pipelineInfo = round.pipeline_drugs.length > 0
    ? `Known Pipeline Drugs: ${round.pipeline_drugs.slice(0, 5).join(", ")}`
    : "";

  const prompt = `${style.structure}

DEAL DATA:
Company: ${round.company_name}
Round: ${round.round_type} — ${amountStr}
${investorInfo}
Date: ${round.announced_date}
Country: ${round.country || "US"}
Sector: ${round.sector || (round.company_categories?.[0]) || "Biotech"}
Company Description: ${round.company_description || "A biotechnology company."}
${pipelineInfo}
${round.pipeline_count > 0 ? `Total Pipeline Programs: ${round.pipeline_count}` : ""}

RULES:
- DO NOT start with "[Company] has raised" or "[Company] has closed" — find a more compelling opening
- DO NOT use the phrase "capital infusion" or "vote of confidence"
- DO NOT say "undisclosed investors" if investors are not known — instead focus on the science and company
- Use specific drug names and mechanisms when available
- Write like this is for sophisticated biotech investors, not a press release
- Vary your headline style — NOT always "[Company] Secures $XM [Round]"
- The headline should capture the ANGLE, not just the transaction

Also provide:
- A compelling, varied headline (max 80 chars) — capture the story angle, not just the deal
- A subtitle (max 120 chars) — the key insight or takeaway
- A sector classification (one of: Oncology, Immunology, Neuroscience, Gene Therapy, Cell Therapy, Rare Diseases, Infectious Diseases, Vaccines, Cardiovascular, Metabolic, Respiratory, Ophthalmology, Dermatology, Diagnostics, Drug Delivery, Digital Health, Small Molecules, Antibodies, RNA Therapeutics, Radiopharmaceuticals, or "Biotech")

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
          { role: "system", content: style.system },
          { role: "user", content: prompt },
        ],
        temperature: 0.6, // Higher temp for variety
        max_tokens: 1000,
      }),
    });

    if (!res.ok) {
      console.error(`  API ${res.status}: ${res.statusText}`);
      return null;
    }
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
  console.log("=== Funding Article Generator (v2 — varied styles) ===\n");

  if (REGENERATE) {
    console.log("🔄 REGENERATE mode — will delete and recreate all articles\n");
    const { error } = await supabase.from("funding_articles").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      console.error("Failed to clear articles:", error.message);
      return;
    }
    console.log("Cleared existing articles.\n");
  }

  // Get recent funding rounds $10M+
  const { data: rounds } = await supabase
    .from("funding_rounds")
    .select(`
      id, company_id, company_name, round_type, amount_usd,
      lead_investor, investors, announced_date, country, sector
    `)
    .gt("amount_usd", 10_000_000)
    .neq("confidence", "filing_only")
    .order("announced_date", { ascending: false })
    .limit(100);

  if (!rounds || rounds.length === 0) {
    console.log("No qualifying rounds found.");
    return;
  }

  // Filter out rounds that already have articles (unless regenerating)
  let newRounds = rounds;
  if (!REGENERATE) {
    const { data: existingArticles } = await supabase
      .from("funding_articles")
      .select("funding_round_id")
      .not("funding_round_id", "is", null);

    const existingRoundIds = new Set((existingArticles || []).map((a) => a.funding_round_id));
    newRounds = rounds.filter((r) => !existingRoundIds.has(r.id));
  }

  console.log(`${rounds.length} qualifying rounds, ${newRounds.length} need articles\n`);

  if (newRounds.length === 0) {
    console.log("All rounds already have articles.");
    return;
  }

  // Get company details for context
  const companyIds = Array.from(new Set(newRounds.map((r) => r.company_id).filter(Boolean)));
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

  // Get pipeline data for companies
  const pipelineMap = new Map<string, { count: number; drugs: string[] }>();
  if (companyIds.length > 0) {
    for (let i = 0; i < companyIds.length; i += 100) {
      const batch = companyIds.slice(i, i + 100);
      const { data: pipelines } = await supabase
        .from("pipelines")
        .select("company_id, product_name")
        .in("company_id", batch)
        .not("product_name", "is", null);
      if (pipelines) {
        for (const p of pipelines) {
          const existing = pipelineMap.get(p.company_id) || { count: 0, drugs: [] };
          existing.count++;
          if (p.product_name && existing.drugs.length < 5 && !existing.drugs.includes(p.product_name)) {
            existing.drugs.push(p.product_name);
          }
          pipelineMap.set(p.company_id, existing);
        }
      }
    }
  }

  let generated = 0;
  const startTime = Date.now();

  for (let i = 0; i < Math.min(newRounds.length, 60); i++) {
    const round = newRounds[i];
    const company = round.company_id ? companyMap.get(round.company_id) : null;
    const pipeline = round.company_id ? pipelineMap.get(round.company_id) : null;

    const enrichedRound: RoundWithCompany = {
      ...round,
      investors: round.investors || null,
      company_slug: company?.slug || null,
      company_description: company?.description || null,
      company_categories: company?.categories || null,
      pipeline_count: pipeline?.count || 0,
      pipeline_drugs: pipeline?.drugs || [],
    };

    const article = await generateArticle(enrichedRound, i);
    if (!article) continue;

    const amountStr = round.amount_usd >= 1e9
      ? `${(round.amount_usd / 1e9).toFixed(1)}b`
      : `${(round.amount_usd / 1e6).toFixed(0)}m`;
    const slug = slugify(`${round.company_name}-${round.round_type}-${amountStr}-${round.announced_date}`);

    // Use the best available investor data
    const bestInvestor = (round.lead_investor && round.lead_investor !== "Undisclosed")
      ? round.lead_investor
      : round.investors && round.investors.length > 0
        ? round.investors[0]
        : null;

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
      lead_investor: bestInvestor,
      round_date: round.announced_date,
      sector: round.sector || article.sector || company?.categories?.[0] || null,
      country: round.country,
      deal_size_category: dealSizeCategory(round.amount_usd),
      article_type: "funding_round",
      is_featured: round.amount_usd >= 100_000_000,
    });

    if (!error) {
      generated++;
      const style = getArticleStyle(i);
      console.log(`  ✓ [${style.name}] ${article.headline}`);
    } else {
      console.error(`  ✗ ${round.company_name}: ${error.message}`);
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 800));
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n=== Done (${elapsed}s) ===`);
  console.log(`Generated: ${generated} articles across ${ARTICLE_STYLES.length} styles`);
}

main().catch(console.error);
