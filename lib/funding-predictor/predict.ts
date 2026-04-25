import OpenAI from 'openai'
import type { PredictorInput } from './gather'

export interface Prediction {
  company_name: string
  company_slug: string | null
  predicted_round_size_usd: number | null
  predicted_round_type: string | null
  predicted_lead_investor: string | null
  reasoning: string
  confidence: number
}

const SYSTEM_PROMPT = `You are a biotech VC analyst predicting funding rounds.

INPUT (JSON):
- recent_rounds: last-12mo deals
- investor_cadence: lead investors and their deal frequency
- sector_trends: which sectors are heating up
- candidate_companies: companies whose last round was 12-36 months ago (typical re-raise window)

TASK: pick FIVE companies most likely to raise in the next 60 days.

For each, output:
- company_name (must come from candidate_companies)
- company_slug (copy from candidate)
- predicted_round_size_usd (integer, plausible given stage + sector)
- predicted_round_type (Series A/B/C/D/Late-stage etc.)
- predicted_lead_investor (must come from investor_cadence list, pick the most plausible one based on sector overlap)
- reasoning (2-3 sentences, cite specific signals: time since last round, sector momentum, investor pattern)
- confidence (0-1)

OUTPUT JSON SHAPE:
{
  "predictions": [ ...5 objects in the shape above... ],
  "summary": "1 short paragraph stitching the picks together as a thesis"
}

Output JSON only. Do not invent companies that aren't in candidate_companies.`

export async function predictTop5(client: OpenAI, input: PredictorInput): Promise<{ predictions: Prediction[]; summary: string }> {
  const response = await client.chat.completions.create({
    model: 'deepseek-v4-pro',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(input) },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 4000,
  })
  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('Empty prediction response')
  const parsed = JSON.parse(content)
  if (!Array.isArray(parsed.predictions)) throw new Error('Predictions array missing')
  return { predictions: parsed.predictions, summary: parsed.summary || '' }
}
