import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import DividerView from '../node-views/DividerView'

export const Divider = Node.create({
  name: 'divider',
  group: 'block',
  atom: true,

  parseHTML() {
    return [{ tag: `div[data-type="${this.name}"]` }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': this.name })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DividerView)
  },
})
