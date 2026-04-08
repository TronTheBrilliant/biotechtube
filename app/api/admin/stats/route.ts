import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServerClient()

    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayISO = todayStart.toISOString()

    // Run all queries in parallel
    const [
      articlesTodayRes,
      articlesPendingRes,
      totalPublishedRes,
      rssItemsTodayRes,
      companiesTotalRes,
      lastArticleRes,
    ] = await Promise.all([
      // Articles created today
      (supabase.from as any)('articles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayISO),
      // Articles in review
      (supabase.from as any)('articles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'in_review'),
      // Total published
      (supabase.from as any)('articles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published'),
      // RSS items today
      (supabase.from as any)('rss_items')
        .select('id', { count: 'exact', head: true })
        .gte('scraped_at', todayISO),
      // Total companies
      supabase.from('companies')
        .select('id', { count: 'exact', head: true }),
      // Last article created (proxy for last cron run)
      (supabase.from as any)('articles')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1),
    ])

    const stats = {
      articlesToday: articlesTodayRes.count ?? 0,
      articlesPending: articlesPendingRes.count ?? 0,
      totalArticles: totalPublishedRes.count ?? 0,
      rssItemsToday: rssItemsTodayRes.count ?? 0,
      companiesTotal: companiesTotalRes.count ?? 0,
      lastCronRun: lastArticleRes.data?.[0]?.created_at ?? null,
    }

    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err: any) {
    console.error('GET /api/admin/stats error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: err.message },
      { status: 500 }
    )
  }
}
