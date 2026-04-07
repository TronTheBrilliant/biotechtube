/**
 * Generic Portfolio Page Scraper
 * Handles ~20 VC portfolio pages with configurable CSS selectors.
 * Falls back to AI extraction when CSS parsing fails.
 */

import { callDeepSeek, parseDeepSeekJSON } from "../deepseek-client";

export interface ScrapedCompany {
  name: string;
  website: string | null;
  description: string | null;
  country: string | null;
  city: string | null;
  source_url: string | null;
}

interface PortfolioConfig {
  url: string;
  css?: {
    container?: string;
    item?: string;
    name?: string;
    link?: string;
    description?: string;
  };
}

/**
 * Scrape a portfolio page. First tries CSS-based extraction, falls back to AI.
 */
export async function scrapePortfolioPage(config: PortfolioConfig): Promise<ScrapedCompany[]> {
  try {
    const res = await fetch(config.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BiotechTube/1.0; +https://biotechtube.io)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return [];
    const html = await res.text();

    // Try AI extraction — more reliable than CSS for varied portfolio pages
    return extractWithAI(html, config.url);
  } catch (err) {
    console.error(`  Portfolio scrape error for ${config.url}:`, (err as Error).message);
    return [];
  }
}

/**
 * Use DeepSeek to extract company names from portfolio HTML.
 * More reliable than CSS selectors since each site has different markup.
 */
async function extractWithAI(html: string, sourceUrl: string): Promise<ScrapedCompany[]> {
  // Truncate HTML to a reasonable size for the API
  // Focus on the body content, strip scripts/styles
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Take first 8000 chars (enough for most portfolio pages)
  text = text.substring(0, 8000);

  if (text.length < 100) return [];

  const content = await callDeepSeek({
    system: "You are a data extraction specialist. Extract biotech/pharma company names from portfolio page text.",
    prompt: `Extract ALL biotech/pharma company names from this VC portfolio page. Return ONLY a JSON array of objects.

Page URL: ${sourceUrl}
Page text (truncated):
${text}

For each company found, return:
{"name": "Company Name", "website": "https://..." or null, "description": "one-liner" or null}

Return as JSON array: [{"name":"...", "website":null, "description":null}, ...]
ONLY include actual company names. No navigation items, headers, or other text.
No markdown fences. Just the JSON array.`,
    temperature: 0,
    maxTokens: 3000,
  });

  if (!content) return [];
  const parsed = parseDeepSeekJSON<Array<{ name: string; website?: string; description?: string }>>(content);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((c) => c.name && c.name.length > 1 && c.name.length < 100)
    .map((c) => ({
      name: c.name.trim(),
      website: c.website || null,
      description: c.description || null,
      country: null,
      city: null,
      source_url: sourceUrl,
    }));
}
