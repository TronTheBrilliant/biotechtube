// Article Engine — Funding Deal Prompt Template

import type { ArticleContext } from '../../types'

function formatUSD(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount}`
}

export function buildFundingPrompt(context: ArticleContext): string {
  const { fundingRound, company, pipeline, recentPrice, sources } = context
  if (!fundingRound) return 'Write a biotech funding analysis article.'

  const parts: string[] = []

  // Deal overview
  parts.push(`## Funding Round`)
  parts.push(`- Company: ${fundingRound.company_name || company?.name || 'Unknown'}`)
  parts.push(`- Amount: ${formatUSD(fundingRound.amount_usd)}`)
  parts.push(`- Round Type: ${fundingRound.round_type || 'Undisclosed'}`)
  parts.push(`- Announced: ${fundingRound.announced_date}`)
  if (fundingRound.lead_investor) parts.push(`- Lead Investor: ${fundingRound.lead_investor}`)
  if (fundingRound.investors?.length) parts.push(`- Other Investors: ${fundingRound.investors.join(', ')}`)
  if (fundingRound.sector) parts.push(`- Sector: ${fundingRound.sector}`)
  if (fundingRound.country) parts.push(`- Country: ${fundingRound.country}`)

  // Company profile
  if (company) {
    parts.push(`\n## Company Profile`)
    parts.push(`- Name: ${company.name}`)
    if (company.description) parts.push(`- Description: ${company.description}`)
    if (company.ticker) parts.push(`- Ticker: ${company.ticker}`)
    if (company.valuation) parts.push(`- Valuation: ${formatUSD(company.valuation)}`)
    if (company.categories?.length) parts.push(`- Categories: ${company.categories.join(', ')}`)
    if (company.country) parts.push(`- HQ: ${company.country}`)
    if (company.website) parts.push(`- Website: ${company.website}`)
  }

  // Pipeline drugs
  if (pipeline?.length) {
    parts.push(`\n## Pipeline (${pipeline.length} programs)`)
    for (const drug of pipeline.slice(0, 8)) {
      const status = drug.status ? ` [${drug.status}]` : ''
      parts.push(`- ${drug.product_name}: ${drug.indication || 'Undisclosed indication'} (${drug.phase || 'Preclinical'})${status}`)
    }
    if (pipeline.length > 8) parts.push(`- ...and ${pipeline.length - 8} more programs`)
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
  parts.push(`Write an original article about this funding round. Use the data above for accuracy.`)
  parts.push(`Do NOT simply paraphrase the source — add analytical context, competitive landscape, and forward-looking commentary.`)
  parts.push(`If pipeline data is available, mention the lead drug candidates by name.`)
  parts.push(`If market data is available, note how the stock reacted or what the valuation implies.`)

  return parts.join('\n')
}
