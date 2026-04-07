import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

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

const ARTICLE_STYLES = [
  {
    system: "You are a sharp biotech equity analyst writing deal commentary. Strong opinions, specific drug names and mechanisms. Never generic.",
    structure: `Write an analyst-style deal commentary (300-400 words). Lead with WHY this matters, not "Company X raised $Y". Cover the drug pipeline, investor signal, and one sharp market observation.`,
  },
  {
    system: "You are a biotech market intelligence analyst. Focus on competitive dynamics, market sizing, and strategic implications. Dense with insight, zero fluff.",
    structure: `Write a market intelligence brief (300-400 words). Open with strategic significance, weave deal details into analysis, cover competitive landscape and market opportunity.`,
  },
  {
    system: "You are a veteran biotech VC explaining why capital flows here. Specific about science and market dynamics.",
    structure: `Write an investor-perspective article (300-400 words). Open with the investment thesis, explain the science precisely, cover why now and the risk/reward.`,
  },
  {
    system: "You are a senior biotech journalist at STAT News. Vivid narratives connecting deals to broader trends.",
    structure: `Write a narrative article (300-400 words). Start with a vivid detail about the company's mission, integrate the funding naturally, connect to a bigger industry trend.`,
  },
  {
    system: "You are a deals reporter at BioPharma Dive. Crisp, fact-dense. Every sentence carries information.",
    structure: `Write a deal spotlight (250-350 words). Lead with one information-rich sentence, then company profile, use of proceeds, investor context, and sector snapshot.`,
  },
];

/**
 * Daily cron: generate articles for funding rounds $10M+ that don't have articles yet.
 * Runs after scrape-funding and creates up to 10 articles per run (within 300s timeout).
 */
export async function GET() {
  const supabase = getSupabase();
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  if (!DEEPSEEK_API_KEY) return NextResponse.json({ ok: false, error: "No DEEPSEEK_API_KEY" });

  // Find rounds $10M+ without articles, newest first
  const { data: rounds } = await supabase
    .from("funding_rounds")
    .select("id, company_id, company_name, round_type, amount_usd, lead_investor, investors, announced_date, country, sector")
    .gt("amount_usd", 10_000_000)
    .neq("confidence", "filing_only")
    .order("announced_date", { ascending: false })
    .limit(50);

  if (!rounds || rounds.length === 0) {
    return NextResponse.json({ ok: true, message: "No qualifying rounds", generated: 0 });
  }

  // Filter out rounds that already have articles
  const { data: existingArticles } = await supabase
    .from("funding_articles")
    .select("funding_round_id")
    .not("funding_round_id", "is", null);

  const existingRoundIds = new Set((existingArticles || []).map((a) => a.funding_round_id));
  const newRounds = rounds.filter((r) => !existingRoundIds.has(r.id));

  if (newRounds.length === 0) {
    return NextResponse.json({ ok: true, message: "All rounds have articles", generated: 0 });
  }

  // Get company details
  const companyIds = Array.from(new Set(newRounds.map((r) => r.company_id).filter(Boolean)));
  const companyMap = new Map<string, { slug: string; description: string; categories: string[] }>();
  if (companyIds.length > 0) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, slug, description, categories")
      .in("id", companyIds.slice(0, 50));
    if (companies) {
      for (const c of companies) companyMap.set(c.id, { slug: c.slug, description: c.description, categories: c.categories });
    }
  }

  // Get pipeline data
  const pipelineMap = new Map<string, string[]>();
  if (companyIds.length > 0) {
    const { data: pipelines } = await supabase
      .from("pipelines")
      .select("company_id, product_name")
      .in("company_id", companyIds.slice(0, 50))
      .not("product_name", "is", null)
      .limit(200);
    if (pipelines) {
      for (const p of pipelines) {
        const existing = pipelineMap.get(p.company_id) || [];
        if (p.product_name && existing.length < 5 && !existing.includes(p.product_name)) {
          existing.push(p.product_name);
          pipelineMap.set(p.company_id, existing);
        }
      }
    }
  }

  let generated = 0;
  const maxArticles = 10; // Stay within 300s timeout

  for (let i = 0; i < Math.min(newRounds.length, maxArticles); i++) {
    const round = newRounds[i];
    const company = round.company_id ? companyMap.get(round.company_id) : null;
    const drugs = round.company_id ? pipelineMap.get(round.company_id) || [] : [];
    const style = ARTICLE_STYLES[i % ARTICLE_STYLES.length];

    const amountStr = round.amount_usd >= 1e9
      ? `$${(round.amount_usd / 1e9).toFixed(1)}B`
      : `$${(round.amount_usd / 1e6).toFixed(0)}M`;

    const investorInfo = round.lead_investor && round.lead_investor !== "Undisclosed"
      ? `Lead Investor: ${round.lead_investor}`
      : round.investors && round.investors.length > 0
        ? `Investors: ${round.investors.join(", ")}`
        : "Investors: Not publicly disclosed";

    const prompt = `${style.structure}

DEAL DATA:
Company: ${round.company_name}
Round: ${round.round_type} — ${amountStr}
${investorInfo}
Date: ${round.announced_date}
Country: ${round.country || "US"}
Sector: ${round.sector || company?.categories?.[0] || "Biotech"}
Company Description: ${company?.description || "A biotechnology company."}
${drugs.length > 0 ? `Known Pipeline Drugs: ${drugs.join(", ")}` : ""}

RULES:
- DO NOT start with "[Company] has raised" — find a compelling opening
- DO NOT use "capital infusion" or "vote of confidence"
- DO NOT mention "undisclosed investors" — focus on science
- Use specific drug names and mechanisms when available
- Vary headline style — capture the ANGLE, not just the transaction

Return as JSON:
{"headline": "...", "subtitle": "...", "body": "...", "sector": "..."}
No markdown fences.`;

    try {
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: style.system },
            { role: "user", content: prompt },
          ],
          temperature: 0.6,
          max_tokens: 1000,
        }),
      });

      if (!res.ok) continue;
      const data = await res.json();
      let content = data.choices[0]?.message?.content || "";
      if (content.startsWith("```")) content = content.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();

      const article = JSON.parse(content);

      const amountSlug = round.amount_usd >= 1e9
        ? `${(round.amount_usd / 1e9).toFixed(1)}b`
        : `${(round.amount_usd / 1e6).toFixed(0)}m`;
      const slug = slugify(`${round.company_name}-${round.round_type}-${amountSlug}-${round.announced_date}`);

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

      if (!error) generated++;
    } catch { continue; }

    // Rate limit
    await new Promise((r) => setTimeout(r, 1000));
  }

  return NextResponse.json({
    ok: true,
    generated,
    roundsWithoutArticles: newRounds.length,
    totalRounds: rounds.length,
  });
}
