import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get('user_id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized: user_id required' }, { status: 401 })
  }

  const supabase = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: notifications, error } = await (supabase as any)
    .from('notifications')
    .select(
      `
      *,
      actor:profiles!notifications_actor_id_fkey(id, full_name, avatar_url),
      post:posts!notifications_post_id_fkey(id, post_type, title, body)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const unreadCount = (notifications || []).filter(
    (n: { read: boolean }) => !n.read
  ).length

  return NextResponse.json({ notifications: notifications || [], unread_count: unreadCount })
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  let body: { user_id: string; notification_ids: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { user_id, notification_ids } = body

  if (!user_id) {
    return NextResponse.json({ error: 'Unauthorized: user_id required' }, { status: 401 })
  }

  if (!notification_ids || !Array.isArray(notification_ids) || notification_ids.length === 0) {
    return NextResponse.json(
      { error: 'notification_ids must be a non-empty array' },
      { status: 400 }
    )
  }

  // Only allow marking notifications that belong to the requesting user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError, count } = await (supabase as any)
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user_id)
    .in('id', notification_ids)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, updated: count })
}
