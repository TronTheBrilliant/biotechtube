import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const sector = searchParams.get('sector') || null

  const supabase = getSupabase()

  // Get latest price date
  const { data: latestDateRow } = await supabase
    .from('company_price_history')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
    .single()

  if (!latestDateRow) {
    return NextResponse.json({ companies: [] })
  }

  // Get companies with their latest price data
  let query = supabase
    .from('company_price_history')
    .select('company_id, market_cap_usd, change_pct')
    .eq('date', latestDateRow.date)
    .not('market_cap_usd', 'is', null)
    .gt('market_cap_usd', 0)
    .order('market_cap_usd', { ascending: false })
    .limit(limit)

  const { data: priceData } = await query
  if (!priceData || priceData.length === 0) {
    return NextResponse.json({ companies: [] })
  }

  // Get company details
  const companyIds = priceData.map((p: { company_id: string }) => p.company_id).filter(Boolean)
  const { data: companies } = await supabase
    .from('companies')
    .select('id, slug, name, ticker, sector_id')
    .in('id', companyIds)

  if (!companies) {
    return NextResponse.json({ companies: [] })
  }

  // If filtering by sector, get sector ID
  let sectorId: string | null = null
  if (sector) {
    const { data: sectorData } = await supabase
      .from('sectors')
      .select('id')
      .eq('slug', sector)
      .single()
    sectorId = sectorData?.id || null
  }

  // Get sector names for tooltips
  const sectorIds = Array.from(new Set(companies.map((c: { sector_id: string | null }) => c.sector_id).filter(Boolean)))
  const sectorMap = new Map<string, string>()
  if (sectorIds.length > 0) {
    const { data: sectors } = await supabase
      .from('sectors')
      .select('id, name')
      .in('id', sectorIds as string[])
    if (sectors) {
      for (const s of sectors) sectorMap.set(s.id, s.name)
    }
  }

  // Build company map
  const companyMap = new Map<string, { slug: string; name: string; ticker: string | null; sector_id: string | null }>()
  for (const c of companies as { id: string; slug: string; name: string; ticker: string | null; sector_id: string | null }[]) {
    companyMap.set(c.id, c)
  }

  // Combine data
  const result = priceData
    .map((p: { company_id: string; market_cap_usd: number; change_pct: number | null }) => {
      const c = companyMap.get(p.company_id)
      if (!c) return null
      if (sectorId && c.sector_id !== sectorId) return null
      return {
        id: p.company_id,
        slug: c.slug,
        name: c.name,
        ticker: c.ticker,
        market_cap: Number(p.market_cap_usd),
        daily_change_pct: Number(p.change_pct) || 0,
        sector: c.sector_id ? sectorMap.get(c.sector_id) || null : null,
      }
    })
    .filter((x: unknown): x is NonNullable<typeof x> => x != null)

  return NextResponse.json(
    { companies: result },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    }
  )
}
