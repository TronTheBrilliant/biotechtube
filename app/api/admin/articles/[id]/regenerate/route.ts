import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import OpenAI from 'openai'
import type { TipTapNode, ParagraphNode } from '@/lib/article-engine/types'

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
})

function extractText(node: TipTapNode): string {
  if ('content' in node && Array.isArray(node.content)) {
    return node.content
      .map((c: any) => c.text || '')
      .join('')
  }
  if ('attrs' in node) {
    const attrs = node.attrs as Record<string, any>
    return attrs.content || attrs.label || attrs.value || ''
  }
  return ''
}

function textToParagraph(text: string): ParagraphNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  const content: ParagraphNode['content'] = []

  for (const part of parts) {
    if (!part) continue
    if (part.startsWith('**') && part.endsWith('**')) {
      content.push({
        type: 'text',
        text: part.slice(2, -2),
        marks: [{ type: 'bold' }],
      })
    } else {
      content.push({ type: 'text', text: part })
    }
  }

  if (content.length === 0) {
    content.push({ type: 'text', text: '' })
  }

  return { type: 'paragraph', content }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerClient()
  const { sectionIndex } = await request.json()

  if (typeof sectionIndex !== 'number') {
    return NextResponse.json({ error: 'sectionIndex is required and must be a number' }, { status: 400 })
  }

  // Fetch article
  const { data: article, error } = await (supabase.from as any)('articles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !article) {
    return NextResponse.json({ error: error?.message || 'Article not found' }, { status: 404 })
  }

  const body = article.body
  if (!body?.content || sectionIndex < 0 || sectionIndex >= body.content.length) {
    return NextResponse.json({ error: 'Invalid sectionIndex' }, { status: 400 })
  }

  const currentBlock = body.content[sectionIndex] as TipTapNode
  const prevBlock = sectionIndex > 0 ? body.content[sectionIndex - 1] as TipTapNode : null
  const nextBlock = sectionIndex < body.content.length - 1 ? body.content[sectionIndex + 1] as TipTapNode : null

  const currentText = extractText(currentBlock)
  const prevText = prevBlock ? extractText(prevBlock) : '(start of article)'
  const nextText = nextBlock ? extractText(nextBlock) : '(end of article)'

  try {
    const completion = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a biotech journalist rewriting article sections for BiotechTube. Return valid JSON only.',
        },
        {
          role: 'user',
          content: `You are rewriting one section of a biotech article for BiotechTube.

Article headline: "${article.headline}"
Current section: "${currentText}"
Context before: "${prevText}"
Context after: "${nextText}"

Rewrite this section with fresh language and analysis. Keep the same topic and facts.
Return JSON: { "type": "text", "content": "..." }`,
        },
      ],
      temperature: 0.8,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) {
      return NextResponse.json({ error: 'Empty response from DeepSeek' }, { status: 500 })
    }

    const parsed = JSON.parse(raw)
    const newBlock: TipTapNode = textToParagraph(parsed.content || currentText)

    return NextResponse.json({ block: newBlock })
  } catch (err: any) {
    console.error('DeepSeek regenerate error:', err)
    return NextResponse.json({ error: err.message || 'Regeneration failed' }, { status: 500 })
  }
}
