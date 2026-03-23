import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServerClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  // Run all three queries in parallel instead of sequentially
  const [totalResult, pipelineResult, countryResult] = await Promise.all([
    supabase
      .from('companies')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .not('stage', 'is', null),
    supabase
      .rpc('get_country_counts'),
  ])

  const response = NextResponse.json({
    totalCompanies: totalResult.count || 0,
    companiesWithPipeline: pipelineResult.count || 0,
    countryCounts: countryResult.data || [],
  })
  // Stats change rarely — cache for 10 minutes
  response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200')
  return response
}
