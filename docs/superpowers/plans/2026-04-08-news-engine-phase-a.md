# News Engine Phase A — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the article engine core with funding_deal + breaking_news types, article display pages, homepage integration, and branded placeholders — all auto-generating and displaying today.

**Architecture:** Shared ArticleEngine library at `lib/article-engine/` with per-type source gatherers and prompt templates. Single orchestrator cron replaces the existing generate-articles cron. New unified `articles` table with JSONB block body. New `/news/[slug]` route for all article types. Old routes/tables untouched.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (PostgreSQL + Storage), DeepSeek API (via OpenAI SDK), Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-04-08-news-engine-design.md`

---

## Chunk 1: Database & Types

### Task 1: Create `articles` table migration

**Files:**
- Create: `lib/article-engine/types.ts`

- [ ] **Step 1: Create the `articles` table in Supabase**

Run this migration via the Supabase MCP tool (`apply_migration`):

```sql
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('funding_deal', 'clinical_trial', 'market_analysis', 'company_deep_dive', 'weekly_roundup', 'breaking_news')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'published', 'archived')),
  confidence TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  headline TEXT NOT NULL,
  subtitle TEXT,
  body JSONB NOT NULL DEFAULT '{"type":"doc","content":[]}',
  summary TEXT,
  hero_image_url TEXT,
  hero_image_prompt TEXT,
  hero_placeholder_style JSONB,
  sources JSONB DEFAULT '[]',
  company_id UUID REFERENCES companies(id),
  company_ids UUID[] DEFAULT '{}',
  sector TEXT,
  article_style TEXT CHECK (article_style IN ('investor_lens', 'science_lens', 'market_analyst', 'editorial_narrative', 'deal_spotlight', 'data_digest')),
  metadata JSONB DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  reading_time_min INT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  edited_by TEXT DEFAULT 'ai' CHECK (edited_by IN ('ai', 'human', 'ai+human'))
);

CREATE INDEX idx_articles_slug ON articles (slug);
CREATE INDEX idx_articles_type_status ON articles (type, status);
CREATE INDEX idx_articles_published_at ON articles (published_at DESC);
CREATE INDEX idx_articles_company_id ON articles (company_id);
CREATE INDEX idx_articles_confidence ON articles (confidence);

-- RLS: Public can read published articles, service role can do everything
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published articles are publicly readable"
  ON articles FOR SELECT
  USING (status = 'published');

CREATE POLICY "Service role has full access"
  ON articles FOR ALL
  USING (auth.role() = 'service_role');
```

- [ ] **Step 2: Create the `rss_items` table**

Run migration via Supabase MCP:

```sql
CREATE TABLE IF NOT EXISTS rss_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  source_name TEXT NOT NULL,
  summary TEXT,
  published_at TIMESTAMPTZ,
  category TEXT DEFAULT 'general' CHECK (category IN ('funding', 'fda', 'partnership', 'acquisition', 'trial', 'general')),
  company_names TEXT[] DEFAULT '{}',
  processed_for_article BOOLEAN DEFAULT false,
  scraped_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rss_items_processed ON rss_items (processed_for_article) WHERE processed_for_article = false;
CREATE INDEX idx_rss_items_category ON rss_items (category);
CREATE INDEX idx_rss_items_scraped_at ON rss_items (scraped_at DESC);

ALTER TABLE rss_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to rss_items"
  ON rss_items FOR ALL
  USING (auth.role() = 'service_role');
```

- [ ] **Step 3: Create Supabase Storage bucket for article images**

Run via Supabase MCP (`execute_sql`):

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-images', 'article-images', true)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 4: Create TypeScript types**

Create `lib/article-engine/types.ts`:

```typescript
// Article types matching database schema

export type ArticleType =
  | 'funding_deal'
  | 'clinical_trial'
  | 'market_analysis'
  | 'company_deep_dive'
  | 'weekly_roundup'
  | 'breaking_news'

export type ArticleStatus = 'draft' | 'in_review' | 'published' | 'archived'
export type ConfidenceLevel = 'high' | 'medium' | 'low'
export type EditedBy = 'ai' | 'human' | 'ai+human'

export type ArticleStyle =
  | 'investor_lens'
  | 'science_lens'
  | 'market_analyst'
  | 'editorial_narrative'
  | 'deal_spotlight'
  | 'data_digest'

// TipTap-compatible block structure
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
  content: Array<{ type: 'text'; text: string; marks?: Array<{ type: string; attrs?: Record<string, any> }> }>
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
  attrs: { companyId: string; chartType: 'price_history' | 'funding_history' | 'market_cap'; period: string }
}

export interface PipelineTableNode {
  type: 'pipelineTable'
  attrs: { companyId: string }
}

export interface DataCalloutNode {
  type: 'dataCallout'
  attrs: { value: string; label: string; trend?: 'up' | 'down' | 'neutral' }
}

export interface ImageNode {
  type: 'image'
  attrs: { src: string; alt: string; caption?: string }
}

export interface DividerNode {
  type: 'divider'
}

// Source citation
export interface Source {
  name: string
  url: string
  date?: string
}

// Branded placeholder style
export interface PlaceholderStyle {
  pattern: 'bars' | 'hexgrid' | 'waves' | 'circles' | 'grid' | 'burst'
  accentColor: string
  icon: string
}

// DeepSeek intermediate output (what the AI returns)
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

// Context object built from DB data for prompt building
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
  competitorNames?: string[]
  sources: Source[]
  companyInDB: boolean
  companyHasFullProfile: boolean
  numbersVerifiedFromDB: boolean
}

// Input to ArticleEngine.generate()
export interface ArticleInput {
  type: ArticleType
  source: Record<string, any>
  style?: ArticleStyle
}

// Output from ArticleEngine.generate()
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
```

- [ ] **Step 5: Verify tables exist**

Run `list_tables` via Supabase MCP for schemas `['public']` with `verbose: true` to confirm `articles` and `rss_items` tables were created correctly.

- [ ] **Step 6: Commit**

```bash
git add lib/article-engine/types.ts
git commit -m "feat: add articles table, rss_items table, and TypeScript types for news engine"
```

---

## Chunk 2: Article Engine Core

### Task 2: Prompt system (base + styles + templates)

**Files:**
- Create: `lib/article-engine/prompts/base-system.ts`
- Create: `lib/article-engine/prompts/styles.ts`
- Create: `lib/article-engine/prompts/templates/funding.ts`
- Create: `lib/article-engine/prompts/templates/breaking-news.ts`

- [ ] **Step 1: Create base system prompt**

Create `lib/article-engine/prompts/base-system.ts`:

```typescript
export const BASE_SYSTEM_PROMPT = `You are a senior biotech journalist at BiotechTube, a market intelligence publication read by biotech investors, executives, and scientists.

VOICE:
- Authoritative but not academic. Assume your reader knows biotech — do not explain basic concepts (IND filings, Phase 3 trials, EPS, market cap).
- Business-forward with scientific precision when the science matters.
- Lead with WHY it matters, not WHAT happened.
- The headline sells the insight, not the event.

RULES:
- NEVER open with "[Company] announced/raised/reported..."
- NEVER use these phrases: "capital infusion", "vote of confidence", "it remains to be seen", "only time will tell", "in the ever-evolving landscape", "poised to", "game-changer", "paradigm shift", "groundbreaking", "revolutionary", "cutting-edge"
- USE specific drug names and mechanisms of action — never "its lead candidate" or "the company's pipeline"
- Every factual claim must trace to a provided source. If you cannot cite it, do not state it.
- Include one forward-looking insight per article — "watch for X next"
- Vary headline structures. Not always "[Company] Secures $XM [Round Type]"

SOURCES:
- You will be provided with source data. Cite sources by name and URL in your sources array.
- Clearly distinguish between verified facts (from sources) and your analysis.
- If the source data is thin, write a shorter article rather than padding with unsupported claims.

OUTPUT FORMAT:
Return valid JSON matching this exact schema:
{
  "headline": "string — compelling, insight-driven headline",
  "subtitle": "string — one sentence key takeaway",
  "summary": "string — 2-3 sentence summary for cards and SEO",
  "sections": [
    { "type": "text", "content": "paragraph text" },
    { "type": "heading", "content": "section heading", "level": 2 },
    { "type": "quote", "content": "pull quote text" },
    { "type": "company_mention", "reason": "why to show company card here" },
    { "type": "chart_suggestion", "chart_type": "price_history|funding_history|market_cap", "period": "6m|1y|3y" },
    { "type": "data_point", "value": "$2.1B", "label": "Market Cap" }
  ],
  "sources": [{ "name": "Source Name", "url": "https://..." }],
  "image_topic": "2-5 words describing the visual theme"
}

Aim for 300-500 words in the sections. Use 4-8 sections total. Include at least one quote block and one company_mention or chart_suggestion where appropriate.`
```

- [ ] **Step 2: Create writing styles**

Create `lib/article-engine/prompts/styles.ts`:

```typescript
import { ArticleStyle, ArticleType } from '../types'

export interface StyleConfig {
  persona: string
  tone: string
  structure: string
  opens_with: string
  best_for: ArticleType[]
}

export const STYLES: Record<ArticleStyle, StyleConfig> = {
  investor_lens: {
    persona: 'Biotech VC partner writing an investment memo for LPs',
    tone: 'Analytical, thesis-driven, risk-aware. Strong opinions backed by data.',
    structure: 'Investment thesis → supporting evidence → risk factors → outlook',
    opens_with: 'A punchy thesis sentence about the deal\'s strategic significance',
    best_for: ['funding_deal', 'company_deep_dive'],
  },
  science_lens: {
    persona: 'Principal scientist presenting at a major conference',
    tone: 'Precise, mechanistic, clinically grounded. Respects the complexity.',
    structure: 'Mechanism of action → clinical data → significance → what\'s next',
    opens_with: 'The specific science that makes this noteworthy',
    best_for: ['clinical_trial', 'company_deep_dive'],
  },
  market_analyst: {
    persona: 'Goldman Sachs biotech sector analyst writing a morning note',
    tone: 'Data-driven, comparative, sector-contextual. Numbers tell the story.',
    structure: 'Key data point → sector context → peer comparison → implication',
    opens_with: 'A striking number or trend that frames the entire analysis',
    best_for: ['market_analysis', 'funding_deal'],
  },
  editorial_narrative: {
    persona: 'STAT News senior correspondent with deep industry sources',
    tone: 'Vivid, story-driven, connects dots across the industry. Human angle.',
    structure: 'Scene-setting hook → backstory → analysis → forward-looking kicker',
    opens_with: 'A specific, vivid detail about the company or its mission',
    best_for: ['breaking_news', 'company_deep_dive'],
  },
  deal_spotlight: {
    persona: 'BioPharma Dive beat reporter who respects the reader\'s time',
    tone: 'Crisp, fact-dense, efficient. Every sentence earns its place.',
    structure: 'Info-rich lead → company context → deal terms → sector positioning',
    opens_with: 'The single most important fact about this story',
    best_for: ['funding_deal', 'breaking_news'],
  },
  data_digest: {
    persona: 'The Economist\'s "Daily chart" writer with dry wit',
    tone: 'Number-forward, makes data tell a story. Dry humor welcome.',
    structure: 'Key number → why it matters → trend context → chart reference',
    opens_with: 'A number that surprises or reframes expectations',
    best_for: ['weekly_roundup', 'market_analysis'],
  },
}

const STYLE_PREFERENCES: Record<ArticleType, ArticleStyle[]> = {
  funding_deal: ['investor_lens', 'deal_spotlight', 'market_analyst'],
  clinical_trial: ['science_lens', 'editorial_narrative'],
  market_analysis: ['market_analyst', 'data_digest'],
  company_deep_dive: ['editorial_narrative', 'investor_lens', 'science_lens'],
  weekly_roundup: ['data_digest'],
  breaking_news: ['deal_spotlight', 'editorial_narrative'],
}

export function selectStyle(
  type: ArticleType,
  recentStyles: ArticleStyle[] = []
): ArticleStyle {
  const candidates = STYLE_PREFERENCES[type]
  // Pick the least-recently-used style from candidates
  const unused = candidates.filter((s) => !recentStyles.includes(s))
  if (unused.length > 0) return unused[0]
  // All used recently — pick random from candidates
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export function buildStylePrompt(style: ArticleStyle): string {
  const config = STYLES[style]
  return `
WRITING STYLE: ${style.replace('_', ' ').toUpperCase()}
Persona: ${config.persona}
Tone: ${config.tone}
Structure: ${config.structure}
Open with: ${config.opens_with}
`
}
```

- [ ] **Step 3: Create funding deal prompt template**

Create `lib/article-engine/prompts/templates/funding.ts`:

```typescript
import { ArticleContext } from '../../types'

export function buildFundingPrompt(context: ArticleContext): string {
  const { fundingRound, company, pipeline, recentPrice } = context

  if (!fundingRound) throw new Error('Funding round data required for funding_deal article')

  const companyInfo = company
    ? `
COMPANY PROFILE:
- Name: ${company.name}
- Description: ${company.description || 'Not available'}
- Categories: ${company.categories?.join(', ') || 'Not specified'}
- Country: ${company.country || 'Not specified'}
- Ticker: ${company.ticker || 'Private'}
- Valuation: ${company.valuation ? `$${(company.valuation / 1e9).toFixed(2)}B` : 'Not available'}
`
    : ''

  const pipelineInfo =
    pipeline && pipeline.length > 0
      ? `
DRUG PIPELINE:
${pipeline
  .slice(0, 5)
  .map((p) => `- ${p.product_name}: ${p.indication || 'Unknown indication'} (${p.phase || 'Unknown phase'})`)
  .join('\n')}
`
      : ''

  const priceInfo = recentPrice
    ? `
MARKET DATA:
- Latest close: $${recentPrice.close.toFixed(2)}
- Recent change: ${recentPrice.change_pct > 0 ? '+' : ''}${recentPrice.change_pct.toFixed(1)}%
- Market cap: ${recentPrice.market_cap_usd ? `$${(recentPrice.market_cap_usd / 1e9).toFixed(2)}B` : 'N/A'}
`
    : ''

  return `
Write an article about this biotech funding round.

FUNDING ROUND:
- Company: ${context.company?.name || 'Unknown'}
- Round type: ${fundingRound.round_type}
- Amount: $${(fundingRound.amount_usd / 1e6).toFixed(1)}M
- Lead investor: ${fundingRound.lead_investor || 'Undisclosed'}
- Other investors: ${fundingRound.investors?.join(', ') || 'Not disclosed'}
- Announced: ${fundingRound.announced_date}
- Sector: ${fundingRound.sector || 'Biotechnology'}
- Country: ${fundingRound.country || 'Not specified'}
${companyInfo}${pipelineInfo}${priceInfo}

SOURCES PROVIDED:
${context.sources.map((s) => `- ${s.name}: ${s.url}`).join('\n')}

Focus on the investment thesis, what the money enables, competitive landscape, and forward-looking implications.
`
}
```

- [ ] **Step 4: Create breaking news prompt template**

Create `lib/article-engine/prompts/templates/breaking-news.ts`:

```typescript
import { ArticleContext } from '../../types'

export function buildBreakingNewsPrompt(context: ArticleContext): string {
  const { rssItem, company, pipeline, recentPrice } = context

  if (!rssItem) throw new Error('RSS item data required for breaking_news article')

  const companyInfo = company
    ? `
COMPANY CONTEXT FROM DATABASE:
- Name: ${company.name}
- Description: ${company.description || 'Not available'}
- Categories: ${company.categories?.join(', ') || 'Not specified'}
- Country: ${company.country || 'Not specified'}
- Ticker: ${company.ticker || 'Private'}
- Valuation: ${company.valuation ? `$${(company.valuation / 1e9).toFixed(2)}B` : 'Not available'}
`
    : ''

  const pipelineInfo =
    pipeline && pipeline.length > 0
      ? `
DRUG PIPELINE:
${pipeline
  .slice(0, 5)
  .map((p) => `- ${p.product_name}: ${p.indication || 'Unknown indication'} (${p.phase || 'Unknown phase'})`)
  .join('\n')}
`
      : ''

  const priceInfo = recentPrice
    ? `
MARKET DATA:
- Latest close: $${recentPrice.close.toFixed(2)}
- Recent change: ${recentPrice.change_pct > 0 ? '+' : ''}${recentPrice.change_pct.toFixed(1)}%
- Market cap: ${recentPrice.market_cap_usd ? `$${(recentPrice.market_cap_usd / 1e9).toFixed(2)}B` : 'N/A'}
`
    : ''

  return `
Rewrite this biotech news as an original BiotechTube article. Add analysis and context — do NOT paraphrase the original. Your article must add substantial original value.

ORIGINAL NEWS:
- Title: ${rssItem.title}
- Source: ${rssItem.source_name}
- Published: ${rssItem.published_at || 'Recent'}
- Summary: ${rssItem.summary || 'Not available'}
- Category: ${rssItem.category}
${companyInfo}${pipelineInfo}${priceInfo}

SOURCES:
- ${rssItem.source_name}: ${rssItem.url}
${context.sources.filter((s) => s.url !== rssItem.url).map((s) => `- ${s.name}: ${s.url}`).join('\n')}

IMPORTANT: Credit the original source. Add BiotechTube's unique data and analysis. Do NOT closely paraphrase — write an original article that uses the news as a factual foundation.
`
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/article-engine/prompts/
git commit -m "feat: add article engine prompt system — base voice, 6 styles, funding + breaking news templates"
```

---

### Task 3: Source gatherers, confidence scoring, blocks converter, image prompts

**Files:**
- Create: `lib/article-engine/sources/funding.ts`
- Create: `lib/article-engine/sources/breaking-news.ts`
- Create: `lib/article-engine/confidence.ts`
- Create: `lib/article-engine/blocks.ts`
- Create: `lib/article-engine/image-prompt.ts`

- [ ] **Step 1: Create funding source gatherer**

Create `lib/article-engine/sources/funding.ts`:

```typescript
import { createServerClient } from '@/lib/supabase'
import { ArticleContext, Source } from '../types'

export async function gatherFundingContext(fundingRoundId: string): Promise<ArticleContext> {
  const supabase = createServerClient()

  // Fetch funding round
  const { data: round } = await supabase
    .from('funding_rounds')
    .select('*')
    .eq('id', fundingRoundId)
    .single()

  if (!round) throw new Error(`Funding round ${fundingRoundId} not found`)

  // Fetch company
  let company = null
  let pipeline: ArticleContext['pipeline'] = []
  let recentPrice: ArticleContext['recentPrice'] = undefined

  if (round.company_id) {
    const { data: co } = await supabase
      .from('companies')
      .select('id, name, slug, description, categories, ticker, valuation, logo_url, website, country')
      .eq('id', round.company_id)
      .single()

    company = co

    if (co) {
      // Fetch pipeline
      const { data: pipes } = await supabase
        .from('pipelines')
        .select('product_name, indication, phase, status')
        .eq('company_id', co.id)
        .limit(5)

      pipeline = pipes || []

      // Fetch recent price if public
      if (co.ticker) {
        const { data: price } = await supabase
          .from('company_price_history')
          .select('close, change_pct, market_cap_usd')
          .eq('company_id', co.id)
          .order('date', { ascending: false })
          .limit(1)
          .single()

        if (price) {
          recentPrice = {
            close: price.close,
            change_pct: price.change_pct || 0,
            market_cap_usd: price.market_cap_usd,
          }
        }
      }
    }
  }

  const sources: Source[] = []
  if (round.source_url) {
    sources.push({ name: round.source_name || 'Press Release', url: round.source_url, date: round.announced_date })
  }

  return {
    company: company || undefined,
    pipeline,
    fundingRound: {
      id: round.id,
      amount_usd: round.amount_usd,
      round_type: round.round_type,
      lead_investor: round.lead_investor,
      investors: round.investors,
      announced_date: round.announced_date,
      sector: round.sector,
      country: round.country,
      confidence: round.confidence,
    },
    recentPrice,
    sources,
    companyInDB: !!company,
    companyHasFullProfile: !!(company?.description && company?.categories?.length),
    numbersVerifiedFromDB: !!company?.valuation || !!recentPrice,
  }
}
```

- [ ] **Step 2: Create breaking news source gatherer**

Create `lib/article-engine/sources/breaking-news.ts`:

```typescript
import { createServerClient } from '@/lib/supabase'
import { ArticleContext, Source } from '../types'

export async function gatherBreakingNewsContext(rssItemId: string): Promise<ArticleContext> {
  const supabase = createServerClient()

  // Fetch RSS item
  const { data: rssItem } = await supabase
    .from('rss_items')
    .select('*')
    .eq('id', rssItemId)
    .single()

  if (!rssItem) throw new Error(`RSS item ${rssItemId} not found`)

  // Try to match a company from the mentioned names
  let company = null
  let pipeline: ArticleContext['pipeline'] = []
  let recentPrice: ArticleContext['recentPrice'] = undefined

  if (rssItem.company_names && rssItem.company_names.length > 0) {
    // Try exact match first, then partial
    for (const name of rssItem.company_names) {
      const { data: co } = await supabase
        .from('companies')
        .select('id, name, slug, description, categories, ticker, valuation, logo_url, website, country')
        .ilike('name', name)
        .limit(1)
        .single()

      if (co) {
        company = co

        // Fetch pipeline
        const { data: pipes } = await supabase
          .from('pipelines')
          .select('product_name, indication, phase, status')
          .eq('company_id', co.id)
          .limit(5)

        pipeline = pipes || []

        // Fetch recent price
        if (co.ticker) {
          const { data: price } = await supabase
            .from('company_price_history')
            .select('close, change_pct, market_cap_usd')
            .eq('company_id', co.id)
            .order('date', { ascending: false })
            .limit(1)
            .single()

          if (price) {
            recentPrice = {
              close: price.close,
              change_pct: price.change_pct || 0,
              market_cap_usd: price.market_cap_usd,
            }
          }
        }
        break // Use first matched company
      }
    }
  }

  const sources: Source[] = [
    { name: rssItem.source_name, url: rssItem.url, date: rssItem.published_at }
  ]

  return {
    company: company || undefined,
    pipeline,
    rssItem: {
      id: rssItem.id,
      title: rssItem.title,
      url: rssItem.url,
      source_name: rssItem.source_name,
      summary: rssItem.summary,
      published_at: rssItem.published_at,
      category: rssItem.category,
      company_names: rssItem.company_names || [],
    },
    recentPrice,
    sources,
    companyInDB: !!company,
    companyHasFullProfile: !!(company?.description && company?.categories?.length),
    numbersVerifiedFromDB: !!company?.valuation || !!recentPrice,
  }
}
```

- [ ] **Step 3: Create confidence scoring**

Create `lib/article-engine/confidence.ts`:

```typescript
import { ArticleType, ArticleContext, AIArticleOutput, ConfidenceLevel } from './types'

const GENERIC_PHRASES = [
  'capital infusion',
  'vote of confidence',
  'it remains to be seen',
  'only time will tell',
  'ever-evolving landscape',
  'paradigm shift',
  'game-changer',
  'groundbreaking',
  'revolutionary',
  'cutting-edge',
  'poised to',
]

function containsGenericPhrases(sections: AIArticleOutput['sections']): boolean {
  const text = sections
    .filter((s) => s.type === 'text')
    .map((s) => (s as { type: 'text'; content: string }).content)
    .join(' ')
    .toLowerCase()

  return GENERIC_PHRASES.some((phrase) => text.includes(phrase))
}

const TYPE_BASELINE_SCORES: Record<ArticleType, number> = {
  funding_deal: 20,
  clinical_trial: 15,
  breaking_news: 10,
  market_analysis: 10,
  weekly_roundup: 15,
  company_deep_dive: 5,
}

export function scoreConfidence(
  type: ArticleType,
  context: ArticleContext,
  output: AIArticleOutput
): ConfidenceLevel {
  let score = 0

  // Source quality (0-40 points)
  score += Math.min(context.sources.length * 15, 40)

  // Data backing (0-30 points)
  if (context.companyInDB) score += 10
  if (context.companyHasFullProfile) score += 10
  if (context.numbersVerifiedFromDB) score += 10

  // Article type baseline (0-20 points)
  score += TYPE_BASELINE_SCORES[type]

  // AI output quality (0-10 points)
  if (output.sources.length >= 2) score += 5
  if (!containsGenericPhrases(output.sections)) score += 5

  // Thresholds
  if (score >= 65) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

export function statusFromConfidence(confidence: ConfidenceLevel): 'published' | 'in_review' | 'draft' {
  switch (confidence) {
    case 'high': return 'published'
    case 'medium': return 'in_review'
    case 'low': return 'draft'
  }
}
```

- [ ] **Step 4: Create blocks converter**

Create `lib/article-engine/blocks.ts`:

```typescript
import { TipTapDoc, TipTapNode, AISection, AIArticleOutput } from './types'

function textToTipTapParagraph(text: string): TipTapNode {
  return {
    type: 'paragraph',
    content: [{ type: 'text', text }],
  }
}

function sectionToNode(section: AISection, companyId: string | null): TipTapNode | null {
  switch (section.type) {
    case 'text':
      return textToTipTapParagraph(section.content)

    case 'heading':
      return {
        type: 'heading',
        attrs: { level: section.level || 2 },
        content: [{ type: 'text', text: section.content }],
      }

    case 'quote':
      return {
        type: 'pullQuote',
        attrs: { content: section.content },
      }

    case 'company_mention':
      if (!companyId) return null
      return {
        type: 'companyCard',
        attrs: { companyId },
      }

    case 'chart_suggestion':
      if (!companyId) return null
      return {
        type: 'chartEmbed',
        attrs: {
          companyId,
          chartType: (['price_history', 'funding_history', 'market_cap'].includes(section.chart_type) ? section.chart_type : 'price_history') as 'price_history' | 'funding_history' | 'market_cap',
          period: section.period || '6m',
        },
      }

    case 'data_point':
      return {
        type: 'dataCallout',
        attrs: {
          value: section.value,
          label: section.label,
          trend: 'neutral',
        },
      }

    default:
      return null
  }
}

export function convertToBlocks(output: AIArticleOutput, companyId: string | null): TipTapDoc {
  const nodes: TipTapNode[] = []

  for (const section of output.sections) {
    const node = sectionToNode(section, companyId)
    if (node) nodes.push(node)
  }

  // Ensure we have at least one paragraph
  if (nodes.length === 0) {
    nodes.push(textToTipTapParagraph('Article content could not be generated.'))
  }

  return { type: 'doc', content: nodes }
}

export function estimateReadingTime(doc: TipTapDoc): number {
  let wordCount = 0

  for (const node of doc.content) {
    if (node.type === 'paragraph' && 'content' in node) {
      for (const child of node.content) {
        if (child.type === 'text') {
          wordCount += child.text.split(/\s+/).length
        }
      }
    }
    if (node.type === 'heading' && 'content' in node) {
      for (const child of node.content) {
        if (child.type === 'text') {
          wordCount += child.text.split(/\s+/).length
        }
      }
    }
    if (node.type === 'pullQuote') {
      wordCount += node.attrs.content.split(/\s+/).length
    }
  }

  return Math.max(1, Math.ceil(wordCount / 200))
}
```

- [ ] **Step 5: Create image prompt generator**

Create `lib/article-engine/image-prompt.ts`:

```typescript
import { ArticleType, ArticleContext, PlaceholderStyle } from './types'

const BASE_PROMPT = `Abstract editorial illustration for a biotech news article. Style: bold geometric data visualization combined with organic biotech elements. {TOPIC}. Color palette: deep navy (#0f172a) background, electric green (#059669) accents, white and cool gray highlights. Modern, clean, Bloomberg Businessweek meets scientific journal aesthetic. No text, no letters, no words, no numbers rendered as text. 16:9 aspect ratio.`

const TOPIC_GENERATORS: Record<ArticleType, (ctx: ArticleContext) => string> = {
  funding_deal: (ctx) => {
    const sector = ctx.fundingRound?.sector || ctx.company?.categories?.[0] || 'biotechnology'
    return `Floating geometric shapes suggesting growth and capital flow. Abstract representation of ${sector}. Ascending data visualization elements`
  },
  clinical_trial: (ctx) => {
    const indication = ctx.pipeline?.[0]?.indication || 'therapeutic'
    return `Molecular structure patterns, clinical data scatter plot shapes. Abstract ${indication} imagery. Precision and scientific rigor conveyed through geometric forms`
  },
  market_analysis: () =>
    'Flowing market data streams, sector treemap patterns. Abstract financial chart elements merging with biological forms. Sense of movement and market dynamics',
  company_deep_dive: (ctx) => {
    const sector = ctx.company?.categories?.[0] || 'biotech'
    return `Corporate silhouette merging with ${sector} imagery. Layered data visualization suggesting depth of analysis. Professional, authoritative composition`
  },
  weekly_roundup: () =>
    'Mosaic of small data visualization elements — charts, molecules, arrows. Sense of compilation and overview. Multiple small geometric forms creating a unified composition',
  breaking_news: (ctx) => {
    const sector = ctx.company?.categories?.[0] || 'biotech'
    return `Dynamic angular composition suggesting urgency and significance. Bold geometric forms with sharp contrasts. Abstract ${sector} elements in motion`
  },
}

export function generateImagePrompt(type: ArticleType, context: ArticleContext, imageTopic: string): string {
  const topicElements = TOPIC_GENERATORS[type](context)
  const topicHint = imageTopic ? ` Theme: ${imageTopic}.` : ''
  return BASE_PROMPT.replace('{TOPIC}', topicElements + topicHint)
}

const PLACEHOLDER_PATTERNS: Record<ArticleType, PlaceholderStyle> = {
  funding_deal: { pattern: 'bars', accentColor: '#059669', icon: 'trending-up' },
  clinical_trial: { pattern: 'hexgrid', accentColor: '#059669', icon: 'flask-conical' },
  market_analysis: { pattern: 'waves', accentColor: '#059669', icon: 'bar-chart-3' },
  company_deep_dive: { pattern: 'circles', accentColor: '#059669', icon: 'building-2' },
  weekly_roundup: { pattern: 'grid', accentColor: '#059669', icon: 'calendar' },
  breaking_news: { pattern: 'burst', accentColor: '#059669', icon: 'zap' },
}

export function getPlaceholderStyle(type: ArticleType): PlaceholderStyle {
  return PLACEHOLDER_PATTERNS[type]
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/article-engine/sources/ lib/article-engine/confidence.ts lib/article-engine/blocks.ts lib/article-engine/image-prompt.ts
git commit -m "feat: add source gatherers, confidence scoring, block converter, and image prompt generator"
```

---

### Task 4: Article Engine main entry + publisher

**Files:**
- Create: `lib/article-engine/index.ts`
- Create: `lib/article-engine/publisher.ts`

- [ ] **Step 1: Create the publisher**

Create `lib/article-engine/publisher.ts`:

```typescript
import { createServerClient } from '@/lib/supabase'
import { GeneratedArticle } from './types'

export async function publishArticle(article: GeneratedArticle): Promise<{ id: string; slug: string }> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('articles')
    .insert({
      slug: article.slug,
      type: article.type,
      status: article.status,
      confidence: article.confidence,
      headline: article.headline,
      subtitle: article.subtitle,
      body: article.body,
      summary: article.summary,
      hero_image_prompt: article.hero_image_prompt,
      hero_placeholder_style: article.hero_placeholder_style,
      sources: article.sources,
      company_id: article.company_id,
      company_ids: article.company_ids,
      sector: article.sector,
      article_style: article.article_style,
      metadata: article.metadata,
      seo_title: article.seo_title,
      seo_description: article.seo_description,
      reading_time_min: article.reading_time_min,
      published_at: article.published_at,
      edited_by: article.edited_by,
    })
    .select('id, slug')
    .single()

  if (error) throw new Error(`Failed to publish article: ${error.message}`)

  return { id: data.id, slug: data.slug }
}

export async function articleExistsForSource(type: string, sourceKey: string, sourceValue: string): Promise<boolean> {
  const supabase = createServerClient()

  const { data } = await supabase
    .from('articles')
    .select('id')
    .eq('type', type)
    .contains('metadata', { [sourceKey]: sourceValue })
    .limit(1)

  return (data?.length || 0) > 0
}
```

- [ ] **Step 2: Create the main ArticleEngine entry point**

Create `lib/article-engine/index.ts`:

```typescript
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase'
import {
  ArticleInput,
  ArticleType,
  ArticleStyle,
  GeneratedArticle,
  AIArticleOutput,
  ArticleContext,
} from './types'
import { BASE_SYSTEM_PROMPT } from './prompts/base-system'
import { selectStyle, buildStylePrompt } from './prompts/styles'
import { buildFundingPrompt } from './prompts/templates/funding'
import { buildBreakingNewsPrompt } from './prompts/templates/breaking-news'
import { gatherFundingContext } from './sources/funding'
import { gatherBreakingNewsContext } from './sources/breaking-news'
import { scoreConfidence, statusFromConfidence } from './confidence'
import { convertToBlocks, estimateReadingTime } from './blocks'
import { generateImagePrompt, getPlaceholderStyle } from './image-prompt'
import { publishArticle, articleExistsForSource } from './publisher'
import { slugify } from '@/lib/seo-utils'

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
})

// Source gatherers by article type
const SOURCE_GATHERERS: Partial<Record<ArticleType, (sourceData: any) => Promise<ArticleContext>>> = {
  funding_deal: (data) => gatherFundingContext(data.fundingRoundId),
  breaking_news: (data) => gatherBreakingNewsContext(data.rssItemId),
}

// Prompt builders by article type
const PROMPT_BUILDERS: Partial<Record<ArticleType, (ctx: ArticleContext) => string>> = {
  funding_deal: buildFundingPrompt,
  breaking_news: buildBreakingNewsPrompt,
}

async function getRecentStyles(type: ArticleType): Promise<ArticleStyle[]> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('articles')
    .select('article_style')
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(5)

  return (data || []).map((r) => r.article_style).filter(Boolean) as ArticleStyle[]
}

function generateSlug(headline: string): string {
  const base = slugify(headline).slice(0, 80)
  const dateStr = new Date().toISOString().slice(0, 10)
  return `${base}-${dateStr}`
}

async function ensureUniqueSlug(slug: string): Promise<string> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('articles')
    .select('slug')
    .like('slug', `${slug}%`)

  if (!data || data.length === 0) return slug
  return `${slug}-${data.length + 1}`
}

async function callDeepSeek(systemPrompt: string, userPrompt: string): Promise<AIArticleOutput> {
  const response = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('Empty response from DeepSeek')

  return JSON.parse(content) as AIArticleOutput
}

export class ArticleEngine {
  static async generate(input: ArticleInput): Promise<GeneratedArticle> {
    const { type, source, style: styleOverride } = input

    // 1. Gather context
    const gatherer = SOURCE_GATHERERS[type]
    if (!gatherer) throw new Error(`No source gatherer for article type: ${type}`)
    const context = await gatherer(source)

    // 2. Select style
    const recentStyles = await getRecentStyles(type)
    const style = styleOverride || selectStyle(type, recentStyles)

    // 3. Build prompt
    const promptBuilder = PROMPT_BUILDERS[type]
    if (!promptBuilder) throw new Error(`No prompt builder for article type: ${type}`)
    const systemPrompt = BASE_SYSTEM_PROMPT + buildStylePrompt(style)
    const userPrompt = promptBuilder(context)

    // 4. Call DeepSeek
    const output = await callDeepSeek(systemPrompt, userPrompt)

    // 5. Convert to TipTap blocks
    const body = convertToBlocks(output, context.company?.id || null)
    const readingTime = estimateReadingTime(body)

    // 6. Generate image prompt
    const heroImagePrompt = generateImagePrompt(type, context, output.image_topic || '')
    const placeholderStyle = getPlaceholderStyle(type)

    // 7. Score confidence
    const confidence = scoreConfidence(type, context, output)
    const status = statusFromConfidence(confidence)

    // 8. Generate slug
    const baseSlug = generateSlug(output.headline)
    const slug = await ensureUniqueSlug(baseSlug)

    // 9. Build metadata by type
    const metadata = buildMetadata(type, context, source)

    // 10. Assemble article
    const article: GeneratedArticle = {
      slug,
      type,
      status: status as any,
      confidence,
      headline: output.headline,
      subtitle: output.subtitle,
      body,
      summary: output.summary,
      hero_image_prompt: heroImagePrompt,
      hero_placeholder_style: placeholderStyle,
      sources: output.sources || context.sources,
      company_id: context.company?.id || null,
      company_ids: context.company ? [context.company.id] : [],
      sector: context.fundingRound?.sector || context.company?.categories?.[0] || null,
      article_style: style,
      metadata,
      reading_time_min: readingTime,
      seo_title: null,
      seo_description: null,
      published_at: status === 'published' ? new Date().toISOString() : null,
      edited_by: 'ai',
    }

    return article
  }

  static async generateAndPublish(input: ArticleInput): Promise<{ id: string; slug: string }> {
    const article = await ArticleEngine.generate(input)
    return publishArticle(article)
  }

  static checkDuplicate = articleExistsForSource
}

function buildMetadata(type: ArticleType, context: ArticleContext, source: Record<string, any>): Record<string, any> {
  switch (type) {
    case 'funding_deal':
      const fr = context.fundingRound!
      return {
        amount_usd: fr.amount_usd,
        round_type: fr.round_type,
        lead_investor: fr.lead_investor,
        investors: fr.investors,
        funding_round_id: fr.id,
        deal_size_category: getDealSizeCategory(fr.amount_usd),
      }
    case 'breaking_news':
      const rss = context.rssItem!
      return {
        original_source_name: rss.source_name,
        original_source_url: rss.url,
        original_published_at: rss.published_at,
        rss_item_id: rss.id,
      }
    default:
      return {}
  }
}

function getDealSizeCategory(amountUsd: number): string {
  if (amountUsd >= 500_000_000) return 'mega'
  if (amountUsd >= 100_000_000) return 'growth'
  if (amountUsd >= 30_000_000) return 'early'
  if (amountUsd >= 10_000_000) return 'seed'
  return 'micro'
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/article-engine/index.ts lib/article-engine/publisher.ts
git commit -m "feat: add ArticleEngine main entry point and publisher"
```

---

## Chunk 3: Orchestrator Cron & RSS Pipeline

### Task 5: Update scrape-funding cron to also store RSS items

**Files:**
- Modify: `app/api/cron/scrape-funding/route.ts`

- [ ] **Step 1: Read the current scrape-funding cron**

Read `biotechtube/app/api/cron/scrape-funding/route.ts` in full to understand the current flow.

- [ ] **Step 2: Add RSS item storage alongside existing funding extraction**

After the existing RSS parsing and keyword filtering, add logic to store ALL biotech-relevant RSS items (not just funding ones) in the `rss_items` table. The existing funding extraction flow continues unchanged.

Add this after the RSS items are parsed but before funding-specific filtering:

```typescript
// Store all biotech RSS items for the breaking news pipeline
const allBiotechItems = parsedItems.filter(item => {
  // Already biotech-relevant since they come from biotech RSS feeds
  return item.title && item.link
})

if (allBiotechItems.length > 0) {
  const rssRows = allBiotechItems.map(item => ({
    title: item.title,
    url: item.link,
    source_name: item.source || 'Unknown',
    summary: item.description?.slice(0, 500) || null,
    published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
    category: categorizeBiotechNews(item.title, item.description),
    company_names: extractCompanyNames(item.title, item.description),
  }))

  await supabase
    .from('rss_items')
    .upsert(rssRows, { onConflict: 'url', ignoreDuplicates: true })
}
```

Add helper functions:

```typescript
function categorizeBiotechNews(title: string, description?: string): string {
  const text = `${title} ${description || ''}`.toLowerCase()
  if (/fda|approv|clear|reject|complete response|advisory committee/.test(text)) return 'fda'
  if (/rais|fund|series [a-e]|seed|ipo|financ|invest|venture|grant/.test(text)) return 'funding'
  if (/partner|collaborat|licens|agreement|alliance/.test(text)) return 'partnership'
  if (/acqui|merg|buyout|takeover/.test(text)) return 'acquisition'
  if (/trial|phase [1-3]|endpoint|efficacy|safety data|readout|clinical/.test(text)) return 'trial'
  return 'general'
}

function extractCompanyNames(title: string, description?: string): string[] {
  // Extract capitalized multi-word names that look like company names
  const text = `${title} ${description || ''}`
  const matches = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|Corp|Ltd|Therapeutics|Pharma|Bio|Sciences|Biosciences|Oncology|Genomics)\.?)?/g)
  if (!matches) return []
  // Deduplicate and filter common non-company words
  const skipWords = new Set(['The', 'This', 'That', 'These', 'Those', 'FDA', 'SEC', 'NYSE', 'NASDAQ'])
  return [...new Set(matches)]
    .filter(m => !skipWords.has(m) && m.length > 3)
    .slice(0, 5)
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/scrape-funding/route.ts
git commit -m "feat: store all biotech RSS items in rss_items table for breaking news pipeline"
```

---

### Task 6: Create new orchestrator cron

**Files:**
- Create: `app/api/cron/generate-news/route.ts`

Note: We create a NEW cron at `/api/cron/generate-news` instead of replacing the existing `/api/cron/generate-articles`. The old one continues to work for `funding_articles` table. The new one writes to `articles` table.

- [ ] **Step 1: Create the orchestrator cron**

Create `app/api/cron/generate-news/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { ArticleEngine } from '@/lib/article-engine'
import { ArticleType } from '@/lib/article-engine/types'

export const maxDuration = 300

interface PipelineConfig {
  type: ArticleType
  source: () => Promise<Array<{ id: string; data: Record<string, any> }>>
  limit: number
  schedule?: 'daily' | 'sunday' | 'wednesday'
}

async function getNewFundingRounds(): Promise<Array<{ id: string; data: Record<string, any> }>> {
  const supabase = createServerClient()

  // Get funding rounds $10M+ without articles in the new articles table
  const { data: rounds } = await supabase
    .from('funding_rounds')
    .select('id, company_id, amount_usd, round_type')
    .gte('amount_usd', 10_000_000)
    .neq('confidence', 'filing_only')
    .order('announced_date', { ascending: false })
    .limit(20)

  if (!rounds || rounds.length === 0) return []

  // Filter out rounds that already have articles
  const results: Array<{ id: string; data: Record<string, any> }> = []
  for (const round of rounds) {
    const exists = await ArticleEngine.checkDuplicate('funding_deal', 'funding_round_id', round.id)
    if (!exists) {
      results.push({ id: round.id, data: { fundingRoundId: round.id } })
    }
    if (results.length >= 5) break
  }

  return results
}

async function getUnprocessedRSSItems(): Promise<Array<{ id: string; data: Record<string, any> }>> {
  const supabase = createServerClient()

  const { data: items } = await supabase
    .from('rss_items')
    .select('id')
    .eq('processed_for_article', false)
    .neq('category', 'funding') // Funding handled by funding_deal pipeline
    .order('scraped_at', { ascending: false })
    .limit(10)

  return (items || []).map((item) => ({ id: item.id, data: { rssItemId: item.id } }))
}

const PIPELINES: PipelineConfig[] = [
  {
    type: 'breaking_news',
    source: getUnprocessedRSSItems,
    limit: 3,
    schedule: 'daily',
  },
  {
    type: 'funding_deal',
    source: getNewFundingRounds,
    limit: 3,
    schedule: 'daily',
  },
]

function shouldRunToday(schedule?: string): boolean {
  if (!schedule || schedule === 'daily') return true
  const day = new Date().getDay()
  if (schedule === 'sunday') return day === 0
  if (schedule === 'wednesday') return day === 3
  return true
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const results: Record<string, { generated: number; errors: number; skipped: number }> = {}

  const supabase = createServerClient()

  for (const pipeline of PIPELINES) {
    if (!shouldRunToday(pipeline.schedule)) {
      results[pipeline.type] = { generated: 0, errors: 0, skipped: 0 }
      continue
    }

    const pipelineResult = { generated: 0, errors: 0, skipped: 0 }

    try {
      const items = await pipeline.source()

      for (const item of items.slice(0, pipeline.limit)) {
        // Check timeout (leave 30s buffer)
        if (Date.now() - startTime > 270_000) {
          console.log(`[generate-news] Timeout approaching, stopping ${pipeline.type}`)
          break
        }

        try {
          const { id, slug } = await ArticleEngine.generateAndPublish({
            type: pipeline.type,
            source: item.data,
          })
          console.log(`[generate-news] Generated ${pipeline.type}: ${slug} (${id})`)
          pipelineResult.generated++

          // Mark RSS item as processed if breaking news
          if (pipeline.type === 'breaking_news' && item.data.rssItemId) {
            await supabase
              .from('rss_items')
              .update({ processed_for_article: true })
              .eq('id', item.data.rssItemId)
          }

          // Rate limit: 1.5s between API calls
          await new Promise((resolve) => setTimeout(resolve, 1500))
        } catch (err) {
          console.error(`[generate-news] Error generating ${pipeline.type} for ${item.id}:`, err)
          pipelineResult.errors++
        }
      }
    } catch (err) {
      console.error(`[generate-news] Pipeline ${pipeline.type} failed:`, err)
      pipelineResult.errors++
    }

    results[pipeline.type] = pipelineResult
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1)

  return NextResponse.json({
    success: true,
    duration: `${duration}s`,
    results,
  })
}
```

- [ ] **Step 2: Add the cron schedule to vercel.json**

Read `vercel.json` to check existing cron config, then add the new cron:

```json
{
  "path": "/api/cron/generate-news",
  "schedule": "0 11 * * *"
}
```

This runs at 11:00 AM UTC, one hour after the existing generate-articles cron at 10:00 AM.

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/generate-news/route.ts vercel.json
git commit -m "feat: add news engine orchestrator cron — generates funding_deal + breaking_news articles"
```

---

## Chunk 4: Frontend — Article Page, Placeholder, Homepage

### Task 7: Article placeholder component

**Files:**
- Create: `components/news/ArticlePlaceholder.tsx`

- [ ] **Step 1: Create the branded placeholder component**

Create `components/news/ArticlePlaceholder.tsx`:

```typescript
import { PlaceholderStyle } from '@/lib/article-engine/types'

interface ArticlePlaceholderProps {
  style: PlaceholderStyle
  headline?: string
  className?: string
}

const PATTERNS: Record<string, () => React.ReactNode> = {
  bars: () => (
    <g opacity="0.3">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect
          key={i}
          x={80 + i * 100}
          y={300 - (i + 2) * 30}
          width={60}
          height={(i + 2) * 30}
          fill="#059669"
          opacity={0.4 + i * 0.08}
          rx={4}
        />
      ))}
    </g>
  ),
  hexgrid: () => (
    <g opacity="0.25">
      {Array.from({ length: 12 }).map((_, i) => {
        const row = Math.floor(i / 4)
        const col = i % 4
        const x = 120 + col * 160 + (row % 2) * 80
        const y = 100 + row * 120
        return (
          <polygon
            key={i}
            points={hexPoints(x, y, 45)}
            fill="none"
            stroke="#059669"
            strokeWidth={2}
          />
        )
      })}
    </g>
  ),
  waves: () => (
    <g opacity="0.3">
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M0 ${180 + i * 50} Q200 ${140 + i * 50} 400 ${180 + i * 50} T800 ${180 + i * 50}`}
          fill="none"
          stroke="#059669"
          strokeWidth={2}
          opacity={0.6 - i * 0.15}
        />
      ))}
    </g>
  ),
  circles: () => (
    <g opacity="0.2">
      {[120, 90, 60, 30].map((r, i) => (
        <circle
          key={i}
          cx={400}
          cy={200}
          r={r}
          fill="none"
          stroke="#059669"
          strokeWidth={2}
          opacity={0.3 + i * 0.15}
        />
      ))}
    </g>
  ),
  grid: () => (
    <g opacity="0.2">
      {Array.from({ length: 12 }).map((_, i) => {
        const row = Math.floor(i / 4)
        const col = i % 4
        return (
          <rect
            key={i}
            x={100 + col * 160}
            y={80 + row * 100}
            width={120}
            height={70}
            fill="#059669"
            opacity={0.2 + ((i * 7 + 3) % 5) * 0.06}
            rx={6}
          />
        )
      })}
    </g>
  ),
  burst: () => (
    <g opacity="0.3" transform="translate(400, 200)">
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 45 * Math.PI) / 180
        return (
          <line
            key={i}
            x1={0}
            y1={0}
            x2={Math.cos(angle) * 200}
            y2={Math.sin(angle) * 200}
            stroke="#059669"
            strokeWidth={2}
            opacity={0.4}
          />
        )
      })}
    </g>
  ),
}

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 })
    .map((_, i) => {
      const angle = (60 * i - 30) * (Math.PI / 180)
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
    })
    .join(' ')
}

export default function ArticlePlaceholder({ style, headline, className = '' }: ArticlePlaceholderProps) {
  const PatternComponent = PATTERNS[style.pattern] || PATTERNS.bars

  return (
    <div className={`relative overflow-hidden bg-[#0f172a] ${className}`}>
      <svg
        viewBox="0 0 800 400"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Background gradient */}
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="800" height="400" fill="#0f172a" />
        <rect width="800" height="400" fill="url(#glow)" />

        {/* Pattern */}
        <PatternComponent />

        {/* BiotechTube watermark */}
        <text
          x="40"
          y="380"
          fill="white"
          opacity="0.15"
          fontSize="14"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="600"
        >
          BIOTECHTUBE
        </text>
      </svg>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/news/ArticlePlaceholder.tsx
git commit -m "feat: add branded article placeholder component with 6 pattern variants"
```

---

### Task 8: Block renderer component

**Files:**
- Create: `components/news/BlockRenderer.tsx`

- [ ] **Step 1: Create the block renderer**

This component renders TipTap JSONB blocks on the public article page. For Phase A, custom blocks (companyCard, chartEmbed, etc.) render as styled placeholders. Full interactive versions come in Phase B.

Create `components/news/BlockRenderer.tsx`:

```typescript
import { TipTapDoc, TipTapNode } from '@/lib/article-engine/types'

interface BlockRendererProps {
  doc: TipTapDoc
}

export default function BlockRenderer({ doc }: BlockRendererProps) {
  if (!doc || !doc.content) return null

  return (
    <div className="article-body space-y-4">
      {doc.content.map((node, index) => (
        <BlockNode key={index} node={node} />
      ))}
    </div>
  )
}

function BlockNode({ node }: { node: TipTapNode }) {
  switch (node.type) {
    case 'paragraph':
      return (
        <p className="text-base leading-relaxed text-[var(--text-primary)]">
          {node.content?.map((child, i) => {
            if (child.type === 'text') {
              let element: React.ReactNode = child.text
              if (child.marks) {
                for (const mark of child.marks) {
                  if (mark.type === 'bold') element = <strong key={i}>{element}</strong>
                  if (mark.type === 'italic') element = <em key={i}>{element}</em>
                  if (mark.type === 'link' && mark.attrs?.href) {
                    element = (
                      <a
                        key={i}
                        href={mark.attrs.href}
                        className="text-[var(--accent)] hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {element}
                      </a>
                    )
                  }
                }
              }
              return <span key={i}>{element}</span>
            }
            return null
          })}
        </p>
      )

    case 'heading':
      const Tag = node.attrs.level === 2 ? 'h2' : 'h3'
      const headingClass =
        node.attrs.level === 2
          ? 'text-xl font-bold mt-8 mb-3 text-[var(--text-primary)]'
          : 'text-lg font-semibold mt-6 mb-2 text-[var(--text-primary)]'
      return (
        <Tag className={headingClass} id={slugifyHeading(node.content?.[0]?.text || '')}>
          {node.content?.map((child, i) => (
            <span key={i}>{child.text}</span>
          ))}
        </Tag>
      )

    case 'pullQuote':
      return (
        <blockquote className="border-l-4 border-[var(--accent)] pl-4 py-2 my-6 italic text-[var(--text-secondary)]">
          <p className="text-lg">{node.attrs.content}</p>
        </blockquote>
      )

    case 'companyCard':
      return (
        <div className="my-4 p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
          <p className="text-sm text-[var(--text-muted)]">Company Profile</p>
          <CompanyCardEmbed companyId={node.attrs.companyId} />
        </div>
      )

    case 'chartEmbed':
      return (
        <div className="my-4 p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
          <p className="text-sm text-[var(--text-muted)]">
            {node.attrs.chartType === 'price_history' ? 'Price History' :
             node.attrs.chartType === 'funding_history' ? 'Funding History' :
             'Market Cap'} — {node.attrs.period}
          </p>
          <div className="h-48 flex items-center justify-center text-[var(--text-muted)]">
            Chart available in full version
          </div>
        </div>
      )

    case 'pipelineTable':
      return (
        <div className="my-4 p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
          <p className="text-sm text-[var(--text-muted)]">Drug Pipeline</p>
          <PipelineTableEmbed companyId={node.attrs.companyId} />
        </div>
      )

    case 'dataCallout':
      return (
        <div className="my-4 p-4 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 text-center">
          <p className="text-3xl font-bold text-[var(--accent)]">{node.attrs.value}</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">{node.attrs.label}</p>
        </div>
      )

    case 'divider':
      return <hr className="my-6 border-[var(--border)]" />

    case 'image':
      return (
        <figure className="my-6">
          <img
            src={node.attrs.src}
            alt={node.attrs.alt}
            className="w-full rounded-lg"
            loading="lazy"
          />
          {node.attrs.caption && (
            <figcaption className="text-sm text-[var(--text-muted)] mt-2 text-center">
              {node.attrs.caption}
            </figcaption>
          )}
        </figure>
      )

    default:
      return null
  }
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Phase A: simple placeholders. Phase B: fetch and render live data
function CompanyCardEmbed({ companyId }: { companyId: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-8 h-8 rounded bg-[var(--accent)]/20 flex items-center justify-center text-xs font-bold text-[var(--accent)]">
        Co
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">Company data loading...</p>
        <p className="text-xs text-[var(--text-muted)]">View full profile</p>
      </div>
    </div>
  )
}

function PipelineTableEmbed({ companyId }: { companyId: string }) {
  return (
    <div className="py-2">
      <p className="text-sm text-[var(--text-muted)]">Pipeline data loading...</p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/news/BlockRenderer.tsx
git commit -m "feat: add block renderer component for TipTap JSONB article bodies"
```

---

### Task 9: Article page route

**Files:**
- Create: `app/news/[slug]/page.tsx`

- [ ] **Step 1: Create the article page**

Create `app/news/[slug]/page.tsx`:

```typescript
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import BlockRenderer from '@/components/news/BlockRenderer'
import ArticlePlaceholder from '@/components/news/ArticlePlaceholder'
import { TipTapDoc, Source, PlaceholderStyle } from '@/lib/article-engine/types'

export const revalidate = 1800 // 30 minutes

interface ArticleRow {
  id: string
  slug: string
  type: string
  headline: string
  subtitle: string | null
  body: TipTapDoc
  summary: string | null
  hero_image_url: string | null
  hero_placeholder_style: PlaceholderStyle | null
  sources: Source[]
  company_id: string | null
  sector: string | null
  article_style: string | null
  metadata: Record<string, any>
  reading_time_min: number | null
  published_at: string
  created_at: string
  seo_title: string | null
  seo_description: string | null
}

async function getArticle(slug: string): Promise<ArticleRow | null> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  return data
}

async function getRelatedArticles(article: ArticleRow) {
  const supabase = createServerClient()

  const { data } = await supabase
    .from('articles')
    .select('slug, headline, type, summary, hero_image_url, hero_placeholder_style, published_at, reading_time_min')
    .eq('status', 'published')
    .neq('slug', article.slug)
    .order('published_at', { ascending: false })
    .limit(3)

  return data || []
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = await getArticle(params.slug)
  if (!article) return { title: 'Article Not Found' }

  const title = article.seo_title || `${article.headline} | BiotechTube`
  const description = article.seo_description || article.summary || article.subtitle || ''

  return {
    title,
    description,
    openGraph: {
      title: article.headline,
      description,
      type: 'article',
      publishedTime: article.published_at,
      ...(article.hero_image_url && { images: [{ url: article.hero_image_url }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: article.headline,
      description,
      ...(article.hero_image_url && { images: [article.hero_image_url] }),
    },
    alternates: {
      canonical: `https://biotechtube.io/news/${article.slug}`,
    },
  }
}

const TYPE_LABELS: Record<string, string> = {
  funding_deal: 'Funding',
  clinical_trial: 'Clinical Trial',
  market_analysis: 'Market Analysis',
  company_deep_dive: 'Company Spotlight',
  weekly_roundup: 'Weekly Roundup',
  breaking_news: 'Breaking News',
}

const TYPE_COLORS: Record<string, string> = {
  funding_deal: 'bg-emerald-500/10 text-emerald-400',
  clinical_trial: 'bg-blue-500/10 text-blue-400',
  market_analysis: 'bg-purple-500/10 text-purple-400',
  company_deep_dive: 'bg-orange-500/10 text-orange-400',
  weekly_roundup: 'bg-yellow-500/10 text-yellow-400',
  breaking_news: 'bg-red-500/10 text-red-400',
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug)
  if (!article) notFound()

  const relatedArticles = await getRelatedArticles(article)

  const publishedDate = new Date(article.published_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <nav className="text-sm text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--accent)]">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/news" className="hover:text-[var(--accent)]">News</Link>
          <span className="mx-2">/</span>
          <span>{TYPE_LABELS[article.type] || article.type}</span>
        </nav>
      </div>

      {/* Header */}
      <header className="max-w-4xl mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TYPE_COLORS[article.type] || 'bg-gray-500/10 text-gray-400'}`}>
            {TYPE_LABELS[article.type] || article.type}
          </span>
          {article.reading_time_min && (
            <span className="text-sm text-[var(--text-muted)]">{article.reading_time_min} min read</span>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] leading-tight mb-3">
          {article.headline}
        </h1>

        {article.subtitle && (
          <p className="text-lg text-[var(--text-secondary)] mb-4">{article.subtitle}</p>
        )}

        <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
          <span>By BiotechTube · {publishedDate}</span>
          {/* Share buttons placeholder — Phase B */}
        </div>
      </header>

      {/* Hero Image / Placeholder */}
      <div className="max-w-4xl mx-auto px-4 mb-8">
        {article.hero_image_url ? (
          <img
            src={article.hero_image_url}
            alt={article.headline}
            className="w-full rounded-lg aspect-video object-cover"
          />
        ) : article.hero_placeholder_style ? (
          <ArticlePlaceholder
            style={article.hero_placeholder_style}
            headline={article.headline}
            className="w-full rounded-lg aspect-video"
          />
        ) : null}
      </div>

      {/* Article Body */}
      <article className="max-w-3xl mx-auto px-4 pb-12">
        <BlockRenderer doc={article.body} />

        {/* Sources */}
        {article.sources && (article.sources as Source[]).length > 0 && (
          <div className="mt-10 pt-6 border-t border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Sources</h3>
            <ul className="space-y-2">
              {(article.sources as Source[]).map((source, i) => (
                <li key={i} className="text-sm">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] hover:underline"
                  >
                    {source.name}
                  </a>
                  {source.date && (
                    <span className="text-[var(--text-muted)]"> — {source.date}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Metadata badges for funding deals */}
        {article.type === 'funding_deal' && article.metadata && (
          <div className="mt-6 flex flex-wrap gap-2">
            {article.metadata.round_type && (
              <span className="text-xs px-2 py-1 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                {article.metadata.round_type}
              </span>
            )}
            {article.metadata.amount_usd && (
              <span className="text-xs px-2 py-1 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                ${(article.metadata.amount_usd / 1e6).toFixed(0)}M
              </span>
            )}
            {article.metadata.lead_investor && (
              <span className="text-xs px-2 py-1 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                Led by {article.metadata.lead_investor}
              </span>
            )}
          </div>
        )}
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 pb-16">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Related Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relatedArticles.map((related) => (
              <Link
                key={related.slug}
                href={`/news/${related.slug}`}
                className="block p-4 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] transition-colors bg-[var(--bg-secondary)]"
              >
                {related.hero_image_url ? (
                  <img
                    src={related.hero_image_url}
                    alt={related.headline}
                    className="w-full h-32 object-cover rounded mb-3"
                  />
                ) : related.hero_placeholder_style ? (
                  <ArticlePlaceholder
                    style={related.hero_placeholder_style as PlaceholderStyle}
                    className="w-full h-32 rounded mb-3"
                  />
                ) : null}
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[related.type] || ''}`}>
                  {TYPE_LABELS[related.type] || related.type}
                </span>
                <h3 className="text-sm font-medium text-[var(--text-primary)] mt-2 line-clamp-2">
                  {related.headline}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {related.reading_time_min || 3} min read
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: article.headline,
            datePublished: article.published_at,
            dateModified: article.published_at,
            author: { '@type': 'Organization', name: 'BiotechTube' },
            publisher: { '@type': 'Organization', name: 'BiotechTube' },
            description: article.summary || article.subtitle,
            ...(article.hero_image_url && { image: article.hero_image_url }),
            ...(article.sources && {
              citation: (article.sources as Source[]).map((s) => ({
                '@type': 'CreativeWork',
                name: s.name,
                url: s.url,
              })),
            }),
          }),
        }}
      />
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/news/[slug]/page.tsx
git commit -m "feat: add unified article page at /news/[slug] with block rendering, SEO, and related articles"
```

---

### Task 10: Homepage "Latest Intelligence" section

**Files:**
- Create: `components/home/LatestIntelligence.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create the LatestIntelligence component**

Create `components/home/LatestIntelligence.tsx`:

```typescript
import Link from 'next/link'
import ArticlePlaceholder from '@/components/news/ArticlePlaceholder'
import { PlaceholderStyle } from '@/lib/article-engine/types'

interface ArticleCard {
  slug: string
  headline: string
  summary: string | null
  type: string
  hero_image_url: string | null
  hero_placeholder_style: PlaceholderStyle | null
  published_at: string
  reading_time_min: number | null
}

interface LatestIntelligenceProps {
  articles: ArticleCard[]
}

const TYPE_LABELS: Record<string, string> = {
  funding_deal: 'Funding',
  clinical_trial: 'Clinical Trial',
  market_analysis: 'Market',
  company_deep_dive: 'Spotlight',
  weekly_roundup: 'Roundup',
  breaking_news: 'Breaking',
}

const TYPE_COLORS: Record<string, string> = {
  funding_deal: 'bg-emerald-500/10 text-emerald-400',
  clinical_trial: 'bg-blue-500/10 text-blue-400',
  market_analysis: 'bg-purple-500/10 text-purple-400',
  company_deep_dive: 'bg-orange-500/10 text-orange-400',
  weekly_roundup: 'bg-yellow-500/10 text-yellow-400',
  breaking_news: 'bg-red-500/10 text-red-400',
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

export default function LatestIntelligence({ articles }: LatestIntelligenceProps) {
  if (!articles || articles.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Latest Intelligence</h2>
        <Link href="/news" className="text-sm text-[var(--accent)] hover:underline">
          View all →
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/news/${article.slug}`}
            className="flex-shrink-0 w-[280px] rounded-lg border border-[var(--border)] hover:border-[var(--accent)] transition-colors bg-[var(--bg-secondary)] overflow-hidden"
          >
            {article.hero_image_url ? (
              <img
                src={article.hero_image_url}
                alt={article.headline}
                className="w-full h-36 object-cover"
              />
            ) : article.hero_placeholder_style ? (
              <ArticlePlaceholder
                style={article.hero_placeholder_style}
                className="w-full h-36"
              />
            ) : (
              <div className="w-full h-36 bg-[#0f172a]" />
            )}
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[article.type] || ''}`}>
                  {TYPE_LABELS[article.type] || article.type}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">{timeAgo(article.published_at)}</span>
              </div>
              <h3 className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 leading-snug">
                {article.headline}
              </h3>
              {article.summary && (
                <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">{article.summary}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add data fetching and component to homepage**

Read `app/page.tsx` to find the right insertion point. Add a `getLatestArticles()` function and include `<LatestIntelligence>` near the top of the page sections (after the hero/market index, before top companies).

Data fetching function:

```typescript
async function getLatestArticles() {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('articles')
    .select('slug, headline, summary, type, hero_image_url, hero_placeholder_style, published_at, reading_time_min')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(5)

  return data || []
}
```

Call it alongside the other data fetches. Pass the result to `<LatestIntelligence articles={latestArticles} />`.

- [ ] **Step 3: Commit**

```bash
git add components/home/LatestIntelligence.tsx app/page.tsx
git commit -m "feat: add Latest Intelligence section to homepage with horizontal article cards"
```

---

### Task 11: Update sitemap to include new articles

**Files:**
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Read current sitemap.ts**

Read `app/sitemap.ts` to understand existing pattern.

- [ ] **Step 2: Add articles table to sitemap**

Add a query for articles from the new `articles` table alongside the existing funding articles query:

```typescript
// Fetch new engine articles
const { data: engineArticles } = await supabase
  .from('articles')
  .select('slug, published_at')
  .eq('status', 'published')
  .order('published_at', { ascending: false })

const engineArticlePages = (engineArticles || []).map((a) => ({
  url: `${BASE_URL}/news/${a.slug}`,
  lastModified: new Date(a.published_at),
  changeFrequency: 'weekly' as const,
  priority: 0.7,
}))
```

Add `...engineArticlePages` to the returned array.

- [ ] **Step 3: Commit**

```bash
git add app/sitemap.ts
git commit -m "feat: include new engine articles in sitemap"
```

---

## Chunk 5: Image Workflow Documentation & Final Verification

### Task 12: Image generation workflow documentation

**Files:**
- Create: `docs/workflows/image-generation.md`

- [ ] **Step 1: Create the image workflow doc**

Create `docs/workflows/image-generation.md`:

```markdown
# Image Generation Workflow for Claude Cowork

## Overview

BiotechTube articles are generated with AI image prompts stored in the database.
Images are created manually via ChatGPT or Gemini using these prompts, then uploaded
via the admin editor (Phase B) or directly to Supabase Storage.

## Steps

### 1. Find articles needing images

Query the database for published articles without hero images:

```sql
SELECT id, slug, headline, hero_image_prompt
FROM articles
WHERE hero_image_url IS NULL
  AND status = 'published'
ORDER BY published_at DESC;
```

### 2. Copy the image prompt

Each article has a `hero_image_prompt` field containing a pre-formatted prompt
optimized for ChatGPT (DALL-E) or Google Gemini image generation.

The prompt follows BiotechTube's branded visual style:
- Deep navy (#0f172a) backgrounds
- Electric green (#059669) accents
- Bold geometric data visualization + organic biotech elements
- Bloomberg Businessweek meets scientific journal aesthetic
- No text/words in the image
- 16:9 aspect ratio

### 3. Generate the image

1. Open ChatGPT or Gemini
2. Paste the `hero_image_prompt` value
3. Generate 2-3 variations
4. Pick the one that best fits:
   - Feels "BiotechTube" — bold, data-visual, abstract biotech
   - No readable text in the image
   - Colors lean navy/green/white
   - Works at both large (article page) and small (card thumbnail) sizes
5. Download at highest resolution available

### 4. Upload to Supabase Storage

Upload the image to the `article-images` bucket:

**Path:** `heroes/{article-slug}.webp`

The admin editor (Phase B) will provide drag-and-drop upload.
Until then, upload directly via Supabase Dashboard:
1. Go to Storage > article-images > heroes
2. Upload the image file
3. Copy the public URL

### 5. Update the article

```sql
UPDATE articles
SET hero_image_url = '{public_url}',
    updated_at = now()
WHERE slug = '{article-slug}';
```

## Brand Style Guide for Images

| Element | Value |
|---------|-------|
| Primary background | Deep navy (#0f172a) |
| Accent color | Electric green (#059669) |
| Secondary | Cool gray (#64748b), white |
| Aesthetic | Bloomberg Businessweek + scientific journal |
| Elements | Geometric shapes, data viz patterns, molecular/organic forms |
| Avoid | Stock photo look, literal representations, text in images |
| Variety | Each image unique while belonging to the same visual family |

## Article Type Visual Themes

| Type | Visual Elements |
|------|----------------|
| Funding Deal | Ascending bars, currency symbols, growth shapes |
| Clinical Trial | Hexagonal molecules, scatter plots, DNA patterns |
| Market Analysis | Flowing data streams, treemap patterns, chart waves |
| Company Spotlight | Concentric circles, corporate silhouettes, depth layers |
| Weekly Roundup | Mosaic grid of small icons, compilation feel |
| Breaking News | Angular burst patterns, dynamic movement, sharp contrasts |
```

- [ ] **Step 2: Commit**

```bash
git add docs/workflows/image-generation.md
git commit -m "docs: add image generation workflow for Claude Cowork"
```

---

### Task 13: Smoke test the full pipeline

- [ ] **Step 1: Verify database tables**

Use Supabase MCP `list_tables` to confirm `articles` and `rss_items` tables exist with correct columns.

- [ ] **Step 2: Test article generation manually**

Run the generate-news cron locally to verify it can:
1. Query funding rounds from the database
2. Build context from company data
3. Call DeepSeek and get structured output
4. Convert to TipTap blocks
5. Insert into `articles` table

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/generate-news
```

- [ ] **Step 3: Verify article page renders**

Open a generated article at `http://localhost:3000/news/{slug}` and verify:
- Headline, subtitle render
- Body blocks render correctly
- Placeholder image shows
- Sources display
- SEO meta tags present
- JSON-LD structured data present

- [ ] **Step 4: Verify homepage integration**

Open `http://localhost:3000` and verify the "Latest Intelligence" section shows article cards.

- [ ] **Step 5: Final commit with any fixes**

```bash
git add -A
git commit -m "fix: address smoke test issues from news engine Phase A"
```

---

## Summary

**Phase A delivers:**
1. `articles` table + `rss_items` table (database)
2. `lib/article-engine/` — core engine with types, prompts, styles, sources, confidence scoring, block conversion, image prompts, publisher
3. `/api/cron/generate-news` — orchestrator cron for funding_deal + breaking_news
4. Updated `scrape-funding` cron to store RSS items
5. `/news/[slug]` — unified article page with block rendering, SEO, JSON-LD
6. `ArticlePlaceholder` — branded SVG/CSS hero image placeholders
7. `LatestIntelligence` — homepage integration
8. Updated sitemap
9. Image workflow documentation for Claude Cowork

**What's NOT in Phase A (deferred):**
- TipTap admin editor (Phase B)
- 4 remaining article types: clinical_trial, market_analysis, company_deep_dive, weekly_roundup (Phase C)
- Interactive custom blocks — companyCard, chartEmbed, pipelineTable render as placeholders (Phase B)
- Migration of existing funding_articles to new table (Phase C)
- News Hub `/news` page redesign (Phase C)
- RSS feed output (Phase C)
