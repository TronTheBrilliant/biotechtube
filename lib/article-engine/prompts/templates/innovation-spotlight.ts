// Article Engine — Innovation Spotlight Prompt Template

import type { ArticleContext } from '../../types'

function formatValuation(val: number | null): string {
  if (!val) return ''
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(0)}M`
  return `$${val}`
}

export function buildInnovationSpotlightPrompt(context: ArticleContext): string {
  const meta = (context as any).metadata || {}
  const parts: string[] = []

  parts.push(`## Innovation Spotlight: Biotech Breakthroughs`)
  parts.push(`Focus: ${meta.focus || 'Latest biotech innovations'}`)
  if (meta.angle) {
    parts.push(`Angle: ${meta.angle}`)
  }
  if (meta.theme) {
    parts.push(`Theme: ${meta.theme}`)
  }
  parts.push(`Number of innovation areas identified: ${meta.topic_count || 0}`)

  // Innovation details
  if (meta.innovations?.length) {
    parts.push(`\n## Innovations to Cover`)
    for (let i = 0; i < meta.innovations.length; i++) {
      const innovation = meta.innovations[i]
      parts.push(`\n### Innovation ${i + 1}: ${innovation.topic}`)
      parts.push(`- Leading Company: ${innovation.company_name}`)
      parts.push(`- Categories: ${innovation.company_categories?.join(', ') || 'biotech'}`)
      if (innovation.company_valuation) {
        parts.push(`- Company Valuation: ${formatValuation(innovation.company_valuation)}`)
      }

      if (innovation.pipeline?.length) {
        parts.push(`- Pipeline:`)
        for (const p of innovation.pipeline) {
          parts.push(`  - ${p.product_name}: ${p.indication || 'Multiple indications'} (${p.phase || 'Preclinical'})`)
        }
      }

      if (innovation.papers?.length) {
        parts.push(`- Supporting Research:`)
        for (const paper of innovation.papers) {
          parts.push(`  - "${paper.title}" (${paper.journal || 'PubMed'})`)
          if (paper.abstract) {
            parts.push(`    ${paper.abstract.slice(0, 200)}...`)
          }
        }
      }
    }
  }

  // Sources
  if (context.sources.length) {
    parts.push(`\n## Available Sources`)
    for (const src of context.sources) {
      parts.push(`- ${src.name}: ${src.url}${src.date ? ` (${src.date})` : ''}`)
    }
  }

  parts.push(`\n## Writing Instructions`)
  parts.push(`Write an Innovation Spotlight article — a curated list of the most important biotech breakthroughs happening right now.`)
  parts.push(``)
  parts.push(`STRUCTURE:`)
  parts.push(`1. ENGAGING INTRO (1-2 paragraphs) — Frame the current moment in biotech innovation. What makes right now special? Set up why these innovations matter. Use a striking framing.`)
  parts.push(``)
  parts.push(`2. THE INNOVATIONS (5-7 items, each gets its own heading) — For each innovation:`)
  parts.push(`   - Give it a compelling heading (not just the technology name)`)
  parts.push(`   - WHAT IT IS: Explain the technology/approach in 2-3 sentences`)
  parts.push(`   - WHY IT MATTERS: The "so what" — impact on patients, industry, science`)
  parts.push(`   - WHO'S LEADING: Name the specific company and their pipeline status from the data`)
  parts.push(`   - KEY STAT: Include a data callout with a striking number (funding amount, patient population, market size, success rate)`)
  parts.push(``)
  parts.push(`3. CONNECTING THREAD (1 paragraph) — What ties these innovations together? What do they tell us about where biotech is heading?`)
  parts.push(``)
  parts.push(`4. FORWARD LOOK (1 paragraph) — What to watch for in the coming months. Upcoming catalysts, readouts, or milestones.`)
  parts.push(``)
  parts.push(`REQUIREMENTS:`)
  parts.push(`- Mix therapeutic areas — do NOT make it all oncology. Include diverse areas from the data.`)
  parts.push(`- Cite PubMed papers as sources (include in the sources array)`)
  parts.push(`- Include a data callout for each innovation (use data_point sections)`)
  parts.push(`- Make it scannable — clear headings, short paragraphs, bold key terms`)
  parts.push(`- Shareable format — each innovation should stand alone as interesting`)
  parts.push(`- Reference actual companies and drugs from the provided data`)
  parts.push(`- Aim for 800-1000 words total`)

  return parts.join('\n')
}
