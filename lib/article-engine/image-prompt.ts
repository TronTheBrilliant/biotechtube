// Article Engine — Hero Image Prompt Generation

import type { ArticleType, ArticleContext, PlaceholderStyle } from './types'

const BASE_IMAGE_TEMPLATE = `A premium editorial illustration for a biotech market intelligence article. Navy blue (#0A1628) background with subtle emerald green (#10B981) accents. Bloomberg Businessweek aesthetic — clean, geometric, sophisticated. Abstract and conceptual. NO text, NO words, NO letters, NO numbers rendered in the image. Professional, data-driven feel.`

/**
 * Build type-specific visual elements, enriched with context when available.
 */
function getTypeElements(articleType: ArticleType, context?: ArticleContext): string {
  const sector = context?.fundingRound?.sector || context?.company?.categories?.[0] || null
  const indication = context?.pipeline?.[0]?.indication || null
  const companyName = context?.company?.name || context?.fundingRound?.company_name || null

  switch (articleType) {
    case 'funding_deal': {
      let base = 'Abstract representation of capital flow — geometric shapes suggesting growth, upward momentum, interconnected nodes representing investor networks. Golden accent highlights.'
      if (sector) base += ` Subtle visual nods to ${sector} sector.`
      if (indication) base += ` Molecular motifs evoking ${indication} research.`
      return base
    }
    case 'clinical_trial': {
      let base = 'Molecular structures and abstract DNA helices. Scientific precision meets editorial design. Subtle laboratory glassware silhouettes. Teal and green tones.'
      if (indication) base += ` Visual elements suggesting ${indication} therapy area.`
      if (sector) base += ` ${sector}-themed scientific imagery.`
      return base
    }
    case 'market_analysis': {
      let base = 'Abstract chart patterns, candlestick-inspired geometric forms. Data visualization aesthetic with flowing lines and grid patterns. Cool blue and white tones.'
      if (sector) base += ` Subtle ${sector} sector iconography woven into the data patterns.`
      return base
    }
    case 'company_deep_dive': {
      let base = 'Corporate architecture meets biology — abstract building forms intertwined with organic cell-like shapes. Depth and layers suggesting comprehensive analysis.'
      if (sector) base += ` Visual references to ${sector} industry.`
      if (indication) base += ` Hints of ${indication}-related molecular structures.`
      return base
    }
    case 'weekly_roundup':
      return 'Mosaic of geometric biotech symbols — pills, molecules, charts, buildings — arranged in a balanced editorial grid. Multiple accent colors in harmony.'
    case 'breaking_news':
      return 'Dynamic composition with sharp angular forms suggesting urgency and impact. Lightning-bolt energy with precise geometric control. Bright accent against dark backdrop.'
    default:
      return 'Abstract chart patterns, candlestick-inspired geometric forms. Data visualization aesthetic with flowing lines and grid patterns. Cool blue and white tones.'
  }
}

/**
 * Generate a branded hero image prompt combining the base template
 * with article-type-specific elements (context-aware) and the AI-suggested topic.
 */
export function generateImagePrompt(articleType: ArticleType, imageTopic: string, context?: ArticleContext): string {
  const typeElement = getTypeElements(articleType, context)
  return `${BASE_IMAGE_TEMPLATE}\n\nTopic context: ${imageTopic}\n\nVisual direction: ${typeElement}`
}

const PLACEHOLDER_STYLES: Record<ArticleType, PlaceholderStyle> = {
  funding_deal: {
    pattern: 'bars',
    accentColor: '#10B981',
    icon: 'trending-up',
  },
  clinical_trial: {
    pattern: 'hexgrid',
    accentColor: '#06B6D4',
    icon: 'flask-conical',
  },
  market_analysis: {
    pattern: 'grid',
    accentColor: '#3B82F6',
    icon: 'bar-chart-2',
  },
  company_deep_dive: {
    pattern: 'circles',
    accentColor: '#8B5CF6',
    icon: 'building-2',
  },
  weekly_roundup: {
    pattern: 'waves',
    accentColor: '#F59E0B',
    icon: 'newspaper',
  },
  breaking_news: {
    pattern: 'burst',
    accentColor: '#EF4444',
    icon: 'zap',
  },
}

/**
 * Get the placeholder style for CSS-based hero images (before real image generation).
 */
export function getPlaceholderStyle(articleType: ArticleType): PlaceholderStyle {
  return PLACEHOLDER_STYLES[articleType] || PLACEHOLDER_STYLES.market_analysis
}
