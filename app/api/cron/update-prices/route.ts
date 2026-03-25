import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Vercel cron jobs have a 60s timeout on Hobby, 300s on Pro
// We process in batches to stay within limits
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// --- helpers -----------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateStr(d);
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface CompanyWithTicker {
  id: string;
  ticker: string;
  country: string;
  shares_outstanding: number | null;
}

// --- main handler ------------------------------------------------------

export async function GET(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const supabase = getSupabase();

  // Dynamically import yahoo-finance2 (ESM module)
  const YahooFinance = (await import("yahoo-finance2")).default;
  const yahooFinance = new YahooFinance();

  try {
    // 1. Fetch all companies with tickers
    const companies: CompanyWithTicker[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("companies")
        .select("id, ticker, country, shares_outstanding")
        .not("ticker", "is", null)
        .neq("ticker", "")
        .range(offset, offset + 999);
      if (error) {
        console.error("Error fetching companies:", error.message);
        break;
      }
      if (!data || data.length === 0) break;
      companies.push(...(data as CompanyWithTicker[]));
      offset += 1000;
      if (data.length < 1000) break;
    }

    console.log(`Found ${companies.length} companies with tickers`);

    // 2. Fetch exchange rates
    const exchangeRates = new Map<string, number>();
    exchangeRates.set("USD", 1.0);
    const pairs = [
      "EUR", "GBP", "NOK", "SEK", "DKK", "CHF", "JPY", "AUD",
      "CAD", "INR", "CNY", "HKD", "ILS", "KRW", "TWD", "PLN",
      "SGD", "ZAR",
    ];
    for (const curr of pairs) {
      try {
        const q = await yahooFinance.quote(`${curr}USD=X`);
        if (q?.regularMarketPrice) exchangeRates.set(curr, q.regularMarketPrice);
      } catch {
        console.log(`Failed to fetch exchange rate for ${curr}`);
      }
    }
    console.log(`Fetched ${exchangeRates.size} exchange rates`);

    // 3. Process tickers in batches of 50
    const BATCH_SIZE = 50;
    const BATCH_DELAY_MS = 2000;
    const LOOKBACK_DAYS = 5;
    const period1 = daysAgo(LOOKBACK_DAYS);
    const period2 = dateStr(new Date());

    let tickersUpdated = 0;
    let tickersFailed = 0;
    let totalRowsUpserted = 0;
    const errors: string[] = [];

    for (let batchStart = 0; batchStart < companies.length; batchStart += BATCH_SIZE) {
      const batch = companies.slice(batchStart, batchStart + BATCH_SIZE);
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(companies.length / BATCH_SIZE);

      console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} tickers)`);

      // Process each ticker in the batch concurrently
      const results = await Promise.allSettled(
        batch.map(async (c) => {
          try {
            // Fetch historical prices (last few days)
            const hist = await yahooFinance.historical(c.ticker, { period1, period2 });

            // Fetch current quote for live market cap
            let currency = "USD";
            let liveMarketCap: number | null = null;
            let sharesOut = c.shares_outstanding;
            try {
              const quote = await yahooFinance.quote(c.ticker);
              currency = quote?.currency || "USD";
              liveMarketCap = quote?.marketCap ?? null;
              if (quote?.sharesOutstanding) sharesOut = quote.sharesOutstanding;
            } catch {
              /* use defaults */
            }

            // Update shares_outstanding and valuation on companies table
            const updateData: Record<string, unknown> = {};
            if (sharesOut && sharesOut !== c.shares_outstanding)
              updateData.shares_outstanding = sharesOut;
            if (liveMarketCap) updateData.valuation = Math.round(liveMarketCap);
            if (Object.keys(updateData).length > 0) {
              await supabase.from("companies").update(updateData).eq("id", c.id);
            }

            if (!hist || hist.length === 0) return { ticker: c.ticker, rows: 0 };

            // Normalize sub-unit currencies (GBp=pence, ZAc=cents)
            let mainCurrency = currency;
            let subUnitDivisor = 1;
            if (currency === "GBp" || currency === "GBX" || currency === "GBx") {
              mainCurrency = "GBP";
              subUnitDivisor = 100;
            } else if (currency === "ZAc" || currency === "ZAC") {
              mainCurrency = "ZAR";
              subUnitDivisor = 100;
            }
            const usdRate = exchangeRates.get(mainCurrency) || 1.0;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rows = hist.map((h: any, i: number) => {
              const adjClose = h.adjClose ?? h.close;
              const prevClose =
                i > 0 ? (hist[i - 1].adjClose ?? hist[i - 1].close) : null;
              const changePct =
                prevClose && prevClose !== 0
                  ? ((adjClose - prevClose) / prevClose) * 100
                  : null;

              const dateVal =
                h.date instanceof Date ? dateStr(h.date) : h.date;
              const isToday = dateVal === period2 || i === hist.length - 1;
              const marketCapUsd =
                isToday && liveMarketCap
                  ? Math.round(
                      liveMarketCap * (currency === "USD" ? 1 : usdRate)
                    )
                  : sharesOut && adjClose
                    ? Math.round(
                        (adjClose / subUnitDivisor) * sharesOut * usdRate
                      )
                    : null;

              return {
                company_id: c.id,
                date: dateVal,
                ticker: c.ticker,
                open: h.open,
                high: h.high,
                low: h.low,
                close: h.close,
                adj_close: adjClose,
                volume: h.volume,
                currency,
                market_cap_usd: marketCapUsd,
                change_pct: changePct
                  ? Math.round(changePct * 100) / 100
                  : null,
              };
            });

            // ── Validation: detect & fix shares_outstanding jumps ──
            // If market_cap jumps >50% but price moves <15%, it's a shares change, not real
            // Fix by using previous row's implied shares (mcap/price ratio)
            for (let i = 1; i < rows.length; i++) {
              const curr = rows[i];
              const prev = rows[i - 1];
              if (
                curr.market_cap_usd &&
                prev.market_cap_usd &&
                curr.adj_close &&
                prev.adj_close &&
                prev.adj_close > 0 &&
                prev.market_cap_usd > 0
              ) {
                const mcapChange = Math.abs(
                  (curr.market_cap_usd - prev.market_cap_usd) /
                    prev.market_cap_usd
                );
                const priceChange = Math.abs(
                  (curr.adj_close - prev.adj_close) / prev.adj_close
                );
                if (mcapChange > 0.5 && priceChange < 0.15) {
                  // Shares changed, not price — recalculate using prev ratio
                  const impliedRatio =
                    prev.market_cap_usd / prev.adj_close;
                  curr.market_cap_usd = Math.round(
                    curr.adj_close * impliedRatio
                  );
                }
              }
            }

            // Upsert in sub-batches of 200 rows to respect statement_timeout
            const SUB_BATCH = 200;
            let rowsUpserted = 0;
            for (let i = 0; i < rows.length; i += SUB_BATCH) {
              const chunk = rows.slice(i, i + SUB_BATCH);
              const { error } = await supabase
                .from("company_price_history")
                .upsert(chunk, { onConflict: "company_id,date" });
              if (error) {
                throw new Error(`Upsert error for ${c.ticker}: ${error.message}`);
              }
              rowsUpserted += chunk.length;
            }

            return { ticker: c.ticker, rows: rowsUpserted };
          } catch (err) {
            throw new Error(
              `${c.ticker}: ${err instanceof Error ? err.message : String(err)}`
            );
          }
        })
      );

      // Tally results
      for (const r of results) {
        if (r.status === "fulfilled") {
          tickersUpdated++;
          totalRowsUpserted += r.value.rows;
        } else {
          tickersFailed++;
          const msg = r.reason?.message || String(r.reason);
          errors.push(msg);
          console.error(`FAIL: ${msg}`);
        }
      }

      // Delay between batches (skip after last batch)
      if (batchStart + BATCH_SIZE < companies.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    const durationSec = Math.round((Date.now() - startTime) / 1000);
    console.log(
      `Price update complete: ${tickersUpdated} updated, ${tickersFailed} failed, ${totalRowsUpserted} rows, ${durationSec}s`
    );

    return NextResponse.json({
      success: true,
      tickers_total: companies.length,
      tickers_updated: tickersUpdated,
      tickers_failed: tickersFailed,
      rows_upserted: totalRowsUpserted,
      exchange_rates_fetched: exchangeRates.size,
      duration_seconds: durationSec,
      errors: errors.slice(0, 20), // cap error list
    });
  } catch (err) {
    console.error("Fatal error in update-prices:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration_seconds: Math.round((Date.now() - startTime) / 1000),
      },
      { status: 500 }
    );
  }
}
