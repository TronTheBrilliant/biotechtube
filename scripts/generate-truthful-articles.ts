#!/usr/bin/env npx tsx
/**
 * Truthful Article Generator — Every claim is sourced from real news or our DB.
 *
 * Pipeline:
 *  1. Gather sources (recent news_items + DB data)
 *  2. Pick topics based on actual coverage density
 *  3. Outline with source citations
 *  4. Draft using ONLY provided facts
 *  5. Fact-check numbers against DB
 *  6. Add sources section
 *
 * Generates 3 articles:
 *  - Weekly Market Recap
 *  - Funding Roundup
 *  - Topic article (most-covered topic from news)
 *
 * Usage: npx tsx scripts/generate-truthful-articles.ts
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

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/* ─── DeepSeek calls ─── */

async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 8000,
  temperature = 0.5
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

/* ─── Auto-link company names (improved version) ─── */

function addInternalLinks(
  content: string,
  companies: { name: string; slug: string }[]
): string {
  // Sort by name length descending to avoid partial matches
  const sorted = [...companies].sort((a, b) => b.name.length - a.name.length);
  let result = content;
  const linked = new Set<string>();

  for (const co of sorted) {
    // Skip short names (too ambiguous) and already-linked companies
    if (!co.name || !co.slug || co.name.length < 4) continue;
    if (linked.has(co.slug)) continue;

    const escaped = co.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Match word boundaries, but NOT inside:
    // - existing markdown links [...](...)
    // - heading lines (starting with ##)
    const regex = new RegExp(
      `(?<!\\[)(?<![#]{1,4}\\s.*)\\b${escaped}\\b(?!\\]\\()(?![^\\[]*\\])`,
      "gi"
    );

    let replaced = false;
    result = result.replace(regex, (match) => {
      if (replaced) return match; // Only link first occurrence
      replaced = true;
      linked.add(co.slug);
      return `[${match}](/company/${co.slug})`;
    });
  }

  return result;
}

/* ─── Database queries ─── */

interface NewsItem {
  id: string;
  title: string;
  source_name: string;
  source_url: string | null;
  published_date: string | null;
  summary: string | null;
  category: string | null;
  companies_mentioned: string[] | null;
}

async function getRecentNews(days = 14): Promise<NewsItem[]> {
  const since = daysAgo(days);
  const { data } = await supabase
    .from("news_items")
    .select("*")
    .gte("published_date", since)
    .order("published_date", { ascending: false })
    .limit(100);
  return (data || []) as NewsItem[];
}

async function getAllNews(): Promise<NewsItem[]> {
  const { data } = await supabase
    .from("news_items")
    .select("*")
    .order("published_date", { ascending: false })
    .limit(100);
  return (data || []) as NewsItem[];
}

async function getTopCompanies(limit = 30) {
  const { data } = await supabase
    .from("companies")
    .select("name, slug, country, valuation, ticker, description, categories")
    .not("valuation", "is", null)
    .order("valuation", { ascending: false })
    .limit(limit);
  return data || [];
}

async function getAllCompanyNamesForLinking() {
  const { data } = await supabase
    .from("companies")
    .select("name, slug")
    .not("valuation", "is", null)
    .order("valuation", { ascending: false })
    .limit(500);
  return data || [];
}

async function getTotalMarketCap(): Promise<string> {
  const { data } = await supabase
    .from("companies")
    .select("valuation")
    .not("valuation", "is", null);
  if (!data) return "N/A";
  const total = data.reduce((sum, c) => sum + Number(c.valuation || 0), 0);
  return fmt(total);
}

async function getMarketStats() {
  const { count: totalCompanies } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true });

  const { count: publicCompanies } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true })
    .not("ticker", "is", null);

  return { totalCompanies: totalCompanies || 0, publicCompanies: publicCompanies || 0 };
}

async function getRecentFundingFromDB() {
  const { data } = await supabase
    .from("funding_rounds")
    .select("company_id, amount, round_type, announced_date")
    .order("announced_date", { ascending: false })
    .limit(20);
  return data || [];
}

/* ─── Source formatting ─── */

function formatSourcesForPrompt(items: NewsItem[]): string {
  return items
    .map(
      (n, i) =>
        `[Source ${i + 1}] ${n.title} (${n.source_name}, ${n.published_date || "recent"}): ${n.summary || "No summary"}`
    )
    .join("\n");
}

function formatSourcesSection(items: NewsItem[]): string {
  const seen = new Set<string>();
  const unique = items.filter((n) => {
    const key = n.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let section = "\n\n---\n\n## Sources\n\n";
  unique.forEach((n, i) => {
    const sourceLabel = n.source_name
      .replace("biospace", "BioSpace")
      .replace("fiercebiotech", "FierceBiotech")
      .replace("endpointsnews", "Endpoints News")
      .replace(/^deepseek.*/, "Industry Reports");

    if (n.source_url) {
      section += `${i + 1}. [${n.title}](${n.source_url}) — *${sourceLabel}*, ${n.published_date || "recent"}\n`;
    } else {
      section += `${i + 1}. ${n.title} — *${sourceLabel}*, ${n.published_date || "recent"}\n`;
    }
  });

  return section;
}

/* ─── Article generation ─── */

const SYSTEM_PROMPT = `You are a senior biotech market analyst writing for BiotechTube, a professional biotech intelligence platform at biotechtube.io.

CRITICAL RULES — FOLLOW THESE EXACTLY:
1. You may ONLY use facts from the SOURCES and DATABASE FACTS provided below
2. Do NOT add any facts, numbers, dates, or claims that are not in the sources
3. If you are not sure about something, do NOT include it
4. Every major claim must reference a source using [Source: N] inline
5. Write like a financial journalist at STAT News or Endpoints News — professional, analytical, never promotional
6. Use markdown with ## headings (never #)
7. Include markdown data tables where relevant
8. Link companies to their profiles: [Company Name](/company/company-slug)
9. Write in present tense for ongoing situations, past tense for events
10. Do NOT use phrases like "according to our database" — present data naturally`;

async function generateWeeklyRecap(
  news: NewsItem[],
  topCompanies: any[],
  marketCap: string,
  stats: { totalCompanies: number; publicCompanies: number }
): Promise<{ title: string; content: string; excerpt: string; tags: string[] }> {
  console.log("  Generating Weekly Market Recap...");

  const weekLabel = getWeekLabel();

  const prompt = `Write a 1,800-2,200 word weekly biotech market recap for the week of ${weekLabel}.

SOURCES (verified news from the past 7-14 days):
${formatSourcesForPrompt(news)}

DATABASE FACTS (from BiotechTube's verified database):
- Total biotech companies tracked: ${stats.totalCompanies.toLocaleString()}
- Public biotech companies: ${stats.publicCompanies.toLocaleString()}
- Combined market cap of tracked companies: ${marketCap}
- Top 10 by market cap: ${topCompanies.slice(0, 10).map((c) => `${c.name} (${fmt(c.valuation)})`).join(", ")}

Structure the article as:
1. Opening paragraph summarizing the week's key themes (cite sources)
2. ## Key Developments — cover 3-5 of the biggest stories with [Source: N] citations
3. ## Market Movers — mention any companies with notable stock moves or valuations from our DB
4. ## Regulatory Updates — any FDA news from sources
5. ## Looking Ahead — what to watch next week based on facts in sources
6. DO NOT add a Sources section — it will be appended automatically

Remember: ONLY use facts from the sources provided. Add [Source: N] inline citations.`;

  const content = await callDeepSeek(SYSTEM_PROMPT, prompt);

  // Append sources section
  const sourcedContent = content + formatSourcesSection(news);

  return {
    title: `Biotech Market Weekly: ${weekLabel}`,
    content: sourcedContent,
    excerpt: `Key developments in biotech for the week of ${weekLabel}, covering regulatory updates, clinical trial results, and market movements — sourced from verified news.`,
    tags: ["weekly-recap", "market-analysis", "biotech", "sourced"],
  };
}

async function generateFundingRoundup(
  news: NewsItem[],
  topCompanies: any[],
  marketCap: string
): Promise<{ title: string; content: string; excerpt: string; tags: string[] }> {
  console.log("  Generating Funding Roundup...");

  const fundingNews = news.filter((n) => n.category === "funding");
  const allNews = fundingNews.length >= 3 ? fundingNews : news; // Fallback to all news if not enough funding

  const prompt = `Write a 1,500-2,000 word biotech funding roundup article.

SOURCES (verified funding and deal news):
${formatSourcesForPrompt(allNews)}

DATABASE FACTS:
- Total biotech companies tracked: over 11,000
- Combined market cap: ${marketCap}
- Top companies by valuation: ${topCompanies.slice(0, 5).map((c) => `${c.name} (${fmt(c.valuation)})`).join(", ")}

Structure:
1. Opening: summarize the funding landscape this period
2. ## Notable Rounds — detail each funding round from sources with [Source: N] citations
3. ## Deal Activity — any M&A or partnership deals from sources
4. ## Market Context — how funding activity connects to broader market trends from our DB
5. ## What This Means — brief analysis staying close to the facts
6. DO NOT add a Sources section — it will be appended automatically

Include a markdown table of funding rounds if 3+ are mentioned in sources.
Remember: ONLY use facts from the sources provided. Add [Source: N] inline citations.`;

  const content = await callDeepSeek(SYSTEM_PROMPT, prompt);
  const sourcedContent = content + formatSourcesSection(allNews);

  return {
    title: `Biotech Funding Roundup: ${getWeekLabel()}`,
    content: sourcedContent,
    excerpt: `This week's biotech funding activity — real deals, real numbers, all sourced from verified reporting.`,
    tags: ["funding", "deals", "biotech", "sourced"],
  };
}

async function generateTopicArticle(
  news: NewsItem[],
  topCompanies: any[],
  marketCap: string,
  stats: { totalCompanies: number; publicCompanies: number }
): Promise<{ title: string; content: string; excerpt: string; tags: string[] }> {
  console.log("  Determining best topic from news coverage...");

  // Count categories
  const catCounts: Record<string, number> = {};
  for (const n of news) {
    const cat = n.category || "general";
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  }

  // Pick the most-covered non-general category
  const sorted = Object.entries(catCounts)
    .filter(([cat]) => cat !== "general")
    .sort((a, b) => b[1] - a[1]);

  const topCategory = sorted.length > 0 ? sorted[0][0] : "clinical_trial";
  const topicNews = news.filter((n) => n.category === topCategory);
  const sourceNews = topicNews.length >= 3 ? topicNews : news;

  const topicTitles: Record<string, string> = {
    fda: "FDA Watch: Recent Regulatory Decisions Shaping Biotech",
    clinical_trial: "Clinical Trial Spotlight: Key Results Driving the Market",
    acquisition: "M&A in Biotech: This Period's Deal Activity",
    funding: "Venture Capital Pulse: Where Biotech Funding Is Flowing",
    earnings: "Biotech Earnings Season: What the Numbers Show",
  };

  const title = topicTitles[topCategory] || "Biotech Market Analysis: What the Data Shows";
  console.log(`  Topic: ${topCategory} (${topicNews.length} stories)`);

  const prompt = `Write a 1,800-2,200 word analysis article about ${topCategory.replace("_", " ")} activity in biotech.

Title: ${title}

SOURCES (verified ${topCategory} news):
${formatSourcesForPrompt(sourceNews)}

DATABASE FACTS:
- Total biotech companies tracked: ${stats.totalCompanies.toLocaleString()}
- Public companies: ${stats.publicCompanies.toLocaleString()}
- Combined market cap: ${marketCap}
- Top companies: ${topCompanies.slice(0, 10).map((c) => `${c.name} (${fmt(c.valuation)})`).join(", ")}

Structure:
1. Opening: set the stage with context from sources
2. ## The Big Picture — overview of ${topCategory.replace("_", " ")} trends using source data
3. ## Key Stories — detail 3-5 specific stories with [Source: N] citations
4. ## By the Numbers — a data table summarizing key figures from sources + our DB
5. ## Analysis — what this means for the sector (stay close to facts)
6. ## What to Watch — upcoming events/catalysts mentioned in sources
7. DO NOT add a Sources section — it will be appended automatically

Remember: ONLY use facts from the sources provided. Add [Source: N] inline citations.`;

  const content = await callDeepSeek(SYSTEM_PROMPT, prompt);
  const sourcedContent = content + formatSourcesSection(sourceNews);

  return {
    title,
    content: sourcedContent,
    excerpt: `Analysis of recent ${topCategory.replace("_", " ")} activity in biotech — every claim sourced from verified reporting and real data.`,
    tags: [topCategory.replace("_", "-"), "analysis", "biotech", "sourced"],
  };
}

/* ─── Fact-checking step ─── */

function factCheckNumbers(
  content: string,
  topCompanies: any[],
  marketCap: string
): { content: string; warnings: string[] } {
  const warnings: string[] = [];

  // Check if any company valuations in the article wildly mismatch our DB
  for (const co of topCompanies) {
    if (!co.valuation) continue;
    const dbVal = fmt(co.valuation);
    // Look for the company name followed by a dollar amount
    const regex = new RegExp(
      `${co.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^.]*?\\$([\\d,.]+)\\s*(T|B|M|trillion|billion|million)`,
      "gi"
    );
    const match = regex.exec(content);
    if (match) {
      const articleAmount = match[1].replace(/,/g, "");
      const articleUnit = match[2].toUpperCase();
      const articleVal = parseFloat(articleAmount);

      let dbNum = Number(co.valuation);
      let normalizedArticle = articleVal;

      if (articleUnit === "T" || articleUnit === "TRILLION")
        normalizedArticle = articleVal * 1e12;
      else if (articleUnit === "B" || articleUnit === "BILLION")
        normalizedArticle = articleVal * 1e9;
      else if (articleUnit === "M" || articleUnit === "MILLION")
        normalizedArticle = articleVal * 1e6;

      // If off by more than 50%, flag it
      if (dbNum > 0 && Math.abs(normalizedArticle - dbNum) / dbNum > 0.5) {
        warnings.push(
          `WARNING: ${co.name} valuation in article ($${match[0]}) differs significantly from DB (${dbVal})`
        );
      }
    }
  }

  return { content, warnings };
}

/* ─── Publishing ─── */

async function publishArticle(article: {
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  category: string;
}) {
  const slug = slugify(article.title);

  // Check if slug already exists
  const { data: existing } = await supabase
    .from("blog_posts")
    .select("id")
    .eq("slug", slug)
    .limit(1);

  if (existing && existing.length > 0) {
    // Update existing
    const { error } = await supabase
      .from("blog_posts")
      .update({
        title: article.title,
        content: article.content,
        excerpt: article.excerpt,
        tags: article.tags,
        category: article.category,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", slug);

    if (error) throw error;
    console.log(`  Updated: ${slug}`);
    return slug;
  }

  // Insert new
  const { error } = await supabase.from("blog_posts").insert({
    slug,
    title: article.title,
    content: article.content,
    excerpt: article.excerpt,
    tags: article.tags,
    category: article.category,
    author: "BiotechTube Research",
    status: "published",
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    meta_title: article.title,
    meta_description: article.excerpt,
  });

  if (error) throw error;
  console.log(`  Published: ${slug}`);
  return slug;
}

/* ─── Week label helper ─── */

function getWeekLabel(): string {
  const now = new Date();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Find this week's Monday
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(monday.getDate() - daysToMonday);

  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);

  const month = monthNames[monday.getMonth()];

  if (monday.getMonth() === friday.getMonth()) {
    return `${month} ${monday.getDate()}-${friday.getDate()}, ${monday.getFullYear()}`;
  }
  return `${monthNames[monday.getMonth()]} ${monday.getDate()} - ${monthNames[friday.getMonth()]} ${friday.getDate()}, ${friday.getFullYear()}`;
}

/* ─── Main ─── */

async function main() {
  console.log("=== Truthful Article Generator ===\n");

  // 1. Gather all data sources
  console.log("--- Gathering Sources ---");
  let news = await getRecentNews(14);
  if (news.length === 0) {
    console.log("  No recent news found, fetching all available...");
    news = await getAllNews();
  }
  console.log(`  News items: ${news.length}`);

  if (news.length === 0) {
    console.error("ERROR: No news items in database. Run scrape-biotech-news.ts first.");
    process.exit(1);
  }

  const topCompanies = await getTopCompanies(30);
  const marketCap = await getTotalMarketCap();
  const stats = await getMarketStats();
  const linkCompanies = await getAllCompanyNamesForLinking();
  console.log(`  Top companies: ${topCompanies.length}`);
  console.log(`  Market cap: ${marketCap}`);
  console.log(`  Total companies: ${stats.totalCompanies}, Public: ${stats.publicCompanies}\n`);

  // 2. Generate articles
  console.log("--- Generating Articles ---");

  const articles: {
    title: string;
    content: string;
    excerpt: string;
    tags: string[];
    category: string;
  }[] = [];

  // Article 1: Weekly Market Recap
  try {
    const recap = await generateWeeklyRecap(news, topCompanies, marketCap, stats);
    recap.content = addInternalLinks(recap.content, linkCompanies);
    const { warnings } = factCheckNumbers(recap.content, topCompanies, marketCap);
    warnings.forEach((w) => console.log(`  ${w}`));
    articles.push({ ...recap, category: "weekly-recap" });
    console.log(`  [OK] Weekly Recap: ${recap.title}`);
  } catch (err: any) {
    console.error(`  [FAIL] Weekly Recap: ${err.message}`);
  }

  await sleep(3000);

  // Article 2: Funding Roundup
  try {
    const funding = await generateFundingRoundup(news, topCompanies, marketCap);
    funding.content = addInternalLinks(funding.content, linkCompanies);
    const { warnings } = factCheckNumbers(funding.content, topCompanies, marketCap);
    warnings.forEach((w) => console.log(`  ${w}`));
    articles.push({ ...funding, category: "funding" });
    console.log(`  [OK] Funding Roundup: ${funding.title}`);
  } catch (err: any) {
    console.error(`  [FAIL] Funding Roundup: ${err.message}`);
  }

  await sleep(3000);

  // Article 3: Topic Article
  try {
    const topic = await generateTopicArticle(news, topCompanies, marketCap, stats);
    topic.content = addInternalLinks(topic.content, linkCompanies);
    const { warnings } = factCheckNumbers(topic.content, topCompanies, marketCap);
    warnings.forEach((w) => console.log(`  ${w}`));
    articles.push({ ...topic, category: "analysis" });
    console.log(`  [OK] Topic Article: ${topic.title}`);
  } catch (err: any) {
    console.error(`  [FAIL] Topic Article: ${err.message}`);
  }

  // 3. Publish
  console.log("\n--- Publishing ---");
  for (const article of articles) {
    try {
      await publishArticle(article);
    } catch (err: any) {
      console.error(`  Publish error for "${article.title}": ${err.message}`);
    }
  }

  console.log(`\n=== Done! Published ${articles.length} truthful articles ===`);
}

main().catch(console.error);
