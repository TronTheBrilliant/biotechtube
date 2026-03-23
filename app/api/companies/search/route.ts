import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const supabase = createServerClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  // Try full-text search first
  let { data } = await supabase
    .from('companies')
    .select('slug, name, country, city, categories, logo_url, stage, company_type')
    .textSearch('fts', q, { type: 'websearch' })
    .limit(10)

  // Fallback to ILIKE if FTS returns nothing (handles partial word matches)
  if (!data || data.length === 0) {
    const { data: ilikeData } = await supabase
      .from('companies')
      .select('slug, name, country, city, categories, logo_url, stage, company_type')
      .ilike('name', `%${q}%`)
      .limit(10)

    data = ilikeData
  }

  const response = NextResponse.json({ results: data || [] })
  // Cache search results briefly (same queries are common)
  response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300')
  return response
}
