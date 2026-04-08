'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
} from 'react'
import {
  Heading,
  Quote,
  Building2,
  BarChart3,
  Table,
  TrendingUp,
  Minus,
  Image as ImageIcon,
} from 'lucide-react'
import { Editor } from '@tiptap/core'

export interface SlashMenuItem {
  title: string
  icon: string
  command: (editor: Editor) => void
}

interface SlashCommandMenuProps {
  items: SlashMenuItem[]
  command: (item: SlashMenuItem) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Heading,
  Quote,
  Building2,
  BarChart3,
  Table,
  TrendingUp,
  Minus,
  ImageIcon,
}

const SlashCommandMenu = forwardRef<any, SlashCommandMenuProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index]
        if (item) command(item)
      },
      [items, command]
    )

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((prev) => (prev + 1) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex)
          return true
        }
        return false
      },
    }))

    if (items.length === 0) {
      return (
        <div
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '8px',
            padding: '8px 12px',
            color: 'var(--color-text-primary)',
            fontSize: '13px',
            opacity: 0.6,
          }}
        >
          No results
        </div>
      )
    }

    return (
      <div
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '8px',
          padding: '4px',
          minWidth: '200px',
          maxHeight: '320px',
          overflowY: 'auto',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}
      >
        {items.map((item, index) => {
          const Icon = ICON_MAP[item.icon]
          return (
            <button
              key={item.title}
              onClick={() => selectItem(index)}
              onMouseEnter={() => setSelectedIndex(index)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '8px 10px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '13px',
                fontFamily: 'inherit',
                color: 'var(--color-text-primary)',
                backgroundColor:
                  index === selectedIndex
                    ? 'var(--color-accent)'
                    : 'transparent',
              }}
            >
              {Icon && <Icon size={16} />}
              <span>{item.title}</span>
            </button>
          )
        })}
      </div>
    )
  }
)

SlashCommandMenu.displayName = 'SlashCommandMenu'

export default SlashCommandMenu
