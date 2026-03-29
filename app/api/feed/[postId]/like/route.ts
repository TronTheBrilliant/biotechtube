import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  const { postId } = params
  const supabase = createServerClient()

  let body: { user_id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { user_id } = body

  if (!user_id) {
    return NextResponse.json({ error: 'Unauthorized: user_id required' }, { status: 401 })
  }

  // Verify the post exists and get the author
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: post, error: postError } = await (supabase as any)
    .from('posts')
    .select('id, author_id, like_count')
    .eq('id', postId)
    .single()

  if (postError) {
    if (postError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    return NextResponse.json({ error: postError.message }, { status: 500 })
  }

  // Check if already liked
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingLike } = await (supabase as any)
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user_id)
    .maybeSingle()

  if (existingLike) {
    // Unlike: remove like and decrement count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user_id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    const newCount = Math.max(0, (post.like_count || 0) - 1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('posts').update({ like_count: newCount }).eq('id', postId)

    return NextResponse.json({ liked: false, like_count: newCount })
  } else {
    // Like: add like and increment count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any)
      .from('post_likes')
      .insert({ post_id: postId, user_id })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const newCount = (post.like_count || 0) + 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('posts').update({ like_count: newCount }).eq('id', postId)

    // Create notification for post author (skip self-likes)
    if (post.author_id && post.author_id !== user_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('notifications').insert({
        user_id: post.author_id,
        actor_id: user_id,
        type: 'like',
        post_id: postId,
      })
    }

    return NextResponse.json({ liked: true, like_count: newCount })
  }
}
