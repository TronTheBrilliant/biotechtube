import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  const { postId } = params
  const supabase = createServerClient()

  let body: { body: string; user_id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { body: commentBody, user_id } = body

  if (!user_id) {
    return NextResponse.json({ error: 'Unauthorized: user_id required' }, { status: 401 })
  }

  if (!commentBody || !commentBody.trim()) {
    return NextResponse.json({ error: 'Comment body is required' }, { status: 400 })
  }

  // Verify the post exists and get the author
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: post, error: postError } = await (supabase as any)
    .from('posts')
    .select('id, author_id, comment_count')
    .eq('id', postId)
    .single()

  if (postError) {
    if (postError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    return NextResponse.json({ error: postError.message }, { status: 500 })
  }

  // Insert the comment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: comment, error: insertError } = await (supabase as any)
    .from('post_comments')
    .insert({
      post_id: postId,
      author_id: user_id,
      body: commentBody.trim(),
    })
    .select(
      `
      *,
      author:profiles!post_comments_author_id_fkey(id, full_name, avatar_url)
    `
    )
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Increment comment count
  const newCount = (post.comment_count || 0) + 1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('posts').update({ comment_count: newCount }).eq('id', postId)

  // Create notification for post author (skip self-comments)
  if (post.author_id && post.author_id !== user_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('notifications').insert({
      user_id: post.author_id,
      actor_id: user_id,
      type: 'comment',
      post_id: postId,
    })
  }

  return NextResponse.json({ comment, comment_count: newCount }, { status: 201 })
}
