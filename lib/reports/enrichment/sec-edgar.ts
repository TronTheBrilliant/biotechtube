// biotechtube/lib/reports/enrichment/sec-edgar.ts
// Fetch latest 10-K + 10-Q + last 12mo Form 4 for a public company.
// SEC requires User-Agent identifying app + contact: "BiotechTube research@biotechtube.io".

const UA = "BiotechTube research@biotechtube.io";
const SEC_HEADERS: HeadersInit = { "User-Agent": UA, Accept: "application/json" };
const FETCH_TIMEOUT_MS = 15000;
const withTimeout = () => AbortSignal.timeout(FETCH_TIMEOUT_MS);

export interface SecEdgarResult {
  filings_10k_summary: string;
  filings_10q_diff: string;
  insider_form4_summary: string;
  fetched_at: string;
}

export async function fetchSecEdgar(ticker: string | null): Promise<SecEdgarResult | null> {
  if (!ticker) return null;
  try {
    const cik = await tickerToCik(ticker);
    if (!cik) return null;

    const cikPadded = cik.padStart(10, "0");
    const subRes = await fetch(`https://data.sec.gov/submissions/CIK${cikPadded}.json`, { headers: SEC_HEADERS, signal: withTimeout() });
    if (!subRes.ok) return null;
    const sub = await subRes.json() as any;

    const filings = sub.filings?.recent;
    if (!filings) return null;

    const idx10K = (filings.form as string[]).findIndex(f => f === "10-K");
    const idx10Q = (filings.form as string[]).findIndex(f => f === "10-Q");

    const fetch10K = idx10K >= 0
      ? fetchFilingText(cikPadded, filings.accessionNumber[idx10K], filings.primaryDocument[idx10K]).catch(() => "")
      : Promise.resolve("");
    const fetch10Q = idx10Q >= 0
      ? fetchFilingText(cikPadded, filings.accessionNumber[idx10Q], filings.primaryDocument[idx10Q]).catch(() => "")
      : Promise.resolve("");

    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const form4Indices = (filings.form as string[])
      .map((f, i) => f === "4" ? i : -1)
      .filter(i => i >= 0 && filings.filingDate[i] >= oneYearAgo)
      .slice(0, 30);

    const form4Summary = form4Indices.length === 0
      ? "No Form 4 filings in the last 12 months."
      : `${form4Indices.length} Form 4 filings in last 12 months. Filing dates: ${form4Indices.map(i => filings.filingDate[i]).join(", ")}.`;

    const [text10K, text10Q] = await Promise.all([fetch10K, fetch10Q]);

    return {
      filings_10k_summary: extractRiskAndMda(text10K).slice(0, 8000),
      filings_10q_diff: extractRiskAndMda(text10Q).slice(0, 4000),
      insider_form4_summary: form4Summary,
      fetched_at: new Date().toISOString(),
    };
  } catch (e) {
    console.warn("[sec-edgar] fetch failed:", e);
    return null;
  }
}

let _cikCache: Record<string, string> | null = null;
async function tickerToCik(ticker: string): Promise<string | null> {
  if (!_cikCache) {
    const res = await fetch("https://www.sec.gov/files/company_tickers.json", { headers: SEC_HEADERS, signal: withTimeout() });
    if (!res.ok) return null;
    const data = await res.json() as Record<string, { cik_str: number; ticker: string; title: string }>;
    _cikCache = {};
    for (const k in data) _cikCache[data[k].ticker.toUpperCase()] = String(data[k].cik_str);
  }
  return _cikCache[ticker.toUpperCase()] ?? null;
}

async function fetchFilingText(cikPadded: string, accession: string, primaryDoc: string): Promise<string> {
  const accNoDash = accession.replace(/-/g, "");
  const url = `https://www.sec.gov/Archives/edgar/data/${parseInt(cikPadded)}/${accNoDash}/${primaryDoc}`;
  const res = await fetch(url, { headers: SEC_HEADERS, signal: withTimeout() });
  if (!res.ok) return "";
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRiskAndMda(text: string): string {
  // Heuristic: pull Risk Factors + MD&A by anchor strings. 10-K TOCs list
  // these phrases before the actual sections, so when we find duplicate matches
  // (TOC + actual section), prefer the second occurrence.
  const lower = text.toLowerCase();
  const findSecond = (needle: string) => {
    const first = lower.indexOf(needle);
    if (first < 0) return -1;
    const second = lower.indexOf(needle, first + needle.length + 100);
    return second >= 0 ? second : first;
  };
  const riskStart = findSecond("risk factors");
  const mdaStart = findSecond("management's discussion");
  const items = [
    riskStart >= 0 ? text.slice(riskStart, riskStart + 6000) : "",
    mdaStart >= 0 ? text.slice(mdaStart, mdaStart + 6000) : "",
  ].filter(Boolean);
  return items.join("\n\n--- Section break ---\n\n") || text.slice(0, 8000);
}
