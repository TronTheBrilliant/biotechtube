// Article Engine — Weekly Roundup Context Gatherer

import { createServerClient } from '@/lib/supabase'
import type { ArticleContext, Source } from '../types'

export async function gatherRoundupContext(data: {
  weekStart: string
  weekEnd: string
}): Promise<ArticleContext> {
  const supabase = createServerClient()

  const sources: Source[] = [
    { name: 'BiotechTube Weekly Roundup', url: 'https://biotechtube.com', date: data.weekEnd },
  ]

  const context: ArticleContext = {
    sources,
    companyInDB: false,
    companyHasFullProfile: false,
    numbersVerifiedFromDB: true,
  }

  const metadata: Record<string, any> = {
    week_start: data.weekStart,
    week_end: data.weekEnd,
  }

  // Count and sum funding rounds in the date range
  const { data: fundingRounds } = await supabase
    .from('funding_rounds')
    .select('id, company_name, amount_usd, round_type, lead_investor, announced_date, sector, country')
    .gte('announced_date', data.weekStart)
    .lte('announced_date', data.weekEnd)
    .order('amount_usd', { ascending: false })
    .limit(50)

  if (fundingRounds?.length) {
    metadata.funding_count = fundingRounds.length
    metadata.funding_total_usd = fundingRounds.reduce((sum, r) => sum + (r.amount_usd || 0), 0)
    metadata.top_deals = fundingRounds.slice(0, 5)
    metadata.funding_by_sector = fundingRounds.reduce((acc: Record<string, number>, r) => {
      const sector = r.sector || 'Other'
      acc[sector] = (acc[sector] || 0) + 1
      return acc
    }, {})
  } else {
    metadata.funding_count = 0
    metadata.funding_total_usd = 0
    metadata.top_deals = []
  }

  // Count RSS items by category in the date range
  const { data: newsItems } = await (supabase.from as any)('rss_items')
    .select('id, title, url, source_name, category, published_at, company_names')
    .gte('published_at', data.weekStart)
    .lte('published_at', data.weekEnd)
    .order('published_at', { ascending: false })
    .limit(100)

  if (newsItems?.length) {
    metadata.news_count = newsItems.length
    metadata.news_by_category = newsItems.reduce((acc: Record<string, number>, item: any) => {
      const cat = item.category || 'general'
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {})
    metadata.notable_news = newsItems.slice(0, 5)
  } else {
    metadata.news_count = 0
    metadata.news_by_category = {}
  }

  // Market snapshot for performance during the week
  const { data: marketSnapshots } = await supabase
    .from('market_snapshots')
    .select('*')
    .gte('snapshot_date', data.weekStart)
    .lte('snapshot_date', data.weekEnd)
    .order('snapshot_date', { ascending: false })
    .limit(7)

  if (marketSnapshots?.length) {
    metadata.market_snapshots = marketSnapshots
    // Calculate week performance from first to last snapshot
    const first = marketSnapshots[marketSnapshots.length - 1]
    const last = marketSnapshots[0]
    if (first.total_market_cap && last.total_market_cap) {
      metadata.market_cap_change_pct =
        ((last.total_market_cap - first.total_market_cap) / first.total_market_cap) * 100
    }
  }

  // Top 3 companies by price change during the week
  const { data: topMovers } = await supabase
    .from('company_price_history')
    .select('company_id, close, change_pct')
    .gte('date', data.weekStart)
    .lte('date', data.weekEnd)
    .order('change_pct', { ascending: false })
    .limit(3)

  if (topMovers?.length) {
    // Enrich with company names
    const companyIds = topMovers.map((m) => m.company_id)
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name, ticker')
      .in('id', companyIds)

    const companyMap = new Map((companies || []).map((c) => [c.id, c]))
    metadata.top_movers = topMovers.map((m) => ({
      ...m,
      company_name: companyMap.get(m.company_id)?.name || 'Unknown',
      ticker: companyMap.get(m.company_id)?.ticker || null,
    }))
  }

  ;(context as any).metadata = metadata

  return context
}
