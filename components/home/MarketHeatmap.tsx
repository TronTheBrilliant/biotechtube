'use client'

import { useState, useEffect } from 'react'
import { MarketTreemap, type TreemapCompany } from '@/components/charts/MarketTreemap'

export function MarketHeatmap() {
  const [companies, setCompanies] = useState<TreemapCompany[]>([])
  const [count, setCount] = useState(50)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    fetch(`/api/treemap?limit=${count}`)
      .then((r) => {
        if (!r.ok) throw new Error(`API error: ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (!cancelled) {
          setCompanies(data.companies || [])
        }
      })
      .catch((err) => {
        console.error('MarketHeatmap fetch error:', err)
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [count, retryKey])

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span
            className="text-11 font-medium uppercase tracking-wider"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}
          >
            Top companies by market cap
          </span>
        </div>
        <div className="flex items-center gap-1">
          {[20, 50, 100].map((n) => (
            <button
              key={n}
              onClick={() => setCount(n)}
              className="text-10 font-medium px-2.5 py-1 rounded transition-all duration-150"
              style={{
                background: count === n ? 'var(--color-accent)' : 'transparent',
                color: count === n ? 'white' : 'var(--color-text-tertiary)',
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Color legend */}
      <div className="flex items-center justify-center gap-4 px-4 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'rgb(220,38,38)' }} />
          <span className="text-10" style={{ color: 'var(--color-text-tertiary)' }}>-5%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'rgb(80,80,80)' }} />
          <span className="text-10" style={{ color: 'var(--color-text-tertiary)' }}>0%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'rgb(22,163,74)' }} />
          <span className="text-10" style={{ color: 'var(--color-text-tertiary)' }}>+5%+</span>
        </div>
      </div>

      {/* Treemap */}
      <div className="px-2 pb-2">
        {loading ? (
          <div
            className="w-full rounded-lg overflow-hidden"
            style={{ height: 400, background: 'var(--color-bg-secondary)' }}
          >
            <div className="w-full h-full grid grid-cols-6 grid-rows-4 gap-0.5 p-0.5">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-sm animate-pulse"
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    gridColumn: i < 2 ? 'span 2' : i < 4 ? 'span 2' : 'span 1',
                    gridRow: i < 1 ? 'span 2' : 'span 1',
                    opacity: 0.5 + ((i * 7 + 3) % 5) * 0.1,
                  }}
                />
              ))}
            </div>
          </div>
        ) : error ? (
          <div
            className="w-full rounded-lg flex flex-col items-center justify-center gap-3"
            style={{ height: 400, background: 'var(--color-bg-secondary)' }}
          >
            <span className="text-[32px]">⚠️</span>
            <span className="text-13 font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
              Failed to load market data
            </span>
            <button
              onClick={() => setRetryKey(k => k + 1)}
              className="text-12 font-medium px-4 py-1.5 rounded-md"
              style={{ background: 'var(--color-accent)', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        ) : companies.length > 0 ? (
          <MarketTreemap companies={companies} height={400} />
        ) : (
          <div
            className="w-full rounded-lg flex flex-col items-center justify-center gap-2"
            style={{ height: 400, background: 'var(--color-bg-secondary)' }}
          >
            <span className="text-[32px]">🗺️</span>
            <span className="text-13 font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
              No market data available
            </span>
            <span className="text-11" style={{ color: 'var(--color-text-tertiary)' }}>
              Check back when markets are open
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
