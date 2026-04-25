import type { AIArticleOutput } from '@/lib/article-engine/types'
import type { Prediction } from './predict'

function formatUSD(n: number | null): string {
  if (!n) return 'undisclosed'
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`
  return `$${n.toLocaleString()}`
}

export function renderPredictionArticle(
  predictions: Prediction[],
  summary: string,
  weekStart: string
): AIArticleOutput {
  const headline = `Funding Radar: 5 Biotechs Likely to Raise in the Next 60 Days`
  const subtitle = `Week of ${weekStart} · BiotechTube AI prediction`

  const sections: AIArticleOutput['sections'] = []

  if (summary) {
    sections.push({ type: 'text', content: summary })
  }
  sections.push({ type: 'heading', content: 'The Picks', level: 2 })

  for (const p of predictions.slice(0, 5)) {
    sections.push({ type: 'heading', content: p.company_name, level: 3 })
    sections.push({
      type: 'data_point',
      value: formatUSD(p.predicted_round_size_usd),
      label: `${p.predicted_round_type || 'Round'} · lead: ${p.predicted_lead_investor || 'TBD'} · conf ${(p.confidence * 100).toFixed(0)}%`,
    })
    sections.push({ type: 'text', content: p.reasoning })
  }

  sections.push({ type: 'heading', content: 'Methodology', level: 2 })
  sections.push({
    type: 'text',
    content: 'Predictions combine three signals: time since last raise (12-36 month re-raise window), lead-investor cadence in the 12 months prior, and sector funding momentum in the trailing quarter. DeepSeek V4-Pro synthesizes these into the picks above. Predictions are not investment advice.',
  })

  return {
    headline,
    subtitle,
    summary: summary || `Five biotech companies most likely to announce a funding round in the next 60 days, based on lead-investor cadence and sector momentum.`,
    sections,
    sources: [
      { name: 'BiotechTube funding rounds dataset', url: 'https://biotechtube.com/news', date: weekStart },
    ],
    image_topic: 'biotech funding radar prediction chart',
  }
}
