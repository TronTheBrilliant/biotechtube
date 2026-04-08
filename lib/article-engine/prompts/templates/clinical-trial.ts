// Article Engine — Clinical Trial Prompt Template

import type { ArticleContext } from '../../types'

export function buildClinicalTrialPrompt(context: ArticleContext): string {
  const { company, pipeline, rssItem, recentPrice, sources } = context
  if (!company) return 'Write a biotech clinical trial analysis article.'

  const parts: string[] = []

  // Company overview
  parts.push(`## Company`)
  parts.push(`- Name: ${company.name}`)
  if (company.description) parts.push(`- Description: ${company.description}`)
  if (company.ticker) parts.push(`- Ticker: ${company.ticker}`)
  if (company.categories?.length) parts.push(`- Therapeutic Areas: ${company.categories.join(', ')}`)
  if (company.country) parts.push(`- HQ: ${company.country}`)

  // Pipeline drugs — the core of the article
  if (pipeline?.length) {
    parts.push(`\n## Pipeline (${pipeline.length} programs)`)
    for (const drug of pipeline) {
      const status = drug.status ? ` [${drug.status}]` : ''
      parts.push(`- ${drug.product_name}: ${drug.indication || 'Undisclosed indication'} (${drug.phase || 'Preclinical'})${status}`)
    }
  }

  // Related trial news
  if (rssItem) {
    parts.push(`\n## Latest Trial News`)
    parts.push(`- Headline: ${rssItem.title}`)
    parts.push(`- Source: ${rssItem.source_name}`)
    if (rssItem.published_at) parts.push(`- Published: ${rssItem.published_at}`)
    if (rssItem.summary) parts.push(`- Summary: ${rssItem.summary}`)
  }

  // Market data
  if (recentPrice) {
    parts.push(`\n## Market Data`)
    parts.push(`- Last Close: $${recentPrice.close.toFixed(2)}`)
    parts.push(`- Daily Change: ${recentPrice.change_pct >= 0 ? '+' : ''}${recentPrice.change_pct.toFixed(2)}%`)
    if (recentPrice.market_cap_usd) {
      const mcap = recentPrice.market_cap_usd >= 1e9
        ? `$${(recentPrice.market_cap_usd / 1e9).toFixed(1)}B`
        : `$${(recentPrice.market_cap_usd / 1e6).toFixed(0)}M`
      parts.push(`- Market Cap: ${mcap}`)
    }
  }

  // Sources
  if (sources.length) {
    parts.push(`\n## Sources`)
    for (const src of sources) {
      parts.push(`- ${src.name}: ${src.url}${src.date ? ` (${src.date})` : ''}`)
    }
  }

  parts.push(`\n## Instructions`)
  parts.push(`Write an original clinical trial analysis article for ${company.name}.`)
  parts.push(`Focus on:`)
  parts.push(`1. The SCIENCE — mechanism of action, how the drug works, what biological pathway it targets.`)
  parts.push(`2. The TRIAL — phase, endpoints, patient population, expected timeline for results.`)
  parts.push(`3. The COMPETITIVE LANDSCAPE — who else is targeting this indication, how does this approach compare.`)
  parts.push(`4. The IMPLICATIONS — what does this mean for patients, for investors, and for the disease area.`)
  parts.push(`If specific trial news is provided, center the article around that news event.`)
  parts.push(`If only pipeline data is available, write a pipeline overview with clinical context.`)
  parts.push(`Name specific drugs, indications, and phases — do not be vague.`)

  return parts.join('\n')
}
