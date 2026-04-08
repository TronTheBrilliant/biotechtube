'use client'

import Link from 'next/link'
import ArticlePlaceholder from '@/components/news/ArticlePlaceholder'
import type { PlaceholderStyle } from '@/lib/article-engine/types'

export interface ArticleCard {
  slug: string
  headline: string
  summary: string
  type: string
  company_id?: string | null
  hero_image_url?: string | null
  hero_placeholder_style?: PlaceholderStyle | null
  published_at: string
  reading_time_min?: number | null
}

type CompanyMap = Record<string, { name: string; logo_url: string | null; slug: string }>

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  funding_deal: { label: 'Funding', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  clinical_trial: { label: 'Clinical Trial', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  market_analysis: { label: 'Market', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  company_deep_dive: { label: 'Spotlight', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  weekly_roundup: { label: 'Roundup', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  breaking_news: { label: 'Breaking', color: 'text-red-400', bg: 'bg-red-500/10' },
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  if (diffMs < 0) return 'Just now'

  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

export function LatestIntelligence({ articles, companyMap = {} }: { articles: ArticleCard[]; companyMap?: CompanyMap }) {
  if (!articles || articles.length === 0) return null

  return (
    <section aria-label="Latest Intelligence">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 15 }}>📰</span>
          <h2
            className="text-[14px] font-semibold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Latest Intelligence
          </h2>
        </div>
        <Link
          href="/news"
          className="text-[12px] font-medium hover:opacity-70 transition-opacity"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          View all →
        </Link>
      </div>

      {/* Horizontal scroll */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex gap-3" style={{ paddingBottom: 4 }}>
          {articles.map((article) => {
            const cfg = TYPE_CONFIG[article.type] || TYPE_CONFIG.breaking_news
            const placeholderStyle = article.hero_placeholder_style || {
              pattern: 'bars' as const,
              accentColor: '#059669',
              icon: 'chart',
            }

            return (
              <Link
                key={article.slug}
                href={`/news/${article.slug}`}
                className="block flex-shrink-0 rounded-xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg"
                style={{
                  width: 280,
                  background: 'var(--color-bg-secondary)',
                  border: '0.5px solid var(--color-border-subtle)',
                }}
              >
                {/* Hero */}
                <div className="h-36 overflow-hidden">
                  {article.hero_image_url ? (
                    <img
                      src={article.hero_image_url}
                      alt={article.headline}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ArticlePlaceholder
                      style={placeholderStyle}
                      headline={article.headline}
                      className="w-full h-full"
                    />
                  )}
                </div>

                {/* Content */}
                <div className="p-3">
                  {/* Type pill + time */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}
                    >
                      {cfg.label}
                    </span>
                    <span
                      className="text-[10px]"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      {timeAgo(article.published_at)}
                    </span>
                  </div>

                  {/* Company info */}
                  {article.company_id && companyMap[article.company_id] && (
                    <div className="flex items-center gap-1.5 mb-1">
                      {companyMap[article.company_id].logo_url ? (
                        <img
                          src={companyMap[article.company_id].logo_url!}
                          alt=""
                          className="rounded"
                          style={{ width: 14, height: 14, objectFit: 'contain' }}
                        />
                      ) : (
                        <div
                          className="rounded flex items-center justify-center"
                          style={{
                            width: 14, height: 14,
                            background: 'var(--color-accent)',
                            color: 'white',
                            fontSize: 8,
                            fontWeight: 700,
                          }}
                        >
                          {companyMap[article.company_id].name.charAt(0)}
                        </div>
                      )}
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {companyMap[article.company_id].name}
                      </span>
                    </div>
                  )}

                  {/* Headline */}
                  <h3
                    className="text-[13px] font-semibold leading-snug line-clamp-2 mb-1"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {article.headline}
                  </h3>

                  {/* Summary */}
                  <p
                    className="text-[11px] leading-relaxed line-clamp-1"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {article.summary}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
