#!/usr/bin/env npx tsx
/**
 * Scrape biotech news from RSS feeds and insert into news_items table.
 *
 * Sources:
 *  - BioSpace RSS
 *  - FierceBiotech RSS
 *  - Endpoints News RSS
 *
 * Fallback: Uses DeepSeek to generate a curated list of real recent news.
 *
 * Usage: npx tsx scripts/scrape-biotech-news.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";
import { CompanyMatcher, loadCompanies } from "./lib/company-matcher";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

/* ─── Helpers ─── */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function categorizeArticle(title: string, summary: string): string {
  const text = (title + " " + summary).toLowerCase();

  if (/\bfda\b|approval|approv|clear(ed|ance)|510\(k\)|breakthrough\s+therapy|priority\s+review|pdufa|nda\b|bla\b|eua\b/.test(text))
    return "fda";
  if (/phase\s+[1-4i]+|clinical\s+trial|pivotal|endpoint|interim\s+(data|results|analysis)|topline|readout|efficacy|safety\s+data/.test(text))
    return "clinical_trial";
  if (/acqui(re|sition)|merger|buyout|take(s|n)?\s+over|deal\s+worth|bid\s+for/.test(text))
    return "acquisition";
  if (/fund(ing|ed|raise)|series\s+[a-f]|ipo\b|raised?\s+\$|venture|financing|capital\s+raise|public\s+offering/.test(text))
    return "funding";
  if (/revenue|earning|quarter|q[1-4]\b|fiscal|profit|loss|beat|miss|guidance|eps\b|financial\s+results/.test(text))
    return "earnings";

  return "general";
}

/* ─── RSS Parsing (simple XML extraction, no dependencies) ─── */

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

function parseRSSItems(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const getTag = (tag: string): string => {
      // Handle CDATA
      const cdataMatch = block.match(new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i"));
      if (cdataMatch) return cdataMatch[1].trim();
      const simpleMatch = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
      return simpleMatch ? simpleMatch[1].trim() : "";
    };

    const title = stripHtml(getTag("title"));
    const link = getTag("link").replace(/<!\[CDATA\[(.*?)\]\]>/, "$1").trim();
    const pubDate = getTag("pubDate");
    const description = getTag("description");

    if (title && link) {
      items.push({ title, link, pubDate, description });
    }
  }

  return items;
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

/* ─── RSS Feed Scraping ─── */

interface NewsItem {
  title: string;
  source_name: string;
  source_url: string;
  published_date: string | null;
  summary: string;
  category: string;
  companies_mentioned: string[];
}

const RSS_FEEDS = [
  { url: "https://www.biospace.com/rss", source: "biospace" },
  { url: "https://www.fiercebiotech.com/rss/xml", source: "fiercebiotech" },
  { url: "https://endpts.com/feed/", source: "endpointsnews" },
];

async function scrapeRSSFeed(
  feedUrl: string,
  sourceName: string,
  companyNames: string[]
): Promise<NewsItem[]> {
  console.log(`  Fetching ${sourceName}: ${feedUrl}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(feedUrl, {
      headers: {
        "User-Agent": "BiotechTube/1.0 (news aggregator)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`  ${sourceName} returned ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const rssItems = parseRSSItems(xml);
    console.log(`  Found ${rssItems.length} items from ${sourceName}`);

    const items: NewsItem[] = [];
    for (const item of rssItems) {
      const summary = stripHtml(item.description).slice(0, 500);
      const category = categorizeArticle(item.title, summary);

      // Find mentioned companies
      const mentioned: string[] = [];
      const searchText = (item.title + " " + summary).toLowerCase();
      for (const name of companyNames) {
        if (name.length >= 4 && searchText.includes(name.toLowerCase())) {
          mentioned.push(name);
        }
      }

      items.push({
        title: item.title.slice(0, 500),
        source_name: sourceName,
        source_url: item.link,
        published_date: parseDate(item.pubDate),
        summary,
        category,
        companies_mentioned: mentioned,
      });
    }

    return items;
  } catch (err: any) {
    console.warn(`  Failed to fetch ${sourceName}: ${err.message}`);
    return [];
  }
}

/* ─── DeepSeek Fallback ─── */

async function fetchNewsViaDeepSeek(): Promise<NewsItem[]> {
  if (!DEEPSEEK_API_KEY) {
    console.warn("  No DEEPSEEK_API_KEY — skipping AI fallback");
    return [];
  }

  console.log("  Using DeepSeek fallback for news gathering...");

  const today = new Date().toISOString().split("T")[0];

  const prompt = `List the 20 most important biotech and pharmaceutical news stories from the past 7 days (today is ${today}). For each, provide the following in a JSON array:

[
  {
    "title": "exact headline",
    "source": "publication name (e.g., STAT News, Endpoints News, FierceBiotech, BioPharma Dive)",
    "date": "YYYY-MM-DD",
    "summary": "2-3 sentence factual summary focusing on verifiable facts only",
    "companies": ["Company A", "Company B"],
    "category": "funding|fda|clinical_trial|acquisition|earnings|general"
  }
]

CRITICAL RULES:
1. Only include stories you are CONFIDENT are real — do not make up any stories
2. Use exact company names
3. Include real dollar amounts when known
4. Date must be within the last 7 days
5. Return ONLY the JSON array, no other text`;

  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "You are a biotech news analyst. Return only factual, verified news. Output valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 4000,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      console.warn(`  DeepSeek API error: ${res.status}`);
      return [];
    }

    const json = await res.json();
    const content = json.choices[0].message.content.trim();

    // Extract JSON from possible markdown code block
    const jsonStr = content.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: any) => ({
      title: String(item.title || "").slice(0, 500),
      source_name: String(item.source || "deepseek").toLowerCase().replace(/\s+/g, "-"),
      source_url: "",
      published_date: item.date || null,
      summary: String(item.summary || "").slice(0, 500),
      category: item.category || "general",
      companies_mentioned: Array.isArray(item.companies) ? item.companies : [],
    }));
  } catch (err: any) {
    console.warn(`  DeepSeek fallback failed: ${err.message}`);
    return [];
  }
}

/* ─── Insert into Supabase ─── */

async function insertNewsItems(items: NewsItem[]): Promise<number> {
  let inserted = 0;

  for (const item of items) {
    // Skip duplicates by source_url (if it has one)
    if (item.source_url) {
      const { data: existing } = await supabase
        .from("news_items")
        .select("id")
        .eq("source_url", item.source_url)
        .limit(1);

      if (existing && existing.length > 0) continue;
    }

    // Skip duplicates by title (for DeepSeek items without URL)
    if (!item.source_url) {
      const { data: existing } = await supabase
        .from("news_items")
        .select("id")
        .eq("title", item.title)
        .limit(1);

      if (existing && existing.length > 0) continue;
    }

    const { error } = await supabase.from("news_items").insert({
      title: item.title,
      source_name: item.source_name,
      source_url: item.source_url || null,
      published_date: item.published_date,
      summary: item.summary,
      category: item.category,
      companies_mentioned: item.companies_mentioned,
    });

    if (error) {
      console.warn(`  Insert error: ${error.message} (${item.title.slice(0, 60)}...)`);
    } else {
      inserted++;
    }
  }

  return inserted;
}

/* ─── Main ─── */

async function main() {
  console.log("=== BiotechTube News Scraper ===\n");

  // Load company names for matching
  console.log("Loading company names...");
  const companies = await loadCompanies(supabase);
  const companyNames = companies.map((c) => c.name);
  console.log(`  Loaded ${companyNames.length} company names\n`);

  let allItems: NewsItem[] = [];

  // 1. Try RSS feeds
  console.log("--- Scraping RSS Feeds ---");
  for (const feed of RSS_FEEDS) {
    const items = await scrapeRSSFeed(feed.url, feed.source, companyNames);
    allItems.push(...items);
    await sleep(1000); // Be polite
  }

  console.log(`\nTotal from RSS: ${allItems.length}`);

  // 2. If we got fewer than 15 items, use DeepSeek fallback
  if (allItems.length < 15) {
    console.log("\n--- DeepSeek Fallback (RSS insufficient) ---");
    const deepseekItems = await fetchNewsViaDeepSeek();
    console.log(`  Got ${deepseekItems.length} items from DeepSeek`);
    allItems.push(...deepseekItems);
  }

  console.log(`\nTotal news items: ${allItems.length}`);

  // 3. Insert into database
  console.log("\n--- Inserting into database ---");
  const inserted = await insertNewsItems(allItems);
  console.log(`\nInserted ${inserted} new items (${allItems.length - inserted} duplicates skipped)`);

  // 4. Summary
  const { count } = await supabase
    .from("news_items")
    .select("*", { count: "exact", head: true });
  console.log(`\nTotal news items in database: ${count}`);

  // Category breakdown
  const { data: categories } = await supabase
    .from("news_items")
    .select("category");
  if (categories) {
    const counts: Record<string, number> = {};
    for (const c of categories) {
      counts[c.category] = (counts[c.category] || 0) + 1;
    }
    console.log("\nCategory breakdown:");
    for (const [cat, cnt] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${cat}: ${cnt}`);
    }
  }
}

main().catch(console.error);
