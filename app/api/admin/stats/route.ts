import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServerClient()

    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayISO = todayStart.toISOString()

    // Month boundaries
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const monthStartISO = monthStart.toISOString()

    const lastMonthStart = new Date(monthStart)
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)
    const lastMonthStartISO = lastMonthStart.toISOString()

    // Run all queries in parallel
    const [
      articlesTodayRes,
      articlesPendingRes,
      totalPublishedRes,
      rssItemsTodayRes,
      companiesTotalRes,
      lastArticleRes,
      articlesThisMonthRes,
      articlesLastMonthRes,
      typeBreakdownRes,
      sponsoredRes,
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
      // Articles this month (published)
      (supabase.from as any)('articles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published')
        .gte('published_at', monthStartISO),
      // Articles last month (published)
      (supabase.from as any)('articles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published')
        .gte('published_at', lastMonthStartISO)
        .lt('published_at', monthStartISO),
      // Articles by type this month
      (supabase.from as any)('articles')
        .select('type')
        .eq('status', 'published')
        .gte('published_at', monthStartISO),
      // Sponsored articles
      (supabase.from as any)('articles')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'company_deep_dive')
        .contains('metadata', { is_sponsored: true }),
    ])

    const articlesThisMonth = articlesThisMonthRes.count ?? 0
    const articlesLastMonth = articlesLastMonthRes.count ?? 0
    const totalArticlesAllTime = totalPublishedRes.count ?? 0

    // Calculate month-over-month growth
    const monthOverMonthGrowth = articlesLastMonth > 0
      ? Math.round(((articlesThisMonth - articlesLastMonth) / articlesLastMonth) * 1000) / 10
      : articlesThisMonth > 0 ? 100 : 0

    // Build type breakdown
    const typeBreakdownThisMonth: Record<string, number> = {}
    if (typeBreakdownRes.data) {
      for (const row of typeBreakdownRes.data) {
        const t = row.type || 'unknown'
        typeBreakdownThisMonth[t] = (typeBreakdownThisMonth[t] || 0) + 1
      }
    }

    const COST_PER_ARTICLE = 0.03
    const estimatedMonthlyCost = Math.round(articlesThisMonth * COST_PER_ARTICLE * 100) / 100

    const stats = {
      articlesToday: articlesTodayRes.count ?? 0,
      articlesPending: articlesPendingRes.count ?? 0,
      totalArticles: totalArticlesAllTime,
      rssItemsToday: rssItemsTodayRes.count ?? 0,
      companiesTotal: companiesTotalRes.count ?? 0,
      lastCronRun: lastArticleRes.data?.[0]?.created_at ?? null,
      // Business metrics
      articlesThisMonth,
      articlesLastMonth,
      monthOverMonthGrowth,
      typeBreakdownThisMonth,
      sponsoredCount: sponsoredRes.count ?? 0,
      estimatedMonthlyCost,
      costPerArticle: COST_PER_ARTICLE,
      totalArticlesAllTime,
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
