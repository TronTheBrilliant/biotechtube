import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Company not found' },
      { status: 404 }
    )
  }

  // Increment profile views (fire and forget)
  const row = data as Record<string, unknown>
  supabase
    .from('companies')
    .update({ profile_views: ((row.profile_views as number) || 0) + 1 })
    .eq('id', row.id as string)
    .then(() => {})

  return NextResponse.json(data)
}
