import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import { Editor, Range } from '@tiptap/core'
import SlashCommandMenu, { SlashMenuItem } from '../SlashCommandMenu'

const items: SlashMenuItem[] = [
  {
    title: 'Heading 2',
    icon: 'Heading',
    command: (editor: Editor) => {
      (editor.chain().focus() as any).toggleHeading({ level: 2 }).run()
    },
  },
  {
    title: 'Heading 3',
    icon: 'Heading',
    command: (editor: Editor) => {
      (editor.chain().focus() as any).toggleHeading({ level: 3 }).run()
    },
  },
  {
    title: 'Pull Quote',
    icon: 'Quote',
    command: (editor: Editor) => {
      editor.chain().focus().insertContent({ type: 'pullQuote', attrs: { content: '' } }).run()
    },
  },
  {
    title: 'Company Card',
    icon: 'Building2',
    command: (editor: Editor) => {
      editor.chain().focus().insertContent({ type: 'companyCard', attrs: { companyId: '' } }).run()
    },
  },
  {
    title: 'Chart',
    icon: 'BarChart3',
    command: (editor: Editor) => {
      editor.chain().focus().insertContent({ type: 'chartEmbed', attrs: { companyId: '', chartType: 'price_history', period: '6m' } }).run()
    },
  },
  {
    title: 'Pipeline Table',
    icon: 'Table',
    command: (editor: Editor) => {
      editor.chain().focus().insertContent({ type: 'pipelineTable', attrs: { companyId: '' } }).run()
    },
  },
  {
    title: 'Data Callout',
    icon: 'TrendingUp',
    command: (editor: Editor) => {
      editor.chain().focus().insertContent({ type: 'dataCallout', attrs: { value: '', label: '', trend: 'neutral' } }).run()
    },
  },
  {
    title: 'Divider',
    icon: 'Minus',
    command: (editor: Editor) => {
      editor.chain().focus().insertContent({ type: 'divider' }).run()
    },
  },
  {
    title: 'Image',
    icon: 'ImageIcon',
    command: (editor: Editor) => {
      editor.chain().focus().insertContent({ type: 'image', attrs: { src: '', alt: '' } }).run()
    },
  },
]

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        items: ({ query }: { query: string }) => {
          return items.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          )
        },
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: SlashMenuItem }) => {
          editor.chain().focus().deleteRange(range).run()
          props.command(editor)
        },
        render: () => {
          let component: ReactRenderer<any> | null = null
          let wrapper: HTMLDivElement | null = null

          return {
            onStart: (props: SuggestionProps) => {
              component = new ReactRenderer(SlashCommandMenu, {
                props,
                editor: props.editor,
              })

              wrapper = document.createElement('div')
              wrapper.style.position = 'absolute'
              wrapper.style.zIndex = '9999'
              wrapper.appendChild(component.element)
              document.body.appendChild(wrapper)

              if (props.clientRect) {
                const rect = (props.clientRect as () => DOMRect)()
                if (rect) {
                  wrapper.style.top = `${rect.bottom + window.scrollY}px`
                  wrapper.style.left = `${rect.left + window.scrollX}px`
                }
              }
            },
            onUpdate: (props: SuggestionProps) => {
              component?.updateProps(props)
              if (wrapper && props.clientRect) {
                const rect = (props.clientRect as () => DOMRect)()
                if (rect) {
                  wrapper.style.top = `${rect.bottom + window.scrollY}px`
                  wrapper.style.left = `${rect.left + window.scrollX}px`
                }
              }
            },
            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === 'Escape') {
                wrapper?.remove()
                return true
              }
              return component?.ref?.onKeyDown(props) ?? false
            },
            onExit: () => {
              wrapper?.remove()
              component?.destroy()
            },
          }
        },
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})
