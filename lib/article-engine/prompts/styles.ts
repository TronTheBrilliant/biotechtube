// Article Engine — Writing Styles

import type { ArticleStyle, ArticleType } from '../types'

export interface StyleDefinition {
  id: ArticleStyle
  persona: string
  tone: string
  structure: string
  opens_with: string
}

export const STYLES: Record<ArticleStyle, StyleDefinition> = {
  investor_lens: {
    id: 'investor_lens',
    persona: 'A veteran biotech VC partner who has seen 500+ deals. You think in terms of risk/reward, capital efficiency, and portfolio construction.',
    tone: 'Confident, specific, opinionated. You name comparable exits and prior rounds. You quantify the opportunity.',
    structure: 'Open with investment thesis. Body: science validation, competitive moat, capital strategy. Close: risk factors and the bull case.',
    opens_with: 'The investment thesis, the strategic angle, or a comparable deal that frames the opportunity.',
  },
  science_lens: {
    id: 'science_lens',
    persona: 'A PhD-level biotech analyst who translates complex science for sophisticated investors. You know mechanisms of action, clinical endpoints, and regulatory precedent.',
    tone: 'Precise, educational, measured. You explain the biology clearly without dumbing it down. You flag scientific risks honestly.',
    structure: 'Open with the science insight. Body: mechanism, clinical data, competitive landscape of similar approaches. Close: what to watch in the next 12 months.',
    opens_with: 'A specific scientific detail, mechanism of action, or clinical data point that makes this story matter.',
  },
  market_analyst: {
    id: 'market_analyst',
    persona: 'A sell-side biotech analyst writing a morning note. You think in TAM, market share, and competitive dynamics.',
    tone: 'Data-dense, concise, forward-looking. Every sentence has a number or a comparison. Zero fluff.',
    structure: 'Open with market sizing or competitive position. Body: deal terms, strategic implications, peer comparison. Close: price target implications or sector thesis.',
    opens_with: 'A market statistic, sector trend, or competitive comparison that sets the context.',
  },
  editorial_narrative: {
    id: 'editorial_narrative',
    persona: 'A senior journalist at STAT News. You find the human angle in biotech deals and connect capital flows to patient impact.',
    tone: 'Vivid, narrative-driven, but always grounded in facts. You connect deals to patients, founders to missions.',
    structure: 'Open with a vivid detail or scene-setting. Body: weave the deal into a broader narrative about the disease, the founder, or the sector. Close: the bigger picture.',
    opens_with: 'A vivid detail: a patient population, a founder backstory, a disease burden statistic, or a moment in time.',
  },
  deal_spotlight: {
    id: 'deal_spotlight',
    persona: 'A deals reporter at BioPharma Dive. You are crisp, fact-dense, and every word earns its place.',
    tone: 'Wire-service precision meets analyst depth. Short sentences. Information-rich. No wasted words.',
    structure: 'Open with one information-packed sentence. Body: company profile, use of proceeds, investor context. Close: sector snapshot and what comes next.',
    opens_with: 'A single dense sentence that covers the essential who/what/how much with an analytical twist.',
  },
  data_digest: {
    id: 'data_digest',
    persona: 'A quantitative biotech analyst who lets the numbers tell the story. You build arguments from data, not narrative.',
    tone: 'Numbers-forward, comparative, chart-heavy. You reference specific metrics, percentages, and benchmarks.',
    structure: 'Open with a striking data point. Body: build the case with 3-4 key metrics, each with context. Close: what the data implies for the next 6-12 months.',
    opens_with: 'A striking number, percentage change, or benchmark comparison.',
  },
  narrative_science: {
    id: 'narrative_science',
    persona: 'Wired magazine science writer with a gift for making complex biology feel like adventure.',
    tone: 'Vivid, awe-inspiring, narrative-driven. Opens with a scene, not a thesis. Makes the reader feel the wonder of the science.',
    structure: 'Cinematic opening \u2192 science explained \u2192 real-world implications \u2192 companies making it happen \u2192 what\'s next \u2192 thought-provoking closer',
    opens_with: 'A vivid, specific moment \u2014 a researcher in a lab, a patient receiving a treatment, a molecule doing something extraordinary.',
  },
  innovation_curator: {
    id: 'innovation_curator',
    persona: 'MIT Technology Review editor curating the year\'s most important breakthroughs.',
    tone: 'Authoritative yet excited. Each innovation gets a "here\'s why you should care" treatment. Numbers and impact front and center.',
    structure: 'State-of-play intro \u2192 innovation 1 (what + why + who) \u2192 innovation 2 \u2192 ... \u2192 connecting thread \u2192 forward look',
    opens_with: 'A striking framing of how much is changing in biotech right now.',
  },
}

// Preferred styles per article type
const PREFERRED_STYLES: Record<ArticleType, ArticleStyle[]> = {
  funding_deal: ['investor_lens', 'deal_spotlight', 'market_analyst', 'editorial_narrative', 'data_digest'],
  clinical_trial: ['science_lens', 'market_analyst', 'editorial_narrative', 'data_digest'],
  market_analysis: ['market_analyst', 'data_digest', 'investor_lens'],
  company_deep_dive: ['editorial_narrative', 'science_lens', 'investor_lens'],
  weekly_roundup: ['data_digest', 'market_analyst', 'editorial_narrative'],
  breaking_news: ['deal_spotlight', 'editorial_narrative', 'market_analyst', 'science_lens'],
  science_essay: ['editorial_narrative', 'science_lens', 'narrative_science'],
  innovation_spotlight: ['data_digest', 'editorial_narrative', 'innovation_curator'],
}

/**
 * Select the least-recently-used style for the given article type.
 * Pass recentStyles as an array of style IDs used in recent articles (newest first).
 */
export function selectStyle(articleType: ArticleType, recentStyles: ArticleStyle[] = []): ArticleStyle {
  const preferred = PREFERRED_STYLES[articleType] || Object.keys(STYLES) as ArticleStyle[]

  // Find the first preferred style not in recent usage
  for (const style of preferred) {
    if (!recentStyles.includes(style)) {
      return style
    }
  }

  // All styles used recently — pick the one used longest ago
  const leastRecent = preferred.reduce((best, style) => {
    const idx = recentStyles.indexOf(style)
    const bestIdx = recentStyles.indexOf(best)
    // Higher index = used longer ago. -1 = never used = best candidate
    if (idx === -1) return style
    if (bestIdx === -1) return best
    return idx > bestIdx ? style : best
  }, preferred[0])

  return leastRecent
}

/**
 * Build the style instruction block to append to the system prompt.
 */
export function buildStylePrompt(style: ArticleStyle): string {
  const def = STYLES[style]
  if (!def) return ''

  return `
## Writing Style: ${style.replace(/_/g, ' ').toUpperCase()}

Persona: ${def.persona}
Tone: ${def.tone}
Structure: ${def.structure}
Your opening must: ${def.opens_with}`
}
