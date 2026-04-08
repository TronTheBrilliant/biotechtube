// Article Engine — Main Engine

import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase'
import { slugify } from '@/lib/seo-utils'
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
import type {
  ArticleInput,
  ArticleContext,
  ArticleStyle,
  ArticleType,
  AIArticleOutput,
  GeneratedArticle,
} from './types'

function dealSizeCategory(amount: number): string {
  if (amount >= 500_000_000) return 'mega'
  if (amount >= 100_000_000) return 'growth'
  if (amount >= 30_000_000) return 'early'
  if (amount >= 10_000_000) return 'seed'
  return 'micro'
}

export class ArticleEngine {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY,
    })
  }

  /**
   * Full pipeline: gather context -> select style -> build prompt -> call DeepSeek
   * -> convert blocks -> generate image prompt -> score confidence -> assemble article
   */
  async generate(input: ArticleInput): Promise<GeneratedArticle> {
    // 1. Gather context
    const context = await this.gatherContext(input)

    // 2. Select style (use explicit or pick least-recently-used)
    const recentStyles = await this.getRecentStyles(input.type)
    const style = input.style || selectStyle(input.type, recentStyles)

    // 3. Build prompt
    const systemPrompt = BASE_SYSTEM_PROMPT + buildStylePrompt(style)
    const userPrompt = this.buildUserPrompt(input.type, context)

    // 4. Call DeepSeek
    const aiOutput = await this.callDeepSeek(systemPrompt, userPrompt)

    // 5. Convert to TipTap blocks
    const companyId = context.company?.id
    const body = convertToBlocks(aiOutput, companyId)

    // 6. Generate image prompt and placeholder
    const heroImagePrompt = generateImagePrompt(input.type, aiOutput.image_topic || '')
    const heroPlaceholderStyle = getPlaceholderStyle(input.type)

    // 7. Score confidence
    const confidence = scoreConfidence(context, aiOutput, input.type)
    const status = statusFromConfidence(confidence.level)

    // 8. Build slug with collision handling
    const dateStr = new Date().toISOString().slice(0, 10)
    const slug = await this.buildSlug(aiOutput.headline, dateStr)

    // 9. Reading time
    const readingTime = estimateReadingTime(aiOutput)

    // 10. Assemble
    const article: GeneratedArticle = {
      slug,
      type: input.type,
      status,
      confidence: confidence.level,
      headline: aiOutput.headline,
      subtitle: aiOutput.subtitle,
      body,
      summary: aiOutput.summary,
      hero_image_prompt: heroImagePrompt,
      hero_placeholder_style: heroPlaceholderStyle,
      sources: [...(aiOutput.sources || []), ...context.sources],
      company_id: companyId || null,
      company_ids: companyId ? [companyId] : [],
      sector: context.fundingRound?.sector || null,
      article_style: style,
      metadata: {
        source_type: this.sourceTypeKey(input.type),
        source_id: this.extractSourceId(input),
        deal_size: context.fundingRound ? dealSizeCategory(context.fundingRound.amount_usd) : undefined,
        confidence_breakdown: confidence,
        generated_at: new Date().toISOString(),
      },
      reading_time_min: readingTime,
      seo_title: aiOutput.headline,
      seo_description: aiOutput.summary?.slice(0, 160) || null,
      published_at: status === 'published' ? new Date().toISOString() : null,
      edited_by: 'ai',
    }

    return article
  }

  /**
   * Generate and immediately publish to DB.
   */
  async generateAndPublish(input: ArticleInput): Promise<{ id: string; slug: string; article: GeneratedArticle }> {
    const article = await this.generate(input)
    const { id, slug } = await publishArticle(article)
    return { id, slug, article }
  }

  /**
   * Check if an article already exists for a given source.
   */
  async checkDuplicate(sourceType: 'funding_round' | 'rss_item', sourceId: string): Promise<boolean> {
    return articleExistsForSource(sourceType, sourceId)
  }

  // ── Private Methods ──

  private async gatherContext(input: ArticleInput): Promise<ArticleContext> {
    switch (input.type) {
      case 'funding_deal':
        return gatherFundingContext(input.source.funding_round_id)
      case 'breaking_news':
        return gatherBreakingNewsContext(input.source.rss_item_id)
      default:
        // For types without dedicated gatherers, return minimal context
        return {
          sources: [],
          companyInDB: false,
          companyHasFullProfile: false,
          numbersVerifiedFromDB: false,
        }
    }
  }

  private buildUserPrompt(type: ArticleType, context: ArticleContext): string {
    switch (type) {
      case 'funding_deal':
        return buildFundingPrompt(context)
      case 'breaking_news':
        return buildBreakingNewsPrompt(context)
      default:
        return `Write a biotech ${type.replace(/_/g, ' ')} article based on the following context:\n${JSON.stringify(context, null, 2)}`
    }
  }

  private async callDeepSeek(systemPrompt: string, userPrompt: string): Promise<AIArticleOutput> {
    const response = await this.openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('Empty response from DeepSeek')

    try {
      const parsed = JSON.parse(content) as AIArticleOutput
      // Validate required fields
      if (!parsed.headline || !parsed.sections) {
        throw new Error('Missing required fields in AI output')
      }
      return parsed
    } catch (e) {
      throw new Error(`Failed to parse DeepSeek response: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  private async buildSlug(headline: string, dateStr: string): Promise<string> {
    const supabase = createServerClient()
    const base = slugify(headline).slice(0, 60)
    const candidate = `${base}-${dateStr}`

    // Check for collision
    const { data: existing } = await (supabase.from as any)('articles')
      .select('slug')
      .like('slug', `${candidate}%`)

    if (!existing || existing.length === 0) return candidate

    // Append counter
    const usedSlugs = new Set(existing.map((e: { slug: string }) => e.slug))
    let counter = 2
    while (usedSlugs.has(`${candidate}-${counter}`)) {
      counter++
    }
    return `${candidate}-${counter}`
  }

  private async getRecentStyles(articleType: ArticleType): Promise<ArticleStyle[]> {
    const supabase = createServerClient()
    const { data } = await (supabase.from as any)('articles')
      .select('article_style')
      .eq('type', articleType)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!data) return []
    return data
      .map((row: { article_style: string | null }) => row.article_style)
      .filter((s): s is ArticleStyle => !!s)
  }

  private sourceTypeKey(type: ArticleType): string {
    switch (type) {
      case 'funding_deal': return 'funding_round'
      case 'breaking_news': return 'rss_item'
      default: return type
    }
  }

  private extractSourceId(input: ArticleInput): string | undefined {
    return input.source.funding_round_id || input.source.rss_item_id || input.source.id
  }
}

// Convenience singleton
let _engine: ArticleEngine | null = null
export function getArticleEngine(): ArticleEngine {
  if (!_engine) _engine = new ArticleEngine()
  return _engine
}
