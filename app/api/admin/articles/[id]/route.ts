import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "trond@biotechtube.io"

async function verifyAdmin(request: Request): Promise<boolean> {
  // Check CRON_SECRET bearer token first
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ') && process.env.CRON_SECRET) {
    if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true
  }

  // Fallback: check Supabase auth via cookie
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('sb-access-token')?.value
      || cookieStore.get(`sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]}-auth-token`)?.value
    if (!accessToken) return false

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    return user?.email === ADMIN_EMAIL
  } catch {
    return false
  }
}

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
  // Auth check for write operations
  const isAdmin = await verifyAdmin(request)
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
