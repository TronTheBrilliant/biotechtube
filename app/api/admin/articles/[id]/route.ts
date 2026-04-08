import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerClient()

  const { data, error } = await (supabase.from as any)('articles')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Article not found' }, { status: 404 })

  return NextResponse.json({ article: data })
}

const ALLOWED_FIELDS = [
  'headline',
  'subtitle',
  'body',
  'status',
  'slug',
  'seo_title',
  'seo_description',
  'sources',
  'hero_image_url',
  'summary',
] as const

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerClient()
  const body = await request.json()

  // Whitelist fields
  const updates: Record<string, any> = {}
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Always mark as human-edited and set updated_at
  updates.edited_by = 'ai+human'
  updates.updated_at = new Date().toISOString()

  // Auto-set published_at when status changes to published
  if (updates.status === 'published' && !body.published_at) {
    updates.published_at = new Date().toISOString()
  }

  const { data, error } = await (supabase.from as any)('articles')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ article: data })
}
