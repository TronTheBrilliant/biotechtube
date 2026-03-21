import type { Company } from './types'

/**
 * Convert a Supabase company row to the frontend Company interface.
 * This lets us swap from JSON to API without rewriting every component.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbRowToCompany(row: Record<string, any>): Company {
  return {
    slug: row.slug,
    name: row.name,
    country: row.country,
    city: row.city || '',
    founded: row.founded || 0,
    stage: row.stage || 'Pre-clinical',
    type: row.company_type || 'Private',
    ticker: row.ticker || undefined,
    focus: row.categories || [],
    employees: row.employee_range || '',
    totalRaised: row.total_raised || 0,
    valuation: row.valuation || undefined,
    isEstimated: row.is_estimated || false,
    description: row.description || '',
    website: row.domain || row.website || '',
    logoUrl: row.logo_url || undefined,
    trending: row.trending_rank || null,
    profileViews: row.profile_views || 0,
  }
}

/**
 * Convert an array of DB rows to Company[]
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbRowsToCompanies(rows: Record<string, any>[]): Company[] {
  return rows.map(dbRowToCompany)
}
