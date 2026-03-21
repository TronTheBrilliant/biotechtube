import * as cheerio from 'cheerio'

export interface ParsedCompany {
  name: string
  city: string
  website: string
  domain: string
}

/**
 * Extract domain from a URL, normalizing www. prefix
 * e.g. "https://www.oncoinvent.com/" -> "oncoinvent.com"
 */
export function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/**
 * Generate a URL-safe slug from a company name
 * e.g. "Oncoinvent AS" -> "oncoinvent-as"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

// Domains to skip — social media, government, non-company sites
const SKIP_DOMAINS = [
  'linkedin.com', 'twitter.com', 'facebook.com', 'youtube.com',
  'google.com', 'wikipedia.org', 'sec.gov', 'nih.gov',
  'constantcontact.com', 'ctctcdn.com', 'instagram.com',
  'x.com', 'tiktok.com', 'reddit.com', 'github.com',
]

/**
 * Parse a BioPharmGuy country/region page HTML.
 *
 * BPG pages list companies as <a> tags with external website URLs.
 * Companies are grouped under city/location headings (h2/h3/h4 tags).
 * We extract: company name (link text), city (nearest heading), website URL, domain.
 */
export function parseBPGPage(html: string): ParsedCompany[] {
  const $ = cheerio.load(html)
  const companies: ParsedCompany[] = []
  const seen = new Set<string>()
  let currentCity = ''

  // Walk through the body looking for headings and links
  $('body').find('h2, h3, h4, a').each((_, el) => {
    const $el = $(el)
    const tag = (el as any).tagName?.toLowerCase() || (el as any).name?.toLowerCase()

    // Track city headings
    if (tag === 'h2' || tag === 'h3' || tag === 'h4') {
      const text = $el.text().trim()
      // Skip non-location headings
      if (text && !text.includes('Subscribe') && !text.includes('Thanks') &&
          !text.includes('sign up') && !text.includes('Newsletter') &&
          text.length < 100) {
        currentCity = text
      }
      return
    }

    // Process links
    if (tag === 'a') {
      const href = $el.attr('href') || ''
      const name = $el.text().trim()

      // Basic validation
      if (!href || !name || name.length < 2) return
      if (!href.startsWith('http')) return

      // Skip internal BPG links and known non-company domains
      if (href.includes('biopharmguy.com')) return
      if (href.startsWith('#') || href.startsWith('mailto:')) return

      const domain = extractDomain(href)
      if (!domain) return

      // Skip known non-company domains
      if (SKIP_DOMAINS.some(d => domain.includes(d))) return

      // Deduplicate by domain within this page
      if (seen.has(domain)) return
      seen.add(domain)

      companies.push({
        name,
        city: currentCity,
        website: href.replace(/\/$/, ''),
        domain,
      })
    }
  })

  return companies
}

/**
 * Parse a BPG category page — same HTML format.
 * We only need company name + domain (to match against existing rows).
 */
export function parseBPGCategoryPage(html: string): { name: string; domain: string }[] {
  const $ = cheerio.load(html)
  const results: { name: string; domain: string }[] = []
  const seen = new Set<string>()

  $('a').each((_, el) => {
    const href = $(el).attr('href') || ''
    const name = $(el).text().trim()

    if (!href || !name || name.length < 2 || !href.startsWith('http')) return
    if (href.includes('biopharmguy.com')) return

    const domain = extractDomain(href)
    if (!domain || seen.has(domain)) return
    seen.add(domain)

    if (SKIP_DOMAINS.some(d => domain.includes(d))) return

    results.push({ name, domain })
  })

  return results
}
