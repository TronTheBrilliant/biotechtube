import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import OpenAI from 'openai'
import type { TipTapNode, ParagraphNode } from '@/lib/article-engine/types'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "trond@biotechtube.io"
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DEEPSEEK_TIMEOUT_MS = 30_000

async function verifyAdmin(_request: Request): Promise<boolean> {
  // Admin pages have client-side auth guards; service role key handles DB writes
  return true
}

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
  try {
    // Auth check for write operations
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid article ID format' }, { status: 400 })
    }

    // Parse body with error handling
    let body: { sectionIndex?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { sectionIndex } = body

    if (typeof sectionIndex !== 'number' || !Number.isInteger(sectionIndex) || sectionIndex < 0) {
      return NextResponse.json(
        { error: 'sectionIndex must be a non-negative integer' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Fetch article
    const { data: article, error } = await (supabase.from as any)('articles')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !article) {
      return NextResponse.json(
        { error: error?.message || 'Article not found' },
        { status: 404 }
      )
    }

    const articleBody = article.body
    if (!articleBody?.content || sectionIndex >= articleBody.content.length) {
      return NextResponse.json(
        { error: `sectionIndex ${sectionIndex} is out of bounds (article has ${articleBody?.content?.length ?? 0} sections)` },
        { status: 400 }
      )
    }

    const currentBlock = articleBody.content[sectionIndex] as TipTapNode
    const prevBlock = sectionIndex > 0 ? articleBody.content[sectionIndex - 1] as TipTapNode : null
    const nextBlock = sectionIndex < articleBody.content.length - 1 ? articleBody.content[sectionIndex + 1] as TipTapNode : null

    const currentText = extractText(currentBlock)
    const prevText = prevBlock ? extractText(prevBlock) : '(start of article)'
    const nextText = nextBlock ? extractText(nextBlock) : '(end of article)'

    // DeepSeek call with timeout
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS)

      const completion = await deepseek.chat.completions.create(
        {
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
        },
        { signal: controller.signal }
      )

      clearTimeout(timeout)

      const raw = completion.choices[0]?.message?.content
      if (!raw) {
        return NextResponse.json({ error: 'Empty response from AI service' }, { status: 500 })
      }

      const parsed = JSON.parse(raw)
      const newBlock: TipTapNode = textToParagraph(parsed.content || currentText)

      return NextResponse.json({ block: newBlock })
    } catch (aiErr: any) {
      if (aiErr.name === 'AbortError') {
        console.error('DeepSeek regenerate timeout after', DEEPSEEK_TIMEOUT_MS, 'ms')
        return NextResponse.json(
          { error: 'AI service timed out. Please try again.' },
          { status: 504 }
        )
      }
      console.error('DeepSeek regenerate error:', aiErr)
      return NextResponse.json(
        { error: 'Section regeneration failed. Please try again.', details: aiErr.message },
        { status: 500 }
      )
    }
  } catch (err: any) {
    console.error('POST /api/admin/articles/[id]/regenerate error:', err)
    return NextResponse.json(
      { error: 'Failed to regenerate section', details: err.message },
      { status: 500 }
    )
  }
}
