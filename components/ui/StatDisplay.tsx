'use client'

import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { AnimatedNumber } from './AnimatedNumber'

interface StatDisplayProps {
  value: number
  format: (n: number) => string
  label: string
  change?: number | null
  changeLabel?: string
  size?: 'lg' | 'md' | 'sm'
  animate?: boolean
}

export function StatDisplay({
  value,
  format,
  label,
  change,
  changeLabel,
  size = 'md',
  animate = true,
}: StatDisplayProps) {
  const sizeClass = {
    lg: 'text-display-lg',
    md: 'text-stat',
    sm: 'text-stat-sm',
  }[size]

  const isPositive = change != null && change >= 0

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-3 flex-wrap">
        {animate ? (
          <AnimatedNumber
            value={value}
            format={format}
            className={sizeClass}
            style={{ color: 'var(--color-text-primary)' }}
          />
        ) : (
          <span
            className={sizeClass}
            style={{ color: 'var(--color-text-primary)' }}
          >
            {format(value)}
          </span>
        )}

        {change != null && (
          <span
            className="flex items-center gap-0.5 text-14 font-semibold"
            style={{
              color: isPositive ? '#16a34a' : '#dc2626',
            }}
          >
            {isPositive ? (
              <ArrowUpRight size={18} strokeWidth={2.5} />
            ) : (
              <ArrowDownRight size={18} strokeWidth={2.5} />
            )}
            {isPositive ? '+' : ''}
            {change.toFixed(1)}%
          </span>
        )}

        {changeLabel && (
          <span
            className="text-11"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {changeLabel}
          </span>
        )}
      </div>

      <span
        className="text-11 font-medium uppercase tracking-wider mt-1"
        style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.08em' }}
      >
        {label}
      </span>
    </div>
  )
}
