import {
  TipTapDoc,
  TipTapNode,
  ParagraphNode,
  HeadingNode,
  PullQuoteNode,
  CompanyCardNode,
  ChartEmbedNode,
  PipelineTableNode,
  DataCalloutNode,
  ImageNode,
} from '@/lib/article-engine/types'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function renderMarks(
  items: ParagraphNode['content']
): React.ReactNode[] {
  return items.map((item, i) => {
    let node: React.ReactNode = item.text
    if (item.marks) {
      for (const mark of item.marks) {
        if (mark.type === 'bold') {
          node = <strong key={`b-${i}`}>{node}</strong>
        } else if (mark.type === 'italic') {
          node = <em key={`i-${i}`}>{node}</em>
        } else if (mark.type === 'link' && mark.attrs?.href) {
          node = (
            <a
              key={`a-${i}`}
              href={mark.attrs.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent)', textDecoration: 'underline' }}
            >
              {node}
            </a>
          )
        }
      }
    }
    return <span key={i}>{node}</span>
  })
}

function ParagraphBlock({ node }: { node: ParagraphNode }) {
  if (!node.content || node.content.length === 0) return null
  return (
    <p
      style={{ color: 'var(--text-primary)', lineHeight: 1.75 }}
      className="mb-4"
    >
      {renderMarks(node.content)}
    </p>
  )
}

function HeadingBlock({ node }: { node: HeadingNode }) {
  const text = node.content?.map((c) => c.text).join('') ?? ''
  const id = slugify(text)
  const Tag = node.attrs.level === 2 ? 'h2' : 'h3'
  return (
    <Tag
      id={id}
      style={{ color: 'var(--text-primary)' }}
      className={
        node.attrs.level === 2
          ? 'text-2xl font-bold mt-10 mb-4'
          : 'text-xl font-semibold mt-8 mb-3'
      }
    >
      {text}
    </Tag>
  )
}

function PullQuoteBlock({ node }: { node: PullQuoteNode }) {
  return (
    <blockquote
      style={{
        borderLeft: '4px solid var(--accent)',
        color: 'var(--text-secondary)',
      }}
      className="pl-5 py-2 my-8 italic text-lg"
    >
      {node.attrs.content}
    </blockquote>
  )
}

function CompanyCardEmbed({ node }: { node: CompanyCardNode }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-secondary)',
      }}
      className="rounded-lg p-4 my-6"
    >
      <div
        className="text-xs font-semibold uppercase tracking-wide mb-1"
        style={{ color: 'var(--accent)' }}
      >
        Company Profile
      </div>
      <div className="text-sm">Company data loading...</div>
    </div>
  )
}

function ChartEmbedBlock({ node }: { node: ChartEmbedNode }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-secondary)',
      }}
      className="rounded-lg p-4 my-6 text-center"
    >
      <div
        className="text-xs font-semibold uppercase tracking-wide mb-1"
        style={{ color: 'var(--accent)' }}
      >
        {node.attrs.chartType.replace(/_/g, ' ')} &middot; {node.attrs.period}
      </div>
      <div className="text-sm">Chart available in full version</div>
    </div>
  )
}

function PipelineTableEmbed({ node }: { node: PipelineTableNode }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-secondary)',
      }}
      className="rounded-lg p-4 my-6"
    >
      <div
        className="text-xs font-semibold uppercase tracking-wide mb-1"
        style={{ color: 'var(--accent)' }}
      >
        Pipeline
      </div>
      <div className="text-sm">Pipeline data loading...</div>
    </div>
  )
}

function DataCalloutBlock({ node }: { node: DataCalloutNode }) {
  return (
    <div className="my-8 text-center">
      <div
        className="text-4xl font-bold"
        style={{ color: 'var(--accent)' }}
      >
        {node.attrs.value}
      </div>
      <div
        className="text-sm mt-1"
        style={{ color: 'var(--text-muted)' }}
      >
        {node.attrs.label}
      </div>
    </div>
  )
}

function DividerBlock() {
  return (
    <hr
      className="my-8"
      style={{ borderColor: 'var(--border)' }}
    />
  )
}

function ImageBlock({ node }: { node: ImageNode }) {
  return (
    <figure className="my-8">
      <img
        src={node.attrs.src}
        alt={node.attrs.alt}
        className="w-full rounded-lg"
      />
      {node.attrs.caption && (
        <figcaption
          className="text-sm mt-2 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          {node.attrs.caption}
        </figcaption>
      )}
    </figure>
  )
}

function BlockNode({ node }: { node: TipTapNode }) {
  switch (node.type) {
    case 'paragraph':
      return <ParagraphBlock node={node} />
    case 'heading':
      return <HeadingBlock node={node} />
    case 'pullQuote':
      return <PullQuoteBlock node={node} />
    case 'companyCard':
      return <CompanyCardEmbed node={node} />
    case 'chartEmbed':
      return <ChartEmbedBlock node={node} />
    case 'pipelineTable':
      return <PipelineTableEmbed node={node} />
    case 'dataCallout':
      return <DataCalloutBlock node={node} />
    case 'divider':
      return <DividerBlock />
    case 'image':
      return <ImageBlock node={node} />
    default:
      return null
  }
}

export default function BlockRenderer({ doc }: { doc: TipTapDoc }) {
  if (!doc?.content) return null
  return (
    <div className="article-body">
      {doc.content.map((node, i) => (
        <BlockNode key={i} node={node} />
      ))}
    </div>
  )
}
