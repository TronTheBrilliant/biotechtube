'use client'

import Link from 'next/link'
import { Newspaper } from 'lucide-react'
import HeroWithLogo from '@/components/news/HeroWithLogo'
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

const TYPE_LABEL: Record<string, string> = {
  funding_deal: 'Funding',
  clinical_trial: 'Clinical Trial',
  market_analysis: 'Market',
  company_deep_dive: 'Spotlight',
  weekly_roundup: 'Roundup',
  breaking_news: 'Breaking',
  science_essay: 'Deep Science',
  innovation_spotlight: 'Innovation',
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
        <div className="flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
          <Newspaper size={14} strokeWidth={1.75} />
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

      {/* Horizontal scroll with snap */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 scroll-fade-right snap-x" style={{ scrollPaddingLeft: 16 }}>
        <div className="flex gap-3" style={{ paddingBottom: 4 }}>
          {articles.map((article) => {
            const typeLabel = TYPE_LABEL[article.type] ?? 'News'
            const placeholderStyle = article.hero_placeholder_style || {
              pattern: 'bars' as const,
              accentColor: '#059669',
              icon: 'chart',
            }

            return (
              <Link
                key={article.slug}
                href={`/news/${article.slug}`}
                className="block flex-shrink-0 rounded-xl overflow-hidden snap-start transition-shadow duration-150 hover:shadow-md"
                style={{
                  width: 300,
                  background: 'var(--color-bg-secondary)',
                  border: '0.5px solid var(--color-border-subtle)',
                }}
              >
                {/* Hero */}
                <div className="h-48 overflow-hidden relative">
                  <HeroWithLogo
                    imageUrl={article.hero_image_url}
                    placeholderStyle={placeholderStyle}
                    headline={article.headline}
                    companyLogo={article.company_id && companyMap[article.company_id]?.logo_url}
                    companyName={article.company_id && companyMap[article.company_id]?.name}
                    className="w-full h-full"
                  />
                </div>

                {/* Content */}
                <div className="p-3">
                  {/* Type pill + time */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide"
                      style={{
                        background: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-secondary)',
                        letterSpacing: '0.3px',
                      }}
                    >
                      {typeLabel}
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
