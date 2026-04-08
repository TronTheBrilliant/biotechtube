import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import PipelineTableView from '../node-views/PipelineTableView'

export const PipelineTable = Node.create({
  name: 'pipelineTable',
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
    return ReactNodeViewRenderer(PipelineTableView)
  },
})
