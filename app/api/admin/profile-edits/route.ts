import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200)

    let q = (supabase.from as any)('profile_edit_queue')
      .select(`
        id, company_id, source_type, source_id, proposed_changes,
        confidence, reasoning, status, created_at, reviewed_at, applied_at,
        companies:company_id ( id, name, slug, ticker )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status && status !== 'all') q = q.eq('status', status)

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ edits: data || [] }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch edits', details: err.message }, { status: 500 })
  }
}
