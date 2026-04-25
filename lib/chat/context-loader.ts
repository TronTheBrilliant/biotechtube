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

// ── Company ──
async function loadCompanyContext(slug: string): Promise<string | null> {
  const supabase = createServerClient()
  const { data: company } = await (supabase.from as any)('companies')
    .select('id, slug, name, ticker, country, city, founded, stage, type, focus, employees, total_raised, valuation, description, website')
    .eq('slug', slug)
    .single()

  if (!company) return null

  const sections: string[] = []

  sections.push(formatKeyFacts({
    Name: company.name,
    Ticker: company.ticker,
    Country: company.country,
    City: company.city,
    Founded: company.founded,
    Stage: company.stage,
    Type: company.type,
    Focus: Array.isArray(company.focus) ? company.focus.join(', ') : company.focus,
    Employees: company.employees,
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

  // Recent news mentioning this company
  sections.push(await loadRecentNewsForCompany(company.id, company.name, slug))

  return sections.filter(Boolean).join('\n\n')
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
