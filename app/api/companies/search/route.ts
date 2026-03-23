import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] })
  }

  const supabase = createServerClient()

  // Search by name (ILIKE for partial matches)
  const { data, error } = await supabase
    .from('companies')
    .select('slug, name, country, city, categories, logo_url, stage, company_type, ticker, total_raised, website, description')
    .ilike('name', `%${q}%`)
    .order('name', { ascending: true })
    .limit(10)

  if (error) {
    console.error('Search error:', error)
    return NextResponse.json({ results: [] })
  }

  return NextResponse.json({ results: data || [] })
}
