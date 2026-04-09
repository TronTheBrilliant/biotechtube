import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { generateAndUploadImage } from '@/lib/article-engine/image-generator'

export const maxDuration = 60

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "trond@biotechtube.io"

async function verifyAdmin(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ') && process.env.CRON_SECRET) {
    if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true
  }

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createServerClient()

    // Fetch article
    const { data: article, error } = await (supabase.from as any)('articles')
      .select('slug, hero_image_prompt')
      .eq('id', id)
      .single()

    if (error || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    if (!article.hero_image_prompt) {
      return NextResponse.json({ error: 'No image prompt available' }, { status: 400 })
    }

    // Generate image via Pollinations and upload to Supabase Storage
    const imageUrl = await generateAndUploadImage(article.hero_image_prompt, article.slug)

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image generation failed' }, { status: 500 })
    }

    // Update article with image URL
    await (supabase.from as any)('articles')
      .update({ hero_image_url: imageUrl, updated_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({ imageUrl })
  } catch (err: any) {
    console.error('Generate image error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
