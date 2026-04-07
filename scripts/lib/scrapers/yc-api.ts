/**
 * Y Combinator Company Scraper
 * Uses YC's Algolia-powered search API to find biotech companies.
 */

export interface ScrapedCompany {
  name: string;
  website: string | null;
  description: string | null;
  country: string | null;
  city: string | null;
  source_url: string | null;
}

const YC_ALGOLIA_URL = "https://45bwzj1sgc-dsn.algolia.net/1/indexes/*/queries";
const YC_APP_ID = "45BWZJ1SGC";
const YC_API_KEY = "MjBjYjRiMzY0NzdhZWY0NjExY2NhZjYxMGIxYjc2MTAwNWFkNTkwNTc4NjgxYjJiMDMyMTY2ZDQ5ZmQwMjdhMWZhY2VkZmJhZTE0NjkwYzc2MjE3NmI2ZTg2ZjAxOGY2OTFhNDE1ZGI2NWJjMjUzNzk2MTI5ZDhiMTI0ZmYwNQ==";

export async function scrapeYC(): Promise<ScrapedCompany[]> {
  const companies: ScrapedCompany[] = [];
  const industries = ["Biotech", "Healthcare", "Drug Discovery", "Therapeutics"];

  for (const industry of industries) {
    try {
      const res = await fetch(YC_ALGOLIA_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Algolia-Application-Id": YC_APP_ID,
          "X-Algolia-API-Key": Buffer.from(YC_API_KEY, "base64").toString(),
        },
        body: JSON.stringify({
          requests: [{
            indexName: "YCCompany_production",
            params: `query=&facetFilters=[["industry:${industry}"]]&hitsPerPage=300`,
          }],
        }),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const hits = data.results?.[0]?.hits || [];

      for (const hit of hits) {
        const name = hit.name?.trim();
        if (!name) continue;
        // Skip if already added (cross-industry dedup)
        if (companies.some((c) => c.name.toLowerCase() === name.toLowerCase())) continue;

        companies.push({
          name,
          website: hit.website || hit.url || null,
          description: hit.one_liner || hit.long_description?.substring(0, 200) || null,
          country: hit.country || "United States",
          city: hit.city || null,
          source_url: `https://www.ycombinator.com/companies/${hit.slug || name.toLowerCase().replace(/\s+/g, "-")}`,
        });
      }
    } catch (err) {
      console.error(`  YC scrape error for "${industry}":`, (err as Error).message);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  return companies;
}
