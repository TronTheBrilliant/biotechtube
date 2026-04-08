import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import PullQuoteView from '../node-views/PullQuoteView'

export const PullQuote = Node.create({
  name: 'pullQuote',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      content: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: `div[data-type="${this.name}"]` }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': this.name })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(PullQuoteView)
  },
})
