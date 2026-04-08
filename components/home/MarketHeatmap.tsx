'use client'

import { useState, useEffect } from 'react'
import { MarketTreemap, type TreemapCompany } from '@/components/charts/MarketTreemap'

export function MarketHeatmap() {
  const [companies, setCompanies] = useState<TreemapCompany[]>([])
  const [count, setCount] = useState(50)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetch(`/api/treemap?limit=${count}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.companies) {
          setCompanies(data.companies)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [count])

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
            className="w-full rounded-lg flex items-center justify-center"
            style={{
              height: 400,
              background: 'var(--color-bg-secondary)',
            }}
          >
            <span className="text-13" style={{ color: 'var(--color-text-tertiary)' }}>
              Loading market data...
            </span>
          </div>
        ) : companies.length > 0 ? (
          <MarketTreemap companies={companies} height={400} />
        ) : (
          <div
            className="w-full rounded-lg flex items-center justify-center"
            style={{
              height: 400,
              background: 'var(--color-bg-secondary)',
            }}
          >
            <span className="text-13" style={{ color: 'var(--color-text-tertiary)' }}>
              No market data available
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
