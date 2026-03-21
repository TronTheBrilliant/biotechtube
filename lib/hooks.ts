'use client'

import { useState, useEffect } from 'react'

interface CompaniesResponse {
  companies: Record<string, unknown>[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface UseCompaniesOptions {
  page?: number
  limit?: number
  country?: string
  category?: string
  stage?: string
  sort?: string
  search?: string
  enabled?: boolean
}

export function useCompanies(options: UseCompaniesOptions = {}) {
  const [data, setData] = useState<CompaniesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { enabled = true, ...queryOptions } = options

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    const params = new URLSearchParams()
    if (queryOptions.page) params.set('page', String(queryOptions.page))
    if (queryOptions.limit) params.set('limit', String(queryOptions.limit))
    if (queryOptions.country) params.set('country', queryOptions.country)
    if (queryOptions.category) params.set('category', queryOptions.category)
    if (queryOptions.stage) params.set('stage', queryOptions.stage)
    if (queryOptions.sort) params.set('sort', queryOptions.sort)
    if (queryOptions.search) params.set('q', queryOptions.search)

    setLoading(true)
    fetch(`/api/companies?${params}`)
      .then(r => {
        if (!r.ok) throw new Error(`API error: ${r.status}`)
        return r.json()
      })
      .then(d => { setData(d); setError(null) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [
    queryOptions.page, queryOptions.limit, queryOptions.country,
    queryOptions.category, queryOptions.stage, queryOptions.sort,
    queryOptions.search, enabled
  ])

  return { data, loading, error }
}

export function useCompanySearch(query: string) {
  const [results, setResults] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    const controller = new AbortController()
    setLoading(true)

    // Debounce: wait 200ms before firing
    const timer = setTimeout(() => {
      fetch(`/api/companies/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then(r => r.json())
        .then(d => setResults(d.results || []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 200)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return { results, loading }
}
