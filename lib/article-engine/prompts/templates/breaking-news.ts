// Article Engine — Breaking News Prompt Template

import type { ArticleContext } from '../../types'

function formatUSD(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount}`
}

export function buildBreakingNewsPrompt(context: ArticleContext): string {
  const { rssItem, company, pipeline, recentPrice, sources } = context
  if (!rssItem) return 'Write a biotech breaking news article.'

  const parts: string[] = []

  // RSS source
  parts.push(`## News Item`)
  parts.push(`- Headline: ${rssItem.title}`)
  parts.push(`- Source: ${rssItem.source_name}`)
  parts.push(`- URL: ${rssItem.url}`)
  if (rssItem.published_at) parts.push(`- Published: ${rssItem.published_at}`)
  if (rssItem.category) parts.push(`- Category: ${rssItem.category}`)
  if (rssItem.summary) parts.push(`- Summary: ${rssItem.summary}`)
  if (rssItem.company_names?.length) parts.push(`- Companies Mentioned: ${rssItem.company_names.join(', ')}`)

  // Company enrichment
  if (company) {
    parts.push(`\n## BiotechTube Company Data`)
    parts.push(`- Name: ${company.name}`)
    if (company.description) parts.push(`- Description: ${company.description}`)
    if (company.ticker) parts.push(`- Ticker: ${company.ticker}`)
    if (company.valuation) parts.push(`- Valuation: ${formatUSD(company.valuation)}`)
    if (company.categories?.length) parts.push(`- Categories: ${company.categories.join(', ')}`)
    if (company.country) parts.push(`- HQ: ${company.country}`)
  }

  // Pipeline context
  if (pipeline?.length) {
    parts.push(`\n## Pipeline (${pipeline.length} programs)`)
    for (const drug of pipeline.slice(0, 6)) {
      parts.push(`- ${drug.product_name}: ${drug.indication || 'Undisclosed'} (${drug.phase || 'Preclinical'})`)
    }
    if (pipeline.length > 6) parts.push(`- ...and ${pipeline.length - 6} more`)
  }

  // Market data
  if (recentPrice) {
    parts.push(`\n## Market Data`)
    parts.push(`- Last Close: $${recentPrice.close.toFixed(2)}`)
    parts.push(`- Daily Change: ${recentPrice.change_pct >= 0 ? '+' : ''}${recentPrice.change_pct.toFixed(2)}%`)
    if (recentPrice.market_cap_usd) parts.push(`- Market Cap: ${formatUSD(recentPrice.market_cap_usd)}`)
  }

  // Sources
  if (sources.length) {
    parts.push(`\n## Sources`)
    for (const src of sources) {
      parts.push(`- ${src.name}: ${src.url}${src.date ? ` (${src.date})` : ''}`)
    }
  }

  parts.push(`\n## Instructions`)
  parts.push(`Write an ORIGINAL article about this news. Do NOT paraphrase or rewrite the source article.`)
  parts.push(`Credit "${rssItem.source_name}" as the original source.`)
  parts.push(`Add BiotechTube context: company data, pipeline status, market reaction, competitive landscape.`)
  parts.push(`Your article should offer analysis and context that the original source does not provide.`)
  parts.push(`Focus on what this news means for investors, the disease area, and the competitive landscape.`)

  return parts.join('\n')
}
