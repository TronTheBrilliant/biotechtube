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
    .select('id, slug, name, country, city, website, domain, categories, description, founded, employee_range, stage, company_type, ticker, logo_url, total_raised, valuation, is_estimated, trending_rank, profile_views')
    .eq('slug', params.slug)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Company not found' },
      { status: 404 }
    )
  }

  // Increment profile views (fire and forget, with error logging)
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const row = data as any
  ;(supabase as any)
    .from('companies')
    .update({ profile_views: (row.profile_views || 0) + 1 })
    .eq('id', row.id)
    .then(({ error: updateErr }: { error: { message: string } | null }) => {
      if (updateErr) console.error('Failed to increment profile_views:', updateErr.message)
    })
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return NextResponse.json(data)
}
