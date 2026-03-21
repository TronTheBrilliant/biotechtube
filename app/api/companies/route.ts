import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const offset = (page - 1) * limit

  const country = searchParams.get('country')
  const category = searchParams.get('category')
  const stage = searchParams.get('stage')
  const search = searchParams.get('q')
  const sort = searchParams.get('sort') || 'name'

  const supabase = createServerClient()

  let query = supabase
    .from('companies')
    .select('*', { count: 'exact' })

  // Filters
  if (country) {
    query = query.eq('country', country)
  }
  if (category) {
    query = query.contains('categories', [category])
  }
  if (stage) {
    query = query.eq('stage', stage)
  }

  // Full-text search
  if (search) {
    query = query.textSearch('fts', search, { type: 'websearch' })
  }

  // Sorting
  switch (sort) {
    case 'trending':
      query = query.order('trending_rank', { ascending: true, nullsFirst: false })
      break
    case 'newest':
      query = query.order('created_at', { ascending: false })
      break
    case 'funded':
      query = query.order('total_raised', { ascending: false, nullsFirst: false })
      break
    case 'name':
    default:
      query = query.order('name', { ascending: true })
      break
  }

  // Pagination
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    companies: data,
    total: count,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  })
}
