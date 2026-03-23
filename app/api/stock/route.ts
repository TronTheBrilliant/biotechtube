import { NextRequest, NextResponse } from "next/server";

const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const YAHOO_SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search";

// Map timescale labels to Yahoo Finance range params
const rangeMap: Record<string, string> = {
  "1W": "5d",
  "1M": "1mo",
  "3M": "3mo",
  "6M": "6mo",
  "1Y": "1y",
  ALL: "max",
};

// Interval depends on range — use weekly for long ranges to keep data manageable
const intervalMap: Record<string, string> = {
  "1W": "15m",
  "1M": "1d",
  "3M": "1d",
  "6M": "1d",
  "1Y": "1d",
  ALL: "1wk",
};

// Yahoo Finance exchange suffixes
const exchangeSuffixes: Record<string, string> = {
  "Oslo": ".OL",
  "OSE": ".OL",
  "Oslo Børs": ".OL",
  "NASDAQ": "",
  "NYSE": "",
  "LSE": ".L",
  "XETRA": ".DE",
  "Frankfurt": ".F",
  "Stockholm": ".ST",
  "Copenhagen": ".CO",
  "Helsinki": ".HE",
  "Toronto": ".TO",
};

// Cache Yahoo symbol lookups in memory (server-side)
const symbolCache = new Map<string, string>();

// Cache crumb + cookies for authenticated Yahoo API calls
let cachedCrumb: { crumb: string; cookie: string; ts: number } | null = null;

async function getYahooCrumb(): Promise<{ crumb: string; cookie: string } | null> {
  // Cache crumb for 1 hour
  if (cachedCrumb && Date.now() - cachedCrumb.ts < 3600000) {
    return { crumb: cachedCrumb.crumb, cookie: cachedCrumb.cookie };
  }
  try {
    // Step 1: Get cookies from consent-free endpoint
    const res1 = await fetch("https://fc.yahoo.com", {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "manual",
    });
    const setCookies = res1.headers.getSetCookie?.() || [];
    const cookie = setCookies.map((c: string) => c.split(";")[0]).join("; ");

    // Step 2: Get crumb
    const res2 = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Cookie": cookie,
      },
    });
    const crumb = await res2.text();
    if (crumb && crumb.length < 50) {
      cachedCrumb = { crumb, cookie, ts: Date.now() };
      return { crumb, cookie };
    }
  } catch {
    // crumb fetch failed
  }
  return null;
}

async function fetchMarketCap(symbol: string): Promise<number | null> {
  try {
    const auth = await getYahooCrumb();
    if (!auth) return null;

    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbol}&crumb=${encodeURIComponent(auth.crumb)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Cookie": auth.cookie,
      },
    });
    const data = await res.json();
    const quote = data?.quoteResponse?.result?.[0];
    return quote?.marketCap ?? null;
  } catch {
    return null;
  }
}

async function trySymbol(symbol: string): Promise<boolean> {
  try {
    const res = await fetch(`${YAHOO_CHART_URL}/${symbol}?range=1d&interval=1d`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const data = await res.json();
    return !!data.chart?.result?.[0];
  } catch {
    return false;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface YahooQuote {
  symbol: string;
  quoteType: string;
  exchange: string;
  shortname?: string;
}

async function findYahooSymbol(ticker: string, exchange?: string, companyName?: string): Promise<string | null> {
  const cacheKey = `${ticker}:${exchange || ""}:${companyName || ""}`;
  if (symbolCache.has(cacheKey)) return symbolCache.get(cacheKey)!;

  // 1. Try direct TICKER.suffix based on exchange
  if (exchange) {
    for (const [key, suffix] of Object.entries(exchangeSuffixes)) {
      if (exchange.includes(key) || exchange === key) {
        const sym = `${ticker}${suffix}`;
        if (await trySymbol(sym)) {
          symbolCache.set(cacheKey, sym);
          return sym;
        }
        break;
      }
    }
  }

  // 2. Search by company name (more reliable than ticker for non-US stocks)
  const searchTerms = companyName ? [companyName, ticker] : [ticker];

  for (const term of searchTerms) {
    try {
      const res = await fetch(`${YAHOO_SEARCH_URL}?q=${encodeURIComponent(term)}&quotesCount=10`, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const data = await res.json();
      if (data.quotes && data.quotes.length > 0) {
        const equities = data.quotes.filter((q: YahooQuote) => q.quoteType === "EQUITY");

        // Prefer the primary exchange match
        if (exchange) {
          // For Oslo, prefer .OL
          if (exchange.includes("Oslo") || exchange === "OSE" || exchange.includes("Børs")) {
            const oslo = equities.find((q: YahooQuote) => q.symbol.endsWith(".OL"));
            if (oslo) {
              symbolCache.set(cacheKey, oslo.symbol);
              return oslo.symbol;
            }
          }
        }

        // Otherwise take the first equity
        if (equities.length > 0) {
          symbolCache.set(cacheKey, equities[0].symbol);
          return equities[0].symbol;
        }

        // Fallback to any result
        const symbol = data.quotes[0].symbol;
        if (symbol) {
          symbolCache.set(cacheKey, symbol);
          return symbol;
        }
      }
    } catch {
      // try next search term
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");
  const exchange = searchParams.get("exchange") || "";
  const companyName = searchParams.get("name") || "";
  const timescale = searchParams.get("timescale") || "6M";

  if (!ticker) {
    return NextResponse.json({ error: "Missing ticker param" }, { status: 400 });
  }

  const range = rangeMap[timescale] || "6mo";
  const interval = intervalMap[timescale] || "1d";

  try {
    const yahooSymbol = await findYahooSymbol(ticker, exchange, companyName || undefined);
    if (!yahooSymbol) {
      return NextResponse.json({ error: "Symbol not found" }, { status: 404 });
    }

    const url = `${YAHOO_CHART_URL}/${yahooSymbol}?range=${range}&interval=${interval}`;
    const [res, marketCap] = await Promise.all([
      fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 300 },
      }),
      fetchMarketCap(yahooSymbol),
    ]);

    const raw = await res.json();
    const result = raw.chart?.result?.[0];

    if (!result) {
      return NextResponse.json({ error: "No data returned" }, { status: 404 });
    }

    const meta = result.meta;
    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const closes: (number | null)[] = quote.close || [];
    const opens: (number | null)[] = quote.open || [];
    const highs: (number | null)[] = quote.high || [];
    const lows: (number | null)[] = quote.low || [];
    const volumes: (number | null)[] = quote.volume || [];

    const points = timestamps.map((ts: number, i: number) => {
      const d = new Date(ts * 1000);
      return {
        date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        fullDate: d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
        isoDate: d.toISOString().split("T")[0],
        timestamp: ts,
        price: closes[i] != null ? +closes[i]!.toFixed(2) : null,
        open: opens[i] != null ? +opens[i]!.toFixed(2) : null,
        high: highs[i] != null ? +highs[i]!.toFixed(2) : null,
        low: lows[i] != null ? +lows[i]!.toFixed(2) : null,
        volume: volumes[i] || 0,
      };
    }).filter((p: { price: number | null }) => p.price != null);

    return NextResponse.json({
      symbol: yahooSymbol,
      currency: meta.currency || "NOK",
      exchangeName: meta.fullExchangeName || meta.exchangeName || "",
      regularMarketPrice: meta.regularMarketPrice,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      regularMarketVolume: meta.regularMarketVolume,
      marketCap: marketCap,
      points,
    });
  } catch (err) {
    console.error("Stock API error:", err);
    return NextResponse.json({ error: "Failed to fetch stock data" }, { status: 500 });
  }
}
