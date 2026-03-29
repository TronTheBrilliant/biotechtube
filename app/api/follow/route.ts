import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  let body: {
    user_id: string
    following_id: string
    following_type: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { user_id, following_id, following_type } = body

  if (!user_id) {
    return NextResponse.json({ error: 'Unauthorized: user_id required' }, { status: 401 })
  }

  if (!following_id || !following_type) {
    return NextResponse.json(
      { error: 'following_id and following_type are required' },
      { status: 400 }
    )
  }

  // Prevent self-follow for user follows
  if (following_type === 'user' && following_id === user_id) {
    return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
  }

  // Check if already following
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('follows')
    .select('id')
    .eq('follower_id', user_id)
    .eq('following_id', following_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Already following' }, { status: 409 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: follow, error: insertError } = await (supabase as any)
    .from('follows')
    .insert({
      follower_id: user_id,
      following_id,
      following_type,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Create notification for the person/entity being followed (only for user follows)
  if (following_type === 'user') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('notifications').insert({
      user_id: following_id,
      actor_id: user_id,
      type: 'follow',
    })
  }

  return NextResponse.json({ follow }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerClient()

  let body: { user_id: string; following_id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { user_id, following_id } = body

  if (!user_id) {
    return NextResponse.json({ error: 'Unauthorized: user_id required' }, { status: 401 })
  }

  if (!following_id) {
    return NextResponse.json({ error: 'following_id is required' }, { status: 400 })
  }

  // Check that the follow record exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: fetchError } = await (supabase as any)
    .from('follows')
    .select('id')
    .eq('follower_id', user_id)
    .eq('following_id', following_id)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!existing) {
    return NextResponse.json({ error: 'Not following' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (supabase as any)
    .from('follows')
    .delete()
    .eq('follower_id', user_id)
    .eq('following_id', following_id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Remove related follow notification
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('notifications')
    .delete()
    .eq('user_id', following_id)
    .eq('actor_id', user_id)
    .eq('type', 'follow')

  return NextResponse.json({ success: true })
}
