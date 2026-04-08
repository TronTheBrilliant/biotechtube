// Article Engine — Weekly Roundup Prompt Template

import type { ArticleContext } from '../../types'

function formatUSD(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount}`
}

export function buildRoundupPrompt(context: ArticleContext): string {
  const meta = (context as any).metadata || {}
  const parts: string[] = []

  parts.push(`## Week: ${meta.week_start || 'Unknown'} to ${meta.week_end || 'Unknown'}`)

  // Funding summary
  parts.push(`\n## Funding Activity`)
  parts.push(`- Total Rounds: ${meta.funding_count || 0}`)
  parts.push(`- Total Raised: ${meta.funding_total_usd ? formatUSD(meta.funding_total_usd) : '$0'}`)

  if (meta.funding_by_sector && Object.keys(meta.funding_by_sector).length) {
    parts.push(`- By Sector:`)
    for (const [sector, count] of Object.entries(meta.funding_by_sector)) {
      parts.push(`  - ${sector}: ${count} deals`)
    }
  }

  // Top deals
  if (meta.top_deals?.length) {
    parts.push(`\n## Top Deals`)
    for (const deal of meta.top_deals) {
      parts.push(`- ${deal.company_name || 'Unknown'}: ${formatUSD(deal.amount_usd)} ${deal.round_type || ''} (${deal.announced_date})${deal.lead_investor ? ` — led by ${deal.lead_investor}` : ''}`)
    }
  }

  // News summary
  parts.push(`\n## News Summary`)
  parts.push(`- Total News Items: ${meta.news_count || 0}`)
  if (meta.news_by_category && Object.keys(meta.news_by_category).length) {
    parts.push(`- By Category:`)
    for (const [cat, count] of Object.entries(meta.news_by_category)) {
      parts.push(`  - ${cat}: ${count}`)
    }
  }

  if (meta.notable_news?.length) {
    parts.push(`\n## Notable Headlines`)
    for (const item of meta.notable_news) {
      parts.push(`- ${item.title} (${item.source_name || 'Unknown'})`)
    }
  }

  // Market performance
  if (meta.market_snapshots?.length) {
    parts.push(`\n## Market Performance`)
    if (meta.market_cap_change_pct != null) {
      parts.push(`- Weekly Market Cap Change: ${meta.market_cap_change_pct >= 0 ? '+' : ''}${meta.market_cap_change_pct.toFixed(2)}%`)
    }
    const latest = meta.market_snapshots[0]
    if (latest.total_market_cap) parts.push(`- Total Market Cap: ${formatUSD(latest.total_market_cap)}`)
    if (latest.gainers_count != null) parts.push(`- Gainers: ${latest.gainers_count}`)
    if (latest.losers_count != null) parts.push(`- Losers: ${latest.losers_count}`)
  }

  // Top movers
  if (meta.top_movers?.length) {
    parts.push(`\n## Top Stock Movers`)
    for (const m of meta.top_movers) {
      parts.push(`- ${m.company_name}${m.ticker ? ` (${m.ticker})` : ''}: ${m.change_pct >= 0 ? '+' : ''}${m.change_pct.toFixed(2)}%`)
    }
  }

  // Sources
  if (context.sources.length) {
    parts.push(`\n## Sources`)
    for (const src of context.sources) {
      parts.push(`- ${src.name}: ${src.url}${src.date ? ` (${src.date})` : ''}`)
    }
  }

  parts.push(`\n## Instructions`)
  parts.push(`Write a weekly biotech roundup for the week of ${meta.week_start || 'this week'}.`)
  parts.push(`Structure as a digestible summary hitting these sections:`)
  parts.push(`1. MARKET OVERVIEW — how did the biotech market perform this week? Gainers vs losers.`)
  parts.push(`2. TOP DEALS — highlight the biggest funding rounds, who invested, and what it signals.`)
  parts.push(`3. CLINICAL & REGULATORY — any trial results, FDA decisions, or pipeline news.`)
  parts.push(`4. NOTABLE NEWS — key headlines and what they mean for the industry.`)
  parts.push(`5. WEEK AHEAD — what to watch next week (expected data readouts, FDA dates, conferences).`)
  parts.push(`Keep it punchy and scannable. Use the actual numbers provided.`)
  parts.push(`This is a newsletter-style weekly summary, not a deep analysis.`)

  return parts.join('\n')
}
