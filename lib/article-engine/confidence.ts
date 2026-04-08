// Article Engine — Confidence Scoring

import type { ArticleContext, AIArticleOutput, ArticleType, ConfidenceLevel, ArticleStatus } from './types'

interface ConfidenceBreakdown {
  sourceScore: number       // 0-40
  dataBackingScore: number  // 0-30
  typeBaseline: number      // 0-20
  outputQuality: number     // 0-10
  bannedPhrasesPenalty: number // 0 to -10
  total: number             // 0-100
  level: ConfidenceLevel
}

const BANNED_PHRASES = [
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

/**
 * Score article confidence 0-100 based on source quality, data backing,
 * article type baseline, and output quality signals.
 */
export function scoreConfidence(
  context: ArticleContext,
  output: AIArticleOutput,
  articleType: ArticleType,
): ConfidenceBreakdown {
  // Source score (0-40): how many and how good the sources are
  let sourceScore = 0
  const sourceCount = context.sources.length
  if (sourceCount >= 3) sourceScore = 40
  else if (sourceCount === 2) sourceScore = 30
  else if (sourceCount === 1) sourceScore = 20
  else sourceScore = 5

  // Bonus for having data from our DB
  if (context.companyInDB) sourceScore = Math.min(40, sourceScore + 5)
  if (context.numbersVerifiedFromDB) sourceScore = Math.min(40, sourceScore + 5)

  // Data backing score (0-30): how much structured data we have
  let dataBackingScore = 0
  if (context.company) dataBackingScore += 8
  if (context.companyHasFullProfile) dataBackingScore += 5
  if (context.pipeline?.length) dataBackingScore += 7
  if (context.recentPrice) dataBackingScore += 5
  if (context.fundingRound) dataBackingScore += 5
  dataBackingScore = Math.min(30, dataBackingScore)

  // Type baseline (0-20): some article types are inherently more reliable
  const TYPE_BASELINES: Record<ArticleType, number> = {
    funding_deal: 16,       // Based on structured deal data
    clinical_trial: 14,     // Based on trial registries
    market_analysis: 10,    // More speculative
    company_deep_dive: 12,  // Depends on data quality
    weekly_roundup: 15,     // Aggregation of known events
    breaking_news: 8,       // Single-source, fast turnaround
  }
  const typeBaseline = TYPE_BASELINES[articleType] || 10

  // Output quality (0-10): basic checks on the AI output
  let outputQuality = 0
  if (output.headline && output.headline.length > 10 && output.headline.length <= 100) outputQuality += 3
  if (output.summary && output.summary.length > 30) outputQuality += 3
  if (output.sections && output.sections.length >= 3) outputQuality += 2
  if (output.sources && output.sources.length > 0) outputQuality += 2
  outputQuality = Math.min(10, outputQuality)

  // Banned phrases penalty (0 to -10): penalize generic AI filler language
  let bannedPhrasesPenalty = 0
  const allText = output.sections
    .filter((s): s is { type: 'text'; content: string } => s.type === 'text')
    .map(s => s.content)
    .join(' ')
    .toLowerCase()
  const fullText = `${output.headline} ${output.subtitle || ''} ${output.summary || ''} ${allText}`.toLowerCase()

  for (const phrase of BANNED_PHRASES) {
    if (fullText.includes(phrase)) {
      bannedPhrasesPenalty -= 2
    }
  }
  bannedPhrasesPenalty = Math.max(-10, bannedPhrasesPenalty)

  const total = Math.max(0, sourceScore + dataBackingScore + typeBaseline + outputQuality + bannedPhrasesPenalty)
  const level: ConfidenceLevel = total >= 65 ? 'high' : total >= 40 ? 'medium' : 'low'

  return { sourceScore, dataBackingScore, typeBaseline, outputQuality, bannedPhrasesPenalty, total, level }
}

/**
 * Map confidence level to article status.
 * High confidence -> published, medium -> in_review, low -> draft.
 */
export function statusFromConfidence(level: ConfidenceLevel): ArticleStatus {
  switch (level) {
    case 'high': return 'published'
    case 'medium': return 'in_review'
    case 'low': return 'draft'
  }
}
