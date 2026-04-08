'use client'

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'

export default function CompanyCardView({ node, updateAttributes, selected }: NodeViewProps) {
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
            marginBottom: '8px',
          }}
        >
          Company Card
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="text"
            value={node.attrs.companyId}
            onChange={(e) => updateAttributes({ companyId: e.target.value })}
            placeholder="Company ID..."
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--color-border-subtle)',
              background: 'transparent',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          {node.attrs.companyId && (
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                backgroundColor: 'var(--color-accent)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {node.attrs.companyId}
            </span>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  )
}
