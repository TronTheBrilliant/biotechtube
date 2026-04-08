// Article Engine — Core Types

export type ArticleType = 'funding_deal' | 'clinical_trial' | 'market_analysis' | 'company_deep_dive' | 'weekly_roundup' | 'breaking_news' | 'science_essay' | 'innovation_spotlight'
export type ArticleStatus = 'draft' | 'in_review' | 'published' | 'archived'
export type ConfidenceLevel = 'high' | 'medium' | 'low'
export type EditedBy = 'ai' | 'human' | 'ai+human'
export type ArticleStyle = 'investor_lens' | 'science_lens' | 'market_analyst' | 'editorial_narrative' | 'deal_spotlight' | 'data_digest' | 'narrative_science' | 'innovation_curator'

// ── TipTap Block Types ──

export interface TipTapDoc {
  type: 'doc'
  content: TipTapNode[]
}

export type TipTapNode =
  | ParagraphNode
  | HeadingNode
  | PullQuoteNode
  | CompanyCardNode
  | ChartEmbedNode
  | PipelineTableNode
  | DataCalloutNode
  | ImageNode
  | DividerNode

export interface ParagraphNode {
  type: 'paragraph'
  content: Array<{
    type: 'text'
    text: string
    marks?: Array<{ type: string; attrs?: Record<string, any> }>
  }>
}

export interface HeadingNode {
  type: 'heading'
  attrs: { level: 2 | 3 }
  content: Array<{ type: 'text'; text: string }>
}

export interface PullQuoteNode {
  type: 'pullQuote'
  attrs: { content: string }
}

export interface CompanyCardNode {
  type: 'companyCard'
  attrs: { companyId: string }
}

export interface ChartEmbedNode {
  type: 'chartEmbed'
  attrs: {
    companyId: string
    chartType: 'price_history' | 'funding_history' | 'market_cap'
    period: string
  }
}

export interface PipelineTableNode {
  type: 'pipelineTable'
  attrs: { companyId: string }
}

export interface DataCalloutNode {
  type: 'dataCallout'
  attrs: {
    value: string
    label: string
    trend?: 'up' | 'down' | 'neutral'
  }
}

export interface ImageNode {
  type: 'image'
  attrs: { src: string; alt: string; caption?: string }
}

export interface DividerNode {
  type: 'divider'
}

// ── Sources ──

export interface Source {
  name: string
  url: string
  date?: string
}

// ── Placeholder Style ──

export interface PlaceholderStyle {
  pattern: 'bars' | 'hexgrid' | 'waves' | 'circles' | 'grid' | 'burst'
  accentColor: string
  icon: string
}

// ── DeepSeek Intermediate Output ──

export interface AIArticleOutput {
  headline: string
  subtitle: string
  summary: string
  sections: AISection[]
  sources: Source[]
  image_topic: string
}

export type AISection =
  | { type: 'text'; content: string }
  | { type: 'heading'; content: string; level: 2 | 3 }
  | { type: 'quote'; content: string }
  | { type: 'company_mention'; reason: string }
  | { type: 'chart_suggestion'; chart_type: string; period: string }
  | { type: 'data_point'; value: string; label: string }

// ── Context from DB ──

export interface ArticleContext {
  company?: {
    id: string
    name: string
    slug: string
    description: string | null
    categories: string[] | null
    ticker: string | null
    valuation: number | null
    logo_url: string | null
    website: string | null
    country: string | null
  }
  pipeline?: Array<{
    product_name: string
    indication: string | null
    phase: string | null
    status: string | null
  }>
  fundingRound?: {
    id: string
    company_name?: string
    amount_usd: number
    round_type: string
    lead_investor: string | null
    investors: string[] | null
    announced_date: string
    sector: string | null
    country: string | null
    confidence: string | null
  }
  rssItem?: {
    id: string
    title: string
    url: string
    source_name: string
    summary: string | null
    published_at: string | null
    category: string
    company_names: string[]
  }
  recentPrice?: {
    close: number
    change_pct: number
    market_cap_usd: number | null
  }
  sources: Source[]
  companyInDB: boolean
  companyHasFullProfile: boolean
  numbersVerifiedFromDB: boolean
}

// ── Engine Input / Output ──

export interface ArticleInput {
  type: ArticleType
  source: Record<string, any>
  style?: ArticleStyle
}

export interface GeneratedArticle {
  slug: string
  type: ArticleType
  status: ArticleStatus
  confidence: ConfidenceLevel
  headline: string
  subtitle: string
  body: TipTapDoc
  summary: string
  hero_image_prompt: string
  hero_placeholder_style: PlaceholderStyle
  sources: Source[]
  company_id: string | null
  company_ids: string[]
  sector: string | null
  article_style: ArticleStyle
  metadata: Record<string, any>
  reading_time_min: number
  seo_title: string | null
  seo_description: string | null
  published_at: string | null
  edited_by: EditedBy
}
