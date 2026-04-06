#!/usr/bin/env npx tsx
/**
 * Fix Tickers — Find correct Yahoo Finance symbols for companies with broken tickers.
 *
 * Uses Yahoo Finance search API to match company names to valid ticker symbols.
 *
 * Usage:
 *   npx tsx scripts/fix-tickers.ts                    # Preview changes (dry run)
 *   npx tsx scripts/fix-tickers.ts --apply            # Apply changes to DB
 *   npx tsx scripts/fix-tickers.ts --limit 10         # Process first 10 only
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── CLI ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const suffixOnly = args.includes("--suffix-only");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 0;

// ── Country → Yahoo Finance exchange suffix mapping ──────────────────────

const EXCHANGE_SUFFIXES: Record<string, string[]> = {
  "Australia": [".AX"],
  "Austria": [".VI"],
  "Belgium": [".BR"],
  "Brazil": [".SA"],
  "Canada": [".TO", ".V"],
  "China": [".SS", ".SZ", ".HK"],
  "Denmark": [".CO"],
  "Finland": [".HE"],
  "France": [".PA"],
  "Germany": [".DE", ".F"],
  "Hong Kong": [".HK"],
  "India": [".NS", ".BO"],
  "Indonesia": [".JK"],
  "Ireland": [".L", ".IR"],
  "Israel": [".TA"],
  "Italy": [".MI"],
  "Japan": [".T"],
  "Malaysia": [".KL"],
  "Netherlands": [".AS"],
  "New Zealand": [".NZ"],
  "Norway": [".OL"],
  "Poland": [".WA"],
  "Portugal": [".LS"],
  "Singapore": [".SI"],
  "South Africa": [".JO"],
  "South Korea": [".KS", ".KQ"],
  "Spain": [".MC"],
  "Sweden": [".ST"],
  "Switzerland": [".SW"],
  "Taiwan": [".TW"],
  "Thailand": [".BK"],
  "Turkey": [".IS"],
  "United Kingdom": [".L"],
  "United States": [""],
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Yahoo Finance search ─────────────────────────────────────────────────

interface YahooQuote {
  symbol: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchange?: string;
  exchDisp?: string;
  isYahooFinance?: boolean;
}

async function searchYahoo(query: string): Promise<YahooQuote[]> {
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BiotechTubeBot/1.0)",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.quotes || []).filter((q: YahooQuote) => q.quoteType === "EQUITY");
  } catch {
    return [];
  }
}

async function validateTicker(symbol: string): Promise<boolean> {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BiotechTubeBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const timestamps = data?.chart?.result?.[0]?.timestamp;
    return Array.isArray(timestamps) && timestamps.length > 0;
  } catch {
    return false;
  }
}

// ── Ticker resolution logic ──────────────────────────────────────────────

function cleanTickerForSearch(ticker: string): string {
  // "AMBU B" → "AMBU", "RAY B" → "RAY", "COLO B" → "COLO"
  return ticker.replace(/\s+[A-Z]$/, "").trim();
}

function scoreName(candidate: string, companyName: string): number {
  const c = candidate.toLowerCase();
  const n = companyName.toLowerCase();
  if (c === n) return 100;
  if (c.includes(n) || n.includes(c)) return 80;
  // Check first word match
  const cFirst = c.split(/\s+/)[0];
  const nFirst = n.split(/\s+/)[0];
  if (cFirst === nFirst) return 60;
  return 0;
}

async function findCorrectTicker(
  name: string,
  currentTicker: string,
  country: string | null
): Promise<{ newTicker: string | null; confidence: string; source: string }> {
  const suffixes = country ? EXCHANGE_SUFFIXES[country] || [""] : [""];

  // Strategy 1: Try current ticker with exchange suffix
  const cleanTicker = cleanTickerForSearch(currentTicker);
  for (const suffix of suffixes) {
    // Try variations: TICKER.EX, TICKER-B.EX (for dual-class shares)
    const candidates = [
      `${cleanTicker}${suffix}`,
      `${currentTicker.replace(/\s+/, "-")}${suffix}`,
    ];
    for (const candidate of candidates) {
      const valid = await validateTicker(candidate);
      if (valid) {
        return { newTicker: candidate, confidence: "high", source: "suffix_match" };
      }
    }
  }

  // Strategy 2: Search Yahoo Finance by company name
  const results = await searchYahoo(name);
  if (results.length > 0) {
    // Find best match by name similarity
    let bestMatch: YahooQuote | null = null;
    let bestScore = 0;

    for (const q of results) {
      const nameScore = Math.max(
        scoreName(q.shortname || "", name),
        scoreName(q.longname || "", name)
      );
      if (nameScore > bestScore) {
        bestScore = nameScore;
        bestMatch = q;
      }
    }

    if (bestMatch && bestScore >= 60) {
      return {
        newTicker: bestMatch.symbol,
        confidence: bestScore >= 80 ? "high" : "medium",
        source: `search_name(${bestScore})`,
      };
    }

    // If no good name match, try first result if it's the only equity
    if (results.length === 1) {
      return {
        newTicker: results[0].symbol,
        confidence: "low",
        source: "search_only_result",
      };
    }
  }

  // Strategy 3: Search by ticker symbol itself
  const tickerResults = await searchYahoo(cleanTicker);
  for (const q of tickerResults) {
    const nameScore = Math.max(
      scoreName(q.shortname || "", name),
      scoreName(q.longname || "", name)
    );
    if (nameScore >= 60) {
      return {
        newTicker: q.symbol,
        confidence: nameScore >= 80 ? "high" : "medium",
        source: `search_ticker(${nameScore})`,
      };
    }
  }

  return { newTicker: null, confidence: "none", source: "not_found" };
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nFix Tickers — ${apply ? "APPLY MODE" : "DRY RUN (use --apply to write)"}${suffixOnly ? " [suffix-only]" : ""}`);
  console.log("=".repeat(60));

  // Fetch orphan tickers using NOT EXISTS (efficient — uses index)
  let companies: Array<{ id: string; name: string; ticker: string; country: string | null }> = [];
  let offset = 0;
  const PAGE_SIZE = 100;

  // Use raw SQL via a simpler approach: fetch all companies with tickers,
  // then check which ones have price data
  console.log("Fetching companies with tickers...");
  const allWithTickers: Array<{ id: string; name: string; ticker: string; country: string | null }> = [];
  while (true) {
    const { data } = await supabase
      .from("companies")
      .select("id, name, ticker, country")
      .not("ticker", "is", null)
      .neq("ticker", "")
      .range(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    allWithTickers.push(...data);
    offset += PAGE_SIZE;
    if (data.length < PAGE_SIZE) break;
  }
  console.log(`  ${allWithTickers.length} companies with tickers`);

  // Check which have price history — check each company individually
  // (The IN + limit approach missed companies because non-DISTINCT results
  // could be dominated by one company's many price rows)
  console.log("Checking price history...");
  const withPriceHistory = new Set<string>();
  for (let i = 0; i < allWithTickers.length; i += 20) {
    const batch = allWithTickers.slice(i, i + 20);
    const results = await Promise.all(
      batch.map(c =>
        supabase
          .from("company_price_history")
          .select("company_id")
          .eq("company_id", c.id)
          .limit(1)
          .then(({ data }) => data?.[0]?.company_id)
      )
    );
    for (const id of results) {
      if (id) withPriceHistory.add(id);
    }
  }

  companies = allWithTickers.filter(c => !withPriceHistory.has(c.id));

  if (limit > 0) companies = companies.slice(0, limit);

  console.log(`\nFound ${companies.length} companies with tickers but no price data\n`);

  let fixed = 0;
  let notFound = 0;
  let alreadyCorrect = 0;
  let errors = 0;

  for (let i = 0; i < companies.length; i++) {
    const c = companies[i];
    const progress = `[${i + 1}/${companies.length}]`;

    try {
      const result = await findCorrectTicker(c.name, c.ticker, c.country);

      if (!result.newTicker) {
        console.log(`${progress} ❌ ${c.name} (${c.ticker}) — not found`);
        notFound++;
      } else if (result.newTicker === c.ticker) {
        console.log(`${progress} ✓ ${c.name} (${c.ticker}) — already correct but no data`);
        alreadyCorrect++;
      } else if (suffixOnly && result.source !== "suffix_match") {
        console.log(
          `${progress} ⏭️  ${c.name}: ${c.ticker} → ${result.newTicker} [${result.confidence}/${result.source}] (skipped — suffix-only mode)`
        );
      } else {
        console.log(
          `${progress} ✅ ${c.name}: ${c.ticker} → ${result.newTicker} [${result.confidence}/${result.source}]`
        );

        if (apply) {
          const { error: updateErr } = await supabase
            .from("companies")
            .update({ ticker: result.newTicker })
            .eq("id", c.id);
          if (updateErr) {
            console.log(`     ⚠️  DB update failed: ${updateErr.message}`);
            errors++;
          }
        }
        fixed++;
      }
    } catch (err) {
      console.log(`${progress} ⚠️  ${c.name} — error: ${(err as Error).message}`);
      errors++;
    }

    // Rate limit: Yahoo Finance doesn't like being hammered
    await sleep(300);
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Results:`);
  console.log(`  Fixed:     ${fixed}`);
  console.log(`  Not found: ${notFound}`);
  console.log(`  Same:      ${alreadyCorrect}`);
  console.log(`  Errors:    ${errors}`);
  if (!apply && fixed > 0) {
    console.log(`\nRun with --apply to save changes to the database.`);
  }
}

main().catch(console.error);
