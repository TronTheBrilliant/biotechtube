import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import CompanyCardView from '../node-views/CompanyCardView'

export const CompanyCard = Node.create({
  name: 'companyCard',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      companyId: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: `div[data-type="${this.name}"]` }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': this.name })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CompanyCardView)
  },
})
