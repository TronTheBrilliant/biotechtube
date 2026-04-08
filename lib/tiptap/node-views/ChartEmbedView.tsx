'use client'

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'

const CHART_TYPES = [
  { value: 'price_history', label: 'Price History' },
  { value: 'funding_history', label: 'Funding History' },
  { value: 'market_cap', label: 'Market Cap' },
]

const PERIODS = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: '3y', label: '3Y' },
]

const selectStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid var(--color-border-subtle)',
  background: 'transparent',
  color: 'var(--color-text-primary)',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'inherit',
}

export default function ChartEmbedView({ node, updateAttributes, selected }: NodeViewProps) {
  return (
    <NodeViewWrapper>
      <div
        style={{
          border: '1px solid var(--color-border-subtle)',
          backgroundColor: 'var(--color-bg-secondary)',
          borderRadius: '8px',
          padding: '16px',
          margin: '24px 0',
          outline: selected ? '2px solid var(--color-accent)' : 'none',
          outlineOffset: '2px',
        }}
      >
        <div
          style={{
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-accent)',
            marginBottom: '12px',
          }}
        >
          Chart Embed
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <input
            type="text"
            value={node.attrs.companyId}
            onChange={(e) => updateAttributes({ companyId: e.target.value })}
            placeholder="Company ID..."
            style={{ ...selectStyle, flex: '1 1 140px' }}
          />
          <select
            value={node.attrs.chartType}
            onChange={(e) => updateAttributes({ chartType: e.target.value })}
            style={selectStyle}
          >
            {CHART_TYPES.map((ct) => (
              <option key={ct.value} value={ct.value}>{ct.label}</option>
            ))}
          </select>
          <select
            value={node.attrs.period}
            onChange={(e) => updateAttributes({ period: e.target.value })}
            style={selectStyle}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div
          style={{
            height: '120px',
            borderRadius: '6px',
            border: '1px dashed var(--color-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-primary)',
            fontSize: '13px',
            opacity: 0.5,
          }}
        >
          {node.attrs.chartType.replace(/_/g, ' ')} &middot; {node.attrs.period}
        </div>
      </div>
    </NodeViewWrapper>
  )
}
