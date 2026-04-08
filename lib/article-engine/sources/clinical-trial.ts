// Article Engine — Clinical Trial Context Gatherer

import { createServerClient } from '@/lib/supabase'
import type { ArticleContext, Source } from '../types'

export async function gatherClinicalTrialContext(data: {
  companyId: string
  pipelineId?: string
}): Promise<ArticleContext> {
  const supabase = createServerClient()

  // Fetch the company
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

  // Fetch pipeline from company_reports
  const { data: report } = await supabase
    .from('company_reports')
    .select('pipeline_programs')
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

  // Fetch recent price
  if (company.ticker) {
    const { data: price } = await supabase
      .from('company_price_history')
      .select('close, change_pct, market_cap_usd')
      .eq('company_id', company.id)
      .order('date', { ascending: false })
      .limit(1)
      .single()

    if (price) {
      context.recentPrice = {
        close: price.close,
        change_pct: price.change_pct || 0,
        market_cap_usd: price.market_cap_usd,
      }
    }
  }

  // Fetch related trial news from rss_items
  const { data: trialNews } = await (supabase.from as any)('rss_items')
    .select('id, title, url, source_name, summary, published_at, category, company_names')
    .eq('category', 'trial')
    .contains('company_names', [company.name])
    .order('published_at', { ascending: false })
    .limit(5)

  if (trialNews?.length) {
    // Use the most recent trial news as rssItem context
    const latest = trialNews[0]
    context.rssItem = {
      id: latest.id,
      title: latest.title,
      url: latest.url,
      source_name: latest.source_name || 'Unknown',
      summary: latest.summary,
      published_at: latest.published_at,
      category: latest.category || 'trial',
      company_names: latest.company_names || [],
    }

    // Add all trial news as sources
    for (const item of trialNews) {
      sources.push({
        name: item.source_name || 'Source',
        url: item.url,
        date: item.published_at || undefined,
      })
    }
  }

  return context
}
