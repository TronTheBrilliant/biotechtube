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
  const { data: priceData } = await supabase
    .from('company_price_history')
    .select('company_id, market_cap_usd, change_pct')
    .eq('date', latestDateRow.date)
    .not('market_cap_usd', 'is', null)
    .gt('market_cap_usd', 0)
    .order('market_cap_usd', { ascending: false })
    .limit(limit)

  if (!priceData || priceData.length === 0) {
    return NextResponse.json({ companies: [] })
  }

  // Get company details — use 'categories' (text[]), not 'sector_id'
  const companyIds = priceData.map((p: any) => p.company_id).filter(Boolean)
  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('id, slug, name, ticker, categories')
    .in('id', companyIds)

  if (companyError || !companies) {
    console.error('Treemap company query error:', companyError?.message)
    return NextResponse.json({ companies: [] })
  }

  // Build company map
  const companyMap = new Map<string, { slug: string; name: string; ticker: string | null; categories: string[] | null }>()
  for (const c of companies as any[]) {
    companyMap.set(c.id, c)
  }

  // Combine data
  const result = priceData
    .map((p: any) => {
      const c = companyMap.get(p.company_id)
      if (!c) return null
      const primarySector = c.categories?.[0] || null
      if (sector && primarySector?.toLowerCase() !== sector.toLowerCase()) return null
      return {
        id: p.company_id,
        slug: c.slug,
        name: c.name,
        ticker: c.ticker,
        market_cap: Number(p.market_cap_usd),
        daily_change_pct: Number(p.change_pct) || 0,
        sector: primarySector,
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
