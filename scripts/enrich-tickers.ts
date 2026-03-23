import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../.env.local') })

import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'

/**
 * Re-scans already-enriched companies that don't have company_type set yet.
 * Extracts ticker symbols from their websites.
 * This fills the gap for companies enriched before ticker detection was added.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const DELAY_MS = 1500
const CONCURRENT = 5
const FETCH_TIMEOUT_MS = 10000

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchHTML(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    })
    clearTimeout(timer)
    if (!response.ok) return null
    const ct = response.headers.get('content-type') || ''
    if (!ct.includes('text/html') && !ct.includes('xhtml')) return null
    return await response.text()
  } catch {
    clearTimeout(timer)
    return null
  }
}

function extractTicker(html: string): { ticker: string | null; companyType: 'Public' | 'Private' } {
  // Use page text (scripts/styles removed) to avoid CSS/JS false positives
  const $ = cheerio.load(html)
  $('script, style, noscript').remove()
  const pageText = $('body').text()

  const tickerPatterns = [
    /\(?(?:NASDAQ|NYSE|AMEX|NYSE\s*MKT)\s*[:：]\s*([A-Z]{2,5})\)?/,
    /\(?(?:TSX|LSE|ASX|Euronext|OMX|OSE|SIX)\s*[:：]\s*([A-Z0-9]{2,6})\)?/,
    /traded\s+(?:on|under)\s+(?:the\s+)?(?:NASDAQ|NYSE)\s+(?:under\s+(?:the\s+)?(?:symbol|ticker)\s+)?["']?([A-Z]{2,5})["']?/,
    /(?:ticker|stock)\s+symbol\s*[:：]\s*([A-Z]{2,5})/,
  ]

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
        return { ticker, companyType: 'Public' }
      }
    }
  }

  return { ticker: null, companyType: 'Private' }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║   BiotechTube — Ticker Re-scan (backfill)        ║')
  console.log('╚══════════════════════════════════════════════════╝\n')

  const startTime = Date.now()

  // Find enriched companies without company_type
  const { count } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .not('enriched_at', 'is', null)
    .is('company_type', null)

  console.log(`  Companies to re-scan: ${count}\n`)

  let processed = 0
  let publicFound = 0
  let privateSet = 0
  let failed = 0
  let hasMore = true

  while (hasMore) {
    const { data: batch } = await supabase
      .from('companies')
      .select('id, name, website')
      .not('enriched_at', 'is', null)
      .is('company_type', null)
      .not('website', 'is', null)
      .order('name')
      .limit(50)

    if (!batch || batch.length === 0) {
      hasMore = false
      break
    }

    for (let i = 0; i < batch.length; i += CONCURRENT) {
      const chunk = batch.slice(i, i + CONCURRENT)
      const htmlResults = await Promise.all(
        chunk.map(c => {
          const url = c.website.startsWith('http') ? c.website : `https://${c.website}`
          return fetchHTML(url)
        })
      )

      for (let j = 0; j < chunk.length; j++) {
        const company = chunk[j]
        const html = htmlResults[j]
        processed++

        if (html) {
          const { ticker, companyType } = extractTicker(html)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const update: Record<string, any> = { company_type: companyType }
          if (ticker) update.ticker = ticker

          await supabase.from('companies').update(update).eq('id', company.id)

          if (companyType === 'Public') {
            publicFound++
            console.log(`  🏛️  ${company.name} → ${ticker || 'no ticker'} (Public)`)
          } else {
            privateSet++
          }
        } else {
          // Can't reach site — mark as Private
          await supabase.from('companies').update({ company_type: 'Private' }).eq('id', company.id)
          failed++
          privateSet++
        }

        if (processed % 100 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
          console.log(`  [${elapsed}m] ${processed}/${count} | 🏛️ ${publicFound} public | 🔒 ${privateSet} private`)
        }
      }

      await sleep(DELAY_MS)
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
  console.log(`\n  ✅ Done! ${publicFound} public, ${privateSet} private, ${failed} unreachable (${elapsed}m)`)
}

main().catch(console.error)
