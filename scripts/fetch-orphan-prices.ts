#!/usr/bin/env npx tsx
/**
 * Fetch Yahoo Finance prices for companies that have tickers but no price history.
 * This is a one-time catchup script after fixing tickers.
 *
 * Usage:
 *   npx tsx scripts/fetch-orphan-prices.ts [--limit N]
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 0;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function dateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

// Map ticker suffix to currency
const SUFFIX_CURRENCY: Record<string, string> = {
  ".ST": "SEK", ".OL": "OL", ".CO": "DKK", ".HE": "EUR",
  ".L": "GBp", ".PA": "EUR", ".DE": "EUR", ".F": "EUR",
  ".BR": "EUR", ".SW": "CHF", ".AX": "AUD", ".T": "JPY",
  ".HK": "HKD", ".SZ": "CNY", ".SS": "CNY", ".TWO": "TWD",
  ".TW": "TWD", ".KQ": "KRW", ".KS": "KRW", ".NS": "INR",
  ".BO": "INR", ".WA": "PLN", ".IS": "TRY", ".IR": "EUR",
  ".V": "CAD", ".TO": "CAD", ".TA": "ILS", ".VI": "EUR",
  ".SG": "SGD",
};

function guessCurrency(ticker: string): string {
  for (const [suffix, curr] of Object.entries(SUFFIX_CURRENCY)) {
    if (ticker.endsWith(suffix)) return curr;
  }
  return "USD";
}

async function fetchExchangeRates(): Promise<Map<string, number>> {
  const rates = new Map<string, number>();
  rates.set("USD", 1.0);
  const pairs = ["EUR", "GBP", "GBp", "NOK", "SEK", "DKK", "CHF", "JPY", "AUD",
    "CAD", "INR", "CNY", "HKD", "ILS", "KRW", "TWD", "PLN", "SGD", "TRY", "ZAR"];

  for (const curr of pairs) {
    try {
      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${curr}USD%3DX?range=1d&interval=1d`;
      const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const data = await resp.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price) {
        rates.set(curr, price);
        // GBp (pence) → GBP
        if (curr === "GBp") rates.set("GBp", price / 100);
      }
    } catch { /* skip */ }
  }
  // Oslo Børs uses NOK
  rates.set("OL", rates.get("NOK") || 0.09);
  console.log(`  Fetched ${rates.size} exchange rates`);
  return rates;
}

async function main() {
  console.log("Fetch Orphan Prices");
  console.log("=".repeat(60));

  // 1. Find orphan companies
  console.log("Finding companies with tickers but no price data...");
  const allWithTickers: Array<{ id: string; name: string; ticker: string; shares_outstanding: number | null }> = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("companies")
      .select("id, name, ticker, shares_outstanding")
      .not("ticker", "is", null)
      .neq("ticker", "")
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allWithTickers.push(...data);
    offset += 1000;
    if (data.length < 1000) break;
  }

  // Check which have price history
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

  let orphans = allWithTickers.filter(c => !withPriceHistory.has(c.id));
  console.log(`  Found ${orphans.length} orphan companies`);

  if (limit > 0) orphans = orphans.slice(0, limit);

  // 2. Fetch exchange rates
  console.log("Fetching exchange rates...");
  const rates = await fetchExchangeRates();

  // 3. Fetch prices for each orphan
  let success = 0;
  let failed = 0;
  let totalRows = 0;

  for (let i = 0; i < orphans.length; i++) {
    const c = orphans[i];
    const progress = `[${i + 1}/${orphans.length}]`;

    try {
      // Fetch 1 year of history
      const period2 = dateStr(new Date());
      const d1 = new Date();
      d1.setFullYear(d1.getFullYear() - 1);
      const period1 = dateStr(d1);

      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(c.ticker)}?period1=${Math.floor(d1.getTime() / 1000)}&period2=${Math.floor(Date.now() / 1000)}&interval=1d`;
      const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const data = await resp.json();

      const result = data?.chart?.result?.[0];
      if (!result?.timestamp || !result?.indicators?.quote?.[0]) {
        console.log(`${progress} ❌ ${c.name} (${c.ticker}) — no data from Yahoo`);
        failed++;
        continue;
      }

      const timestamps: number[] = result.timestamp;
      const quotes = result.indicators.quote[0];
      const currency = result.meta?.currency || guessCurrency(c.ticker);
      const fxRate = rates.get(currency) || rates.get("USD") || 1;

      // Also get current quote for market cap
      let liveMarketCap: number | null = null;
      let sharesOut = c.shares_outstanding;
      try {
        const qUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(c.ticker)}?range=1d&interval=1d`;
        const qResp = await fetch(qUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
        const qData = await qResp.json();
        const meta = qData?.chart?.result?.[0]?.meta;
        if (meta?.regularMarketPrice && meta?.previousClose) {
          // Estimate market cap from price * shares
          if (sharesOut) {
            liveMarketCap = Math.round(meta.regularMarketPrice * sharesOut * fxRate);
          }
        }
      } catch { /* skip */ }

      // Build rows
      const rows: Array<Record<string, unknown>> = [];
      for (let j = 0; j < timestamps.length; j++) {
        const close = quotes.close?.[j];
        if (close == null) continue;
        const date = new Date(timestamps[j] * 1000).toISOString().split("T")[0];
        const closeUsd = close * fxRate;
        const marketCap = sharesOut ? Math.round(closeUsd * sharesOut) : null;

        rows.push({
          company_id: c.id,
          date,
          close_price: Math.round(closeUsd * 100) / 100,
          market_cap: marketCap,
          currency,
        });
      }

      if (rows.length === 0) {
        console.log(`${progress} ❌ ${c.name} (${c.ticker}) — no valid price rows`);
        failed++;
        continue;
      }

      // Upsert in chunks of 100
      for (let j = 0; j < rows.length; j += 100) {
        const chunk = rows.slice(j, j + 100);
        const { error } = await supabase
          .from("company_price_history")
          .upsert(chunk, { onConflict: "company_id,date" });
        if (error) {
          console.error(`  DB error for ${c.name}: ${error.message}`);
        }
      }

      // Update valuation on companies table
      if (liveMarketCap) {
        await supabase.from("companies").update({ valuation: liveMarketCap }).eq("id", c.id);
      }

      console.log(`${progress} ✅ ${c.name} (${c.ticker}) — ${rows.length} price rows`);
      success++;
      totalRows += rows.length;

      // Rate limit: ~300ms between requests
      if (i < orphans.length - 1) await sleep(300);
    } catch (err: any) {
      console.log(`${progress} ❌ ${c.name} (${c.ticker}) — ${err.message}`);
      failed++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Results:`);
  console.log(`  Success:    ${success}`);
  console.log(`  Failed:     ${failed}`);
  console.log(`  Total rows: ${totalRows}`);
}

main().catch(console.error);
