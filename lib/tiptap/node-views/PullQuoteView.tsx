'use client'

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'

export default function PullQuoteView({ node, updateAttributes, selected }: NodeViewProps) {
  return (
    <NodeViewWrapper>
      <div
        style={{
          borderLeft: '4px solid var(--color-accent)',
          padding: '12px 20px',
          margin: '24px 0',
          backgroundColor: 'var(--color-bg-secondary)',
          borderRadius: '0 8px 8px 0',
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
          Pull Quote
        </div>
        <textarea
          value={node.attrs.content}
          onChange={(e) => updateAttributes({ content: e.target.value })}
          placeholder="Enter quote text..."
          rows={3}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'vertical',
            fontStyle: 'italic',
            fontSize: '18px',
            lineHeight: 1.6,
            color: 'var(--color-text-primary)',
            fontFamily: 'inherit',
          }}
        />
      </div>
    </NodeViewWrapper>
  )
}
