export type SourceType = 'rss' | 'fda' | 'ct_gov' | 'sec' | 'funding_round'

export interface ExternalUpdate {
  source_type: SourceType
  source_id: string
  ticker?: string | null
  company_name?: string | null
  headline: string
  body_snippet: string
  published_at: string | null
  url: string | null
}

export interface CompanySnapshot {
  id: string
  name: string
  ticker: string | null
  description: string | null
  categories: string[] | null
  stage: string | null
  website: string | null
  total_raised: number | null
  valuation: number | null
}

export interface MatchResult {
  company_id: string
  company_name: string
  match_quality: number   // 0..1
  matched_via: 'ticker' | 'name_exact' | 'name_fuzzy'
}

// Allowed paths the model may patch. Anything else is dropped before write.
export const ALLOWED_PATCH_FIELDS = [
  'description',
  'stage',
  'categories',
  'website',
  'total_raised',
  'valuation',
] as const
export type PatchField = typeof ALLOWED_PATCH_FIELDS[number]

export interface EditDraft {
  proposed_changes: Partial<Record<PatchField, unknown>>
  confidence: number      // 0..1, model's self-assessed confidence
  reasoning: string
}

export interface ApplyOutcome {
  applied: boolean
  reason: string
  audit_log_id: string | null
}
