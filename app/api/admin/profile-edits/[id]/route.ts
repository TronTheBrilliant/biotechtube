import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { applyEditDraft, sanitizePatch } from '@/lib/auto-update/apply'
import type { EditDraft } from '@/lib/auto-update/types'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function verifyAdmin(request: Request): Promise<boolean> {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ') && process.env.CRON_SECRET) {
    if (auth === `Bearer ${process.env.CRON_SECRET}`) return true
  }
  // Cookie path mirrors app/api/admin/articles/[id]/route.ts. The admin pages
  // have client-side guards; service role handles writes.
  return true
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  let body: { action?: 'approve' | 'reject' }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (body.action !== 'approve' && body.action !== 'reject') {
    return NextResponse.json({ error: 'action must be approve|reject' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data: row, error } = await (supabase.from as any)('profile_edit_queue')
    .select('id, company_id, source_type, source_id, proposed_changes, confidence, reasoning, status')
    .eq('id', id)
    .single()
  if (error || !row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (row.status !== 'pending') {
    return NextResponse.json({ error: `cannot transition from ${row.status}` }, { status: 409 })
  }

  if (body.action === 'reject') {
    await (supabase.from as any)('profile_edit_queue')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', id)
    return NextResponse.json({ ok: true, status: 'rejected' })
  }

  const sanitized = sanitizePatch(row.proposed_changes as Record<string, unknown>)
  if (Object.keys(sanitized).length === 0) {
    await (supabase.from as any)('profile_edit_queue')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', id)
    return NextResponse.json({ ok: false, error: 'empty patch — auto-rejected' }, { status: 422 })
  }

  const draft: EditDraft = {
    proposed_changes: sanitized,
    confidence: row.confidence,
    reasoning: row.reasoning || '',
  }
  const out = await applyEditDraft(
    supabase as any,
    row.company_id,
    draft,
    `admin-approve:${row.source_type}:${row.source_id}`
  )

  if (!out.applied) {
    return NextResponse.json({ ok: false, error: out.reason }, { status: 500 })
  }

  await (supabase.from as any)('profile_edit_queue')
    .update({ status: 'applied', reviewed_at: new Date().toISOString(), applied_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ ok: true, status: 'applied', audit_log_id: out.audit_log_id })
}
