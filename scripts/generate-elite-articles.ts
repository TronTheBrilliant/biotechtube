#!/usr/bin/env npx tsx
/**
 * Elite Article Generator — 4-step pipeline (Outline → Research → Draft → Refine)
 *
 * Produces thesis-driven, analyst-quality articles using multiple DeepSeek calls
 * per article instead of a single monolithic prompt.
 *
 * Usage: npx tsx scripts/generate-elite-articles.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

if (!DEEPSEEK_API_KEY) {
  console.error("Missing DEEPSEEK_API_KEY");
  process.exit(1);
}

/* ─── Helpers ─── */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function fmt(val: number | string | null | undefined): string {
  if (!val) return "N/A";
  const n = Number(val);
  if (isNaN(n)) return "N/A";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtPct(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return "N/A";
  const n = Number(val);
  if (isNaN(n)) return "N/A";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

/* ─── DeepSeek calls ─── */

async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 8000,
  temperature = 0.7
): Promise<string> {
  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  return json.choices[0].message.content;
}

/* ─── Auto-link company names ─── */

function addInternalLinks(
  content: string,
  companies: { name: string; slug: string }[]
): string {
  const sorted = [...companies].sort((a, b) => b.name.length - a.name.length);
  let result = content;

  for (const co of sorted) {
    if (!co.name || !co.slug || co.name.length < 4) continue;
    const escaped = co.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `(?<!\\[)\\b${escaped}\\b(?!\\]\\()(?![^\\[]*\\])`,
      "g"
    );
    let replaced = false;
    result = result.replace(regex, (match) => {
      if (replaced) return match;
      replaced = true;
      return `[${match}](/company/${co.slug})`;
    });
  }

  return result;
}

/* ─── Database queries ─── */

async function getTopCompanies(limit = 50) {
  const { data } = await supabase
    .from("companies")
    .select("name, slug, country, valuation, ticker, description, categories, founded")
    .not("valuation", "is", null)
    .order("valuation", { ascending: false })
    .limit(limit);
  return data || [];
}

async function getEuropeanCompanies(limit = 50) {
  const euCountries = [
    "United Kingdom", "Germany", "France", "Switzerland", "Denmark",
    "Sweden", "Netherlands", "Belgium", "Ireland", "Norway",
    "Finland", "Italy", "Spain", "Austria", "Iceland",
  ];
  const { data } = await supabase
    .from("companies")
    .select("name, slug, country, valuation, ticker, description, categories, founded")
    .in("country", euCountries)
    .not("valuation", "is", null)
    .order("valuation", { ascending: false })
    .limit(limit);
  return data || [];
}

async function getUSCompanies(limit = 50) {
  const { data } = await supabase
    .from("companies")
    .select("name, slug, country, valuation, ticker, description, categories, founded")
    .eq("country", "United States")
    .not("valuation", "is", null)
    .order("valuation", { ascending: false })
    .limit(limit);
  return data || [];
}

async function getMarketSnapshots(limit = 60) {
  const { data } = await supabase
    .from("market_snapshots")
    .select("snapshot_date, total_market_cap, public_companies_count, change_1d_pct, change_7d_pct, change_30d_pct, change_ytd_pct")
    .order("snapshot_date", { ascending: false })
    .limit(limit);
  return data || [];
}

async function getSectorData() {
  const { data } = await supabase
    .from("sector_market_data")
    .select("sector_id, combined_market_cap, company_count, change_7d_pct, change_30d_pct, snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(500);

  // Get sector names
  const { data: sectors } = await supabase
    .from("sectors")
    .select("id, name, slug");

  const sectorMap = new Map((sectors || []).map((s: any) => [s.id, s]));
  // Get only latest snapshot per sector
  const latest = new Map<string, any>();
  for (const row of data || []) {
    if (!latest.has(row.sector_id)) {
      const sector = sectorMap.get(row.sector_id);
      if (sector) {
        latest.set(row.sector_id, { ...row, sector_name: sector.name, sector_slug: sector.slug });
      }
    }
  }
  return Array.from(latest.values()).sort(
    (a: any, b: any) => Number(b.combined_market_cap || 0) - Number(a.combined_market_cap || 0)
  );
}

async function getCountryData() {
  const { data } = await supabase
    .from("country_market_data")
    .select("country, combined_market_cap, company_count, change_30d_pct, change_7d_pct, snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(500);

  const latest = new Map<string, any>();
  for (const row of data || []) {
    if (!latest.has(row.country)) {
      latest.set(row.country, row);
    }
  }
  return Array.from(latest.values()).sort(
    (a: any, b: any) => Number(b.combined_market_cap || 0) - Number(a.combined_market_cap || 0)
  );
}

async function getFundingRounds(limit = 500) {
  const { data } = await supabase
    .from("funding_rounds")
    .select("company_name, round_type, amount_usd, announced_date, country, sector, lead_investor")
    .not("amount_usd", "is", null)
    .order("announced_date", { ascending: false })
    .limit(limit);
  return data || [];
}

async function getFundingByYear() {
  const { data } = await supabase
    .from("funding_rounds")
    .select("round_type, amount_usd, announced_date")
    .not("amount_usd", "is", null)
    .order("announced_date", { ascending: false })
    .limit(10000);

  const byYear: Record<string, { count: number; total: number; types: Record<string, number> }> = {};
  for (const r of data || []) {
    const year = r.announced_date ? r.announced_date.substring(0, 4) : "Unknown";
    if (!byYear[year]) byYear[year] = { count: 0, total: 0, types: {} };
    byYear[year].count++;
    byYear[year].total += Number(r.amount_usd) || 0;
    const rt = r.round_type || "Unknown";
    byYear[year].types[rt] = (byYear[year].types[rt] || 0) + (Number(r.amount_usd) || 0);
  }
  return byYear;
}

async function getCompaniesBySector(sectorSlug: string, limit = 30) {
  const { data: sector } = await supabase
    .from("sectors")
    .select("id, name")
    .eq("slug", sectorSlug)
    .single();
  if (!sector) return { sectorName: sectorSlug, companies: [] };

  const { data: links } = await supabase
    .from("company_sectors")
    .select("company_id")
    .eq("sector_id", sector.id)
    .order("relevance_score", { ascending: false })
    .limit(limit);

  if (!links || links.length === 0) return { sectorName: sector.name, companies: [] };

  const ids = links.map((l: any) => l.company_id);
  const { data: companies } = await supabase
    .from("companies")
    .select("name, slug, country, valuation, ticker, description, categories")
    .in("id", ids)
    .order("valuation", { ascending: false, nullsFirst: false });

  return { sectorName: sector.name, companies: companies || [] };
}

async function getAllCompanyNames() {
  const all: { name: string; slug: string }[] = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("companies")
      .select("name, slug")
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    all.push(...data);
    offset += 1000;
    if (data.length < 1000) break;
  }
  return all;
}

/* ─── 4-Step Pipeline ─── */

interface OutlineSection {
  heading: string;
  key_point: string;
  data_needed: string;
}

interface Outline {
  thesis: string;
  title: string;
  sections: OutlineSection[];
}

interface ResearchedSection extends OutlineSection {
  data: string;
  research: string;
}

const EDITOR_SYSTEM = `You are an editor at a top-tier biotech publication (like STAT News or Endpoints News). You combine deep domain expertise with sharp editorial instincts. You never produce generic content — every piece you work on has a clear thesis and is backed by specific data.`;

const ANALYST_SYSTEM = `You are a senior biotech analyst writing for professionals who manage biotech portfolios and make investment decisions. You write like a financial journalist — every claim backed by data, every paragraph earning its place. You never sound like AI. You sound like someone who has covered this industry for 15 years.

Rules:
- Write 2,500-3,500 words
- Use markdown format with ## headings (never # — start at ##)
- Include markdown data tables where relevant
- Reference specific companies with internal links: [Company Name](/company/company-slug)
- Start with a "Key Takeaways" box (use blockquote format)
- End with a "Methodology" section explaining data sources
- DO NOT use: "landscape", "at the forefront", "innovative", "cutting-edge", "poised for growth", "it's worth noting", "in conclusion", "moving forward", "exciting times", "game-changing", "revolutionary"
- DO use: specific numbers, dates, comparisons, cause-and-effect reasoning
- Every paragraph should either present data, make an argument, or provide context
- Use "however", "despite this", "what's often overlooked" — show complexity
- End with actionable insight, not generic optimism
- End the article with: "---\\n\\n*Data and analysis provided by [BiotechTube](https://biotechtube.io). Updated ${today()}.*"`;

const REFINER_SYSTEM = `You are a senior editor at a biotech publication. Your job is to take a good draft and make it exceptional. You have zero tolerance for AI-sounding phrases, weak claims, or generic analysis.`;

// Step 1: Generate outline
async function generateOutline(topic: string, dbDataSummary: string): Promise<Outline> {
  console.log("    Step 1/4: Generating outline...");

  const prompt = `Create a structured outline for an article about: "${topic}"

Requirements:
- The article must have a THESIS — a central argument or insight, not just "here are some companies"
- The thesis should be contrarian, surprising, or offer a unique angle that professionals would find valuable
- Structure: Hook → Thesis → Evidence (3-5 sections) → Implications → Conclusion
- Each section should have a specific data point it needs to prove

Bad example: "Top 10 Biotech Companies" (generic list)
Good example: "Why the Biotech Top 10 Looks Completely Different Than 5 Years Ago — And What It Means for Investors" (has a thesis)

Available data from our database:
${dbDataSummary}

Output ONLY valid JSON (no markdown code fences) with these fields:
{
  "thesis": "The central argument of the article",
  "title": "Compelling, specific title that reflects the thesis",
  "sections": [
    {
      "heading": "Section heading",
      "key_point": "The specific argument this section makes",
      "data_needed": "What data points this section requires"
    }
  ]
}`;

  const raw = await callDeepSeek(EDITOR_SYSTEM, prompt, 2000, 0.8);
  await sleep(1500);

  // Parse JSON from response (handle potential markdown fences)
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON from the response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`Failed to parse outline JSON: ${cleaned.slice(0, 200)}`);
  }
}

// Step 2: Research each section
async function researchSections(
  outline: Outline,
  dbData: string
): Promise<ResearchedSection[]> {
  console.log("    Step 2/4: Researching sections...");

  const researched: ResearchedSection[] = [];

  for (const section of outline.sections) {
    const prompt = `Based on this outline section about "${section.heading}" for an article with thesis "${outline.thesis}", provide:

1. One specific real-world example or case study relevant to biotech (use real company names, real events, real data points from the past 2 years)
2. One contrarian perspective or counterargument that a skeptical analyst might raise
3. One forward-looking prediction with specific reasoning

The article's available data:
${dbData}

Section details:
- Heading: ${section.heading}
- Key point to prove: ${section.key_point}
- Data needed: ${section.data_needed}

Keep each point to 2-3 sentences. Be specific, not generic. Reference real companies, real numbers, real events.`;

    const research = await callDeepSeek(EDITOR_SYSTEM, prompt, 1500, 0.7);
    await sleep(1500);

    researched.push({
      ...section,
      data: dbData,
      research,
    });
  }

  return researched;
}

// Step 3: Write full draft
async function writeDraft(
  outline: Outline,
  sections: ResearchedSection[],
  companyLinks: string
): Promise<string> {
  console.log("    Step 3/4: Writing full draft...");

  const sectionGuides = sections
    .map(
      (s) => `## ${s.heading}
Key point: ${s.key_point}
Data available: ${s.data_needed}
Research context: ${s.research}`
    )
    .join("\n\n");

  const prompt = `Write this article as a complete, publication-ready piece.

TITLE: ${outline.title}
THESIS: ${outline.thesis}

OUTLINE WITH RESEARCH:
${sectionGuides}

DATABASE DATA FOR REFERENCE:
${sections[0]?.data || ""}

COMPANY LINK REFERENCE (use these exact link formats):
${companyLinks}

RULES:
- Start with a compelling hook — a specific number, event, or question
- Include a "Key Takeaways" blockquote near the top (3-4 bullet points)
- Every paragraph should either present data, make an argument, or provide context
- Use "however", "despite this", "what's often overlooked" — show complexity
- Include specific company names with links: [Company](/company/slug)
- Include [chart:description] placeholders where visual data would strengthen a section
- DO NOT use: "landscape", "at the forefront", "innovative", "cutting-edge", "poised for growth", "it's worth noting", "in conclusion", "moving forward", "exciting times"
- DO use: specific numbers, dates, comparisons, cause-and-effect reasoning
- End with actionable insight for professionals, not generic optimism
- 2,500-3,500 words
- End with: "---\\n\\n*Data and analysis provided by [BiotechTube](https://biotechtube.io). Updated ${today()}.*"`;

  const draft = await callDeepSeek(ANALYST_SYSTEM, prompt, 8000, 0.7);
  await sleep(2000);
  return draft;
}

// Step 4: Refine
async function refineDraft(draft: string, thesis: string): Promise<string> {
  console.log("    Step 4/4: Refining draft...");

  const prompt = `Review and improve this biotech article. The thesis is: "${thesis}"

DRAFT:
${draft}

Fix the following:
1. Remove any AI-sounding phrases ("it's worth noting", "in conclusion", "moving forward", "exciting", "game-changing", "revolutionary", "landscape", "at the forefront", "innovative", "cutting-edge")
2. Strengthen weak claims — if a claim lacks a specific number, add [DATA NEEDED] so we know
3. Ensure every section has at least one concrete number or data point
4. Check that the thesis is supported throughout — every section should connect back to the central argument
5. Make the title more compelling if needed
6. Add [chart:description] placeholders where visual data would strengthen a section (if not already present)
7. Ensure company links use the format [Company Name](/company/slug)
8. Verify the Key Takeaways blockquote is present and punchy
9. Check that the ending provides actionable insight, not vague optimism
10. Make sure it reads like a senior analyst wrote it, not an AI

Return the COMPLETE improved article (not just the changes). Keep the same markdown format.`;

  const refined = await callDeepSeek(REFINER_SYSTEM, prompt, 8000, 0.5);
  await sleep(1500);
  return refined;
}

/* ─── Article Definitions ─── */

interface EliteArticleDef {
  slug: string;
  suggestedTitle: string;
  topic: string;
  category: string;
  tags: string[];
  gatherData: () => Promise<{ dbSummary: string; companyLinks: string; companies: { name: string; slug: string }[] }>;
}

const eliteArticles: EliteArticleDef[] = [
  // 1. Market Concentration
  {
    slug: "biotech-market-7-5t-valuation-dangerous-concentration-problem",
    suggestedTitle: "Why the Biotech Market's $7.5T Valuation Hides a Dangerous Concentration Problem",
    topic: "The biotech market's total valuation hides extreme concentration — the top 10 companies represent a massive share of total market cap, making the index vulnerable to single-stock moves. What does this concentration mean for investors and the industry?",
    category: "market-analysis",
    tags: ["market-cap", "concentration-risk", "biotech-index", "large-cap", "2026", "investment-risk"],
    gatherData: async () => {
      const top50 = await getTopCompanies(50);
      const snapshots = await getMarketSnapshots(30);
      const sectors = await getSectorData();
      const countries = await getCountryData();
      const allCompanies = await getAllCompanyNames();

      const top10 = top50.slice(0, 10);
      const top10Cap = top10.reduce((s, c) => s + Number(c.valuation || 0), 0);
      const top50Cap = top50.reduce((s, c) => s + Number(c.valuation || 0), 0);
      const latestSnapshot = snapshots[0];
      const totalMarketCap = Number(latestSnapshot?.total_market_cap || 0);
      const top10Pct = totalMarketCap > 0 ? ((top10Cap / totalMarketCap) * 100).toFixed(1) : "N/A";
      const top20 = top50.slice(0, 20);
      const top20Cap = top20.reduce((s, c) => s + Number(c.valuation || 0), 0);
      const top20Pct = totalMarketCap > 0 ? ((top20Cap / totalMarketCap) * 100).toFixed(1) : "N/A";

      const dbSummary = `MARKET OVERVIEW:
- Total biotech market cap: ${fmt(totalMarketCap)} (as of ${latestSnapshot?.snapshot_date})
- Public companies tracked: ${latestSnapshot?.public_companies_count}
- 30-day change: ${fmtPct(latestSnapshot?.change_30d_pct)}
- YTD change: ${fmtPct(latestSnapshot?.change_ytd_pct)}

CONCENTRATION DATA:
- Top 10 companies combined: ${fmt(top10Cap)} = ${top10Pct}% of total market
- Top 20 companies combined: ${fmt(top20Cap)} = ${top20Pct}% of total market
- Remaining ${(latestSnapshot?.public_companies_count || 0) - 20} companies share the other ${(100 - Number(top20Pct)).toFixed(1)}%

TOP 10 COMPANIES:
${top10.map((c, i) => `${i + 1}. ${c.name} (${c.ticker || "Private"}) — ${fmt(c.valuation)} — ${c.country} — Founded ${c.founded || "N/A"}`).join("\n")}

COMPANIES #11-30:
${top50.slice(10, 30).map((c, i) => `${i + 11}. ${c.name} (${c.ticker || "Private"}) — ${fmt(c.valuation)} — ${c.country}`).join("\n")}

SECTOR BREAKDOWN (top sectors by market cap):
${sectors.slice(0, 12).map((s: any) => `- ${s.sector_name}: ${fmt(s.combined_market_cap)} (${s.company_count} companies, 30d: ${fmtPct(s.change_30d_pct)})`).join("\n")}

GEOGRAPHIC BREAKDOWN (top countries):
${countries.slice(0, 10).map((c: any) => `- ${c.country}: ${fmt(c.combined_market_cap)} (${c.company_count} companies)`).join("\n")}`;

      const companyLinks = top50
        .map((c) => `[${c.name}](/company/${c.slug})`)
        .join(", ");

      return { dbSummary, companyLinks, companies: allCompanies };
    },
  },

  // 2. Biotech IPO Window
  {
    slug: "quiet-death-biotech-ipo-window-who-still-getting-through",
    suggestedTitle: "The Quiet Death of the Biotech IPO Window — And Who's Still Getting Through",
    topic: "The biotech IPO market has fundamentally changed. The window is mostly closed, deal sizes are smaller, and only certain types of companies get through. What does the new IPO reality look like, and what does it mean for biotech innovation pipeline?",
    category: "market-analysis",
    tags: ["ipo", "biotech-ipo", "public-markets", "capital-markets", "2026"],
    gatherData: async () => {
      const funding = await getFundingByYear();
      const topCompanies = await getTopCompanies(30);
      const snapshots = await getMarketSnapshots(30);
      const sectors = await getSectorData();
      const allCompanies = await getAllCompanyNames();

      // Extract IPO-relevant data from funding rounds
      const ipoRounds = await supabase
        .from("funding_rounds")
        .select("company_name, round_type, amount_usd, announced_date, country, sector")
        .or("round_type.ilike.%ipo%,round_type.ilike.%public%")
        .order("announced_date", { ascending: false })
        .limit(200);

      const latestSnapshot = snapshots[0];

      const dbSummary = `MARKET CONTEXT:
- Total biotech market cap: ${fmt(Number(latestSnapshot?.total_market_cap || 0))}
- Public companies tracked: ${latestSnapshot?.public_companies_count}
- YTD change: ${fmtPct(latestSnapshot?.change_ytd_pct)}

FUNDING BY YEAR (total rounds and capital):
${Object.entries(funding).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 8).map(([year, d]) => `- ${year}: ${d.count} rounds, ${fmt(d.total)} total`).join("\n")}

FUNDING ROUND TYPES BY YEAR (showing capital flow by stage):
${Object.entries(funding).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 5).map(([year, d]) => {
  const types = Object.entries(d.types).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return `${year}:\n${types.map(([t, v]) => `  - ${t}: ${fmt(v)}`).join("\n")}`;
}).join("\n")}

IPO-RELATED ROUNDS FROM DATABASE:
${(ipoRounds.data || []).slice(0, 30).map((r: any) => `- ${r.company_name}: ${r.round_type} — ${fmt(r.amount_usd)} — ${r.announced_date} — ${r.country || "N/A"}`).join("\n")}

TOP PUBLIC COMPANIES (for context on successful listings):
${topCompanies.filter(c => c.ticker).slice(0, 15).map((c) => `- ${c.name} (${c.ticker}) — ${fmt(c.valuation)} — Founded ${c.founded || "N/A"}`).join("\n")}

SECTOR MARKET CAPS:
${sectors.slice(0, 10).map((s: any) => `- ${s.sector_name}: ${fmt(s.combined_market_cap)} (${s.company_count} companies)`).join("\n")}`;

      const companyLinks = topCompanies
        .map((c) => `[${c.name}](/company/${c.slug})`)
        .join(", ");

      return { dbSummary, companyLinks, companies: allCompanies };
    },
  },

  // 3. Europe's Biotech Gap
  {
    slug: "europe-biotech-gap-closing-faster-than-expected",
    suggestedTitle: "Europe's Biotech Gap Is Closing Faster Than Anyone Expected",
    topic: "European biotech is catching up to the US faster than most analysts predicted. Switzerland, Denmark, and the UK are leading a surge. What's driving it, and can Europe sustain the momentum?",
    category: "market-analysis",
    tags: ["europe", "biotech-europe", "us-vs-europe", "switzerland", "denmark", "uk-biotech", "2026"],
    gatherData: async () => {
      const euCompanies = await getEuropeanCompanies(40);
      const usCompanies = await getUSCompanies(20);
      const countries = await getCountryData();
      const sectors = await getSectorData();
      const snapshots = await getMarketSnapshots(10);
      const allCompanies = await getAllCompanyNames();

      const euCountryList = [
        "United Kingdom", "Germany", "France", "Switzerland", "Denmark",
        "Sweden", "Netherlands", "Belgium", "Ireland", "Norway",
        "Finland", "Italy", "Spain", "Austria", "Iceland",
      ];

      const euCountries = countries.filter((c: any) => euCountryList.includes(c.country));
      const euTotalCap = euCountries.reduce((s: number, c: any) => s + Number(c.combined_market_cap || 0), 0);
      const usData = countries.find((c: any) => c.country === "United States");
      const usCap = Number(usData?.combined_market_cap || 0);

      const latestSnapshot = snapshots[0];

      const dbSummary = `MARKET OVERVIEW:
- Total global biotech market cap: ${fmt(Number(latestSnapshot?.total_market_cap || 0))}
- US biotech market cap: ${fmt(usCap)} (${usData?.company_count || 0} companies)
- European biotech combined market cap: ${fmt(euTotalCap)} (${euCountries.reduce((s: number, c: any) => s + (c.company_count || 0), 0)} companies)
- Europe as % of US: ${usCap > 0 ? ((euTotalCap / usCap) * 100).toFixed(1) : "N/A"}%

EUROPEAN COUNTRY BREAKDOWN:
${euCountries.map((c: any) => `- ${c.country}: ${fmt(c.combined_market_cap)} (${c.company_count} companies, 30d: ${fmtPct(c.change_30d_pct)}, 7d: ${fmtPct(c.change_7d_pct)})`).join("\n")}

TOP 25 EUROPEAN COMPANIES:
${euCompanies.slice(0, 25).map((c, i) => `${i + 1}. ${c.name} (${c.ticker || "Private"}) — ${c.country} — ${fmt(c.valuation)} — Founded ${c.founded || "N/A"} — ${(c.categories || []).join(", ")}`).join("\n")}

TOP 15 US COMPANIES (for comparison):
${usCompanies.slice(0, 15).map((c, i) => `${i + 1}. ${c.name} (${c.ticker || "Private"}) — ${fmt(c.valuation)}`).join("\n")}

SECTOR PERFORMANCE (global):
${sectors.slice(0, 10).map((s: any) => `- ${s.sector_name}: ${fmt(s.combined_market_cap)} (30d: ${fmtPct(s.change_30d_pct)})`).join("\n")}`;

      const companyLinks = [...euCompanies.slice(0, 30), ...usCompanies.slice(0, 10)]
        .map((c) => `[${c.name}](/company/${c.slug})`)
        .join(", ");

      return { dbSummary, companyLinks, companies: allCompanies };
    },
  },

  // 4. Funding Peak
  {
    slug: "80-billion-question-biotech-funding-peaked-2021-what-comes-next",
    suggestedTitle: "The $80 Billion Question: Why Biotech Funding Peaked in 2021 and What Comes Next",
    topic: "Biotech funding peaked around 2021 and has not recovered to those levels. The funding dynamics have permanently shifted — round sizes, stage distribution, sector preferences, and investor behavior are all different. What does the new normal look like?",
    category: "funding",
    tags: ["funding", "venture-capital", "biotech-vc", "funding-trends", "2026", "investment"],
    gatherData: async () => {
      const fundingByYear = await getFundingByYear();
      const recentRounds = await getFundingRounds(100);
      const sectors = await getSectorData();
      const snapshots = await getMarketSnapshots(10);
      const allCompanies = await getAllCompanyNames();

      // Group recent rounds by sector and type
      const bySector: Record<string, { count: number; total: number }> = {};
      const byType: Record<string, { count: number; total: number }> = {};
      for (const r of recentRounds) {
        const sec = r.sector || "Unknown";
        if (!bySector[sec]) bySector[sec] = { count: 0, total: 0 };
        bySector[sec].count++;
        bySector[sec].total += Number(r.amount_usd) || 0;

        const type = r.round_type || "Unknown";
        if (!byType[type]) byType[type] = { count: 0, total: 0 };
        byType[type].count++;
        byType[type].total += Number(r.amount_usd) || 0;
      }

      const latestSnapshot = snapshots[0];

      const dbSummary = `MARKET CONTEXT:
- Total biotech market cap: ${fmt(Number(latestSnapshot?.total_market_cap || 0))}
- YTD market change: ${fmtPct(latestSnapshot?.change_ytd_pct)}

FUNDING BY YEAR (historical):
${Object.entries(fundingByYear).sort((a, b) => b[0].localeCompare(a[0])).map(([year, d]) => `- ${year}: ${d.count} rounds, ${fmt(d.total)} total raised`).join("\n")}

ROUND TYPE EVOLUTION (last 5 years):
${Object.entries(fundingByYear).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 5).map(([year, d]) => {
  const types = Object.entries(d.types).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return `${year}:\n${types.map(([t, v]) => `  - ${t}: ${fmt(v)} (${(d.total > 0 ? (v / d.total * 100) : 0).toFixed(0)}% of total)`).join("\n")}`;
}).join("\n")}

RECENT ROUNDS BY SECTOR:
${Object.entries(bySector).sort((a, b) => b[1].total - a[1].total).slice(0, 12).map(([sec, d]) => `- ${sec}: ${d.count} deals, ${fmt(d.total)}`).join("\n")}

RECENT ROUNDS BY TYPE:
${Object.entries(byType).sort((a, b) => b[1].total - a[1].total).map(([type, d]) => `- ${type}: ${d.count} deals, ${fmt(d.total)}`).join("\n")}

TOP 20 RECENT ROUNDS:
${recentRounds.slice(0, 20).map((r) => `- ${r.company_name}: ${r.round_type || "N/A"} — ${fmt(r.amount_usd)} — ${r.announced_date} — ${r.country || "N/A"} — ${r.sector || "N/A"} — Lead: ${r.lead_investor || "N/A"}`).join("\n")}

SECTOR MARKET CAPS:
${sectors.slice(0, 12).map((s: any) => `- ${s.sector_name}: ${fmt(s.combined_market_cap)}`).join("\n")}`;

      const companyLinks = recentRounds.slice(0, 30)
        .map((r) => r.company_name)
        .filter(Boolean)
        .join(", ");

      return { dbSummary, companyLinks, companies: allCompanies };
    },
  },

  // 5. Small Molecules vs Biologics
  {
    slug: "small-molecules-vs-biologics-4-trillion-battle-reshaping-pharma",
    suggestedTitle: "Small Molecules vs Biologics: The $4 Trillion Battle Reshaping Pharma",
    topic: "Small molecules and biologics are neck-and-neck in market cap, but the dynamics are shifting. New modalities like PROTACs, molecular glues, and targeted protein degraders are revitalizing the small molecule space. Meanwhile, biologics face biosimilar pressure. Who wins the next decade?",
    category: "sector-reports",
    tags: ["small-molecules", "biologics", "protac", "biosimilars", "sector-comparison", "pharma", "2026"],
    gatherData: async () => {
      const sectors = await getSectorData();
      const smData = await getCompaniesBySector("small-molecules", 25);
      const bioData = await getCompaniesBySector("biologics", 25);
      const adcData = await getCompaniesBySector("antibody-drug-conjugates", 15);
      const rnaData = await getCompaniesBySector("rna-therapeutics", 15);
      const snapshots = await getMarketSnapshots(10);
      const allCompanies = await getAllCompanyNames();

      const smSector = sectors.find((s: any) => s.sector_slug === "small-molecules");
      const bioSector = sectors.find((s: any) => s.sector_slug === "biologics");
      const adcSector = sectors.find((s: any) => s.sector_slug === "antibody-drug-conjugates");
      const rnaSector = sectors.find((s: any) => s.sector_slug === "rna-therapeutics");
      const mrnaSector = sectors.find((s: any) => s.sector_slug === "mrna");
      const ddSector = sectors.find((s: any) => s.sector_slug === "drug-delivery");

      const latestSnapshot = snapshots[0];

      const dbSummary = `MARKET OVERVIEW:
- Total biotech market cap: ${fmt(Number(latestSnapshot?.total_market_cap || 0))}

SECTOR HEAD-TO-HEAD:
- Small Molecule Drugs: ${fmt(smSector?.combined_market_cap)} market cap, ${smSector?.company_count} companies, 30d: ${fmtPct(smSector?.change_30d_pct)}, 7d: ${fmtPct(smSector?.change_7d_pct)}
- Biologics / Biosimilars: ${fmt(bioSector?.combined_market_cap)} market cap, ${bioSector?.company_count} companies, 30d: ${fmtPct(bioSector?.change_30d_pct)}, 7d: ${fmtPct(bioSector?.change_7d_pct)}

RELATED SECTORS:
- Antibody-Drug Conjugates: ${fmt(adcSector?.combined_market_cap)} (${adcSector?.company_count} companies, 30d: ${fmtPct(adcSector?.change_30d_pct)})
- RNA Therapeutics: ${fmt(rnaSector?.combined_market_cap)} (${rnaSector?.company_count} companies, 30d: ${fmtPct(rnaSector?.change_30d_pct)})
- mRNA Therapeutics: ${fmt(mrnaSector?.combined_market_cap)} (${mrnaSector?.company_count} companies)
- Drug Delivery: ${fmt(ddSector?.combined_market_cap)} (${ddSector?.company_count} companies)

TOP SMALL MOLECULE COMPANIES:
${smData.companies.slice(0, 20).map((c, i) => `${i + 1}. ${c.name} (${c.ticker || "Private"}) — ${c.country || "N/A"} — ${fmt(c.valuation)}`).join("\n")}

TOP BIOLOGICS COMPANIES:
${bioData.companies.slice(0, 20).map((c, i) => `${i + 1}. ${c.name} (${c.ticker || "Private"}) — ${c.country || "N/A"} — ${fmt(c.valuation)}`).join("\n")}

TOP ADC COMPANIES:
${adcData.companies.slice(0, 10).map((c, i) => `${i + 1}. ${c.name} — ${fmt(c.valuation)}`).join("\n")}

ALL SECTORS BY MARKET CAP:
${sectors.map((s: any) => `- ${s.sector_name}: ${fmt(s.combined_market_cap)} (${s.company_count} cos)`).join("\n")}`;

      const companyLinks = [
        ...smData.companies.slice(0, 15),
        ...bioData.companies.slice(0, 15),
        ...adcData.companies.slice(0, 5),
      ]
        .map((c) => `[${c.name}](/company/${c.slug})`)
        .join(", ");

      return { dbSummary, companyLinks, companies: allCompanies };
    },
  },
];

/* ─── Main Pipeline ─── */

async function generateEliteArticle(def: EliteArticleDef): Promise<{
  title: string;
  content: string;
  excerpt: string;
}> {
  console.log(`\n  Gathering data for "${def.suggestedTitle}"...`);
  const { dbSummary, companyLinks, companies } = await def.gatherData();

  // Step 1: Outline
  const outline = await generateOutline(def.topic, dbSummary);
  console.log(`    Outline: "${outline.title}" — ${outline.sections.length} sections`);

  // Step 2: Research
  const researched = await researchSections(outline, dbSummary);

  // Step 3: Draft
  const draft = await writeDraft(outline, researched, companyLinks);

  // Step 4: Refine
  const refined = await refineDraft(draft, outline.thesis);

  // Auto-link company names
  const withLinks = addInternalLinks(refined, companies);

  // Extract excerpt
  const firstPara = withLinks
    .split("\n\n")
    .find((p) => p.trim() && !p.startsWith("#") && !p.startsWith("|") && !p.startsWith("-") && !p.startsWith(">"));
  const excerpt = firstPara
    ? firstPara.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "").slice(0, 280)
    : "";

  return {
    title: outline.title,
    content: withLinks,
    excerpt,
  };
}

async function main() {
  console.log("=== Elite Article Generator — 4-Step Pipeline ===\n");
  console.log(`Pipeline: Outline → Research → Draft → Refine`);
  console.log(`Articles to generate: ${eliteArticles.length}\n`);

  // Check existing
  const { data: existing } = await supabase
    .from("blog_posts")
    .select("slug");
  const existingSlugs = new Set((existing || []).map((e: { slug: string }) => e.slug));

  let generated = 0;
  let skipped = 0;

  for (const def of eliteArticles) {
    if (existingSlugs.has(def.slug)) {
      console.log(`  SKIP: "${def.suggestedTitle}" (slug exists: ${def.slug})`);
      skipped++;
      continue;
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`GENERATING: ${def.suggestedTitle}`);
    console.log(`${"=".repeat(60)}`);

    try {
      const { title, content, excerpt } = await generateEliteArticle(def);

      const metaDescription = `${excerpt.slice(0, 155)}...`;

      const { error } = await supabase.from("blog_posts").insert({
        slug: def.slug,
        title,
        content,
        excerpt,
        category: def.category,
        tags: def.tags,
        author: "BiotechTube Research",
        meta_title: title,
        meta_description: metaDescription,
        status: "published",
      });

      if (error) {
        console.error(`  DB INSERT ERROR for "${def.slug}":`, error.message);
      } else {
        console.log(`  PUBLISHED: "${title}"`);
        console.log(`  Slug: ${def.slug}`);
        console.log(`  Excerpt: ${excerpt.slice(0, 100)}...`);
        generated++;
      }
    } catch (err: any) {
      console.error(`  PIPELINE ERROR for "${def.suggestedTitle}":`, err.message);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`COMPLETE: Generated ${generated}, Skipped ${skipped}, Total ${eliteArticles.length}`);
  console.log(`${"=".repeat(60)}`);
}

main().catch(console.error);
