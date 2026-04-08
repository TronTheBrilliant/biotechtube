import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: Request) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = (supabase.from as any)('articles')
    .select('id, slug, type, status, confidence, headline, subtitle, hero_image_url, hero_placeholder_style, published_at, created_at, reading_time_min, edited_by')
    .order('created_at', { ascending: false })
    .limit(100)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ articles: data || [] })
}
