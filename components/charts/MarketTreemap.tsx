'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { layoutTreemap, changeToColor, type TreemapInput } from '@/lib/treemap'
import { formatMarketCap } from '@/lib/market-utils'

export interface TreemapCompany {
  id: string
  slug: string
  name: string
  ticker: string | null
  market_cap: number
  daily_change_pct: number
  sector?: string | null
}

interface MarketTreemapProps {
  companies: TreemapCompany[]
  width?: number
  height?: number
}

interface TooltipState {
  x: number
  y: number
  company: TreemapCompany | null
}

export function MarketTreemap({ companies, width = 1200, height = 500 }: MarketTreemapProps) {
  const router = useRouter()
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState>({ x: 0, y: 0, company: null })
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const items: TreemapInput[] = useMemo(
    () =>
      companies
        .filter((c) => c.market_cap > 0)
        .map((c) => ({
          id: c.id,
          value: c.market_cap,
          label: c.ticker || c.name.slice(0, 4).toUpperCase(),
          fullLabel: c.name,
          color: changeToColor(c.daily_change_pct),
          changePct: c.daily_change_pct,
          slug: c.slug,
        })),
    [companies]
  )

  const rects = useMemo(() => layoutTreemap(items, width, height), [items, width, height])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svgEl = svgRef.current
      if (!svgEl) return

      const rect = svgEl.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Scale to SVG coordinates
      const scaleX = width / rect.width
      const scaleY = height / rect.height
      const sx = x * scaleX
      const sy = y * scaleY

      // Find which rect we're in
      const hit = rects.find(
        (r) => sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h
      )

      if (hit) {
        const company = companies.find((c) => c.id === hit.id) || null
        setTooltip({ x: e.clientX, y: e.clientY, company })
        setHoveredId(hit.id)
      } else {
        setTooltip({ x: 0, y: 0, company: null })
        setHoveredId(null)
      }
    },
    [rects, companies, width, height]
  )

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svgEl = svgRef.current
      if (!svgEl) return

      const rect = svgEl.getBoundingClientRect()
      const x = (e.clientX - rect.left) * (width / rect.width)
      const y = (e.clientY - rect.top) * (height / rect.height)

      const hit = rects.find(
        (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
      )

      if (hit) {
        router.push(`/company/${hit.slug}`)
      }
    },
    [rects, router, width, height]
  )

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full rounded-lg cursor-pointer"
        style={{ aspectRatio: `${width}/${height}` }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setTooltip({ x: 0, y: 0, company: null })
          setHoveredId(null)
        }}
        onClick={handleClick}
      >
        {rects.map((r) => {
          const isHovered = hoveredId === r.id
          const showTicker = r.w > 45 && r.h > 25
          const showChange = r.w > 55 && r.h > 40
          const showName = r.w > 100 && r.h > 55
          const isPositive = r.changePct >= 0

          // Font size scales with cell area
          const area = r.w * r.h
          const tickerSize = Math.max(9, Math.min(18, Math.sqrt(area) / 6))
          const changeSize = Math.max(8, tickerSize * 0.75)
          const nameSize = Math.max(7, tickerSize * 0.6)

          return (
            <g key={r.id}>
              <rect
                x={r.x + 1}
                y={r.y + 1}
                width={Math.max(0, r.w - 2)}
                height={Math.max(0, r.h - 2)}
                rx={3}
                fill={r.color}
                stroke={isHovered ? 'white' : 'rgba(0,0,0,0.15)'}
                strokeWidth={isHovered ? 2 : 0.5}
                opacity={isHovered ? 1 : 0.9}
                style={{ transition: 'opacity 0.15s, stroke-width 0.15s' }}
              />
              {showTicker && (
                <text
                  x={r.x + r.w / 2}
                  y={r.y + r.h / 2 + (showChange ? -changeSize * 0.4 : 0)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize={tickerSize}
                  fontWeight="700"
                  fontFamily="var(--font-brand), var(--font-geist-sans), sans-serif"
                  style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
                >
                  {r.label}
                </text>
              )}
              {showChange && (
                <text
                  x={r.x + r.w / 2}
                  y={r.y + r.h / 2 + tickerSize * 0.6}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isPositive ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.85)'}
                  fontSize={changeSize}
                  fontWeight="600"
                  fontFamily="var(--font-geist-sans), sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  {isPositive ? '+' : ''}{r.changePct.toFixed(1)}%
                </text>
              )}
              {showName && (
                <text
                  x={r.x + r.w / 2}
                  y={r.y + r.h / 2 + tickerSize * 0.6 + changeSize * 1.2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="rgba(255,255,255,0.5)"
                  fontSize={nameSize}
                  fontWeight="400"
                  fontFamily="var(--font-geist-sans), sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  {r.fullLabel.length > 18 ? r.fullLabel.slice(0, 16) + '...' : r.fullLabel}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {tooltip.company && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 10,
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border-medium)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxWidth: 240,
          }}
        >
          <div className="text-13 font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {tooltip.company.name}
          </div>
          {tooltip.company.ticker && (
            <div className="text-11" style={{ color: 'var(--color-text-secondary)' }}>
              {tooltip.company.ticker}
            </div>
          )}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-12" style={{ color: 'var(--color-text-secondary)' }}>
              {formatMarketCap(tooltip.company.market_cap)}
            </span>
            <span
              className="text-12 font-semibold"
              style={{
                color: tooltip.company.daily_change_pct >= 0 ? '#16a34a' : '#dc2626',
              }}
            >
              {tooltip.company.daily_change_pct >= 0 ? '+' : ''}
              {tooltip.company.daily_change_pct.toFixed(2)}%
            </span>
          </div>
          {tooltip.company.sector && (
            <div className="text-10 mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
              {tooltip.company.sector}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
