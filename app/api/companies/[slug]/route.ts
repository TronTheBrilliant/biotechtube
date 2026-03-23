import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createServerClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { data, error } = await supabase
    .from('companies')
    .select('slug, name, country, city, website, domain, categories, description, founded, employee_range, stage, company_type, ticker, logo_url, total_raised, valuation, is_estimated, trending_rank, profile_views')
    .eq('slug', params.slug)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Company not found' },
      { status: 404 }
    )
  }

  // Atomic increment of profile views (avoids race conditions)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(supabase.rpc as any)('increment_profile_views', { company_slug: params.slug })
    .then(({ error: rpcErr }: { error: { message: string } | null }) => {
      if (rpcErr) console.error('Failed to increment profile_views:', rpcErr.message)
    })

  const response = NextResponse.json(data)
  // Short cache — profile views need to stay fresh-ish
  response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  return response
}
