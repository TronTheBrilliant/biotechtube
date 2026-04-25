import { createServerClient } from '@/lib/supabase'
import type { ExternalUpdate } from './types'

const LOOKBACK_HOURS = 24

export async function gatherRecentUpdates(): Promise<ExternalUpdate[]> {
  const supabase = createServerClient()
  const since = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000).toISOString()

  const updates: ExternalUpdate[] = []

  const { data: rss } = await (supabase.from as any)('rss_items')
    .select('id, title, url, source_name, summary, published_at, category, company_names')
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(200)

  for (const r of (rss as any[]) || []) {
    const firstName = Array.isArray(r.company_names) && r.company_names.length > 0 ? r.company_names[0] : null
    updates.push({
      source_type: 'rss',
      source_id: r.id,
      ticker: null,
      company_name: firstName,
      headline: r.title || '',
      body_snippet: (r.summary || '').slice(0, 1500),
      published_at: r.published_at || null,
      url: r.url || null,
    })
  }

  const { data: fda } = await supabase
    .from('fda_approvals')
    .select('id, drug_name, company_name, indication, approval_date, application_number, source_name')
    .gte('approval_date', since.slice(0, 10))
    .limit(50)

  for (const f of fda || []) {
    updates.push({
      source_type: 'fda',
      source_id: f.id,
      ticker: null,
      company_name: f.company_name || null,
      headline: `FDA approval: ${f.drug_name}${f.indication ? ' for ' + f.indication : ''}`,
      body_snippet: `Application ${f.application_number || 'n/a'} approved on ${f.approval_date}.`,
      published_at: f.approval_date || null,
      url: null,
    })
  }

  const { data: rounds } = await supabase
    .from('funding_rounds')
    .select('id, company_name, amount_usd, round_type, announced_date, sector, lead_investor')
    .gte('announced_date', since.slice(0, 10))
    .limit(100)

  for (const r of rounds || []) {
    updates.push({
      source_type: 'funding_round',
      source_id: r.id,
      ticker: null,
      company_name: r.company_name || null,
      headline: `${r.company_name} raises ${r.amount_usd ? '$' + r.amount_usd.toLocaleString() : 'funding'} ${r.round_type || ''}`.trim(),
      body_snippet: `Lead investor: ${r.lead_investor || 'n/a'}. Sector: ${r.sector || 'n/a'}.`,
      published_at: r.announced_date || null,
      url: null,
    })
  }

  return updates
}
