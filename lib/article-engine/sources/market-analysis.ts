// Article Engine — Market Analysis Context Gatherer

import { createServerClient } from '@/lib/supabase'
import type { ArticleContext, Source } from '../types'

export async function gatherMarketAnalysisContext(data: {
  sectorId?: string
  period?: string
}): Promise<ArticleContext> {
  const supabase = createServerClient()

  const sources: Source[] = [
    { name: 'BiotechTube Market Data', url: 'https://biotechtube.com' },
  ]

  const context: ArticleContext = {
    sources,
    companyInDB: false,
    companyHasFullProfile: false,
    numbersVerifiedFromDB: true,
    metadata: {} as Record<string, any>,
  }

  // Fetch sector data
  if (data.sectorId) {
    const { data: sectorData } = await supabase
      .from('sector_market_data')
      .select('*')
      .eq('sector_id', data.sectorId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single()

    if (sectorData) {
      ;(context as any).metadata = {
        ...(context as any).metadata,
        sector_data: sectorData,
      }
    }

    // Fetch sector info from sectors table
    const { data: sector } = await supabase
      .from('sectors')
      .select('id, name, slug, company_count')
      .eq('id', data.sectorId)
      .single()

    if (sector) {
      ;(context as any).metadata.sector_name = sector.name
      ;(context as any).metadata.sector_slug = sector.slug
      ;(context as any).metadata.sector_company_count = sector.company_count
    }

    // Top companies in sector by market cap
    const { data: topCompanies } = await supabase
      .from('companies')
      .select('id, name, slug, ticker, valuation, country, categories')
      .contains('categories', [data.sectorId])
      .order('valuation', { ascending: false })
      .limit(5)

    if (topCompanies?.length) {
      ;(context as any).metadata.top_companies = topCompanies
    }
  } else {
    // No sector specified — fetch all sectors overview
    const { data: allSectors } = await supabase
      .from('sector_market_data')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(20)

    if (allSectors?.length) {
      ;(context as any).metadata = {
        ...(context as any).metadata,
        all_sectors: allSectors,
      }
    }
  }

  // Fetch overall market snapshot
  const { data: marketSnapshot } = await supabase
    .from('market_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  if (marketSnapshot) {
    ;(context as any).metadata.market_snapshot = marketSnapshot
  }

  return context
}
