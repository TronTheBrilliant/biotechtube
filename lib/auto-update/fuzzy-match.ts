import type { MatchResult } from './types'

const SUFFIXES = [' inc', ' inc.', ' corporation', ' corp', ' corp.', ' ltd', ' ltd.', ' plc', ' pharmaceuticals', ' pharmaceutical', ' therapeutics', ' biosciences', ' bio']

function normalize(s: string): string {
  let out = s.toLowerCase().trim().replace(/\s+/g, ' ')
  for (const suf of SUFFIXES) {
    if (out.endsWith(suf)) {
      out = out.slice(0, -suf.length).trim()
      break
    }
  }
  return out
}

export function levenshtein(a: string, b: string): number {
  const x = a.toLowerCase()
  const y = b.toLowerCase()
  const m = x.length, n = y.length
  if (m === 0) return n
  if (n === 0) return m
  const prev = new Array(n + 1).fill(0).map((_, i) => i)
  const curr = new Array(n + 1).fill(0)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j]
  }
  return prev[n]
}

interface Candidate {
  id: string
  name: string
  ticker: string | null
}

export function matchCompany(
  update: { ticker?: string | null; company_name?: string | null },
  companies: Candidate[]
): MatchResult | null {
  const ticker = update.ticker?.trim().toUpperCase() || null
  const rawName = update.company_name?.trim() || null
  if (!ticker && !rawName) return null

  if (ticker) {
    const hit = companies.find(c => c.ticker?.toUpperCase() === ticker)
    if (hit) return { company_id: hit.id, company_name: hit.name, match_quality: 1, matched_via: 'ticker' }
  }

  if (!rawName) return null
  const needle = normalize(rawName)

  // Exact (post-normalization) match
  const exact = companies.find(c => normalize(c.name) === needle)
  if (exact) {
    return { company_id: exact.id, company_name: exact.name, match_quality: 0.95, matched_via: 'name_exact' }
  }

  // Fuzzy: pick min-distance candidate within threshold 3
  let best: { c: Candidate; d: number } | null = null
  for (const c of companies) {
    const d = levenshtein(needle, normalize(c.name))
    if (d <= 3 && (!best || d < best.d)) best = { c, d }
  }
  if (!best) return null
  // Map distance 0..3 → quality 0.9..0.55 linearly
  const quality = 0.9 - (best.d / 3) * 0.35
  return { company_id: best.c.id, company_name: best.c.name, match_quality: quality, matched_via: 'name_fuzzy' }
}
