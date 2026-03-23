#!/usr/bin/env npx tsx
/**
 * Fix sub-unit currency market caps
 *
 * GBp (British pence) and ZAc (South African cents) prices were
 * incorrectly treated as main unit values when calculating market_cap_usd.
 * This script divides affected market_cap_usd values by 100.
 *
 * Usage: npx tsx scripts/fix-subunit-market-caps.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const BATCH_SIZE = 1000;
const CONCURRENCY = 50;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
    process.exit(1);
  }
  const supabase = createClient(url, key);

  console.log("\nFixing sub-unit currency market caps");
  console.log("========================================\n");

  const startTime = Date.now();

  for (const currency of ["GBp", "ZAc"] as const) {
    console.log(`Processing ${currency}...`);
    const currencyStart = Date.now();
    let totalRows = 0;
    let updatedRows = 0;
    let errorCount = 0;
    let offset = 0;

    while (true) {
      const { data, error } = await supabase
        .from("company_price_history")
        .select("company_id, date, market_cap_usd")
        .eq("currency", currency)
        .not("market_cap_usd", "is", null)
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) {
        console.error(`  Error fetching rows: ${error.message}`);
        break;
      }
      if (!data || data.length === 0) break;

      totalRows += data.length;

      // Build updates with corrected market_cap_usd
      const updates = data.map((row: any) => ({
        company_id: row.company_id as string,
        date: row.date as string,
        market_cap_usd: Math.round(row.market_cap_usd / 100),
      }));

      // Process updates in parallel chunks of CONCURRENCY
      for (let i = 0; i < updates.length; i += CONCURRENCY) {
        const chunk = updates.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
          chunk.map((u) =>
            supabase
              .from("company_price_history")
              .update({ market_cap_usd: u.market_cap_usd })
              .eq("company_id", u.company_id)
              .eq("date", u.date)
          )
        );

        for (let j = 0; j < results.length; j++) {
          if (results[j].error) {
            errorCount++;
            console.error(
              `  Update error for ${chunk[j].company_id}/${chunk[j].date}: ${results[j].error!.message}`
            );
          } else {
            updatedRows++;
          }
        }
      }

      console.log(`  Processed ${totalRows} rows so far (${updatedRows} updated, ${errorCount} errors)...`);

      if (data.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
    }

    const elapsed = ((Date.now() - currencyStart) / 1000).toFixed(1);
    console.log(`  Done ${currency}: ${updatedRows}/${totalRows} rows fixed in ${elapsed}s\n`);
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`All done in ${totalElapsed}s`);
}

main().catch(console.error);
