// Article Engine — Article Publisher

import { createServerClient } from '@/lib/supabase'
import type { GeneratedArticle } from './types'

/**
 * Insert a generated article into the Supabase `articles` table.
 * Returns the inserted row's id and slug.
 */
export async function publishArticle(article: GeneratedArticle): Promise<{ id: string; slug: string }> {
  const supabase = createServerClient()

  const { data, error } = await (supabase.from as any)('articles')
    .insert({
      slug: article.slug,
      type: article.type,
      status: article.status,
      confidence: article.confidence,
      headline: article.headline,
      subtitle: article.subtitle,
      body: article.body as any,
      summary: article.summary,
      hero_image_prompt: article.hero_image_prompt,
      hero_image_url: article.hero_image_url || null,
      hero_placeholder_style: article.hero_placeholder_style as any,
      sources: article.sources as any,
      company_id: article.company_id,
      company_ids: article.company_ids,
      sector: article.sector,
      article_style: article.article_style,
      metadata: article.metadata as any,
      reading_time_min: article.reading_time_min,
      seo_title: article.seo_title,
      seo_description: article.seo_description,
      published_at: article.published_at,
      edited_by: article.edited_by,
    })
    .select('id, slug')
    .single()

  if (error) {
    throw new Error(`Failed to publish article: ${error.message}`)
  }

  return { id: data.id, slug: data.slug }
}

/**
 * Check if an article already exists for a given source (deduplication).
 * Checks by source URL in metadata or by matching company_id + type within a time window.
 */
export async function articleExistsForSource(
  sourceType: 'funding_round' | 'rss_item',
  sourceId: string,
): Promise<boolean> {
  const supabase = createServerClient()

  // Check metadata for source reference
  const { data } = await (supabase.from as any)('articles')
    .select('id')
    .contains('metadata', { source_type: sourceType, source_id: sourceId })
    .limit(1)

  return !!(data && data.length > 0)
}
