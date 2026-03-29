import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  const { postId } = params
  const supabase = createServerClient()

  let body: { user_id: string; body?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { user_id, body: quoteBody } = body

  if (!user_id) {
    return NextResponse.json({ error: 'Unauthorized: user_id required' }, { status: 401 })
  }

  // Verify the original post exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: originalPost, error: postError } = await (supabase as any)
    .from('posts')
    .select('id, author_id, share_count, post_type')
    .eq('id', postId)
    .single()

  if (postError) {
    if (postError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    return NextResponse.json({ error: postError.message }, { status: 500 })
  }

  // Create a new repost referencing the original
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: repost, error: insertError } = await (supabase as any)
    .from('posts')
    .insert({
      post_type: 'repost',
      body: quoteBody || '',
      author_id: user_id,
      shared_post_id: postId,
    })
    .select(
      `
      *,
      author:profiles!posts_author_id_fkey(id, full_name, avatar_url),
      shared_post:posts!posts_shared_post_id_fkey(
        id,
        post_type,
        title,
        body,
        image_url,
        created_at,
        author:profiles!posts_author_id_fkey(id, full_name, avatar_url),
        company:companies!posts_company_id_fkey(id, name, slug, logo_url)
      )
    `
    )
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Increment share count on the original post
  const newShareCount = (originalPost.share_count || 0) + 1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('posts').update({ share_count: newShareCount }).eq('id', postId)

  // Create notification for original post author (skip self-shares)
  if (originalPost.author_id && originalPost.author_id !== user_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('notifications').insert({
      user_id: originalPost.author_id,
      actor_id: user_id,
      type: 'share',
      post_id: postId,
    })
  }

  return NextResponse.json({ post: repost, share_count: newShareCount }, { status: 201 })
}
