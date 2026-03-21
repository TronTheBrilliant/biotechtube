import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServerClient()

  // Get total company count
  const { count: totalCompanies } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })

  // Get companies with pipeline/stage data
  const { count: withPipeline } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .not('stage', 'is', null)

  // Get country counts
  const { data: countryCounts } = await supabase
    .rpc('get_country_counts')

  return NextResponse.json({
    totalCompanies: totalCompanies || 0,
    companiesWithPipeline: withPipeline || 0,
    countryCounts: countryCounts || [],
  })
}
