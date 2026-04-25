#!/usr/bin/env npx tsx
/**
 * Fetch market caps for orphan companies that have close_price but no market_cap_usd.
 * Uses yahoo-finance2 npm package (same as the cron job) for reliable marketCap data.
 *
 * Usage: npx tsx scripts/fetch-orphan-marketcaps.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Hard cap on what we'll ever write to market_cap_usd. No biotech on earth is >$1.5T.
// Guards against FX-conversion bugs (e.g. writing raw INR/KRW/JPY as USD).
const MAX_MARKET_CAP_USD = 1_500_000_000_000;

async function main() {
  console.log("Fetch Orphan Market Caps");
  console.log("=".repeat(60));

  // Dynamically import yahoo-finance2 (ESM module)
  const YahooFinance = (await import("yahoo-finance2")).default;
  const yahooFinance = new YahooFinance();

  // ---- FX rates (mirrors daily-update.ts). Without these, foreign market caps
  // get written as raw local-currency values into market_cap_usd, producing
  // values 80-100x inflated for INR/KRW/JPY stocks (the Mankind Pharma bug).
  const exchangeRates = new Map<string, number>();
  exchangeRates.set("USD", 1.0);
  const pairs = ["EUR", "GBP", "NOK", "SEK", "DKK", "CHF", "JPY", "AUD", "CAD", "INR", "CNY", "HKD", "ILS", "KRW", "TWD", "PLN", "SGD", "ZAR"];
  for (const curr of pairs) {
    try {
      const q = await yahooFinance.quote(`${curr}USD=X`);
      if (q?.regularMarketPrice) exchangeRates.set(curr, q.regularMarketPrice);
    } catch { /* skip */ }
  }
  console.log(`  Fetched ${exchangeRates.size} exchange rates`);

  // Find companies with price data but no market_cap_usd
  const { data: orphanIds } = await supabase.rpc("get_orphan_marketcap_companies") as any;

  // Fallback: query directly
  console.log("Finding companies with prices but no market cap...");
  const companiesNeedingMcap: Array<{ id: string; name: string; ticker: string }> = [];

  let offset = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data } = await supabase
      .from("companies")
      .select("id, name, ticker, shares_outstanding")
      .not("ticker", "is", null)
      .neq("ticker", "")
      .range(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    companiesNeedingMcap.push(...data);
    offset += PAGE_SIZE;
    if (data.length < PAGE_SIZE) break;
  }

  // Filter to those that have price rows but no market_cap_usd
  const needsMcap: typeof companiesNeedingMcap = [];
  for (let i = 0; i < companiesNeedingMcap.length; i += 20) {
    const batch = companiesNeedingMcap.slice(i, i + 20);
    const results = await Promise.all(
      batch.map(async (c) => {
        const { data } = await supabase
          .from("company_price_history")
          .select("market_cap_usd")
          .eq("company_id", c.id)
          .not("market_cap_usd", "is", null)
          .limit(1);
        const hasMcap = data && data.length > 0;

        // Also check if has any price rows at all
        const { data: priceData } = await supabase
          .from("company_price_history")
          .select("company_id")
          .eq("company_id", c.id)
          .limit(1);
        const hasPrices = priceData && priceData.length > 0;

        return { company: c, hasMcap, hasPrices };
      })
    );
    for (const r of results) {
      if (r.hasPrices && !r.hasMcap) needsMcap.push(r.company);
    }
  }

  console.log(`  Found ${needsMcap.length} companies needing market cap data`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < needsMcap.length; i++) {
    const c = needsMcap[i];
    const progress = `[${i + 1}/${needsMcap.length}]`;

    try {
      // Get quote with marketCap and sharesOutstanding
      const quote = await yahooFinance.quote(c.ticker);

      if (!quote) {
        console.log(`${progress} ❌ ${c.name} (${c.ticker}) — no quote`);
        failed++;
        continue;
      }

      const marketCap = quote.marketCap;
      const sharesOut = quote.sharesOutstanding;
      const price = quote.regularMarketPrice;
      const rawCurrency = quote.currency || "USD";

      // Normalize sub-unit currencies (GBp=pence, ZAc=cents) to main units.
      // Yahoo quotes UK/South-Africa stocks in sub-units — divide by 100 before applying FX rate.
      let currency = rawCurrency;
      let subUnitDivisor = 1;
      if (rawCurrency === "GBp" || rawCurrency === "GBX" || rawCurrency === "GBx") {
        currency = "GBP";
        subUnitDivisor = 100;
      } else if (rawCurrency === "ZAc" || rawCurrency === "ZAC") {
        currency = "ZAR";
        subUnitDivisor = 100;
      }
      const usdRate = exchangeRates.get(currency) || 1.0;

      if (!marketCap && !sharesOut) {
        console.log(`${progress} ❌ ${c.name} (${c.ticker}) — no marketCap or shares`);
        failed++;
        continue;
      }

      // Update shares_outstanding on companies table.
      // NOTE: valuation stays in local currency (matches daily-update.ts behavior);
      // ranking page converts to USD via company_price_history.market_cap_usd.
      const updateData: Record<string, unknown> = {};
      if (sharesOut) updateData.shares_outstanding = sharesOut;
      if (marketCap) updateData.valuation = Math.round(marketCap);

      if (Object.keys(updateData).length > 0) {
        await supabase.from("companies").update(updateData).eq("id", c.id);
      }

      // Now update all price history rows with market_cap_usd.
      // Formula: mcap_usd = (price_ratio * marketCap_local / subUnitDivisor) * usdRate
      if (sharesOut && marketCap) {
        // Get all price rows for this company
        const allRows: Array<{ date: string; close_price: number }> = [];
        let priceOffset = 0;
        while (true) {
          const { data } = await supabase
            .from("company_price_history")
            .select("date, close_price")
            .eq("company_id", c.id)
            .not("close_price", "is", null)
            .range(priceOffset, priceOffset + 999);
          if (!data || data.length === 0) break;
          allRows.push(...data as any);
          priceOffset += 1000;
          if (data.length < 1000) break;
        }

        if (allRows.length > 0 && price) {
          // Calculate price-to-mcap ratio + apply FX conversion.
          // mcapUsd = (close_price/current_price) * marketCap_local / subUnitDivisor * usdRate
          const updates: Array<{ company_id: string; date: string; market_cap_usd: number; currency: string }> = [];
          let skippedOverCap = 0;
          for (const row of allRows) {
            const ratio = row.close_price / price;
            const mcapUsd = Math.round((ratio * marketCap / subUnitDivisor) * usdRate);

            // Sanity guard: refuse to write obviously inflated values.
            // Catches FX bugs where currency is misidentified as USD.
            if (mcapUsd > MAX_MARKET_CAP_USD || mcapUsd < 0) {
              skippedOverCap++;
              continue;
            }

            updates.push({
              company_id: c.id,
              date: row.date,
              market_cap_usd: mcapUsd,
              // Always write currency explicitly — DB default is 'USD' which
              // produces a false-positive USD tag for foreign stocks.
              currency,
            });
          }

          // Batch upsert
          for (let j = 0; j < updates.length; j += 100) {
            const chunk = updates.slice(j, j + 100);
            const { error } = await supabase
              .from("company_price_history")
              .upsert(chunk, { onConflict: "company_id,date" });
            if (error) {
              console.error(`  DB error: ${error.message}`);
            }
          }

          const mcapUsdLive = Math.round((marketCap / subUnitDivisor) * usdRate);
          const skipNote = skippedOverCap > 0 ? ` [skipped ${skippedOverCap} over $${MAX_MARKET_CAP_USD / 1e12}T cap]` : "";
          console.log(`${progress} ✅ ${c.name} (${c.ticker}) [${currency}] — mcap $${(mcapUsdLive / 1e6).toFixed(0)}M, ${updates.length}/${allRows.length} rows updated${skipNote}`);
          success++;
        } else {
          console.log(`${progress} ⚠️  ${c.name} (${c.ticker}) — mcap $${(marketCap / 1e6).toFixed(0)}M but no price rows to update`);
          failed++;
        }
      } else {
        console.log(`${progress} ❌ ${c.name} (${c.ticker}) — marketCap=${marketCap} shares=${sharesOut}`);
        failed++;
      }

      if (i < needsMcap.length - 1) await sleep(200);
    } catch (err: any) {
      console.log(`${progress} ❌ ${c.name} (${c.ticker}) — ${err.message?.slice(0, 80)}`);
      failed++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Results:`);
  console.log(`  Success: ${success}`);
  console.log(`  Failed:  ${failed}`);
}

main().catch(console.error);
