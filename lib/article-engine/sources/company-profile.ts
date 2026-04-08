// Article Engine — Company Deep Dive Context Gatherer

import { createServerClient } from '@/lib/supabase'
import type { ArticleContext, Source } from '../types'

export async function gatherCompanyProfileContext(data: {
  companyId: string
}): Promise<ArticleContext> {
  const supabase = createServerClient()

  // Fetch the company (full profile)
  const { data: company } = await supabase
    .from('companies')
    .select('id, name, slug, description, categories, ticker, valuation, logo_url, website, country')
    .eq('id', data.companyId)
    .single()

  if (!company) {
    return { sources: [], companyInDB: false, companyHasFullProfile: false, numbersVerifiedFromDB: false }
  }

  const sources: Source[] = []
  if (company.website) {
    sources.push({ name: `${company.name} Website`, url: company.website })
  }

  const context: ArticleContext = {
    company,
    sources,
    companyInDB: true,
    companyHasFullProfile: !!(company.description && company.categories?.length),
    numbersVerifiedFromDB: true,
  }

  // Fetch pipeline from company_reports (extra columns not in generated types)
  const { data: report } = await (supabase.from as any)('company_reports')
    .select('pipeline_programs, key_people, competitive_landscape, financial_summary, technology_platforms')
    .eq('report_slug', company.slug)
    .single()

  if (report?.pipeline_programs && Array.isArray(report.pipeline_programs)) {
    context.pipeline = report.pipeline_programs.map((p: any) => ({
      product_name: p.name || p.product_name || 'Unknown',
      indication: p.indication || null,
      phase: p.phase || null,
      status: p.status || null,
    }))
  }

  // Store extra report data in metadata
  ;(context as any).metadata = {
    key_people: report?.key_people || null,
    competitive_landscape: report?.competitive_landscape || null,
    financial_summary: report?.financial_summary || null,
    technology_platforms: report?.technology_platforms || null,
  }

  // Fetch all funding rounds for this company
  const { data: fundingRounds } = await supabase
    .from('funding_rounds')
    .select('id, amount_usd, round_type, lead_investor, investors, announced_date, sector, country')
    .eq('company_id', company.id)
    .order('announced_date', { ascending: false })
    .limit(20)

  if (fundingRounds?.length) {
    ;(context as any).metadata.funding_history = fundingRounds
    // Use the most recent round as the primary funding round
    const latest = fundingRounds[0]
    context.fundingRound = {
      id: latest.id,
      amount_usd: latest.amount_usd ?? 0,
      round_type: latest.round_type ?? 'Unknown',
      lead_investor: latest.lead_investor,
      investors: latest.investors,
      announced_date: latest.announced_date ?? '',
      sector: latest.sector,
      country: latest.country,
      confidence: null,
    }
  }

  // Fetch recent price history (30 days)
  if (company.ticker) {
    const { data: priceHistory } = await supabase
      .from('company_price_history')
      .select('date, close, change_pct, market_cap_usd, volume')
      .eq('company_id', company.id)
      .order('date', { ascending: false })
      .limit(30)

    if (priceHistory?.length) {
      context.recentPrice = {
        close: priceHistory[0].close,
        change_pct: priceHistory[0].change_pct || 0,
        market_cap_usd: priceHistory[0].market_cap_usd,
      }
      ;(context as any).metadata.price_history_30d = priceHistory
    }
  }

  // Fetch related RSS items mentioning the company
  const { data: newsItems } = await (supabase.from as any)('rss_items')
    .select('id, title, url, source_name, summary, published_at, category, company_names')
    .contains('company_names', [company.name])
    .order('published_at', { ascending: false })
    .limit(10)

  if (newsItems?.length) {
    ;(context as any).metadata.recent_news = newsItems
    for (const item of newsItems.slice(0, 5)) {
      sources.push({
        name: item.source_name || 'Source',
        url: item.url,
        date: item.published_at || undefined,
      })
    }
  }

  return context
}
