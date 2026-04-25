import { describe, it, expect } from 'vitest'
import { levenshtein, matchCompany } from '../fuzzy-match'

describe('levenshtein', () => {
  it('returns 0 for equal strings', () => {
    expect(levenshtein('moderna', 'moderna')).toBe(0)
  })
  it('handles single-char edits', () => {
    expect(levenshtein('moderna', 'modernax')).toBe(1)
    expect(levenshtein('biogen', 'biogen inc')).toBe(4)
  })
  it('is case-insensitive after normalization', () => {
    expect(levenshtein('PFIZER', 'pfizer')).toBe(0)
  })
})

describe('matchCompany', () => {
  const companies = [
    { id: 'a', name: 'Moderna Inc.', ticker: 'MRNA' },
    { id: 'b', name: 'Pfizer Inc.', ticker: 'PFE' },
    { id: 'c', name: 'BioMarin Pharmaceutical', ticker: 'BMRN' },
  ]

  it('prefers ticker exact match', () => {
    const m = matchCompany({ ticker: 'mrna', company_name: 'who cares' }, companies)
    expect(m?.company_id).toBe('a')
    expect(m?.matched_via).toBe('ticker')
    expect(m?.match_quality).toBe(1)
  })

  it('falls back to name exact (case-insensitive, suffix-stripped)', () => {
    const m = matchCompany({ ticker: null, company_name: 'pfizer' }, companies)
    expect(m?.company_id).toBe('b')
    expect(m?.matched_via).toBe('name_exact')
  })

  it('falls back to name fuzzy within Levenshtein 3', () => {
    // 'biomarn' is distance 1 from normalized 'biomarin' (BioMarin Pharmaceutical
    // → 'biomarin' after stripping the ' pharmaceutical' suffix).
    const m = matchCompany({ ticker: null, company_name: 'biomarn' }, companies)
    expect(m?.company_id).toBe('c')
    expect(m?.matched_via).toBe('name_fuzzy')
    expect(m!.match_quality).toBeLessThan(1)
    expect(m!.match_quality).toBeGreaterThan(0.5)
  })

  it('returns null when no candidate is within distance 3', () => {
    const m = matchCompany({ ticker: null, company_name: 'completely unrelated co' }, companies)
    expect(m).toBeNull()
  })

  it('returns null when both ticker and name are missing', () => {
    const m = matchCompany({ ticker: null, company_name: null }, companies)
    expect(m).toBeNull()
  })
})
