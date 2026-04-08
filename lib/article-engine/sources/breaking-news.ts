// Article Engine — Breaking News Context Gatherer

import { createServerClient } from '@/lib/supabase'
import type { ArticleContext, Source } from '../types'

export async function gatherBreakingNewsContext(rssItemId: string): Promise<ArticleContext> {
  const supabase = createServerClient()

  // Fetch the RSS item
  const { data: item } = await (supabase.from as any)('rss_items')
    .select('id, title, url, source_name, summary, published_at, category, company_names')
    .eq('id', rssItemId)
    .single()

  if (!item) {
    return { sources: [], companyInDB: false, companyHasFullProfile: false, numbersVerifiedFromDB: false }
  }

  const sources: Source[] = [
    { name: item.source_name || 'Source', url: item.url, date: item.published_at || undefined },
  ]

  const context: ArticleContext = {
    rssItem: {
      id: item.id,
      title: item.title,
      url: item.url,
      source_name: item.source_name || 'Unknown',
      summary: item.summary,
      published_at: item.published_at,
      category: item.category || 'general',
      company_names: item.company_names || [],
    },
    sources,
    companyInDB: false,
    companyHasFullProfile: false,
    numbersVerifiedFromDB: false,
  }

  // Try to match a company by name
  const companyNames = item.company_names || []
  if (companyNames.length > 0) {
    // Try exact match on first company name
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, slug, description, categories, ticker, valuation, logo_url, website, country')
      .ilike('name', companyNames[0])
      .limit(1)
      .single()

    if (company) {
      context.company = company
      context.companyInDB = true
      context.companyHasFullProfile = !!(company.description && company.categories?.length)

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
    }
  }

  return context
}
