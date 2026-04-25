import { describe, it, expect, vi } from 'vitest'
import { sanitizePatch, applyEditDraft } from '../apply'
import type { EditDraft } from '../types'

describe('sanitizePatch', () => {
  it('drops fields not in the allowlist', () => {
    const out = sanitizePatch({
      description: 'new desc',
      stage: 'Phase 2',
      id: 'attempted-overwrite',
      slug: 'attempted-slug-change',
    } as any)
    expect(out).toEqual({ description: 'new desc', stage: 'Phase 2' })
  })

  it('returns empty object when no allowed fields present', () => {
    const out = sanitizePatch({ id: 'x', slug: 'y' } as any)
    expect(out).toEqual({})
  })
})

describe('applyEditDraft', () => {
  function mockSupabase(currentRow: any) {
    const updateMock = vi.fn(() => ({ eq: () => Promise.resolve({ data: null, error: null }) }))
    const insertMock = vi.fn(() => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'audit-1' }, error: null }) }) }))

    const sb = {
      from: vi.fn((table: string) => {
        if (table === 'companies') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: currentRow, error: null }),
              }),
            }),
            update: updateMock,
          }
        }
        if (table === 'audit_log') return { insert: insertMock }
        throw new Error('unexpected table ' + table)
      }),
    }
    return Object.assign(sb, { _updateMock: updateMock, _insertMock: insertMock })
  }

  it('skips when sanitized patch is empty', async () => {
    const sb = mockSupabase({ id: 'c1', description: 'old' })
    const draft: EditDraft = {
      proposed_changes: { id: 'x' } as any,
      confidence: 0.95,
      reasoning: 'unrelated',
    }
    const out = await applyEditDraft(sb as any, 'c1', draft, 'auto-update-cron:rss:r1')
    expect(out.applied).toBe(false)
    expect(out.reason).toMatch(/empty/i)
    expect(sb._updateMock).not.toHaveBeenCalled()
  })

  it('applies allowed fields and writes audit_log', async () => {
    const sb = mockSupabase({ id: 'c1', description: 'old', stage: 'Phase 1' })
    const draft: EditDraft = {
      proposed_changes: { description: 'new', stage: 'Phase 2' },
      confidence: 0.95,
      reasoning: 'rss says phase 2 readout',
    }
    const out = await applyEditDraft(sb as any, 'c1', draft, 'auto-update-cron:rss:r1')
    expect(out.applied).toBe(true)
    expect(out.audit_log_id).toBe('audit-1')
    expect(sb._updateMock).toHaveBeenCalledOnce()
    expect(sb._insertMock).toHaveBeenCalledOnce()
    const auditRow = (sb._insertMock.mock.calls as any[])[0][0]
    expect(auditRow.table_name).toBe('companies')
    expect(auditRow.record_id).toBe('c1')
    expect(auditRow.action).toBe('auto_update')
    expect(auditRow.source).toBe('auto-update-cron:rss:r1')
    expect(auditRow.before_jsonb).toMatchObject({ description: 'old', stage: 'Phase 1' })
    expect(auditRow.after_jsonb).toMatchObject({ description: 'new', stage: 'Phase 2' })
  })
})
