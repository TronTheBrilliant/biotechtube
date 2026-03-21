import { createClient } from '@supabase/supabase-js'
import { COUNTRY_PAGES, CATEGORY_PAGES } from './scrape-config'
import { parseBPGPage, parseBPGCategoryPage, slugify } from './parse-bpg'

// --- Config ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const LOGO_TOKEN = 'pk_FNHUWoZORpiR_7j_vzFnmQ'
const BATCH_SIZE = 100
const DELAY_MS = 2000 // be polite to BPG servers

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing environment variables.')
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  console.error('   Either in .env.local or export them in your shell.')
  process.exit(1)
}

// Using untyped client for scraper script (standalone, doesn't need strict types)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function generateLogoUrl(domain: string): string {
  return `https://img.logo.dev/${domain}?token=${LOGO_TOKEN}`
}

// ============================================================
// Phase 1: Scrape country pages for company names + locations
// ============================================================
async function scrapeCountryPages() {
  console.log('\n🌍 Phase 1: Scraping country pages\n')

  const allCompanies: {
    name: string; city: string; country: string
    website: string; domain: string; sourceUrl: string
  }[] = []

  const globalSeen = new Set<string>() // dedupe by domain across all pages

  for (const page of COUNTRY_PAGES) {
    console.log(`  📄 ${page.country} — ${page.url}`)

    // Log scrape start
    const { data: logEntry } = await supabase
      .from('scrape_log')
      .insert({
        source: 'biopharmguy',
        url: page.url,
        status: 'running',
        company_count: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    try {
      const response = await fetch(page.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const html = await response.text()
      const parsed = parseBPGPage(html)

      let newCount = 0
      for (const company of parsed) {
        if (globalSeen.has(company.domain)) continue
        globalSeen.add(company.domain)
        newCount++

        allCompanies.push({
          name: company.name,
          city: company.city,
          country: page.country,
          website: company.website,
          domain: company.domain,
          sourceUrl: page.url,
        })
      }

      console.log(`     → ${parsed.length} found, ${newCount} new (${globalSeen.size} total unique)`)

      // Update log
      if (logEntry) {
        await supabase
          .from('scrape_log')
          .update({
            status: 'done',
            company_count: newCount,
            completed_at: new Date().toISOString(),
          })
          .eq('id', logEntry.id)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`     ✗ Failed: ${msg}`)

      if (logEntry) {
        await supabase
          .from('scrape_log')
          .update({
            status: 'failed',
            error_message: msg,
            completed_at: new Date().toISOString(),
          })
          .eq('id', logEntry.id)
      }
    }

    await sleep(DELAY_MS)
  }

  console.log(`\n  ✅ Total unique companies found: ${allCompanies.length}\n`)
  return allCompanies
}

// ============================================================
// Phase 2: Insert companies into Supabase
// ============================================================
async function insertCompanies(companies: {
  name: string; city: string; country: string
  website: string; domain: string; sourceUrl: string
}[]) {
  console.log('💾 Phase 2: Inserting into Supabase\n')

  // Handle duplicate slugs by appending city
  const slugCounts = new Map<string, number>()

  const rows = companies.map(c => {
    let slug = slugify(c.name)
    const count = slugCounts.get(slug) || 0
    if (count > 0) {
      // Append city or country to make slug unique
      const suffix = slugify(c.city || c.country)
      slug = suffix ? `${slug}-${suffix}` : `${slug}-${count + 1}`
    }
    slugCounts.set(slugify(c.name), count + 1)

    return {
      slug,
      name: c.name,
      country: c.country,
      city: c.city || null,
      website: c.website,
      domain: c.domain,
      categories: [] as string[],
      logo_url: generateLogoUrl(c.domain),
      source: 'biopharmguy' as const,
      source_url: c.sourceUrl,
      is_estimated: false,
    }
  })

  // Batch upsert
  let inserted = 0
  let errors = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('companies')
      .upsert(batch, { onConflict: 'slug' })

    if (error) {
      console.error(`  ✗ Batch ${i + 1}-${i + batch.length} failed: ${error.message}`)
      errors++
      // Try inserting one by one to find the problematic row
      for (const row of batch) {
        const { error: singleError } = await supabase
          .from('companies')
          .upsert(row, { onConflict: 'slug' })
        if (singleError) {
          console.error(`    ✗ "${row.name}" (${row.slug}): ${singleError.message}`)
        } else {
          inserted++
        }
      }
    } else {
      inserted += batch.length
      if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= rows.length) {
        console.log(`  ✓ Progress: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`)
      }
    }
  }

  console.log(`\n  ✅ Inserted ${inserted} companies (${errors} batch errors)\n`)
}

// ============================================================
// Phase 3: Scrape category pages & tag companies
// ============================================================
async function scrapeCategories() {
  console.log('🏷️  Phase 3: Tagging companies with categories\n')

  for (const page of CATEGORY_PAGES) {
    console.log(`  📂 ${page.category}`)

    try {
      const response = await fetch(page.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const html = await response.text()
      const parsed = parseBPGCategoryPage(html)

      // Match companies by domain and add category
      let matched = 0
      const domains = parsed.map(c => c.domain)

      // Process in chunks of 100 domains (Supabase IN limit)
      for (let i = 0; i < domains.length; i += BATCH_SIZE) {
        const domainBatch = domains.slice(i, i + BATCH_SIZE)

        const { data: existing } = await supabase
          .from('companies')
          .select('id, domain, categories')
          .in('domain', domainBatch)

        if (existing) {
          for (const company of existing) {
            const cats = company.categories || []
            if (!cats.includes(page.category)) {
              cats.push(page.category)
              await supabase
                .from('companies')
                .update({ categories: cats })
                .eq('id', company.id)
              matched++
            }
          }
        }
      }

      console.log(`     → ${parsed.length} in category, ${matched} matched & tagged`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`     ✗ Failed: ${msg}`)
    }

    await sleep(DELAY_MS)
  }

  console.log('')
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║   BiotechTube — BioPharmGuy Scraper      ║')
  console.log('╚══════════════════════════════════════════╝')

  const startTime = Date.now()

  // Phase 1: Scrape country pages
  const companies = await scrapeCountryPages()

  if (companies.length === 0) {
    console.error('❌ No companies found. BPG page structure may have changed.')
    console.error('   Check the HTML output manually.')
    process.exit(1)
  }

  // Phase 2: Insert into database
  await insertCompanies(companies)

  // Phase 3: Tag with categories
  await scrapeCategories()

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)

  const { count } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })

  console.log('╔══════════════════════════════════════════╗')
  console.log(`║   Done! ${count} companies in database`)
  console.log(`║   Elapsed: ${elapsed} minutes`)
  console.log('╚══════════════════════════════════════════╝')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
