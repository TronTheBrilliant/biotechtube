/**
 * Squarified treemap layout algorithm.
 * Produces rectangles with aspect ratios as close to 1:1 as possible.
 */

export interface TreemapInput {
  id: string
  value: number // size (market cap)
  label: string // ticker
  fullLabel: string // company name
  color: string // hex color based on daily change
  changePct: number
  slug: string
}

export interface TreemapRect {
  id: string
  x: number
  y: number
  w: number
  h: number
  label: string
  fullLabel: string
  color: string
  changePct: number
  value: number
  slug: string
}

function worst(row: number[], w: number): number {
  const s = row.reduce((a, b) => a + b, 0)
  const maxVal = Math.max(...row)
  const minVal = Math.min(...row)
  return Math.max(
    (w * w * maxVal) / (s * s),
    (s * s) / (w * w * minVal)
  )
}

function squarify(
  children: number[],
  indices: number[],
  rect: { x: number; y: number; w: number; h: number },
  results: { index: number; x: number; y: number; w: number; h: number }[]
) {
  if (children.length === 0) return

  const { x, y, w, h } = rect
  const shortSide = Math.min(w, h)

  if (children.length === 1) {
    results.push({ index: indices[0], x, y, w, h })
    return
  }

  // Build row
  const row: number[] = [children[0]]
  const rowIndices: number[] = [indices[0]]
  let i = 1

  while (i < children.length) {
    const currentWorst = worst(row, shortSide)
    const newRow = [...row, children[i]]
    const newWorst = worst(newRow, shortSide)

    if (newWorst <= currentWorst) {
      row.push(children[i])
      rowIndices.push(indices[i])
      i++
    } else {
      break
    }
  }

  // Layout the row
  const rowSum = row.reduce((a, b) => a + b, 0)
  const isHorizontal = w >= h

  if (isHorizontal) {
    const rowWidth = rowSum / h
    let cy = y
    for (let j = 0; j < row.length; j++) {
      const cellH = row[j] / rowWidth
      results.push({ index: rowIndices[j], x, y: cy, w: rowWidth, h: cellH })
      cy += cellH
    }
    // Recurse on remaining
    squarify(
      children.slice(i),
      indices.slice(i),
      { x: x + rowWidth, y, w: w - rowWidth, h },
      results
    )
  } else {
    const rowHeight = rowSum / w
    let cx = x
    for (let j = 0; j < row.length; j++) {
      const cellW = row[j] / rowHeight
      results.push({ index: rowIndices[j], x: cx, y, w: cellW, h: rowHeight })
      cx += cellW
    }
    squarify(
      children.slice(i),
      indices.slice(i),
      { x, y: y + rowHeight, w, h: h - rowHeight },
      results
    )
  }
}

export function layoutTreemap(
  items: TreemapInput[],
  width: number,
  height: number
): TreemapRect[] {
  if (items.length === 0) return []

  // Sort by value descending
  const sorted = items
    .map((item, i) => ({ ...item, originalIndex: i }))
    .sort((a, b) => b.value - a.value)

  const totalValue = sorted.reduce((sum, item) => sum + item.value, 0)
  if (totalValue === 0) return []

  const totalArea = width * height
  const normalizedValues = sorted.map(
    (item) => (item.value / totalValue) * totalArea
  )
  const indices = sorted.map((_, i) => i)

  const rects: { index: number; x: number; y: number; w: number; h: number }[] = []
  squarify(normalizedValues, indices, { x: 0, y: 0, w: width, h: height }, rects)

  return rects.map((r) => {
    const item = sorted[r.index]
    return {
      id: item.id,
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
      label: item.label,
      fullLabel: item.fullLabel,
      color: item.color,
      changePct: item.changePct,
      value: item.value,
      slug: item.slug,
    }
  })
}

/**
 * Map daily change % to a color on red-gray-green gradient.
 * -5% or worse → deep red, 0% → neutral, +5% or better → deep green
 */
export function changeToColor(changePct: number): string {
  const clamped = Math.max(-5, Math.min(5, changePct))
  const t = (clamped + 5) / 10 // 0 = deep red, 0.5 = neutral, 1 = deep green

  if (t < 0.5) {
    // Red to gray
    const factor = t / 0.5
    const r = Math.round(220 * (1 - factor) + 80 * factor)
    const g = Math.round(38 * (1 - factor) + 80 * factor)
    const b = Math.round(38 * (1 - factor) + 80 * factor)
    return `rgb(${r},${g},${b})`
  } else {
    // Gray to green
    const factor = (t - 0.5) / 0.5
    const r = Math.round(80 * (1 - factor) + 22 * factor)
    const g = Math.round(80 * (1 - factor) + 163 * factor)
    const b = Math.round(80 * (1 - factor) + 74 * factor)
    return `rgb(${r},${g},${b})`
  }
}
