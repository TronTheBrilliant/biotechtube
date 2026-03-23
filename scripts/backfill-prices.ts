#!/usr/bin/env npx tsx
/**
 * Stock Price History Backfill
 *
 * Fetches full historical daily price data for all companies with tickers
 * using yahoo-finance2. Stores in company_price_history table.
 *
 * Usage:
 *   npx tsx scripts/backfill-prices.ts
 *   npx tsx scripts/backfill-prices.ts --limit 50
 *   npx tsx scripts/backfill-prices.ts --workers 3
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();

const DEFAULT_LIMIT = 1000;
const DEFAULT_WORKERS = 5;
const DELAY_MS = 500;
const MAX_RETRIES = 3;
const BACKFILL_START = "1990-01-01";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing env vars");
    process.exit(1);
  }
  return createClient(url, key);
}

function parseArgs(): { limit: number; workers: number } {
  const args = process.argv.slice(2);
  let limit = DEFAULT_LIMIT;
  let workers = DEFAULT_WORKERS;

  const limitIdx = args.indexOf("--limit");
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    const p = parseInt(args[limitIdx + 1], 10);
    if (!isNaN(p) && p > 0) limit = p;
  }

  const workersIdx = args.indexOf("--workers");
  if (workersIdx !== -1 && args[workersIdx + 1]) {
    const p = parseInt(args[workersIdx + 1], 10);
    if (!isNaN(p) && p > 0 && p <= 10) workers = p;
  }

  return { limit, workers };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface CompanyWithTicker {
  id: string;
  slug: string;
  name: string;
  ticker: string;
  country: string;
}

// Shared counters
let successCount = 0;
let failCount = 0;
let totalRows = 0;
let completedCount = 0;
const failures: { name: string; ticker: string; error: string }[] = [];

async function fetchExchangeRates(): Promise<Map<string, number>> {
  const rates = new Map<string, number>();
  rates.set("USD", 1.0);

  const pairs = ["EUR", "GBP", "NOK", "SEK", "DKK", "CHF", "JPY", "AUD", "CAD", "INR", "CNY", "HKD", "ILS", "KRW", "TWD", "PLN", "SGD", "ZAR", "MXN", "NZD", "SAR", "HUF", "MYR", "ISK"];

  for (const curr of pairs) {
    try {
      const quote = await yahooFinance.quote(`${curr}USD=X`);
      if (quote?.regularMarketPrice) {
        rates.set(curr, quote.regularMarketPrice);
      }
    } catch {
      // Some pairs may fail — that's OK, we'll handle missing rates
      console.log(`  ⚠️  Could not fetch rate for ${curr}/USD`);
    }
  }

  console.log(`  Fetched ${rates.size} exchange rates`);
  return rates;
}

async function fetchSharesOutstanding(ticker: string): Promise<number | null> {
  try {
    const summary = await yahooFinance.quoteSummary(ticker, {
      modules: ["defaultKeyStatistics"],
    });
    return summary?.defaultKeyStatistics?.sharesOutstanding ?? null;
  } catch {
    return null;
  }
}

async function getLatestDate(
  supabase: ReturnType<typeof getSupabase>,
  companyId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("company_price_history")
    .select("date")
    .eq("company_id", companyId)
    .order("date", { ascending: false })
    .limit(1);

  return data?.[0]?.date ?? null;
}

async function backfillTicker(
  supabase: ReturnType<typeof getSupabase>,
  company: CompanyWithTicker,
  exchangeRates: Map<string, number>,
  totalCompanies: number
): Promise<void> {
  completedCount++;
  const progress = `[${completedCount}/${totalCompanies}]`;

  // Get shares outstanding
  const sharesOutstanding = await fetchSharesOutstanding(company.ticker);
  if (sharesOutstanding) {
    await supabase
      .from("companies")
      .update({ shares_outstanding: sharesOutstanding })
      .eq("id", company.id);
  }

  // Check latest date
  const latestDate = await getLatestDate(supabase, company.id);
  const period1 = latestDate
    ? new Date(new Date(latestDate).getTime() + 86400000).toISOString().split("T")[0]
    : BACKFILL_START;

  // Fetch historical data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let historical: any[] | undefined;
  for (let retry = 0; retry < MAX_RETRIES; retry++) {
    try {
      historical = await yahooFinance.historical(company.ticker, {
        period1,
        period2: new Date().toISOString().split("T")[0],
      });
      break;
    } catch (err) {
      if (retry === MAX_RETRIES - 1) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`${progress} ❌ ${company.name} (${company.ticker}): ${msg}`);
        failCount++;
        failures.push({ name: company.name, ticker: company.ticker, error: msg });
        return;
      }
      await sleep(1000 * Math.pow(2, retry));
    }
  }

  if (!historical || historical.length === 0) {
    console.log(`${progress} ⏭️  ${company.name} (${company.ticker}): no new data`);
    return;
  }

  // Determine currency
  let currency = "USD";
  try {
    const quote = await yahooFinance.quote(company.ticker);
    currency = quote?.currency || "USD";
  } catch {
    // Default to USD
  }

  // Normalize sub-unit currencies (GBp=pence, ZAc=cents) to main units
  let mainCurrency = currency;
  let subUnitDivisor = 1;
  if (currency === 'GBp' || currency === 'GBX' || currency === 'GBx') {
    mainCurrency = 'GBP';
    subUnitDivisor = 100;
  } else if (currency === 'ZAc' || currency === 'ZAC') {
    mainCurrency = 'ZAR';
    subUnitDivisor = 100;
  }
  const usdRate = exchangeRates.get(mainCurrency) || 1.0;

  // Build rows with change_pct calculation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = historical.map((h: any, i: number) => {
    const adjClose = h.adjClose ?? h.close;
    const prevClose = i > 0 ? (historical![i - 1].adjClose ?? historical![i - 1].close) : null;
    const changePct = prevClose && prevClose !== 0
      ? ((adjClose - prevClose) / prevClose) * 100
      : null;

    const marketCapUsd = sharesOutstanding && adjClose
      ? (adjClose / subUnitDivisor) * sharesOutstanding * usdRate
      : null;

    return {
      company_id: company.id,
      date: h.date instanceof Date ? h.date.toISOString().split("T")[0] : h.date,
      ticker: company.ticker,
      open: h.open,
      high: h.high,
      low: h.low,
      close: h.close,
      adj_close: adjClose,
      volume: h.volume,
      currency,
      market_cap_usd: marketCapUsd ? Math.round(marketCapUsd) : null,
      change_pct: changePct ? Math.round(changePct * 100) / 100 : null,
    };
  });

  // Deduplicate by date (Yahoo sometimes returns duplicate dates)
  const deduped = new Map<string, typeof rows[0]>();
  for (const row of rows) {
    deduped.set(row.date, row); // last one wins
  }
  const uniqueRows = Array.from(deduped.values());

  // Batch upsert (Supabase limit is 1000 rows per call)
  const BATCH_SIZE = 500;
  let insertedRows = 0;

  for (let i = 0; i < uniqueRows.length; i += BATCH_SIZE) {
    const batch = uniqueRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("company_price_history")
      .upsert(batch, { onConflict: "company_id,date" });

    if (error) {
      console.log(`${progress} ❌ ${company.name}: insert error: ${error.message}`);
      failCount++;
      failures.push({ name: company.name, ticker: company.ticker, error: error.message });
      return;
    }
    insertedRows += batch.length;
  }

  console.log(`${progress} ✅ ${company.name} (${company.ticker}): ${insertedRows} rows, ${currency}${sharesOutstanding ? '' : ' (no shares_outstanding)'}`);
  successCount++;
  totalRows += insertedRows;
}

async function worker(
  _workerId: number,
  companies: CompanyWithTicker[],
  supabase: ReturnType<typeof getSupabase>,
  exchangeRates: Map<string, number>,
  totalCompanies: number
): Promise<void> {
  for (const company of companies) {
    await backfillTicker(supabase, company, exchangeRates, totalCompanies);
    await sleep(DELAY_MS);
  }
}

async function main() {
  const { limit, workers: numWorkers } = parseArgs();
  const supabase = getSupabase();

  console.log("\n📈 Stock Price Backfill");
  console.log("======================");
  console.log(`Workers: ${numWorkers}`);
  console.log(`Limit: ${limit}\n`);

  // Fetch companies with tickers
  console.log("Fetching companies with tickers...");
  const allCompanies: CompanyWithTicker[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("companies")
      .select("id, slug, name, ticker, country")
      .not("ticker", "is", null)
      .neq("ticker", "")
      .order("valuation", { ascending: false, nullsFirst: false })
      .range(offset, offset + pageSize - 1);

    if (error) { console.error("Error:", error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    allCompanies.push(...(data as CompanyWithTicker[]));
    offset += pageSize;
    if (data.length < pageSize) break;
    if (allCompanies.length >= limit) break;
  }

  // Apply limit
  const companies = allCompanies.slice(0, limit);
  console.log(`  Found ${allCompanies.length} companies with tickers, using ${companies.length}`);

  if (companies.length === 0) {
    console.log("No companies with tickers found.");
    process.exit(0);
  }

  // Fetch exchange rates
  console.log("Fetching exchange rates...");
  const exchangeRates = await fetchExchangeRates();

  const startTime = Date.now();
  const totalCompanies = companies.length;

  // Split across workers
  const chunks: CompanyWithTicker[][] = Array.from({ length: numWorkers }, () => []);
  for (let i = 0; i < companies.length; i++) {
    chunks[i % numWorkers].push(companies[i]);
  }

  console.log(`\nStarting backfill with ${numWorkers} workers...\n`);

  const workerPromises = chunks.map((chunk, i) => {
    if (chunk.length === 0) return Promise.resolve();
    return worker(i + 1, chunk, supabase, exchangeRates, totalCompanies);
  });

  await Promise.all(workerPromises);

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log(`\n======================`);
  console.log(`🏁 Backfill Complete`);
  console.log(`======================`);
  console.log(`Succeeded: ${successCount}`);
  console.log(`Failed:    ${failCount}`);
  console.log(`Rows:      ${totalRows.toLocaleString()}`);
  console.log(`Time:      ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`);

  if (failures.length > 0) {
    console.log(`\n❌ Failed tickers (${failures.length}):`);
    failures.forEach((f) => console.log(`  - ${f.name} (${f.ticker}): ${f.error}`));
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
