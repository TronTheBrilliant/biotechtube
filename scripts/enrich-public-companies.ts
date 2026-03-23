import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../.env.local') })

import { createClient } from '@supabase/supabase-js'

// --- Config ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BATCH_SIZE = 50
const DELAY_MS = 1000 // be more polite to avoid rate limits
const CONCURRENT = 2 // lower concurrency to avoid 429s
const MAX_RETRIES = 3

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================
// Yahoo Finance Search
// ============================================================

interface YahooQuote {
  symbol: string
  shortname?: string
  longname?: string
  exchDisp?: string
  typeDisp?: string
  quoteType?: string
  sector?: string
  industry?: string
}

type SearchResult =
  | { status: 'match'; quote: YahooQuote }
  | { status: 'no_match' }
  | { status: 'error'; reason: string }

async function searchYahooFinance(companyName: string, retries = 0): Promise<SearchResult> {
  const query = encodeURIComponent(companyName)
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${query}&quotesCount=5&newsCount=0&listsCount=0&enableFuzzyQuery=false`

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    })

    clearTimeout(timer)

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited — exponential backoff and retry
        if (retries < MAX_RETRIES) {
          const backoff = Math.pow(2, retries + 1) * 5000 // 10s, 20s, 40s
          console.log(`    ⏳ Rate limited, backing off ${backoff / 1000}s...`)
          await sleep(backoff)
          return searchYahooFinance(companyName, retries + 1)
        }
        return { status: 'error', reason: 'rate_limited' }
      }
      return { status: 'error', reason: `http_${response.status}` }
    }

    const data = await response.json()
    const quotes = (data.quotes || []) as YahooQuote[]

    // Filter for equity matches — case-insensitive typeDisp check
    const equityQuotes = quotes.filter(q => {
      const type = (q.typeDisp || q.quoteType || '').toLowerCase()
      return type === 'equity'
    })

    if (equityQuotes.length === 0) {
      return { status: 'no_match' }
    }

    // Check if any equity is in healthcare/biotech/pharma sector
    // But also accept matches WITHOUT sector info (some Yahoo results lack it)
    const normalizedSearch = companyName.toLowerCase().replace(/[^a-z0-9]/g, '')

    for (const q of equityQuotes) {
      const qName = (q.longname || q.shortname || '').toLowerCase().replace(/[^a-z0-9]/g, '')

      // Name must match reasonably
      const nameMatches = (
        qName.includes(normalizedSearch.slice(0, Math.min(8, normalizedSearch.length))) ||
        normalizedSearch.includes(qName.slice(0, Math.min(8, qName.length))) ||
        qName.split(/[^a-z0-9]+/)[0] === normalizedSearch.split(/[^a-z0-9]+/)[0]
      )

      if (!nameMatches) continue

      // Sector check — accept healthcare/biotech/pharma OR no sector info
      const sector = (q.sector || '').toLowerCase()
      const industry = (q.industry || '').toLowerCase()
      const isBiotech = (
        !q.sector || // no sector info = accept if name matches
        sector.includes('health') ||
        industry.includes('biotech') ||
        industry.includes('pharma') ||
        industry.includes('medical') ||
        industry.includes('drug') ||
        industry.includes('genetic') ||
        industry.includes('diagnostic') ||
        industry.includes('life science')
      )

      if (isBiotech) {
        return { status: 'match', quote: q }
      }
    }

    return { status: 'no_match' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('abort') && retries < MAX_RETRIES) {
      await sleep(3000)
      return searchYahooFinance(companyName, retries + 1)
    }
    return { status: 'error', reason: msg }
  }
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║   BiotechTube — Public Company Identification    ║')
  console.log('╚══════════════════════════════════════════════════╝\n')

  const startTime = Date.now()

  // Count companies where company_type is null
  const { count: totalCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .is('company_type', null)

  const { count: doneCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .not('company_type', 'is', null)

  console.log(`  Companies to check: ${totalCount}`)
  console.log(`  Already classified: ${doneCount}`)
  console.log(`  Starting Yahoo Finance lookups...\n`)

  if (totalCount === 0) {
    console.log('  Nothing to do!')
    return
  }

  // Log this run
  const { data: logEntry } = await supabase
    .from('scrape_log')
    .insert({
      source: 'yahoo-finance-lookup',
      url: 'yahoo-finance',
      status: 'running',
      company_count: 0,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  let processed = 0
  let publicFound = 0
  let privateSet = 0
  let skipped = 0 // API errors — not classified, will retry next run
  let consecutiveErrors = 0
  let hasMore = true

  while (hasMore) {
    // If we hit too many consecutive errors, Yahoo is probably blocking us
    if (consecutiveErrors >= 20) {
      console.log(`\n  ⚠️ 20 consecutive API errors — Yahoo likely rate-limiting. Stopping.`)
      console.log(`  Run again later to continue from where we left off.\n`)
      break
    }

    // Fetch next batch of unclassified companies
    const { data: batch, error: fetchError } = await supabase
      .from('companies')
      .select('id, name, domain')
      .is('company_type', null)
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

    // Process with concurrency
    for (let i = 0; i < batch.length; i += CONCURRENT) {
      const chunk = batch.slice(i, i + CONCURRENT)
      const results = await Promise.all(
        chunk.map(c => searchYahooFinance(c.name))
      )

      for (let j = 0; j < chunk.length; j++) {
        const company = chunk[j]
        const result = results[j]
        processed++

        if (result.status === 'match') {
          consecutiveErrors = 0
          // Found a public company match!
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const update: Record<string, any> = {
            company_type: 'Public',
            ticker: result.quote.symbol,
          }

          const { error: updateError } = await supabase
            .from('companies')
            .update(update)
            .eq('id', company.id)

          if (updateError) {
            console.error(`    DB error for "${company.name}": ${updateError.message}`)
          } else {
            publicFound++
            console.log(`  🏛️  ${company.name} → ${result.quote.symbol} (${result.quote.exchDisp || '?'}) [${result.quote.industry || '?'}]`)
          }
        } else if (result.status === 'no_match') {
          consecutiveErrors = 0
          // Genuinely no match on Yahoo — mark as Private
          const { error: updateError } = await supabase
            .from('companies')
            .update({ company_type: 'Private' })
            .eq('id', company.id)

          if (!updateError) privateSet++
        } else {
          // API error — do NOT mark as Private, skip and retry next run
          consecutiveErrors++
          skipped++
        }

        // Progress log every 200
        if (processed % 200 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
          console.log(`  [${elapsed}m] ${processed}/${totalCount} | 🏛️ ${publicFound} public | 🔒 ${privateSet} private | ⏭️ ${skipped} skipped`)
        }
      }

      await sleep(DELAY_MS)
    }

    // Update log
    if (logEntry) {
      await supabase
        .from('scrape_log')
        .update({ company_count: publicFound })
        .eq('id', logEntry.id)
    }
  }

  // Final log
  if (logEntry) {
    await supabase
      .from('scrape_log')
      .update({
        status: consecutiveErrors >= 20 ? 'paused' : 'done',
        company_count: publicFound,
        completed_at: new Date().toISOString(),
      })
      .eq('id', logEntry.id)
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)

  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log(`║   Public Company Identification ${consecutiveErrors >= 20 ? 'Paused' : 'Complete'}!`)
  console.log(`║   Processed: ${processed}`)
  console.log(`║   Public:    ${publicFound}`)
  console.log(`║   Private:   ${privateSet}`)
  console.log(`║   Skipped:   ${skipped} (API errors, will retry next run)`)
  console.log(`║   Time:      ${elapsed} minutes`)
  console.log('╚══════════════════════════════════════════════════╝')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
