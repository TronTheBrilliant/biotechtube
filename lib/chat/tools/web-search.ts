/**
 * Firecrawl wrapper for the chatbot's `web_search` tool.
 *
 * Calls Firecrawl's /v1/search endpoint (search-only, no scrape — cheaper
 * and we only need snippets). Caches results in-process for 5 minutes
 * keyed by normalized query, since rapid-fire follow-ups in a single
 * conversation often issue the same query twice.
 */

const FIRECRAWL_SEARCH_URL = 'https://api.firecrawl.dev/v1/search'
const MAX_QUERY_LEN = 200
const HARD_RESULT_CAP = 5
const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_MAX_ENTRIES = 200

export interface WebSearchResult {
  url: string
  title: string
  snippet: string
}

interface CacheEntry {
  expires: number
  results: WebSearchResult[]
}

const cache = new Map<string, CacheEntry>()

function cacheKey(query: string, limit: number): string {
  return `${limit}::${query.trim().toLowerCase()}`
}

function pruneCache() {
  if (cache.size <= CACHE_MAX_ENTRIES) return
  // Drop the oldest 25% of entries. Map iteration order = insertion order.
  const toDrop = Math.ceil(CACHE_MAX_ENTRIES * 0.25)
  const keys = Array.from(cache.keys())
  for (let i = 0; i < toDrop && i < keys.length; i++) {
    cache.delete(keys[i])
  }
}

/**
 * Search the web via Firecrawl. Returns up to `maxResults` clean snippets.
 *
 * Throws when the Firecrawl API errors or `FIRECRAWL_API_KEY` is missing —
 * caller is expected to surface a tool_error event back to the model so
 * it can answer without the web search.
 */
export async function searchWeb(
  query: string,
  maxResults = HARD_RESULT_CAP,
): Promise<WebSearchResult[]> {
  const trimmed = (query ?? '').trim().slice(0, MAX_QUERY_LEN)
  if (!trimmed) return []
  const limit = Math.min(Math.max(1, maxResults), HARD_RESULT_CAP)

  const key = cacheKey(trimmed, limit)
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) {
    return hit.results
  }
  if (hit) cache.delete(key)

  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY not configured')

  const res = await fetch(FIRECRAWL_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query: trimmed, limit }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Firecrawl search failed (${res.status}): ${errText.slice(0, 200)}`)
  }

  const json = (await res.json()) as {
    success?: boolean
    data?: Array<{ url?: string; title?: string; description?: string; markdown?: string }>
  }

  if (!json?.success || !Array.isArray(json.data)) {
    return []
  }

  const results: WebSearchResult[] = json.data
    .filter((d) => typeof d?.url === 'string')
    .slice(0, limit)
    .map((d) => ({
      url: d.url!,
      title: (d.title ?? '').toString().slice(0, 200),
      snippet: (d.description ?? d.markdown ?? '').toString().slice(0, 500),
    }))

  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, results })
  pruneCache()

  return results
}

/**
 * Estimate cost in USD for a search call. Firecrawl prices roughly $0.005
 * per result on the search endpoint as of 2026-04. We bill per result
 * actually returned (capped at the requested limit).
 */
export function estimateSearchCostUsd(resultCount: number): number {
  return Math.max(0, resultCount) * 0.005
}
