'use client'

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'

const TRENDS = [
  { value: 'up', label: 'Up' },
  { value: 'down', label: 'Down' },
  { value: 'neutral', label: 'Neutral' },
]

export default function DataCalloutView({ node, updateAttributes, selected }: NodeViewProps) {
  return (
    <NodeViewWrapper>
      <div
        style={{
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '8px',
          padding: '20px 16px',
          margin: '24px 0',
          textAlign: 'center',
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
          Data Callout
        </div>
        <input
          type="text"
          value={node.attrs.value}
          onChange={(e) => updateAttributes({ value: e.target.value })}
          placeholder="Value (e.g. $2.4B)"
          style={{
            width: '100%',
            textAlign: 'center',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '32px',
            fontWeight: 700,
            color: 'var(--color-accent)',
            fontFamily: 'inherit',
            marginBottom: '4px',
          }}
        />
        <input
          type="text"
          value={node.attrs.label}
          onChange={(e) => updateAttributes({ label: e.target.value })}
          placeholder="Label (e.g. Total Funding)"
          style={{
            width: '100%',
            textAlign: 'center',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '14px',
            color: 'var(--color-text-primary)',
            fontFamily: 'inherit',
            opacity: 0.7,
            marginBottom: '8px',
          }}
        />
        <select
          value={node.attrs.trend}
          onChange={(e) => updateAttributes({ trend: e.target.value })}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1px solid var(--color-border-subtle)',
            background: 'transparent',
            color: 'var(--color-text-primary)',
            fontSize: '12px',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        >
          {TRENDS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
    </NodeViewWrapper>
  )
}
