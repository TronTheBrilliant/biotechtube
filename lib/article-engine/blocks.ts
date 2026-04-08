// Article Engine — TipTap Block Conversion

import type {
  AIArticleOutput,
  AISection,
  TipTapDoc,
  TipTapNode,
  ParagraphNode,
  HeadingNode,
  PullQuoteNode,
  CompanyCardNode,
  ChartEmbedNode,
  DataCalloutNode,
} from './types'

/**
 * Convert AI output sections to a TipTap document structure.
 */
export function convertToBlocks(output: AIArticleOutput, companyId?: string): TipTapDoc {
  const nodes: TipTapNode[] = []

  for (const section of output.sections) {
    const node = sectionToNode(section, companyId)
    if (node) nodes.push(node)
  }

  // Ensure we have at least one node
  if (nodes.length === 0) {
    nodes.push(textToParagraph(output.summary || 'Article content unavailable.'))
  }

  return { type: 'doc', content: nodes }
}

function sectionToNode(section: AISection, companyId?: string): TipTapNode | null {
  switch (section.type) {
    case 'text':
      return textToParagraph(section.content)

    case 'heading': {
      const level = (section.level === 2 || section.level === 3) ? section.level : 2
      return {
        type: 'heading',
        attrs: { level },
        content: [{ type: 'text', text: section.content }],
      } as HeadingNode
    }

    case 'quote':
      return {
        type: 'pullQuote',
        attrs: { content: section.content },
      } as PullQuoteNode

    case 'company_mention':
      if (!companyId) return null
      return {
        type: 'companyCard',
        attrs: { companyId },
      } as CompanyCardNode

    case 'chart_suggestion': {
      if (!companyId) return null
      const chartType = normalizeChartType(section.chart_type)
      return {
        type: 'chartEmbed',
        attrs: {
          companyId,
          chartType,
          period: section.period || '1y',
        },
      } as ChartEmbedNode
    }

    case 'data_point':
      return {
        type: 'dataCallout',
        attrs: {
          value: section.value,
          label: section.label,
        },
      } as DataCalloutNode

    default:
      return null
  }
}

function textToParagraph(text: string): ParagraphNode {
  // Split on **bold** markers to create text nodes with marks
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  const content: ParagraphNode['content'] = []

  for (const part of parts) {
    if (!part) continue
    if (part.startsWith('**') && part.endsWith('**')) {
      content.push({
        type: 'text',
        text: part.slice(2, -2),
        marks: [{ type: 'bold' }],
      })
    } else {
      content.push({ type: 'text', text: part })
    }
  }

  if (content.length === 0) {
    content.push({ type: 'text', text: '' })
  }

  return { type: 'paragraph', content }
}

function normalizeChartType(raw: string): 'price_history' | 'funding_history' | 'market_cap' {
  const lower = raw.toLowerCase().replace(/[\s_-]+/g, '_')
  if (lower.includes('price')) return 'price_history'
  if (lower.includes('funding')) return 'funding_history'
  if (lower.includes('market') || lower.includes('cap')) return 'market_cap'
  return 'price_history'
}

/**
 * Estimate reading time from sections. ~200 WPM.
 */
export function estimateReadingTime(output: AIArticleOutput): number {
  let wordCount = 0

  // Count words in headline, subtitle, summary
  wordCount += countWords(output.headline)
  wordCount += countWords(output.subtitle)
  wordCount += countWords(output.summary)

  // Count words in sections
  for (const section of output.sections) {
    if ('content' in section && typeof section.content === 'string') {
      wordCount += countWords(section.content)
    }
    if (section.type === 'data_point') {
      wordCount += countWords(section.value) + countWords(section.label)
    }
  }

  const minutes = Math.max(1, Math.ceil(wordCount / 200))
  return minutes
}

function countWords(text: string | undefined): number {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}
