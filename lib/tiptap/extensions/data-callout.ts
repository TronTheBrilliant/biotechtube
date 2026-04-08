import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import DataCalloutView from '../node-views/DataCalloutView'

export const DataCallout = Node.create({
  name: 'dataCallout',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      value: { default: '' },
      label: { default: '' },
      trend: { default: 'neutral' },
    }
  },

  parseHTML() {
    return [{ tag: `div[data-type="${this.name}"]` }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': this.name })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DataCalloutView)
  },
})
