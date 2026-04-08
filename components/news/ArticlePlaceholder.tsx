import { PlaceholderStyle } from '@/lib/article-engine/types'

interface ArticlePlaceholderProps {
  style: PlaceholderStyle
  headline?: string
  className?: string
}

function hexPoints(cx: number, cy: number, r: number): string {
  const points: string[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`)
  }
  return points.join(' ')
}

function PatternBars() {
  const heights = [60, 100, 80, 140, 120, 180, 220]
  return (
    <g opacity="0.25" transform="translate(250, 100)">
      {heights.map((h, i) => (
        <rect
          key={i}
          x={i * 45}
          y={260 - h}
          width={30}
          height={h}
          rx={4}
          fill="#059669"
        />
      ))}
    </g>
  )
}

function PatternHexgrid() {
  const hexagons: Array<[number, number]> = []
  const r = 28
  const dx = r * 1.8
  const dy = r * 1.6
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const offset = row % 2 === 1 ? dx / 2 : 0
      hexagons.push([280 + col * dx + offset, 120 + row * dy])
    }
  }
  return (
    <g opacity="0.25">
      {hexagons.map(([cx, cy], i) => (
        <polygon
          key={i}
          points={hexPoints(cx, cy, r)}
          fill="none"
          stroke="#059669"
          strokeWidth={2}
        />
      ))}
    </g>
  )
}

function PatternWaves() {
  const waves = [0, 1, 2]
  return (
    <g opacity="0.28">
      {waves.map((w) => {
        const yBase = 150 + w * 50
        const d = `M 100 ${yBase} C 200 ${yBase - 40}, 300 ${yBase + 40}, 400 ${yBase} C 500 ${yBase - 40}, 600 ${yBase + 40}, 700 ${yBase}`
        return (
          <path
            key={w}
            d={d}
            fill="none"
            stroke="#059669"
            strokeWidth={2.5}
          />
        )
      })}
    </g>
  )
}

function PatternCircles() {
  const radii = [40, 70, 100, 130]
  return (
    <g opacity="0.25">
      {radii.map((r, i) => (
        <circle
          key={i}
          cx={400}
          cy={200}
          r={r}
          fill="none"
          stroke="#059669"
          strokeWidth={2}
        />
      ))}
    </g>
  )
}

function PatternGrid() {
  return (
    <g opacity="0.3">
      {Array.from({ length: 12 }).map((_, i) => {
        const col = i % 4
        const row = Math.floor(i / 4)
        const opacity = 0.2 + ((i * 7 + 3) % 5) * 0.06
        return (
          <rect
            key={i}
            x={250 + col * 80}
            y={100 + row * 70}
            width={60}
            height={50}
            rx={6}
            fill="#059669"
            opacity={opacity}
          />
        )
      })}
    </g>
  )
}

function PatternBurst() {
  return (
    <g opacity="0.25">
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (Math.PI / 4) * i
        const x1 = 400 + 30 * Math.cos(angle)
        const y1 = 200 + 30 * Math.sin(angle)
        const x2 = 400 + 140 * Math.cos(angle)
        const y2 = 200 + 140 * Math.sin(angle)
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#059669"
            strokeWidth={2.5}
          />
        )
      })}
    </g>
  )
}

const patternMap: Record<PlaceholderStyle['pattern'], () => JSX.Element> = {
  bars: PatternBars,
  hexgrid: PatternHexgrid,
  waves: PatternWaves,
  circles: PatternCircles,
  grid: PatternGrid,
  burst: PatternBurst,
}

export default function ArticlePlaceholder({
  style,
  headline,
  className = '',
}: ArticlePlaceholderProps) {
  const Pattern = patternMap[style.pattern] ?? PatternBars

  return (
    <svg
      viewBox="0 0 800 400"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Deep navy background */}
      <rect width="800" height="400" fill="#0f172a" />

      {/* Radial gradient glow */}
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#059669" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="400" fill="url(#glow)" />

      {/* Pattern */}
      <Pattern />

      {/* Headline overlay */}
      {headline && (
        <text
          x="400"
          y="360"
          textAnchor="middle"
          fill="white"
          opacity="0.6"
          fontSize="18"
          fontFamily="system-ui, sans-serif"
          fontWeight="600"
        >
          {headline.length > 60 ? headline.slice(0, 57) + '...' : headline}
        </text>
      )}

      {/* BIOTECHTUBE watermark */}
      <text
        x="20"
        y="388"
        fill="white"
        opacity="0.15"
        fontSize="12"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        letterSpacing="2"
      >
        BIOTECHTUBE
      </text>
    </svg>
  )
}
