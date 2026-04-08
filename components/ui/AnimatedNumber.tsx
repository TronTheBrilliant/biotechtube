'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  format: (n: number) => string
  duration?: number
  className?: string
  style?: React.CSSProperties
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

export function AnimatedNumber({
  value,
  format,
  duration = 1200,
  className,
  style,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(format(0))
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)
  const prefersReducedMotion = useRef(false)

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion.current || value === 0) {
      setDisplay(format(value))
      return
    }

    const start = performance.now()
    startRef.current = start

    function tick(now: number) {
      const elapsed = now - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutExpo(progress)
      const current = eased * value

      setDisplay(format(current))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDisplay(format(value))
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, format, duration])

  return (
    <span className={className} style={style}>
      {display}
    </span>
  )
}
