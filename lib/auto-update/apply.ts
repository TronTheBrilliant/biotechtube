import { ALLOWED_PATCH_FIELDS } from './types'
import type { EditDraft, ApplyOutcome, PatchField } from './types'

export function sanitizePatch(raw: Record<string, unknown>): Partial<Record<PatchField, unknown>> {
  const out: Partial<Record<PatchField, unknown>> = {}
  for (const k of ALLOWED_PATCH_FIELDS) {
    if (k in raw && raw[k] !== undefined && raw[k] !== null) {
      out[k] = raw[k]
    }
  }
  return out
}

type SupabaseLike = {
  from: (t: string) => any
}

export async function applyEditDraft(
  supabase: SupabaseLike,
  companyId: string,
  draft: EditDraft,
  source: string
): Promise<ApplyOutcome> {
  const patch = sanitizePatch(draft.proposed_changes as Record<string, unknown>)
  if (Object.keys(patch).length === 0) {
    return { applied: false, reason: 'empty patch after sanitization', audit_log_id: null }
  }

  const { data: current, error: readErr } = await supabase
    .from('companies')
    .select(['id', ...Object.keys(patch)].join(','))
    .eq('id', companyId)
    .single()
  if (readErr || !current) {
    return { applied: false, reason: `read failed: ${readErr?.message || 'not found'}`, audit_log_id: null }
  }

  const before: Record<string, unknown> = {}
  const after: Record<string, unknown> = {}
  for (const k of Object.keys(patch)) {
    before[k] = (current as any)[k] ?? null
    after[k] = patch[k as PatchField] ?? null
  }

  const { error: updErr } = await supabase.from('companies').update(patch).eq('id', companyId)
  if (updErr) {
    return { applied: false, reason: `update failed: ${updErr.message}`, audit_log_id: null }
  }

  const { data: audit, error: auditErr } = await supabase
    .from('audit_log')
    .insert({
      table_name: 'companies',
      record_id: companyId,
      action: 'auto_update',
      before_jsonb: before,
      after_jsonb: after,
      source,
    })
    .select('id')
    .single()
  if (auditErr) {
    return { applied: true, reason: `applied but audit insert failed: ${auditErr.message}`, audit_log_id: null }
  }

  return { applied: true, reason: 'ok', audit_log_id: audit?.id ?? null }
}
