import { createServerClient } from '@/lib/supabase'

export interface PredictorInput {
  recent_rounds: Array<{
    company_id: string | null
    company_name: string
    amount_usd: number | null
    round_type: string | null
    lead_investor: string | null
    sector: string | null
    announced_date: string | null
  }>
  investor_cadence: Array<{ investor: string; deals_last_12mo: number; avg_round_usd: number }>
  sector_trends: Array<{ sector: string; rounds_last_quarter: number; total_usd_last_quarter: number }>
  candidate_companies: Array<{
    id: string
    name: string
    slug: string
    ticker: string | null
    stage: string | null
    categories: string[] | null
    last_round_date: string | null
    last_round_amount: number | null
    months_since_last_round: number | null
  }>
}

export async function gatherPredictorInputs(): Promise<PredictorInput> {
  const supabase = createServerClient()
  const since = new Date()
  since.setUTCMonth(since.getUTCMonth() - 12)
  const sinceISO = since.toISOString().slice(0, 10)

  const { data: rounds } = await supabase
    .from('funding_rounds')
    .select('company_id, company_name, amount_usd, round_type, lead_investor, sector, announced_date')
    .gte('announced_date', sinceISO)
    .order('announced_date', { ascending: false })
    .limit(2000)

  const cadence = new Map<string, { count: number; sum: number }>()
  for (const r of rounds || []) {
    if (!r.lead_investor) continue
    const c = cadence.get(r.lead_investor) || { count: 0, sum: 0 }
    c.count += 1
    c.sum += r.amount_usd || 0
    cadence.set(r.lead_investor, c)
  }
  const investor_cadence = Array.from(cadence.entries())
    .map(([investor, c]) => ({ investor, deals_last_12mo: c.count, avg_round_usd: Math.round(c.sum / c.count) }))
    .sort((a, b) => b.deals_last_12mo - a.deals_last_12mo)
    .slice(0, 25)

  const qStart = new Date()
  qStart.setUTCMonth(qStart.getUTCMonth() - 3)
  const qStartISO = qStart.toISOString().slice(0, 10)
  const { data: qRounds } = await supabase
    .from('funding_rounds')
    .select('sector, amount_usd')
    .gte('announced_date', qStartISO)
    .limit(1000)

  const sectorAgg = new Map<string, { n: number; sum: number }>()
  for (const r of qRounds || []) {
    const s = r.sector || 'Other'
    const a = sectorAgg.get(s) || { n: 0, sum: 0 }
    a.n += 1
    a.sum += r.amount_usd || 0
    sectorAgg.set(s, a)
  }
  const sector_trends = Array.from(sectorAgg.entries())
    .map(([sector, a]) => ({ sector, rounds_last_quarter: a.n, total_usd_last_quarter: a.sum }))
    .sort((a, b) => b.total_usd_last_quarter - a.total_usd_last_quarter)
    .slice(0, 15)

  const { data: companyRows } = await supabase
    .from('companies')
    .select('id, name, slug, ticker, stage, categories')
    .order('valuation', { ascending: false })
    .limit(500)

  const candidateIds = (companyRows || []).map((c) => c.id)
  const { data: lastRoundRows } = await supabase
    .from('funding_rounds')
    .select('company_id, amount_usd, announced_date')
    .in('company_id', candidateIds)
    .order('announced_date', { ascending: false })
    .limit(2000)

  const lastByCompany = new Map<string, { date: string; amount: number | null }>()
  for (const r of lastRoundRows || []) {
    if (!r.company_id) continue
    if (!lastByCompany.has(r.company_id) && r.announced_date) {
      lastByCompany.set(r.company_id, { date: r.announced_date, amount: r.amount_usd })
    }
  }

  const now = Date.now()
  const candidate_companies = (companyRows || []).map((c) => {
    const last = lastByCompany.get(c.id)
    const months = last ? Math.round((now - new Date(last.date).getTime()) / (30 * 86400_000)) : null
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      ticker: c.ticker,
      stage: c.stage,
      categories: c.categories,
      last_round_date: last?.date || null,
      last_round_amount: last?.amount || null,
      months_since_last_round: months,
    }
  }).filter((c) => c.months_since_last_round !== null && c.months_since_last_round >= 12 && c.months_since_last_round <= 36)
    .slice(0, 100)

  return {
    recent_rounds: (rounds || []).slice(0, 200),
    investor_cadence,
    sector_trends,
    candidate_companies,
  }
}
