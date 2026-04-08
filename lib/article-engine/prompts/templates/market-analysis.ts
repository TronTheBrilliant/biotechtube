// Article Engine — Market Analysis Prompt Template

import type { ArticleContext } from '../../types'

function formatUSD(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount}`
}

export function buildMarketAnalysisPrompt(context: ArticleContext): string {
  const meta = (context as any).metadata || {}
  const parts: string[] = []

  // Sector-specific analysis
  if (meta.sector_name) {
    parts.push(`## Sector: ${meta.sector_name}`)
    if (meta.sector_company_count) parts.push(`- Companies in sector: ${meta.sector_company_count}`)

    if (meta.sector_data) {
      const sd = meta.sector_data
      parts.push(`\n## Sector Performance`)
      if (sd.change_1d_pct != null) parts.push(`- 1-Day Change: ${sd.change_1d_pct >= 0 ? '+' : ''}${sd.change_1d_pct.toFixed(2)}%`)
      if (sd.change_7d_pct != null) parts.push(`- 7-Day Change: ${sd.change_7d_pct >= 0 ? '+' : ''}${sd.change_7d_pct.toFixed(2)}%`)
      if (sd.change_30d_pct != null) parts.push(`- 30-Day Change: ${sd.change_30d_pct >= 0 ? '+' : ''}${sd.change_30d_pct.toFixed(2)}%`)
      if (sd.total_market_cap) parts.push(`- Sector Market Cap: ${formatUSD(sd.total_market_cap)}`)
      if (sd.avg_pe_ratio) parts.push(`- Avg P/E Ratio: ${sd.avg_pe_ratio.toFixed(1)}`)
    }
  }

  // All sectors overview (when no specific sector)
  if (meta.all_sectors?.length) {
    parts.push(`## All Sector Performance (Latest)`)
    for (const s of meta.all_sectors) {
      const change = s.change_1d_pct != null ? ` (1d: ${s.change_1d_pct >= 0 ? '+' : ''}${s.change_1d_pct.toFixed(2)}%)` : ''
      parts.push(`- Sector ${s.sector_id}: Market Cap ${s.total_market_cap ? formatUSD(s.total_market_cap) : 'N/A'}${change}`)
    }
  }

  // Top companies in sector
  if (meta.top_companies?.length) {
    parts.push(`\n## Top Companies by Market Cap`)
    for (const c of meta.top_companies) {
      parts.push(`- ${c.name}${c.ticker ? ` (${c.ticker})` : ''}: ${c.valuation ? formatUSD(c.valuation) : 'N/A'} — ${c.country || 'Unknown'}`)
    }
  }

  // Overall market context
  if (meta.market_snapshot) {
    const ms = meta.market_snapshot
    parts.push(`\n## Overall Biotech Market`)
    if (ms.total_market_cap) parts.push(`- Total Market Cap: ${formatUSD(ms.total_market_cap)}`)
    if (ms.total_companies) parts.push(`- Total Companies Tracked: ${ms.total_companies}`)
    if (ms.gainers_count != null) parts.push(`- Gainers: ${ms.gainers_count}`)
    if (ms.losers_count != null) parts.push(`- Losers: ${ms.losers_count}`)
    if (ms.avg_change_pct != null) parts.push(`- Avg Change: ${ms.avg_change_pct >= 0 ? '+' : ''}${ms.avg_change_pct.toFixed(2)}%`)
  }

  // Sources
  if (context.sources.length) {
    parts.push(`\n## Sources`)
    for (const src of context.sources) {
      parts.push(`- ${src.name}: ${src.url}${src.date ? ` (${src.date})` : ''}`)
    }
  }

  parts.push(`\n## Instructions`)
  parts.push(`Write a biotech market analysis article.`)
  parts.push(`Focus on:`)
  parts.push(`1. WHY the sector or market moved — identify catalysts, FDA decisions, macro trends.`)
  parts.push(`2. KEY MOVERS — highlight specific companies and what drove their performance.`)
  parts.push(`3. TRENDS — spot patterns in the data (sector rotation, risk-on/off, pipeline catalysts).`)
  parts.push(`4. OUTLOOK — forward-looking commentary on what to watch next.`)
  parts.push(`Use the actual numbers provided. Do not invent data points.`)
  parts.push(`This is a data-driven market analysis, not a company profile.`)

  return parts.join('\n')
}
