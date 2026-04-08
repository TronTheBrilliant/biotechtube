import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import ChartEmbedView from '../node-views/ChartEmbedView'

export const ChartEmbed = Node.create({
  name: 'chartEmbed',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      companyId: { default: '' },
      chartType: { default: 'price_history' },
      period: { default: '6m' },
    }
  },

  parseHTML() {
    return [{ tag: `div[data-type="${this.name}"]` }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': this.name })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartEmbedView)
  },
})
