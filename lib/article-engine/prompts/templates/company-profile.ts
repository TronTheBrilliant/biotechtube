// Article Engine — Company Deep Dive Prompt Template

import type { ArticleContext } from '../../types'

function formatUSD(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount}`
}

export function buildCompanyProfilePrompt(context: ArticleContext): string {
  const { company, pipeline, fundingRound, recentPrice, sources } = context
  const meta = (context as any).metadata || {}

  if (!company) return 'Write a biotech company deep dive article.'

  const parts: string[] = []

  // Company profile
  parts.push(`## Company Profile`)
  parts.push(`- Name: ${company.name}`)
  if (company.description) parts.push(`- Description: ${company.description}`)
  if (company.ticker) parts.push(`- Ticker: ${company.ticker}`)
  if (company.valuation) parts.push(`- Valuation: ${formatUSD(company.valuation)}`)
  if (company.categories?.length) parts.push(`- Categories: ${company.categories.join(', ')}`)
  if (company.country) parts.push(`- HQ: ${company.country}`)
  if (company.website) parts.push(`- Website: ${company.website}`)

  // Key people
  if (meta.key_people && Array.isArray(meta.key_people) && meta.key_people.length) {
    parts.push(`\n## Key People`)
    for (const person of meta.key_people.slice(0, 10)) {
      const name = person.name || 'Unknown'
      const role = person.role || person.title || ''
      parts.push(`- ${name}${role ? ` — ${role}` : ''}`)
    }
  }

  // Technology platforms
  if (meta.technology_platforms) {
    parts.push(`\n## Technology Platforms`)
    if (Array.isArray(meta.technology_platforms)) {
      for (const tp of meta.technology_platforms) {
        parts.push(`- ${typeof tp === 'string' ? tp : tp.name || JSON.stringify(tp)}`)
      }
    } else if (typeof meta.technology_platforms === 'string') {
      parts.push(meta.technology_platforms)
    }
  }

  // Pipeline
  if (pipeline?.length) {
    parts.push(`\n## Pipeline (${pipeline.length} programs)`)
    for (const drug of pipeline) {
      const status = drug.status ? ` [${drug.status}]` : ''
      parts.push(`- ${drug.product_name}: ${drug.indication || 'Undisclosed indication'} (${drug.phase || 'Preclinical'})${status}`)
    }
  }

  // Funding history
  if (meta.funding_history?.length) {
    parts.push(`\n## Funding History (${meta.funding_history.length} rounds)`)
    let totalRaised = 0
    for (const round of meta.funding_history.slice(0, 10)) {
      totalRaised += round.amount_usd || 0
      parts.push(`- ${round.announced_date}: ${round.round_type} — ${formatUSD(round.amount_usd)}${round.lead_investor ? ` (led by ${round.lead_investor})` : ''}`)
    }
    parts.push(`- Total Raised: ${formatUSD(totalRaised)}`)
  } else if (fundingRound) {
    parts.push(`\n## Latest Funding`)
    parts.push(`- ${fundingRound.round_type}: ${formatUSD(fundingRound.amount_usd)} (${fundingRound.announced_date})`)
    if (fundingRound.lead_investor) parts.push(`- Lead: ${fundingRound.lead_investor}`)
  }

  // Market data
  if (recentPrice) {
    parts.push(`\n## Market Data`)
    parts.push(`- Last Close: $${recentPrice.close.toFixed(2)}`)
    parts.push(`- Daily Change: ${recentPrice.change_pct >= 0 ? '+' : ''}${recentPrice.change_pct.toFixed(2)}%`)
    if (recentPrice.market_cap_usd) parts.push(`- Market Cap: ${formatUSD(recentPrice.market_cap_usd)}`)
  }

  // 30-day price trend
  if (meta.price_history_30d?.length >= 2) {
    const prices = meta.price_history_30d
    const oldest = prices[prices.length - 1]
    const newest = prices[0]
    const change30d = ((newest.close - oldest.close) / oldest.close) * 100
    parts.push(`- 30-Day Price Change: ${change30d >= 0 ? '+' : ''}${change30d.toFixed(2)}%`)
  }

  // Competitive landscape
  if (meta.competitive_landscape) {
    parts.push(`\n## Competitive Landscape`)
    if (typeof meta.competitive_landscape === 'string') {
      parts.push(meta.competitive_landscape)
    } else if (Array.isArray(meta.competitive_landscape)) {
      for (const comp of meta.competitive_landscape) {
        parts.push(`- ${typeof comp === 'string' ? comp : comp.name || JSON.stringify(comp)}`)
      }
    }
  }

  // Financial summary
  if (meta.financial_summary && typeof meta.financial_summary === 'string') {
    parts.push(`\n## Financial Summary`)
    parts.push(meta.financial_summary)
  }

  // Recent news
  if (meta.recent_news?.length) {
    parts.push(`\n## Recent News (${meta.recent_news.length} items)`)
    for (const item of meta.recent_news.slice(0, 5)) {
      parts.push(`- ${item.title} (${item.source_name}, ${item.published_at || 'undated'})`)
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
  parts.push(`Write a comprehensive company spotlight / deep dive for ${company.name}.`)
  parts.push(`Cover ALL of the following:`)
  parts.push(`1. BUSINESS MODEL — what the company does, its core technology platform, revenue model.`)
  parts.push(`2. PIPELINE VALUE — key drug candidates, their phases, target indications, and differentiation.`)
  parts.push(`3. COMPETITIVE POSITIONING — how it compares to peers, unique advantages or risks.`)
  parts.push(`4. FINANCIAL & MARKET PERFORMANCE — funding history, stock performance, valuation context.`)
  parts.push(`5. INVESTMENT THESIS — bull case and bear case, key catalysts to watch.`)
  parts.push(`If key people data is available, mention notable leadership.`)
  parts.push(`This is a deep, authoritative company profile. Be thorough and analytical.`)

  return parts.join('\n')
}
