import OpenAI from 'openai'
import type { CompanySnapshot, EditDraft, ExternalUpdate, PatchField } from './types'
import { ALLOWED_PATCH_FIELDS } from './types'

// Keep this prompt byte-identical across calls so DeepSeek's automatic
// prefix cache catches it (cached input is ~12x cheaper).
const SYSTEM_PROMPT = `You are an analyst that updates biotech company profiles from external news.

You receive (1) a recent update (RSS, FDA, funding round) and (2) the current profile in JSON.
Output a JSON object with EXACTLY these keys:

{
  "proposed_changes": { ...partial profile patch... },
  "confidence": 0.0-1.0,
  "reasoning": "one short sentence"
}

Rules:
- Only patch fields that need to change. Do not echo unchanged fields.
- Allowed patch fields: ${ALLOWED_PATCH_FIELDS.join(', ')}. Anything else will be discarded.
- "stage" should follow the form: Preclinical | Phase 1 | Phase 2 | Phase 3 | Filed | Approved | Commercial.
- "categories" is a list of 1-4 short tags (e.g. ["oncology","cell therapy"]).
- "total_raised" is a USD integer, monotonically increasing from current value (never lower it).
- Confidence 0.9+ means the source is unambiguous AND matches the company; 0.6-0.9 = plausible but ambiguous; <0.6 = speculation.
- If the update does not warrant any change, return {"proposed_changes":{},"confidence":0,"reasoning":"no change"}.
- DO NOT invent values. Empty object is the safe default.
- Output JSON only. No markdown fences.`

export async function draftEdit(
  client: OpenAI,
  update: ExternalUpdate,
  company: CompanySnapshot
): Promise<EditDraft> {
  const userPrompt = `## UPDATE
source_type: ${update.source_type}
source_id: ${update.source_id}
headline: ${update.headline}
published_at: ${update.published_at || 'unknown'}
url: ${update.url || 'n/a'}
body:
${update.body_snippet}

## CURRENT PROFILE
${JSON.stringify(
  {
    name: company.name,
    ticker: company.ticker,
    description: company.description,
    categories: company.categories,
    stage: company.stage,
    website: company.website,
    total_raised: company.total_raised,
    valuation: company.valuation,
  },
  null,
  2
)}

Return the JSON edit draft now.`

  const response = await client.chat.completions.create({
    model: 'deepseek-v4-flash',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 600,
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('Empty draft response')
  const parsed = JSON.parse(content) as Partial<EditDraft>
  const proposed_changes = (parsed.proposed_changes ?? {}) as Partial<Record<PatchField, unknown>>
  const confidence =
    typeof parsed.confidence === 'number' && parsed.confidence >= 0 && parsed.confidence <= 1
      ? parsed.confidence
      : 0
  const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : ''
  return { proposed_changes, confidence, reasoning }
}
