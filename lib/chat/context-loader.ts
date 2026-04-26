import { createServerClient } from '@/lib/supabase'
import type { ChatContext } from './types'

const NEWS_LOOKBACK_DAYS = 30
const NEWS_MAX_ARTICLES = 30
const NEWS_SUMMARY_CHARS = 1000
const COMPANY_DESCRIPTION_CHARS = 2000
const PIPELINE_MAX_ROWS = 50
const SECTOR_TOP_COMPANIES = 20

/**
 * Loads context for the given entity and returns a markdown-formatted string
 * suitable for injection into the system prompt.
 *
 * Returns null if the entity slug doesn't resolve. Caller should respond
 * 404 to the client in that case.
 */
export async function loadContextPayload(context: ChatContext): Promise<string | null> {
  switch (context.type) {
    case 'company': return loadCompanyContext(context.slug)
    case 'drug':    return loadDrugContext(context.slug)
    case 'sector':  return loadSectorContext(context.slug)
  }
}

/**
 * Loads platform-wide baseline data for the standalone /agents/research page.
 * Without this, the chatbot has no live data and can only refuse questions like
 * "what are the most-funded sectors?". This snapshots the most useful slices
 * of BiotechTube data into a markdown payload (~5-10K tokens).
 *
 * Cached at the route level via Next.js revalidate; this fetcher is safe to
 * call on every request but each query is small.
 */
export async function loadGeneralPlatformContext(): Promise<string> {
  const supabase = createServerClient()
  const sections: string[] = []

  // ── Sitewide stats (latest market_snapshot) ──
  const { data: snap } = await supabase
    .from('market_snapshots')
    .select('snapshot_date, total_market_cap, public_companies_count')
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()
  if (snap) {
    sections.push(
      `### BiotechTube platform stats (as of ${snap.snapshot_date})\n\n` +
      `- Public biotech market cap: $${(Number(snap.total_market_cap) / 1e12).toFixed(2)}T\n` +
      `- Public companies tracked: ${snap.public_companies_count?.toLocaleString() ?? 'n/a'}\n` +
      `- Total companies (public + private): 14,000+\n` +
      `- Drug pipeline programs: 54,000+\n` +
      `- Therapeutic areas: 20+`
    )
  }

  // ── Top 15 companies by latest market_cap_usd ──
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  const cutoffStr = cutoff.toISOString().split('T')[0]
  const { data: topCos } = await (supabase.from as any)('company_price_history')
    .select('company_id, market_cap_usd, date, companies(name, slug, ticker, country)')
    .gte('date', cutoffStr)
    .not('market_cap_usd', 'is', null)
    .order('market_cap_usd', { ascending: false })
    .limit(80)
  if (topCos?.length) {
    const seen = new Set<string>()
    const lines: string[] = []
    for (const r of topCos) {
      const c = r.companies
      if (!c?.slug || seen.has(c.slug)) continue
      seen.add(c.slug)
      lines.push(
        `- ${c.name} (${c.ticker || '—'}, ${c.country || '—'}): $${(Number(r.market_cap_usd) / 1e9).toFixed(1)}B — /company/${c.slug}`
      )
      if (lines.length >= 15) break
    }
    sections.push(`### Top 15 biotech companies by market cap\n\n${lines.join('\n')}`)
  }

  // ── Top sectors by combined market cap ──
  const { data: sectorMarket } = await (supabase.from as any)('sector_market_data')
    .select('sector_id, combined_market_cap, change_1d_pct, change_7d_pct, snapshot_date')
    .order('snapshot_date', { ascending: false })
    .limit(40)
  if (sectorMarket?.length) {
    const latestDate = sectorMarket[0].snapshot_date
    const latest = sectorMarket.filter((s: any) => s.snapshot_date === latestDate)
    const sectorIds = latest.map((s: any) => s.sector_id)
    const { data: sectorMeta } = await (supabase.from as any)('sectors')
      .select('id, slug, name')
      .in('id', sectorIds)
    const metaMap = new Map(sectorMeta?.map((s: any) => [s.id, s]) ?? [])
    const sorted = latest
      .map((s: any) => ({ ...s, meta: metaMap.get(s.sector_id) }))
      .filter((s: any) => s.meta)
      .sort((a: any, b: any) => (b.combined_market_cap || 0) - (a.combined_market_cap || 0))
      .slice(0, 12)
    const lines = sorted.map((s: any) =>
      `- ${(s.meta as any).name}: $${(Number(s.combined_market_cap) / 1e9).toFixed(0)}B (${s.change_1d_pct >= 0 ? '+' : ''}${(s.change_1d_pct || 0).toFixed(2)}% today, ${s.change_7d_pct >= 0 ? '+' : ''}${(s.change_7d_pct || 0).toFixed(2)}% 7d) — /sectors/${(s.meta as any).slug}`
    )
    sections.push(`### Top biotech sectors by market cap (as of ${latestDate})\n\n${lines.join('\n')}`)
  }

  // ── Recent funding (last 90 days, biggest by amount) ──
  const fundingCutoff = new Date()
  fundingCutoff.setDate(fundingCutoff.getDate() - 90)
  const { data: funding } = await (supabase.from as any)('funding_rounds')
    .select('company_id, round_type, amount_usd, announced_date, lead_investor, sector, companies(name, slug)')
    .gte('announced_date', fundingCutoff.toISOString().split('T')[0])
    .not('amount_usd', 'is', null)
    .order('amount_usd', { ascending: false })
    .limit(20)
  if (funding?.length) {
    const lines = funding.map((f: any) => {
      const co = f.companies?.name || 'Unknown'
      const slug = f.companies?.slug ? ` (/company/${f.companies.slug})` : ''
      const amt = f.amount_usd ? `$${(Number(f.amount_usd) / 1e6).toFixed(0)}M` : '—'
      const lead = f.lead_investor ? `, led by ${f.lead_investor}` : ''
      const sec = f.sector ? `, ${f.sector}` : ''
      return `- ${f.announced_date}: ${co}${slug} raised ${amt} (${f.round_type || 'Round'}${lead}${sec})`
    })
    sections.push(`### Top 20 biotech funding rounds in last 90 days\n\n${lines.join('\n')}`)
  }

  // ── Funding aggregate by sector (last 90 days) ──
  if (funding?.length) {
    const bySector = new Map<string, number>()
    for (const f of funding) {
      const k = f.sector || 'Uncategorized'
      bySector.set(k, (bySector.get(k) || 0) + (Number(f.amount_usd) || 0))
    }
    const ranked = Array.from(bySector.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([sec, total]) => `- ${sec}: $${(total / 1e6).toFixed(0)}M total (top 20 deals only)`)
    sections.push(`### Most-funded sectors in last 90 days (top-20-deal subset)\n\n${ranked.join('\n')}`)
  }

  // ── Recent news headlines ──
  const newsCutoff = new Date()
  newsCutoff.setDate(newsCutoff.getDate() - 14)
  const { data: news } = await (supabase.from as any)('articles')
    .select('slug, headline, type, published_at, sector')
    .eq('status', 'published')
    .gte('published_at', newsCutoff.toISOString())
    .order('published_at', { ascending: false })
    .limit(15)
  if (news?.length) {
    const lines = news.map((n: any) =>
      `- ${n.published_at?.slice(0, 10)} [${n.type}]: ${n.headline} — /news/${n.slug}`
    )
    sections.push(`### Recent biotech news (last 14 days)\n\n${lines.join('\n')}`)
  }

  // ── Quick-link reference ──
  sections.push(
    `### Useful BiotechTube pages\n\n` +
    `- /top-companies — full ranking by market cap\n` +
    `- /pipelines — 54K+ drug programs with phase/indication\n` +
    `- /funding — funding intelligence dashboard\n` +
    `- /sectors — sector market data\n` +
    `- /countries — biotech market by country\n` +
    `- /charts — 20+ market indicators\n` +
    `- /news — AI-generated daily intelligence\n` +
    `- /events — biotech conference calendar`
  )

  return sections.join('\n\n')
}

// ── Company ──
async function loadCompanyContext(slug: string): Promise<string | null> {
  const supabase = createServerClient()
  // NOTE: column names match the actual `companies` schema:
  // - `company_type` (not `type`)
  // - `categories` array (not `focus`)
  // - no `employees` column — dropped
  const { data: company, error } = await (supabase.from as any)('companies')
    .select('id, slug, name, ticker, country, city, founded, stage, company_type, categories, total_raised, valuation, description, website')
    .eq('slug', slug)
    .single()

  if (error || !company) {
    if (error) console.error(`loadCompanyContext error for slug=${slug}:`, error.message)
    return null
  }

  const sections: string[] = []

  sections.push(formatKeyFacts({
    Name: company.name,
    Ticker: company.ticker,
    Country: company.country,
    City: company.city,
    Founded: company.founded,
    Stage: company.stage,
    Type: company.company_type,
    Categories: Array.isArray(company.categories) ? company.categories.join(', ') : company.categories,
    'Total raised (USD)': company.total_raised,
    'Valuation (USD)': company.valuation,
    Website: company.website,
    'BiotechTube page': `https://biotechtube.io/company/${slug}`,
  }))

  if (company.description) {
    sections.push(`### Description\n\n${truncate(company.description, COMPANY_DESCRIPTION_CHARS)}`)
  }

  // Pipeline programs
  const { data: report } = await (supabase.from as any)('company_reports')
    .select('pipeline_programs, summary, therapeutic_areas')
    .eq('report_slug', slug)
    .single()

  if (report?.pipeline_programs?.length) {
    const programs = report.pipeline_programs.slice(0, PIPELINE_MAX_ROWS)
    const lines = programs.map((p: any) =>
      `- ${p.name ?? 'Unnamed'} — ${p.indication ?? 'unknown indication'} (${p.phase ?? 'unknown phase'}${p.status ? `, ${p.status}` : ''})`
    )
    sections.push(`### Pipeline (${programs.length} programs${report.pipeline_programs.length > PIPELINE_MAX_ROWS ? `, top ${PIPELINE_MAX_ROWS} shown` : ''})\n\n${lines.join('\n')}`)
  }

  if (report?.therapeutic_areas?.length) {
    sections.push(`### Therapeutic areas\n\n${report.therapeutic_areas.join(', ')}`)
  }

  if (report?.summary) {
    sections.push(`### Analyst summary\n\n${truncate(report.summary, COMPANY_DESCRIPTION_CHARS)}`)
  }

  // Competitors — primary-sector match with similar market cap (top 5)
  // + sector-mates as a wider "similar companies" pool (top 5)
  // Mirrors the page-side `getEnhancedCompetitors` + `getSimilarCompanies`.
  const competitorsSection = await loadCompetitors(company.id, company.name, slug, company.categories)
  if (competitorsSection) sections.push(competitorsSection)

  // Recent news mentioning this company
  sections.push(await loadRecentNewsForCompany(company.id, company.name, slug))

  return sections.filter(Boolean).join('\n\n')
}

// Competitor lookup used by company context.
async function loadCompetitors(
  companyId: string,
  companyName: string,
  companySlug: string,
  categories: string[] | null,
): Promise<string | null> {
  const supabase = createServerClient()
  const lines: string[] = []

  // 1. Sector-based competitors (primary sector match, ranked by valuation)
  if (Array.isArray(categories) && categories.length > 0) {
    const primarySector = categories[0]
    const { data: sameSector } = await (supabase.from as any)('companies')
      .select('slug, name, ticker, country, valuation, categories, stage')
      .contains('categories', [primarySector])
      .neq('slug', companySlug)
      .not('valuation', 'is', null)
      .order('valuation', { ascending: false })
      .limit(8)
    if (sameSector?.length) {
      const cs = sameSector.slice(0, 6).map((c: any) =>
        `- ${c.name}${c.ticker ? ` (${c.ticker})` : ''}${c.country ? `, ${c.country}` : ''}${c.stage ? ` — ${c.stage}` : ''}${c.valuation ? `, $${(Number(c.valuation) / 1e9).toFixed(2)}B` : ''} — /company/${c.slug}`
      ).join('\n')
      lines.push(`### Same-sector competitors (${primarySector})\n\n${cs}`)
    }
  }

  // 2. Companies in the same country with similar valuation as a fallback pool
  const { data: company } = await (supabase.from as any)('companies')
    .select('country, valuation')
    .eq('id', companyId)
    .single()
  if (company?.country) {
    const { data: countryPeers } = await (supabase.from as any)('companies')
      .select('slug, name, ticker, valuation, stage, categories')
      .eq('country', company.country)
      .neq('slug', companySlug)
      .not('valuation', 'is', null)
      .order('valuation', { ascending: false })
      .limit(5)
    if (countryPeers?.length) {
      const cp = countryPeers.slice(0, 5).map((c: any) =>
        `- ${c.name}${c.ticker ? ` (${c.ticker})` : ''}${c.stage ? ` — ${c.stage}` : ''}${c.valuation ? `, $${(Number(c.valuation) / 1e9).toFixed(2)}B` : ''} — /company/${c.slug}`
      ).join('\n')
      lines.push(`### ${company.country} biotech peers\n\n${cp}`)
    }
  }

  if (!lines.length) return null
  return lines.join('\n\n') + `\n\nNote: competitors are inferred from sector + country overlap, not from explicit competitive analysis. ${companyName} may compete with companies outside this list (different sectors, private companies not in BiotechTube, or international peers).`
}

// ── Drug ──
async function loadDrugContext(slug: string): Promise<string | null> {
  // Drug pages aggregate pipeline_programs across companies whose slug matches.
  // We use the same `getAllDrugs` logic but inline a lighter fetch to avoid
  // pulling all 14k companies. Filter pipeline_programs by name slug.
  const supabase = createServerClient()

  // Pull a manageable slice of company_reports and filter in JS — matches
  // the pattern in lib/seo-utils.ts. Pipeline programs are nested JSON,
  // so we can't filter them in SQL.
  const allReports: any[] = []
  let offset = 0
  while (offset < 5000) {
    const { data } = await (supabase.from as any)('company_reports')
      .select('report_slug, pipeline_programs, summary, therapeutic_areas')
      .not('pipeline_programs', 'is', null)
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    allReports.push(...data)
    if (data.length < 1000) break
    offset += 1000
  }

  // Match drugs by slugified name (matches drugSlug() in lib/seo-utils.ts).
  // We re-implement slug logic locally to avoid coupling.
  const matchSlug = (name: string): string =>
    String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const matches: Array<{ companySlug: string; companyName: string; program: any }> = []
  for (const r of allReports) {
    if (!Array.isArray(r.pipeline_programs)) continue
    for (const p of r.pipeline_programs) {
      if (p?.name && matchSlug(p.name) === slug) {
        matches.push({ companySlug: r.report_slug, companyName: r.report_slug, program: p })
      }
    }
  }

  if (matches.length === 0) return null

  // Resolve company names
  const slugs = Array.from(new Set(matches.map((m) => m.companySlug)))
  const { data: companies } = await (supabase.from as any)('companies')
    .select('slug, name')
    .in('slug', slugs)
  const nameBySlug = new Map<string, string>()
  for (const c of companies ?? []) nameBySlug.set(c.slug, c.name)
  for (const m of matches) m.companyName = nameBySlug.get(m.companySlug) ?? m.companySlug

  const primary = matches[0].program
  const sections: string[] = []

  sections.push(formatKeyFacts({
    Drug: primary.name,
    Indication: primary.indication,
    Phase: primary.phase,
    Status: primary.status,
    'Trial ID': primary.trial_id,
    Sponsors: matches.map((m) => m.companyName).join(', '),
    'BiotechTube page': `https://biotechtube.io/drugs/${slug}`,
  }))

  // All sponsor variants (a drug can be co-developed)
  if (matches.length > 1) {
    const lines = matches.map((m) =>
      `- ${m.companyName} (https://biotechtube.io/company/${m.companySlug}) — ${m.program.phase ?? 'unknown phase'}${m.program.status ? `, ${m.program.status}` : ''}`
    )
    sections.push(`### Sponsors\n\n${lines.join('\n')}`)
  }

  // Competing drugs in same indication (top 20)
  const competing: Array<{ name: string; phase: string; companySlug: string }> = []
  for (const r of allReports) {
    if (!Array.isArray(r.pipeline_programs)) continue
    for (const p of r.pipeline_programs) {
      if (
        p?.indication === primary.indication &&
        matchSlug(p.name ?? '') !== slug &&
        competing.length < 20
      ) {
        competing.push({ name: p.name, phase: p.phase ?? 'unknown', companySlug: r.report_slug })
      }
    }
    if (competing.length >= 20) break
  }
  if (competing.length > 0) {
    const lines = competing.map((c) => `- ${c.name} — ${c.phase} (sponsor: ${c.companySlug})`)
    sections.push(`### Competing drugs in ${primary.indication}\n\n${lines.join('\n')}`)
  }

  return sections.filter(Boolean).join('\n\n')
}

// ── Sector ──
async function loadSectorContext(slug: string): Promise<string | null> {
  const supabase = createServerClient()
  const { data: sector } = await (supabase.from as any)('sectors')
    .select('id, slug, name, short_name, description, company_count, public_company_count')
    .eq('slug', slug)
    .single()

  if (!sector) return null

  const sections: string[] = []

  sections.push(formatKeyFacts({
    Sector: sector.name,
    'Short name': sector.short_name,
    'Total companies': sector.company_count,
    'Public companies': sector.public_company_count,
    'BiotechTube page': `https://biotechtube.io/sectors/${slug}`,
  }))

  if (sector.description) {
    sections.push(`### Description\n\n${truncate(sector.description, COMPANY_DESCRIPTION_CHARS)}`)
  }

  // Top N companies in sector by valuation
  const { data: csRows } = await (supabase.from as any)('company_sectors')
    .select('company_id')
    .eq('sector_id', sector.id)
    .limit(500)

  const companyIds = (csRows ?? []).map((r: { company_id: string }) => r.company_id)
  if (companyIds.length > 0) {
    const { data: companies } = await (supabase.from as any)('companies')
      .select('slug, name, country, ticker, valuation')
      .in('id', companyIds)
      .order('valuation', { ascending: false, nullsFirst: false })
      .limit(SECTOR_TOP_COMPANIES)

    if (companies?.length) {
      const lines = (companies as any[]).map((c) =>
        `- ${c.name}${c.ticker ? ` (${c.ticker})` : ''} — ${c.country ?? 'unknown'} — https://biotechtube.io/company/${c.slug}`
      )
      sections.push(`### Top ${companies.length} companies in this sector\n\n${lines.join('\n')}`)
    }
  }

  // Recent news matching this sector
  sections.push(await loadRecentNewsForSector(sector.name))

  return sections.filter(Boolean).join('\n\n')
}

// ── News loaders ──

async function loadRecentNewsForCompany(companyId: string, companyName: string, companySlug: string): Promise<string> {
  const supabase = createServerClient()
  const since = new Date(Date.now() - NEWS_LOOKBACK_DAYS * 86400 * 1000).toISOString()

  // Try by company_id first (the structured link), fall back to name match.
  const { data: byId } = await (supabase.from as any)('articles')
    .select('slug, headline, summary, published_at, type')
    .contains('company_ids', [companyId])
    .gte('published_at', since)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(NEWS_MAX_ARTICLES)

  let articles = byId ?? []

  if (articles.length < 5) {
    // Supplement with name match
    const { data: byName } = await (supabase.from as any)('articles')
      .select('slug, headline, summary, published_at, type')
      .ilike('headline', `%${companyName}%`)
      .gte('published_at', since)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(NEWS_MAX_ARTICLES - articles.length)
    const seen = new Set(articles.map((a: any) => a.slug))
    for (const a of byName ?? []) {
      if (!seen.has(a.slug)) {
        articles.push(a)
        seen.add(a.slug)
      }
    }
  }

  if (articles.length === 0) {
    return `### Recent news (last ${NEWS_LOOKBACK_DAYS} days)\n\nNo BiotechTube articles in this window.`
  }

  const lines = articles.map((a: any) =>
    `- **${a.headline}** (${a.type}, ${a.published_at?.slice(0, 10)})\n  ${truncate(a.summary ?? '', NEWS_SUMMARY_CHARS)}\n  https://biotechtube.io/news/${a.slug}`
  )
  return `### Recent news (last ${NEWS_LOOKBACK_DAYS} days, ${articles.length} articles)\n\n${lines.join('\n\n')}`
}

async function loadRecentNewsForSector(sectorName: string): Promise<string> {
  const supabase = createServerClient()
  const since = new Date(Date.now() - NEWS_LOOKBACK_DAYS * 86400 * 1000).toISOString()

  const { data: articles } = await (supabase.from as any)('articles')
    .select('slug, headline, summary, published_at, type')
    .eq('sector', sectorName)
    .gte('published_at', since)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(NEWS_MAX_ARTICLES)

  if (!articles?.length) {
    return `### Recent news (last ${NEWS_LOOKBACK_DAYS} days)\n\nNo BiotechTube articles in this window.`
  }

  const lines = (articles as any[]).map((a) =>
    `- **${a.headline}** (${a.type}, ${a.published_at?.slice(0, 10)})\n  ${truncate(a.summary ?? '', NEWS_SUMMARY_CHARS)}\n  https://biotechtube.io/news/${a.slug}`
  )
  return `### Recent news (last ${NEWS_LOOKBACK_DAYS} days, ${articles.length} articles)\n\n${lines.join('\n\n')}`
}

// ── Helpers ──

function formatKeyFacts(facts: Record<string, unknown>): string {
  const lines: string[] = ['### Key facts', '']
  for (const [k, v] of Object.entries(facts)) {
    if (v == null || v === '') continue
    lines.push(`- **${k}:** ${v}`)
  }
  return lines.join('\n')
}

function truncate(s: string, max: number): string {
  if (!s) return ''
  if (s.length <= max) return s
  return s.slice(0, max - 1).trimEnd() + '…'
}
