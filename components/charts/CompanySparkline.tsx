'use client'

import { TvSparkline } from './TvSparkline'

interface CompanySparklineProps {
  data: number[]
  positive?: boolean
  width?: number
  height?: number
}

export function CompanySparkline({
  data,
  positive = true,
  width = 60,
  height = 24,
}: CompanySparklineProps) {
  if (!data || data.length < 2) return <div style={{ width, height }} />

  const color = positive ? '#16a34a' : '#dc2626'

  return <TvSparkline data={data} width={width} height={height} color={color} />
}
