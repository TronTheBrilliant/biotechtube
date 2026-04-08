import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface Suggestion {
  type: 'uncovered_funding' | 'trending_topic' | 'stale_content' | 'uncovered_company'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  action?: string
  data?: any
}

export async function GET() {
  try {
    const supabase = createServerClient()
    const suggestions: Suggestion[] = []

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Run all queries in parallel
    const [
      recentFundingRes,
      trendingRssRes,
      staleArticlesRes,
      highValueCompaniesRes,
      existingArticlesRes,
    ] = await Promise.all([
      // 1. Recent large funding rounds
      supabase
        .from('funding_rounds')
        .select('id, company_name, company_id, amount_usd, round_type, announced_date')
        .gte('amount_usd', 10000000)
        .gte('announced_date', thirtyDaysAgo)
        .order('amount_usd', { ascending: false })
        .limit(20),

      // 2. RSS items in last 7 days for trending topics
      (supabase.from as any)('rss_items')
        .select('category')
        .gte('scraped_at', sevenDaysAgo),

      // 3. Stale company deep dives (older than 30 days)
      (supabase.from as any)('articles')
        .select('headline, slug, company_id, published_at, type')
        .eq('type', 'company_deep_dive')
        .eq('status', 'published')
        .lt('published_at', thirtyDaysAgo)
        .order('published_at', { ascending: true })
        .limit(5),

      // 4. High-value companies
      supabase
        .from('companies')
        .select('id, name, market_cap_usd, slug')
        .gt('market_cap_usd', 1000000000)
        .order('market_cap_usd', { ascending: false })
        .limit(20),

      // 5. All published articles (for cross-referencing)
      (supabase.from as any)('articles')
        .select('company_id, metadata, type')
        .eq('status', 'published'),
    ])

    // --- Build suggestion 1: Uncovered funding rounds ---
    if (recentFundingRes.data && existingArticlesRes.data) {
      // Find funding round IDs that already have articles
      const coveredSourceIds = new Set<string>()
      for (const article of existingArticlesRes.data) {
        if (article.metadata?.source_id) {
          coveredSourceIds.add(article.metadata.source_id)
        }
      }

      const uncoveredFunding = recentFundingRes.data.filter(
        (r: any) => !coveredSourceIds.has(r.id)
      )

      if (uncoveredFunding.length > 0) {
        const totalAmount = uncoveredFunding.reduce((sum: number, r: any) => sum + (r.amount_usd || 0), 0)
        const topNames = uncoveredFunding
          .slice(0, 3)
          .map((r: any) => `${r.company_name} ($${formatCompact(r.amount_usd)})`)
          .join(', ')

        const hasLargeDeal = uncoveredFunding.some((r: any) => r.amount_usd >= 50000000)

        suggestions.push({
          type: 'uncovered_funding',
          title: `${uncoveredFunding.length} funding round${uncoveredFunding.length !== 1 ? 's' : ''} without articles`,
          description: `${topNames}${uncoveredFunding.length > 3 ? ` and ${uncoveredFunding.length - 3} more` : ''} raised $${formatCompact(totalAmount)}+ with no coverage`,
          priority: hasLargeDeal || uncoveredFunding.length >= 5 ? 'high' : 'medium',
          action: 'Generate Articles',
          data: { fundingRoundIds: uncoveredFunding.map((r: any) => r.id) },
        })
      }
    }

    // --- Build suggestion 2: Trending RSS topics ---
    if (trendingRssRes.data) {
      const categoryCounts: Record<string, number> = {}
      for (const item of trendingRssRes.data) {
        const cat = item.category || 'general'
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
      }

      // Find categories with high volume (threshold: 10+ mentions)
      const trendingTopics = Object.entries(categoryCounts)
        .filter(([, count]) => count >= 10)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)

      for (const [topic, count] of trendingTopics) {
        if (topic === 'general' || topic === 'other') continue
        suggestions.push({
          type: 'trending_topic',
          title: `"${topic}" trending in RSS feeds`,
          description: `${count} mentions in the past week. Consider a Deep Science essay or market analysis.`,
          priority: count >= 20 ? 'medium' : 'low',
          action: 'Create Essay',
          data: { topic, mentionCount: count },
        })
      }
    }

    // --- Build suggestion 3: Stale content ---
    if (staleArticlesRes.data) {
      for (const article of staleArticlesRes.data) {
        const daysOld = Math.floor(
          (now.getTime() - new Date(article.published_at).getTime()) / (1000 * 60 * 60 * 24)
        )
        suggestions.push({
          type: 'stale_content',
          title: `"${truncate(article.headline, 50)}" is ${daysOld} days old`,
          description: `This company deep dive could use an update with recent data.`,
          priority: daysOld >= 60 ? 'medium' : 'low',
          action: 'Update Article',
          data: { slug: article.slug, articleType: article.type },
        })
      }
    }

    // --- Build suggestion 4: High-value uncovered companies ---
    if (highValueCompaniesRes.data && existingArticlesRes.data) {
      const coveredCompanyIds = new Set<string>()
      for (const article of existingArticlesRes.data) {
        if (article.company_id) {
          coveredCompanyIds.add(article.company_id)
        }
      }

      const uncoveredCompanies = highValueCompaniesRes.data.filter(
        (c: any) => !coveredCompanyIds.has(c.id)
      )

      if (uncoveredCompanies.length > 0) {
        const topNames = uncoveredCompanies
          .slice(0, 3)
          .map((c: any) => c.name)
          .join(', ')

        suggestions.push({
          type: 'uncovered_company',
          title: `${uncoveredCompanies.length} companies valued $1B+ have no coverage`,
          description: `${topNames}${uncoveredCompanies.length > 3 ? ` and ${uncoveredCompanies.length - 3} more` : ''} are missing article coverage.`,
          priority: uncoveredCompanies.length >= 5 ? 'high' : 'low',
          action: 'Start Deep Dives',
          data: { companyIds: uncoveredCompanies.slice(0, 10).map((c: any) => c.id) },
        })
      }
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    return NextResponse.json({ suggestions }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err: any) {
    console.error('GET /api/admin/suggestions error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch suggestions', details: err.message },
      { status: 500 }
    )
  }
}

function formatCompact(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(0)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`
  return String(num)
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}
