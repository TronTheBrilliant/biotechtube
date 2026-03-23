import { NextRequest, NextResponse } from "next/server";

const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

// Per-symbol cache with 5-minute TTL
const symbolDataCache = new Map<string, { data: SymbolData; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

interface SymbolData {
  price: number | null;
  change30d: number | null;
  currency: string | null;
}

async function fetchSymbolData(symbol: string): Promise<SymbolData> {
  const cached = symbolDataCache.get(symbol);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  try {
    const res = await fetch(
      `${YAHOO_CHART_URL}/${encodeURIComponent(symbol)}?range=1mo&interval=1d`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(5000),
      }
    );
    const raw = await res.json();
    const result = raw?.chart?.result?.[0];

    if (!result) {
      const empty: SymbolData = { price: null, change30d: null, currency: null };
      symbolDataCache.set(symbol, { data: empty, ts: Date.now() });
      return empty;
    }

    const meta = result.meta;
    const price = meta?.regularMarketPrice || null;
    const chartPrevClose = meta?.chartPreviousClose || null;
    const currency = meta?.currency || null;

    // Calculate 30d change from chart data
    let change30d: number | null = null;
    if (price && chartPrevClose) {
      change30d = +((price - chartPrevClose) / chartPrevClose * 100).toFixed(2);
    }

    const data: SymbolData = { price, change30d, currency };
    symbolDataCache.set(symbol, { data, ts: Date.now() });
    return data;
  } catch {
    const empty: SymbolData = { price: null, change30d: null, currency: null };
    symbolDataCache.set(symbol, { data: empty, ts: Date.now() });
    return empty;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get("symbols");

  if (!symbols) {
    return NextResponse.json({ error: "Missing symbols param" }, { status: 400 });
  }

  const symbolList = symbols
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);

  const result: Record<string, SymbolData> = {};

  // Fetch in parallel batches of 15
  for (let i = 0; i < symbolList.length; i += 15) {
    const batch = symbolList.slice(i, i + 15);
    const batchResults = await Promise.all(
      batch.map(async (sym) => ({
        symbol: sym,
        data: await fetchSymbolData(sym),
      }))
    );
    for (const { symbol, data } of batchResults) {
      result[symbol] = data;
    }
  }

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
