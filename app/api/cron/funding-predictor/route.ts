import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { gatherPredictorInputs } from '@/lib/funding-predictor/gather'
import { predictTop5 } from '@/lib/funding-predictor/predict'
import { renderPredictionArticle } from '@/lib/funding-predictor/render'
import { convertToBlocks, estimateReadingTime } from '@/lib/article-engine/blocks'
import { publishArticle } from '@/lib/article-engine/publisher'
import { slugify } from '@/lib/seo-utils'
import type { GeneratedArticle } from '@/lib/article-engine/types'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  const ai = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: process.env.DEEPSEEK_API_KEY })

  // Compute week start (Monday) so the slug is stable across the day.
  const now = new Date()
  const dow = now.getUTCDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const weekStart = new Date(now)
  weekStart.setUTCDate(now.getUTCDate() + mondayOffset)
  const weekStartISO = weekStart.toISOString().slice(0, 10)

  const inputs = await gatherPredictorInputs()
  const { predictions, summary } = await predictTop5(ai, inputs)
  const ai_output = renderPredictionArticle(predictions, summary, weekStartISO)
  const body = convertToBlocks(ai_output, undefined)

  const article: GeneratedArticle = {
    slug: `${slugify(ai_output.headline).slice(0, 60)}-${weekStartISO}`,
    type: 'funding_prediction',
    status: 'published',
    confidence: 'medium',
    headline: ai_output.headline,
    subtitle: ai_output.subtitle,
    body,
    summary: ai_output.summary,
    hero_image_prompt: 'Editorial illustration of a radar sweep over biotech molecules, dark background, neon green sweep, high contrast',
    hero_placeholder_style: { pattern: 'waves', accentColor: '#9333ea', icon: 'trending-up' },
    sources: ai_output.sources,
    company_id: null,
    company_ids: [],
    sector: null,
    article_style: 'data_digest',
    metadata: {
      source_type: 'funding_prediction',
      source_id: weekStartISO,
      week_start: weekStartISO,
      predictions,
      send_to_newsletter: 'funding_radar_pro',
      generated_at: new Date().toISOString(),
    },
    reading_time_min: estimateReadingTime(ai_output),
    seo_title: ai_output.headline,
    seo_description: ai_output.summary?.slice(0, 160) || null,
    published_at: new Date().toISOString(),
    edited_by: 'ai',
  }

  const { id, slug } = await publishArticle(article)

  return NextResponse.json({
    ok: true,
    elapsed_seconds: Math.round((Date.now() - start) / 1000),
    article_id: id,
    slug,
    prediction_count: predictions.length,
  })
}
