import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../.env.local') })

import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'

// --- Config ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BATCH_SIZE = 50
const DELAY_MS = 1500 // polite delay between website fetches
const FETCH_TIMEOUT_MS = 10000 // 10s timeout per website
const CONCURRENT = 5 // parallel fetches

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================
// HTML Extraction Logic
// ============================================================

interface ExtractedData {
  description: string | null
  founded: number | null
  employeeRange: string | null
  stage: string | null
  ticker: string | null
  companyType: 'Public' | 'Private' | null
}

const STAGE_PATTERNS: { pattern: RegExp; stage: string }[] = [
  { pattern: /phase\s*3/i, stage: 'Phase 3' },
  { pattern: /phase\s*(?:2|ii)\s*[\/\\]\s*(?:3|iii)/i, stage: 'Phase 2/3' },
  { pattern: /phase\s*2/i, stage: 'Phase 2' },
  { pattern: /phase\s*(?:1|i)\s*[\/\\]\s*(?:2|ii)/i, stage: 'Phase 1/2' },
  { pattern: /phase\s*1/i, stage: 'Phase 1' },
  { pattern: /fda[\s-]*approved|ema[\s-]*approved|commercially\s+available|marketed\s+product/i, stage: 'Approved' },
  { pattern: /pre[\s-]*clinical|preclinical/i, stage: 'Pre-clinical' },
  { pattern: /discovery\s+stage|early[\s-]*stage\s+research/i, stage: 'Pre-clinical' },
  { pattern: /clinical[\s-]*stage/i, stage: 'Phase 1' },
]

const EMPLOYEE_PATTERNS: { pattern: RegExp; range: string }[] = [
  { pattern: /(\d{1,3}),?(\d{3})\+?\s*employees/i, range: '' }, // handled specially
  { pattern: /over\s+(\d[\d,]*)\s*employees/i, range: '' },
  { pattern: /(\d+)\s*[\-–to]+\s*(\d+)\s*employees/i, range: '' },
  { pattern: /(?:approximately|about|around|nearly|~)\s*(\d[\d,]*)\s*employees/i, range: '' },
  { pattern: /(\d[\d,]*)\s*(?:\+\s*)?employees/i, range: '' },
  { pattern: /team\s+of\s+(?:over\s+)?(\d[\d,]*)/i, range: '' },
]

function classifyEmployeeCount(num: number): string {
  if (num <= 10) return '1-10'
  if (num <= 50) return '11-50'
  if (num <= 200) return '51-200'
  if (num <= 500) return '201-500'
  if (num <= 1000) return '501-1000'
  if (num <= 5000) return '1001-5000'
  if (num <= 10000) return '5001-10000'
  return '10000+'
}

function extractFromHTML(html: string, url: string): ExtractedData {
  const $ = cheerio.load(html)
  const result: ExtractedData = {
    description: null,
    founded: null,
    employeeRange: null,
    stage: null,
    ticker: null,
    companyType: null,
  }

  // --- Description ---
  // Priority: og:description > meta description > first substantial <p>
  const ogDesc = $('meta[property="og:description"]').attr('content')?.trim()
  const metaDesc = $('meta[name="description"]').attr('content')?.trim()
  const twitterDesc = $('meta[name="twitter:description"]').attr('content')?.trim()

  let description = ogDesc || metaDesc || twitterDesc || null

  // If no meta description, try first substantial paragraph
  if (!description) {
    const paragraphs: string[] = []
    $('p').each((_, el) => {
      const text = $(el).text().trim()
      if (text.length > 80 && text.length < 2000) {
        paragraphs.push(text)
      }
    })
    if (paragraphs.length > 0) {
      // Take the first meaningful paragraph
      description = paragraphs[0]
    }
  }

  // Clean up description
  if (description) {
    description = description
      .replace(/\s+/g, ' ')
      .replace(/\n/g, ' ')
      .trim()
    // Limit to 500 chars
    if (description.length > 500) {
      description = description.slice(0, 497) + '...'
    }
    // Skip if it's just cookie/legal boilerplate
    if (/cookie|privacy|gdpr|consent|javascript|enable javascript/i.test(description) && description.length < 150) {
      description = null
    }
  }

  result.description = description

  // --- Get full page text for pattern matching ---
  // Remove scripts and styles first
  $('script, style, noscript').remove()
  const pageText = $('body').text().replace(/\s+/g, ' ')

  // --- Founded year ---
  const foundedPatterns = [
    /(?:founded|established|incorporated|started)\s+(?:in\s+)?(\d{4})/i,
    /(?:since|est\.?)\s+(\d{4})/i,
    /(\d{4})\s*[-–]\s*(?:present|today|now)/i,
    /\b(?:founded|established)\b[^.]{0,40}(\d{4})/i,
  ]

  for (const pattern of foundedPatterns) {
    const match = pageText.match(pattern)
    if (match) {
      const year = parseInt(match[1])
      if (year >= 1900 && year <= 2026) {
        result.founded = year
        break
      }
    }
  }

  // Also check structured data (JSON-LD)
  if (!result.founded) {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const jsonld = JSON.parse($(el).html() || '')
        const data = Array.isArray(jsonld) ? jsonld[0] : jsonld
        if (data.foundingDate) {
          const year = parseInt(data.foundingDate.toString().slice(0, 4))
          if (year >= 1900 && year <= 2026) {
            result.founded = year
          }
        }
      } catch { /* ignore */ }
    })
  }

  // --- Employee range ---
  for (const { pattern } of EMPLOYEE_PATTERNS) {
    const match = pageText.match(pattern)
    if (match) {
      // If it's a range pattern (e.g., "100-200 employees")
      if (match[2]) {
        const high = parseInt(match[2].replace(/,/g, ''))
        result.employeeRange = classifyEmployeeCount(high)
      } else if (match[1]) {
        const num = parseInt(match[1].replace(/,/g, ''))
        if (num > 0 && num < 500000) {
          result.employeeRange = classifyEmployeeCount(num)
        }
      }
      if (result.employeeRange) break
    }
  }

  // Also check JSON-LD for employee count
  if (!result.employeeRange) {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const jsonld = JSON.parse($(el).html() || '')
        const data = Array.isArray(jsonld) ? jsonld[0] : jsonld
        if (data.numberOfEmployees) {
          const val = typeof data.numberOfEmployees === 'object'
            ? data.numberOfEmployees.value
            : data.numberOfEmployees
          if (val) {
            result.employeeRange = classifyEmployeeCount(parseInt(val))
          }
        }
      } catch { /* ignore */ }
    })
  }

  // --- Stage (highest clinical stage mentioned) ---
  // We match the HIGHEST stage mentioned on the page
  for (const { pattern, stage } of STAGE_PATTERNS) {
    if (pattern.test(pageText)) {
      result.stage = stage
      break // STAGE_PATTERNS is ordered highest-first
    }
  }

  // --- Ticker / Public Company Detection ---
  // Only match VISIBLE TEXT patterns like "NASDAQ: ABCD" or "(NYSE: ABCD)"
  // We search pageText (scripts/styles removed) to avoid CSS/JS false positives
  const tickerPatterns = [
    // "(NASDAQ: ABCD)" or "NASDAQ: ABCD" — most common on biotech sites
    /\(?(?:NASDAQ|NYSE|AMEX|NYSE\s*MKT)\s*[:：]\s*([A-Z]{2,5})\)?/,
    // "TSX: ABCD" etc for international exchanges
    /\(?(?:TSX|LSE|ASX|Euronext|OMX|OSE|SIX)\s*[:：]\s*([A-Z0-9]{2,6})\)?/,
    // "traded on NASDAQ under the symbol ABCD"
    /traded\s+(?:on|under)\s+(?:the\s+)?(?:NASDAQ|NYSE)\s+(?:under\s+(?:the\s+)?(?:symbol|ticker)\s+)?["']?([A-Z]{2,5})["']?/,
    // "ticker symbol: ABCD" or "stock symbol: ABCD"
    /(?:ticker|stock)\s+symbol\s*[:：]\s*([A-Z]{2,5})/,
  ]

  // Also exclude common abbreviations that could be false-positive tickers
  const excludedTickers = new Set([
    'CEO', 'CFO', 'CSO', 'CTO', 'COO', 'CMO', 'CDO', 'CIO', 'CPO',
    'USA', 'FDA', 'EMA', 'SEC', 'IPO', 'DNA', 'RNA', 'API', 'HIV',
    'CSS', 'HTML', 'PHP', 'PDF', 'URL', 'XML', 'RSS', 'SQL', 'CDN',
    'EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY', 'SEK', 'NOK', 'DKK',
  ])

  for (const pattern of tickerPatterns) {
    const match = pageText.match(pattern)
    if (match && match[1]) {
      const ticker = match[1].toUpperCase()
      if (!excludedTickers.has(ticker)) {
        result.ticker = ticker
        result.companyType = 'Public'
        break
      }
    }
  }

  // If no ticker found, default to Private (no IR page heuristic — too unreliable)
  if (!result.companyType) {
    result.companyType = 'Private'
  }

  return result
}

// ============================================================
// Fetch with timeout
// ============================================================
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error(`Not HTML: ${contentType}`)
    }

    return await response.text()
  } finally {
    clearTimeout(timer)
  }
}

// ============================================================
// Process a single company
// ============================================================
async function enrichCompany(company: { id: string; name: string; website: string; domain: string }): Promise<{
  success: boolean
  data: ExtractedData | null
  error?: string
}> {
  const url = company.website.startsWith('http') ? company.website : `https://${company.website}`

  try {
    const html = await fetchWithTimeout(url, FETCH_TIMEOUT_MS)
    const data = extractFromHTML(html, url)
    return { success: true, data }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, data: null, error: msg }
  }
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   BiotechTube — Website Enrichment (Tier 1)  ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  const startTime = Date.now()

  // Count total companies needing enrichment (enriched_at IS NULL)
  const { count: totalCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .is('enriched_at', null)
    .not('website', 'is', null)

  const { count: doneCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .not('enriched_at', 'is', null)

  console.log(`  Total companies without enrichment: ${totalCount}`)
  console.log(`  Already enriched: ${doneCount}`)
  console.log(`  Starting enrichment...\n`)

  // Log this run
  const { data: logEntry } = await supabase
    .from('scrape_log')
    .insert({
      source: 'website-enrichment',
      url: 'company-websites',
      status: 'running',
      company_count: 0,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  let processed = 0
  let enriched = 0
  let failed = 0
  let noData = 0

  // Process in pages (BATCH_SIZE at a time from DB)
  let hasMore = true

  while (hasMore) {
    // Fetch next batch of un-enriched companies
    const { data: batch, error: fetchError } = await supabase
      .from('companies')
      .select('id, name, website, domain')
      .is('enriched_at', null)
      .not('website', 'is', null)
      .order('name')
      .limit(BATCH_SIZE)

    if (fetchError) {
      console.error(`  DB fetch error: ${fetchError.message}`)
      break
    }

    if (!batch || batch.length === 0) {
      hasMore = false
      break
    }

    // Process this batch with concurrency limit
    for (let i = 0; i < batch.length; i += CONCURRENT) {
      const chunk = batch.slice(i, i + CONCURRENT)
      const results = await Promise.all(chunk.map(c => enrichCompany(c)))

      // Update each company in DB
      for (let j = 0; j < chunk.length; j++) {
        const company = chunk[j]
        const result = results[j]
        processed++

        if (result.success && result.data) {
          const hasAnyData = result.data.description || result.data.founded || result.data.employeeRange || result.data.stage || result.data.ticker

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const update: Record<string, any> = {
            enriched_at: new Date().toISOString(),
          }

          if (result.data.description) update.description = result.data.description
          if (result.data.founded) update.founded = result.data.founded
          if (result.data.employeeRange) update.employee_range = result.data.employeeRange
          if (result.data.stage) update.stage = result.data.stage
          if (result.data.ticker) update.ticker = result.data.ticker
          if (result.data.companyType) update.company_type = result.data.companyType

          const { error: updateError } = await supabase
            .from('companies')
            .update(update)
            .eq('id', company.id)

          if (updateError) {
            console.error(`    DB error for "${company.name}": ${updateError.message}`)
            failed++
          } else if (hasAnyData) {
            enriched++
          } else {
            noData++
          }
        } else {
          // Mark as enriched (attempted) so we don't retry endlessly
          await supabase
            .from('companies')
            .update({ enriched_at: new Date().toISOString() })
            .eq('id', company.id)

          failed++
        }

        // Progress log every 100
        if (processed % 100 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
          const rate = (processed / ((Date.now() - startTime) / 1000)).toFixed(1)
          console.log(`  [${elapsed}m] ${processed}/${totalCount} processed | ${enriched} enriched | ${failed} failed | ${noData} no data | ${rate}/s`)
        }
      }

      // Small delay between concurrent chunks
      await sleep(DELAY_MS)
    }

    // Update log periodically
    if (logEntry) {
      await supabase
        .from('scrape_log')
        .update({ company_count: enriched })
        .eq('id', logEntry.id)
    }
  }

  // Final log update
  if (logEntry) {
    await supabase
      .from('scrape_log')
      .update({
        status: 'done',
        company_count: enriched,
        completed_at: new Date().toISOString(),
      })
      .eq('id', logEntry.id)
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)

  console.log('\n╔══════════════════════════════════════════════╗')
  console.log(`║   Website Enrichment Complete!`)
  console.log(`║   Processed: ${processed}`)
  console.log(`║   Enriched:  ${enriched} (got at least one field)`)
  console.log(`║   No data:   ${noData} (site reachable but no extractable data)`)
  console.log(`║   Failed:    ${failed} (unreachable/timeout/error)`)
  console.log(`║   Time:      ${elapsed} minutes`)
  console.log('╚══════════════════════════════════════════════╝')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
