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

async function main() {
  console.log("Fetch Orphan Market Caps");
  console.log("=".repeat(60));

  // Dynamically import yahoo-finance2 (ESM module)
  const YahooFinance = (await import("yahoo-finance2")).default;
  const yahooFinance = new YahooFinance();

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
      const currency = quote.currency || "USD";

      if (!marketCap && !sharesOut) {
        console.log(`${progress} ❌ ${c.name} (${c.ticker}) — no marketCap or shares`);
        failed++;
        continue;
      }

      // Update shares_outstanding on companies table
      const updateData: Record<string, unknown> = {};
      if (sharesOut) updateData.shares_outstanding = sharesOut;
      if (marketCap) updateData.valuation = Math.round(marketCap);

      if (Object.keys(updateData).length > 0) {
        await supabase.from("companies").update(updateData).eq("id", c.id);
      }

      // Now update all price history rows with market_cap_usd
      // market_cap_usd = close_price_local * shares_outstanding * fx_rate
      // But simpler: use the latest marketCap from Yahoo and scale by price ratio
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
          // Calculate price-to-mcap ratio from current data
          // marketCapUsd for each date = (close_price / current_price) * current_marketCap
          const updates: Array<{ company_id: string; date: string; market_cap_usd: number }> = [];
          for (const row of allRows) {
            const ratio = row.close_price / price;
            const mcapUsd = Math.round(ratio * marketCap);
            updates.push({
              company_id: c.id,
              date: row.date,
              market_cap_usd: mcapUsd,
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

          console.log(`${progress} ✅ ${c.name} (${c.ticker}) — mcap $${(marketCap / 1e6).toFixed(0)}M, ${allRows.length} rows updated, ${sharesOut?.toLocaleString()} shares`);
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
