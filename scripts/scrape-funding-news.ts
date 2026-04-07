/**
 * Biotech Funding News Scraper
 *
 * Layer 1 of the combined funding pipeline.
 * Scrapes RSS feeds for biotech funding announcements, uses DeepSeek
 * to extract structured data, matches to companies, inserts into funding_rounds.
 *
 * Sources: GlobeNewswire, BusinessWire, PRNewswire, FierceBiotech
 *
 * Usage: npx tsx scripts/scrape-funding-news.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── RSS Feed Sources ───
const RSS_FEEDS = [
  {
    name: "GlobeNewswire",
    url: "https://www.globenewswire.com/RssFeed/subjectcode/15-Pharmaceuticals+Biotechnology/feedTitle/GlobeNewswire+-+Pharmaceuticals+Biotechnology",
    source_name: "globenewswire",
  },
  {
    name: "BusinessWire",
    url: "https://feed.businesswire.com/rss/home/?rss=G22",
    source_name: "businesswire",
  },
  {
    name: "PRNewswire",
    url: "https://www.prnewswire.com/rss/health-latest-news/health-latest-news-list.rss",
    source_name: "prnewswire",
  },
];

// Keywords that signal a funding announcement
const FUNDING_KEYWORDS = [
  "raises", "raised", "funding", "series a", "series b", "series c", "series d",
  "seed round", "seed funding", "investment", "million", "financing",
  "capital raise", "ipo", "initial public offering", "public offering",
  "pipe", "private placement", "grant", "awarded", "venture",
  "$m", "$b", "closes", "closed", "secures", "secured",
];

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
}

interface ExtractedRound {
  company_name: string;
  round_type: string;
  amount_usd: number;
  lead_investor: string;
  date: string;
  source_url: string;
  source_name: string;
}

// ─── RSS Parsing (simple XML extraction without library) ───
async function fetchRSSFeed(feed: typeof RSS_FEEDS[0]): Promise<RSSItem[]> {
  try {
    const response = await fetch(feed.url, {
      headers: { "User-Agent": "BiotechTube Research Bot (research@biotechtube.io)" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.log(`  ⚠ ${feed.name}: HTTP ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const items: RSSItem[] = [];

    // Simple XML item extraction
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
    for (const itemXml of itemMatches.slice(0, 50)) { // Max 50 items per feed
      const title = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() || "";
      const link = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() || "";
      const description = itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").trim() || "";
      const pubDate = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || "";

      if (title) {
        items.push({ title, link, description: description.substring(0, 500), pubDate, source: feed.source_name });
      }
    }

    return items;
  } catch (err) {
    console.log(`  ⚠ ${feed.name}: ${(err as Error).message}`);
    return [];
  }
}

function isFundingRelated(item: RSSItem): boolean {
  const text = `${item.title} ${item.description}`.toLowerCase();
  return FUNDING_KEYWORDS.some((kw) => text.includes(kw));
}

// ─── AI Extraction ───
async function extractFundingData(articles: RSSItem[]): Promise<ExtractedRound[]> {
  if (articles.length === 0) return [];

  const articleTexts = articles.map((a, i) =>
    `[${i + 1}] "${a.title}" — ${a.description.substring(0, 200)}`
  ).join("\n\n");

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are a biotech funding data extractor. Given news article titles and descriptions, extract funding round information.

Return a JSON array of funding rounds. Each round:
{
  "article_index": 1,
  "company_name": "Company Name",
  "round_type": "Series A"|"Series B"|"Series C"|"Seed"|"IPO"|"PIPE"|"Grant"|"Venture"|"Debt"|"Public Offering",
  "amount_millions_usd": 50,
  "lead_investor": "Investor Name" or "Undisclosed",
  "date": "YYYY-MM-DD"
}

RULES:
- Only extract if there's a CLEAR funding announcement (not just mentioning money)
- Convert all amounts to millions USD
- If amount is unclear, use 0
- If date is unclear, use today's date
- Skip articles that aren't about a specific company's funding round
- Return ONLY the JSON array, no markdown`
        },
        {
          role: "user",
          content: `Extract funding rounds from these biotech news articles:\n\n${articleTexts}\n\nToday's date: ${new Date().toISOString().split("T")[0]}`
        }
      ],
      temperature: 0,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    console.error(`  DeepSeek error: ${response.status}`);
    return [];
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || "[]";

  try {
    let clean = content.trim();
    if (clean.startsWith("```")) clean = clean.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();

    const rounds = JSON.parse(clean);
    if (!Array.isArray(rounds)) return [];

    return rounds
      .filter((r: { company_name: string; round_type: string }) => r.company_name && r.round_type)
      .map((r: { article_index: number; company_name: string; round_type: string; amount_millions_usd: number; lead_investor: string; date: string }) => {
        const article = articles[(r.article_index || 1) - 1];
        return {
          company_name: r.company_name,
          round_type: r.round_type,
          amount_usd: (r.amount_millions_usd || 0) * 1_000_000,
          lead_investor: r.lead_investor || "Undisclosed",
          date: r.date || new Date().toISOString().split("T")[0],
          source_url: article?.link || "",
          source_name: article?.source || "news",
        };
      });
  } catch {
    console.error("  JSON parse error from DeepSeek");
    return [];
  }
}

// ─── Company Matching ───
async function matchCompany(companyName: string): Promise<string | null> {
  // Try exact match first
  const { data: exact } = await supabase
    .from("companies")
    .select("id")
    .ilike("name", companyName)
    .limit(1)
    .single();

  if (exact) return exact.id;

  // Try partial match
  const { data: partial } = await supabase
    .from("companies")
    .select("id")
    .ilike("name", `%${companyName}%`)
    .limit(1)
    .single();

  return partial?.id || null;
}

// ─── Deduplication ───
async function isDuplicate(companyId: string, roundType: string, date: string, amount: number): Promise<boolean> {
  // Check same company + round type + date within 30 days
  const dateObj = new Date(date);
  const dateMin = new Date(dateObj);
  dateMin.setDate(dateMin.getDate() - 30);
  const dateMax = new Date(dateObj);
  dateMax.setDate(dateMax.getDate() + 30);

  const { data } = await supabase
    .from("funding_rounds")
    .select("id, amount_usd")
    .eq("company_id", companyId)
    .eq("round_type", roundType)
    .gte("announced_date", dateMin.toISOString().split("T")[0])
    .lte("announced_date", dateMax.toISOString().split("T")[0])
    .limit(5);

  if (!data || data.length === 0) return false;

  // If same round type exists in the window, check amount similarity
  if (amount === 0) return true; // No amount = likely duplicate
  for (const existing of data) {
    if (!existing.amount_usd) return true; // Existing has no amount, likely same round
    const ratio = amount / existing.amount_usd;
    if (ratio > 0.8 && ratio < 1.2) return true; // Within 20% = same round
  }

  return false;
}

// ─── Main Pipeline ───
async function main() {
  console.log("=== Biotech Funding News Scraper ===\n");
  const startTime = Date.now();

  // Step 1: Fetch RSS feeds
  console.log("📡 Fetching RSS feeds...");
  let allItems: RSSItem[] = [];
  for (const feed of RSS_FEEDS) {
    const items = await fetchRSSFeed(feed);
    console.log(`  ${feed.name}: ${items.length} items`);
    allItems.push(...items);
  }
  console.log(`  Total: ${allItems.length} items\n`);

  // Step 2: Filter for funding-related articles
  const fundingArticles = allItems.filter(isFundingRelated);
  console.log(`💰 Funding-related articles: ${fundingArticles.length}\n`);

  if (fundingArticles.length === 0) {
    console.log("No funding articles found. Done.");
    return;
  }

  // Step 3: Extract structured data using AI (batch of 15)
  console.log("🤖 Extracting funding data with AI...");
  const allRounds: ExtractedRound[] = [];
  const BATCH = 15;
  for (let i = 0; i < fundingArticles.length; i += BATCH) {
    const batch = fundingArticles.slice(i, i + BATCH);
    const rounds = await extractFundingData(batch);
    allRounds.push(...rounds);
    console.log(`  Batch ${Math.floor(i / BATCH) + 1}: extracted ${rounds.length} rounds`);
    if (i + BATCH < fundingArticles.length) {
      await new Promise((r) => setTimeout(r, 1000)); // Rate limit
    }
  }
  console.log(`  Total extracted: ${allRounds.length} rounds\n`);

  // Step 4: Match to companies and insert
  console.log("🔗 Matching and inserting...");
  let inserted = 0;
  let duplicates = 0;
  let noMatch = 0;

  for (const round of allRounds) {
    // Match company
    const companyId = await matchCompany(round.company_name);
    if (!companyId) {
      noMatch++;
      continue;
    }

    // Check duplicate
    if (await isDuplicate(companyId, round.round_type, round.date, round.amount_usd)) {
      duplicates++;
      continue;
    }

    // Insert
    const { error } = await supabase.from("funding_rounds").insert({
      company_id: companyId,
      company_name: round.company_name,
      round_type: round.round_type,
      amount_usd: round.amount_usd > 0 ? round.amount_usd : null,
      announced_date: round.date,
      lead_investor: round.lead_investor,
      source_name: round.source_name,
      source_url: round.source_url,
      confidence: "scraped",
    });

    if (!error) {
      inserted++;
      console.log(`  ✓ ${round.company_name}: ${round.round_type} $${round.amount_usd ? (round.amount_usd / 1e6).toFixed(0) + "M" : "?"}`);
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n=== Done (${elapsed}s) ===`);
  console.log(`Inserted: ${inserted} new rounds`);
  console.log(`Duplicates skipped: ${duplicates}`);
  console.log(`No company match: ${noMatch}`);
  console.log(`Total in pipeline: ${allRounds.length}`);
}

main().catch(console.error);
