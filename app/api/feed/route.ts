import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const offset = (page - 1) * limit
  const userId = searchParams.get('user_id')
  const filter = searchParams.get('filter')

  const supabase = createServerClient()

  // Fetch posts with author profile and company info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
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
    `,
      { count: 'exact' }
    )

  // Apply filter
  if (filter === 'companies') {
    query = query.not('company_id', 'is', null)
  } else if (filter === 'people') {
    query = query.is('company_id', null)
  } else if (filter === 'articles') {
    query = query.eq('post_type', 'article')
  }

  const { data: posts, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If user is authenticated, check which posts they have liked and bookmarked
  let likedPostIds: Set<string> = new Set()
  let bookmarkedPostIds: Set<string> = new Set()
  if (userId && posts && posts.length > 0) {
    const postIds = posts.map((p: { id: string }) => p.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [likesResult, bookmarksResult] = await Promise.all([
      (supabase as any)
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', postIds),
      (supabase as any)
        .from('post_bookmarks')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', postIds),
    ])

    if (likesResult.data) {
      likedPostIds = new Set(likesResult.data.map((l: { post_id: string }) => l.post_id))
    }
    if (bookmarksResult.data) {
      bookmarkedPostIds = new Set(bookmarksResult.data.map((b: { post_id: string }) => b.post_id))
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrichedPosts = (posts || []).map((post: any) => ({
    ...post,
    liked_by_user: likedPostIds.has(post.id as string),
    bookmarked_by_user: bookmarkedPostIds.has(post.id as string),
  }))

  return NextResponse.json({
    posts: enrichedPosts,
    total: count,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  })
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  let body: {
    post_type: string
    title?: string
    body: string
    image_url?: string
    company_id?: string
    author_id: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { post_type, title, body: postBody, image_url, company_id, author_id } = body

  if (!author_id) {
    return NextResponse.json({ error: 'Unauthorized: author_id required' }, { status: 401 })
  }

  if (!post_type || !postBody) {
    return NextResponse.json({ error: 'post_type and body are required' }, { status: 400 })
  }

  // If company_id is provided, verify the user has a verified claim for that company
  if (company_id) {
    const { data: claim, error: claimError } = await supabase
      .from('company_claims')
      .select('id, status')
      .eq('company_id', company_id)
      .eq('user_id', author_id)
      .eq('status', 'verified')
      .maybeSingle()

    if (claimError) {
      return NextResponse.json({ error: claimError.message }, { status: 500 })
    }

    if (!claim) {
      return NextResponse.json(
        { error: 'Forbidden: no verified claim for this company' },
        { status: 403 }
      )
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: post, error: insertError } = await (supabase as any)
    .from('posts')
    .insert({
      post_type,
      title: title || null,
      body: postBody,
      image_url: image_url || null,
      company_id: company_id || null,
      author_id,
    })
    .select(
      `
      *,
      author:profiles!posts_author_id_fkey(id, full_name, avatar_url),
      company:companies!posts_company_id_fkey(id, name, slug, logo_url)
    `
    )
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ post }, { status: 201 })
}
