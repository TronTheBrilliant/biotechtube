// Article Engine — Funding Round Context Gatherer

import { createServerClient } from '@/lib/supabase'
import type { ArticleContext, Source } from '../types'

export async function gatherFundingContext(fundingRoundId: string): Promise<ArticleContext> {
  const supabase = createServerClient()

  // Fetch the funding round
  const { data: round } = await supabase
    .from('funding_rounds')
    .select('id, company_id, company_name, amount_usd, round_type, lead_investor, investors, announced_date, sector, country, confidence, source_url, source_name')
    .eq('id', fundingRoundId)
    .single()

  if (!round) {
    return { sources: [], companyInDB: false, companyHasFullProfile: false, numbersVerifiedFromDB: false }
  }

  const sources: Source[] = []
  if (round.source_url) {
    sources.push({ name: round.source_name || 'Source', url: round.source_url, date: round.announced_date })
  }

  const context: ArticleContext = {
    fundingRound: {
      id: round.id,
      company_name: round.company_name || undefined,
      amount_usd: round.amount_usd,
      round_type: round.round_type,
      lead_investor: round.lead_investor,
      investors: round.investors,
      announced_date: round.announced_date,
      sector: round.sector,
      country: round.country,
      confidence: round.confidence,
    },
    sources,
    companyInDB: false,
    companyHasFullProfile: false,
    numbersVerifiedFromDB: true,
  }

  // Fetch company if linked
  if (round.company_id) {
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, slug, description, categories, ticker, valuation, logo_url, website, country')
      .eq('id', round.company_id)
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
