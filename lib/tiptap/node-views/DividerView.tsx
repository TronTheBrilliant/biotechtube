'use client'

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'

export default function DividerView({ selected }: NodeViewProps) {
  return (
    <NodeViewWrapper>
      <div
        style={{
          margin: '24px 0',
          padding: '8px 0',
          outline: selected ? '2px solid var(--color-accent)' : 'none',
          outlineOffset: '2px',
          borderRadius: '4px',
        }}
      >
        <hr
          style={{
            border: 'none',
            borderTop: '1px solid var(--color-border-subtle)',
          }}
        />
      </div>
    </NodeViewWrapper>
  )
}
