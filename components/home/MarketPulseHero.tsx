'use client'

import { useMemo, useCallback } from 'react'
import { ArrowUpRight, ArrowDownRight, TrendingUp, Beaker, DollarSign, Activity } from 'lucide-react'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { formatMarketCap } from '@/lib/market-utils'

interface IndexPoint {
  snapshot_date: string
  total_market_cap: number
}

interface FlashStat {
  label: string
  value: string
  icon: 'trending' | 'funding' | 'fda' | 'trials'
  companyLogo?: string | null
}

interface MarketPulseHeroProps {
  marketCap: number
  dailyChangePct: number
  indexHistory: IndexPoint[]
  companyCount: string
  sectorCount: string
  countryCount: string
  flashStats?: FlashStat[]
  logoParade: string[]
}

const ICON_MAP = {
  trending: TrendingUp,
  funding: DollarSign,
  fda: Beaker,
  trials: Activity,
}

function MiniAreaPath({ data, width, height }: { data: number[]; width: number; height: number }) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  })

  const pathD = `M${points.join(' L')}`
  const areaD = `${pathD} L${width},${height} L0,${height} Z`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="none"
      style={{ opacity: 0.08 }}
    >
      <defs>
        <linearGradient id="heroAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#heroAreaGrad)" />
      <path d={pathD} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeOpacity="0.3" />
    </svg>
  )
}

export function MarketPulseHero({
  marketCap,
  dailyChangePct,
  indexHistory,
  companyCount,
  sectorCount,
  countryCount,
  flashStats = [],
  logoParade,
}: MarketPulseHeroProps) {
  const isPositive = dailyChangePct >= 0

  const chartValues = useMemo(() => {
    // Take last 90 points for the background chart
    const recent = indexHistory.slice(-90)
    return recent.map((p) => p.total_market_cap)
  }, [indexHistory])

  const formatMcap = useCallback((n: number) => formatMarketCap(n), [])

  return (
    <section
      aria-label="Market Pulse"
      className="relative overflow-hidden max-w-[1200px] mx-auto px-4 md:px-6 pt-8 md:pt-14 pb-8 md:pb-10"
    >
      {/* Background chart silhouette */}
      <div className="absolute inset-0 pointer-events-none">
        <MiniAreaPath data={chartValues} width={1200} height={400} />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center">
        {/* Live indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="live-dot" />
          <span
            className="text-[11px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.1em' }}
          >
            Live Market Pulse
          </span>
        </div>

        {/* Big market cap number */}
        <div className="flex items-center justify-center gap-3 flex-wrap mb-2">
          <AnimatedNumber
            value={marketCap}
            format={formatMcap}
            duration={1500}
            className="text-display-lg"
            style={{ color: 'var(--color-text-primary)' }}
          />
          <span
            className="flex items-center gap-0.5 text-[18px] md:text-[20px] font-bold"
            style={{ color: isPositive ? '#16a34a' : '#dc2626' }}
          >
            {isPositive ? (
              <ArrowUpRight size={22} strokeWidth={2.5} />
            ) : (
              <ArrowDownRight size={22} strokeWidth={2.5} />
            )}
            {isPositive ? '+' : ''}
            {dailyChangePct.toFixed(2)}%
          </span>
        </div>

        {/* Label */}
        <p
          className="text-[11px] font-medium uppercase tracking-wider mb-5"
          style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.1em' }}
        >
          Global Biotech Market Cap
        </p>

        {/* Subtitle */}
        <p
          className="text-[15px] md:text-[17px] max-w-[560px] mx-auto mb-6"
          style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}
        >
          Tracking{' '}
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
            {companyCount}
          </span>{' '}
          companies across{' '}
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{sectorCount}</span>{' '}
          sectors and{' '}
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{countryCount}</span>{' '}
          countries.
        </p>

        {/* Flash stat pills */}
        {flashStats.length > 0 && (
          <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
            {flashStats.map((stat, i) => {
              const Icon = ICON_MAP[stat.icon]
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{
                    background: 'var(--color-bg-secondary)',
                    border: '0.5px solid var(--color-border-subtle)',
                  }}
                >
                  {stat.companyLogo ? (
                    <img
                      src={stat.companyLogo}
                      alt=""
                      className="rounded"
                      style={{ width: 14, height: 14, objectFit: 'contain' }}
                    />
                  ) : (
                    <Icon size={13} style={{ color: 'var(--color-text-tertiary)' }} />
                  )}
                  <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    {stat.label}
                  </span>
                  <span className="text-[11px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {stat.value}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Company logo parade */}
        <div className="flex items-center justify-center gap-3 md:gap-5 opacity-40 overflow-hidden px-2">
          {logoParade.map((domain) => (
            <img
              key={domain}
              src={`https://img.logo.dev/${domain}?token=pk_FNHUWoZORpiR_7j_vzFnmQ`}
              alt={domain.split('.')[0]}
              className="h-5 md:h-8 object-contain grayscale flex-shrink-0"
              style={{ maxWidth: 80 }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
