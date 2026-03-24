/**
 * Company Matcher — Fuzzy matching utility for enrichment scripts
 *
 * Maps external company names (from USPTO, PubMed, FDA, etc.) to our database IDs.
 */

export interface CompanyRecord {
  id: string;
  name: string;
  ticker: string | null;
  website: string | null;
}

const STRIP_SUFFIXES = [
  /,?\s*(inc\.?|corp\.?|corporation|ltd\.?|limited|llc|lp|plc|ag|sa|se|ab|nv|gmbh|co\.?|company)$/i,
  /,?\s*(therapeutics?|pharmaceuticals?|pharma|biosciences?|biotech(nology)?|biopharmaceuticals?|biologics?|biopharma|sciences?|medical|health|healthcare|genomics|diagnostics|devices)$/i,
];

function normalize(name: string): string {
  let n = name.trim().toLowerCase();
  // Strip common suffixes iteratively
  for (let i = 0; i < 3; i++) {
    for (const re of STRIP_SUFFIXES) {
      n = n.replace(re, "").trim();
    }
  }
  // Remove punctuation and extra spaces
  n = n.replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  return n;
}

function alphanumOnly(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export class CompanyMatcher {
  private exactMap: Map<string, string>; // normalized name -> id
  private alphaMap: Map<string, string>; // alphanumeric only -> id
  private tickerMap: Map<string, string>; // ticker -> id

  constructor(companies: CompanyRecord[]) {
    this.exactMap = new Map();
    this.alphaMap = new Map();
    this.tickerMap = new Map();

    for (const c of companies) {
      const norm = normalize(c.name);
      const alpha = alphanumOnly(c.name);

      // Don't overwrite if already set (first company wins in case of conflicts)
      if (!this.exactMap.has(norm)) this.exactMap.set(norm, c.id);
      if (!this.alphaMap.has(alpha)) this.alphaMap.set(alpha, c.id);

      // Also index the original lowercase name
      const lower = c.name.toLowerCase().trim();
      if (!this.exactMap.has(lower)) this.exactMap.set(lower, c.id);

      if (c.ticker) {
        const t = c.ticker.toLowerCase().replace(/\..+$/, ""); // Remove exchange suffix (.T, .SW, etc.)
        if (!this.tickerMap.has(t)) this.tickerMap.set(t, c.id);
      }
    }
  }

  /**
   * Match an external company name to our database.
   * Returns company_id or null.
   */
  match(externalName: string): string | null {
    if (!externalName) return null;

    // 1. Exact lowercase match
    const lower = externalName.toLowerCase().trim();
    if (this.exactMap.has(lower)) return this.exactMap.get(lower)!;

    // 2. Normalized match (strip suffixes)
    const norm = normalize(externalName);
    if (this.exactMap.has(norm)) return this.exactMap.get(norm)!;

    // 3. Alphanumeric-only match
    const alpha = alphanumOnly(externalName);
    if (alpha.length >= 3 && this.alphaMap.has(alpha)) return this.alphaMap.get(alpha)!;

    // 4. Try without common prefixes
    const withoutPrefix = norm.replace(/^(the|a)\s+/, "");
    if (withoutPrefix !== norm && this.exactMap.has(withoutPrefix)) {
      return this.exactMap.get(withoutPrefix)!;
    }

    return null;
  }

  /**
   * Match by ticker symbol.
   */
  matchByTicker(ticker: string): string | null {
    if (!ticker) return null;
    const t = ticker.toLowerCase().replace(/\..+$/, "");
    return this.tickerMap.get(t) || null;
  }

  /**
   * Try all matching strategies.
   */
  matchAny(name: string, ticker?: string): string | null {
    if (ticker) {
      const byTicker = this.matchByTicker(ticker);
      if (byTicker) return byTicker;
    }
    return this.match(name);
  }
}

/**
 * Load all companies from Supabase for matching.
 */
export async function loadCompanies(supabase: ReturnType<typeof import("@supabase/supabase-js").createClient>): Promise<CompanyRecord[]> {
  const all: CompanyRecord[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data } = await supabase
      .from("companies")
      .select("id, name, ticker, website")
      .range(offset, offset + pageSize - 1);

    if (!data || data.length === 0) break;
    all.push(...(data as CompanyRecord[]));
    offset += pageSize;
    if (data.length < pageSize) break;
  }

  return all;
}
