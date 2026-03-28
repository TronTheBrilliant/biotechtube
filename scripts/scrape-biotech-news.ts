#!/usr/bin/env npx tsx
/**
 * Scrape biotech news from RSS feeds and insert into news_items table.
 * Also extracts drug/product mentions from each article and inserts into drug_mentions.
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

/* ─── Pipeline Product Matching ─── */

interface PipelineProduct {
  id: string;
  product_name: string;
  company_name: string | null;
}

/** Load all pipeline product names for drug mention matching (paginated) */
async function loadPipelineProducts(): Promise<PipelineProduct[]> {
  const all: PipelineProduct[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data } = await supabase
      .from("pipelines")
      .select("id, product_name, company_name")
      .range(offset, offset + pageSize - 1);

    if (!data || data.length === 0) break;
    all.push(...(data as PipelineProduct[]));
    offset += pageSize;
    if (data.length < pageSize) break;
  }

  return all;
}

/**
 * Build a search index: lowercased product name -> { id, company_name }
 * Only index names with 4+ chars to avoid false positives (e.g. "ACE", "AMP").
 * Also builds word-boundary regex for each product for precise matching.
 */
interface DrugIndex {
  name: string;         // original product_name
  id: string;           // pipeline id
  company: string | null;
  regex: RegExp;
}

function buildDrugIndex(products: PipelineProduct[]): DrugIndex[] {
  // Deduplicate by product_name (keep first occurrence per name)
  const seen = new Map<string, PipelineProduct>();
  for (const p of products) {
    const key = p.product_name.toLowerCase().trim();
    if (key.length >= 4 && !seen.has(key)) {
      seen.set(key, p);
    }
  }

  const index: DrugIndex[] = [];
  for (const [key, p] of seen) {
    // Escape regex special chars and build word-boundary pattern
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    try {
      index.push({
        name: p.product_name,
        id: p.id,
        company: p.company_name,
        regex: new RegExp(`\\b${escaped}\\b`, "i"),
      });
    } catch {
      // Skip invalid regex patterns
    }
  }

  return index;
}

interface DrugMention {
  drug_name: string;
  pipeline_id: string;
  company_name: string | null;
  source: string;
  article_title: string;
  article_url: string | null;
  mentioned_at: string; // YYYY-MM-DD
}

/** Scan article text for drug/product name matches */
function findDrugMentions(
  title: string,
  summary: string,
  source: string,
  articleUrl: string | null,
  publishedDate: string | null,
  drugIndex: DrugIndex[]
): DrugMention[] {
  const text = title + " " + summary;
  const mentions: DrugMention[] = [];
  const today = new Date().toISOString().split("T")[0];
  const date = publishedDate || today;

  for (const drug of drugIndex) {
    if (drug.regex.test(text)) {
      mentions.push({
        drug_name: drug.name,
        pipeline_id: drug.id,
        company_name: drug.company,
        source,
        article_title: title.slice(0, 500),
        article_url: articleUrl || null,
        mentioned_at: date,
      });
    }
  }

  return mentions;
}

/** Insert drug mentions into Supabase, deduplicating by drug+article_url+date */
async function insertDrugMentions(mentions: DrugMention[]): Promise<number> {
  let inserted = 0;

  // Batch insert in chunks of 50
  for (let i = 0; i < mentions.length; i += 50) {
    const batch = mentions.slice(i, i + 50);
    const { error, count } = await supabase
      .from("drug_mentions")
      .upsert(batch, {
        onConflict: "drug_name,article_url,mentioned_at",
        ignoreDuplicates: true,
      });

    if (error) {
      // If upsert fails (no unique constraint), fall back to individual inserts
      for (const m of batch) {
        // Check for existing
        const { data: existing } = await supabase
          .from("drug_mentions")
          .select("id")
          .eq("drug_name", m.drug_name)
          .eq("mentioned_at", m.mentioned_at)
          .eq("article_title", m.article_title)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const { error: insertErr } = await supabase.from("drug_mentions").insert(m);
        if (!insertErr) inserted++;
      }
    } else {
      inserted += batch.length;
    }
  }

  return inserted;
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

  // Load pipeline products for drug mention extraction
  console.log("Loading pipeline products for drug mention matching...");
  const pipelineProducts = await loadPipelineProducts();
  const drugIndex = buildDrugIndex(pipelineProducts);
  console.log(`  Loaded ${pipelineProducts.length} pipeline products, indexed ${drugIndex.length} unique drug names\n`);

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

  // 4. Extract drug mentions from all articles
  console.log("\n--- Extracting Drug Mentions ---");
  const allMentions: DrugMention[] = [];
  for (const item of allItems) {
    const mentions = findDrugMentions(
      item.title,
      item.summary,
      item.source_name,
      item.source_url || null,
      item.published_date,
      drugIndex
    );
    allMentions.push(...mentions);
  }
  console.log(`  Found ${allMentions.length} drug mentions across ${allItems.length} articles`);

  if (allMentions.length > 0) {
    const mentionsInserted = await insertDrugMentions(allMentions);
    console.log(`  Inserted ${mentionsInserted} drug mentions into drug_mentions table`);
  }

  // 5. Summary
  const { count } = await supabase
    .from("news_items")
    .select("*", { count: "exact", head: true });
  console.log(`\nTotal news items in database: ${count}`);

  const { count: mentionCount } = await supabase
    .from("drug_mentions")
    .select("*", { count: "exact", head: true });
  console.log(`Total drug mentions in database: ${mentionCount}`);

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

  // Top mentioned drugs
  const { data: topDrugs } = await supabase
    .from("drug_mentions")
    .select("drug_name")
    .gte("mentioned_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

  if (topDrugs && topDrugs.length > 0) {
    const drugCounts: Record<string, number> = {};
    for (const d of topDrugs) {
      drugCounts[d.drug_name] = (drugCounts[d.drug_name] || 0) + 1;
    }
    const sorted = Object.entries(drugCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    console.log("\nTop 10 mentioned drugs (last 7 days):");
    for (const [drug, cnt] of sorted) {
      console.log(`  ${drug}: ${cnt} mentions`);
    }
  }
}

main().catch(console.error);
