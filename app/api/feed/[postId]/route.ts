import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { postId: string } }
) {
  const { postId } = params
  const supabase = createServerClient()

  // Fetch post with full details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: post, error } = await (supabase as any)
    .from('posts')
    .select(
      `
      *,
      author:profiles!posts_author_id_fkey(id, full_name, avatar_url),
      company:companies!posts_company_id_fkey(id, name, slug, logo_url),
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
    .eq('id', postId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch comments for the post
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: comments, error: commentsError } = await (supabase as any)
    .from('post_comments')
    .select(
      `
      *,
      author:profiles!post_comments_author_id_fkey(id, full_name, avatar_url)
    `
    )
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (commentsError) {
    return NextResponse.json({ error: commentsError.message }, { status: 500 })
  }

  return NextResponse.json({ post: { ...post, comments: comments || [] } })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  const { postId } = params
  const supabase = createServerClient()

  let body: { user_id: string; body?: string; title?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { user_id, body: newBody, title: newTitle } = body

  if (!user_id) {
    return NextResponse.json({ error: 'Unauthorized: user_id required' }, { status: 401 })
  }

  // Verify ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: post, error: fetchError } = await (supabase as any)
    .from('posts')
    .select('id, author_id')
    .eq('id', postId)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (post.author_id !== user_id) {
    return NextResponse.json({ error: 'Forbidden: you are not the author' }, { status: 403 })
  }

  // Build update object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any = { updated_at: new Date().toISOString() }
  if (newBody !== undefined) updates.body = newBody
  if (newTitle !== undefined) updates.title = newTitle

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error: updateError } = await (supabase as any)
    .from('posts')
    .update(updates)
    .eq('id', postId)
    .select(
      `
      *,
      author:profiles!posts_author_id_fkey(id, full_name, avatar_url),
      company:companies!posts_company_id_fkey(id, name, slug, logo_url)
    `
    )
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ post: updated })
}

export async function DELETE(
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

  // Fetch the post to check ownership and shared_post_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: post, error: fetchError } = await (supabase as any)
    .from('posts')
    .select('id, author_id, shared_post_id')
    .eq('id', postId)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (post.author_id !== user_id) {
    return NextResponse.json({ error: 'Forbidden: you are not the author' }, { status: 403 })
  }

  // If this is a share (repost), decrement the original post's share_count
  if (post.shared_post_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: originalPost } = await (supabase as any)
      .from('posts')
      .select('share_count')
      .eq('id', post.shared_post_id)
      .single()

    if (originalPost) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('posts')
        .update({ share_count: Math.max(0, (originalPost.share_count || 0) - 1) })
        .eq('id', post.shared_post_id)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (supabase as any)
    .from('posts')
    .delete()
    .eq('id', postId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
