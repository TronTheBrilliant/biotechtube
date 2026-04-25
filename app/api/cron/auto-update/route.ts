import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase'
import { gatherRecentUpdates } from '@/lib/auto-update/sources'
import { matchCompany } from '@/lib/auto-update/fuzzy-match'
import { draftEdit } from '@/lib/auto-update/draft'
import { applyEditDraft, sanitizePatch } from '@/lib/auto-update/apply'
import type { CompanySnapshot } from '@/lib/auto-update/types'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const TIMEOUT_MS = 270_000
const RATE_LIMIT_MS = 750
// Anything above MIN_CONF auto-applies. Everything is logged to audit_log
// so a bad change can be reverted by inspecting before_jsonb.
const MIN_CONF = 0.6

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  const supabase = createServerClient()
  const ai = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: process.env.DEEPSEEK_API_KEY })

  const updates = await gatherRecentUpdates()

  const { data: companies } = await supabase.from('companies').select('id, name, ticker')
  const companyDir = (companies || []) as { id: string; name: string; ticker: string | null }[]

  const counters = {
    updates_seen: updates.length,
    matched: 0,
    drafted: 0,
    auto_applied: 0,
    discarded_low_conf: 0,
    discarded_no_match: 0,
    errors: 0,
  }

  const errors: string[] = []

  for (const update of updates) {
    if (Date.now() - start > TIMEOUT_MS) break

    const match = matchCompany(update, companyDir)
    if (!match) {
      counters.discarded_no_match++
      continue
    }
    counters.matched++

    const { data: existing } = await (supabase.from as any)('profile_edit_queue')
      .select('id')
      .eq('source_type', update.source_type)
      .eq('source_id', update.source_id)
      .eq('company_id', match.company_id)
      .limit(1)
    if (existing && existing.length > 0) continue

    const { data: full } = await supabase
      .from('companies')
      .select('id, name, ticker, description, categories, stage, website, total_raised, valuation')
      .eq('id', match.company_id)
      .single()
    if (!full) continue
    const snapshot: CompanySnapshot = full as CompanySnapshot

    let draft
    try {
      draft = await draftEdit(ai, update, snapshot)
      counters.drafted++
    } catch (err) {
      counters.errors++
      errors.push(`draft ${update.source_type}:${update.source_id}: ${(err as Error).message}`)
      await sleep(RATE_LIMIT_MS)
      continue
    }

    // Geometric mean of model + match confidence: keeps both honest.
    const finalConfidence = Math.sqrt(draft.confidence * match.match_quality)

    const sanitized = sanitizePatch(draft.proposed_changes as Record<string, unknown>)
    if (Object.keys(sanitized).length === 0 || finalConfidence < MIN_CONF) {
      counters.discarded_low_conf++
      await sleep(RATE_LIMIT_MS)
      continue
    }

    const sourceTag = `auto-update-cron:${update.source_type}:${update.source_id}`

    const out = await applyEditDraft(supabase as any, match.company_id, { ...draft, proposed_changes: sanitized }, sourceTag)
    if (out.applied) {
      counters.auto_applied++
      await (supabase.from as any)('profile_edit_queue').insert({
        company_id: match.company_id,
        source_type: update.source_type,
        source_id: update.source_id,
        proposed_changes: sanitized,
        confidence: finalConfidence,
        reasoning: draft.reasoning,
        status: 'auto_applied',
        applied_at: new Date().toISOString(),
      })
    } else {
      counters.errors++
      errors.push(`apply ${update.source_type}:${update.source_id}: ${out.reason}`)
    }

    await sleep(RATE_LIMIT_MS)
  }

  return NextResponse.json({
    ok: true,
    elapsed_seconds: Math.round((Date.now() - start) / 1000),
    counters,
    errors: errors.slice(0, 20),
  })
}
