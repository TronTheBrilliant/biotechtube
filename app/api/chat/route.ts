import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase'
import { getUserFromRequest, getClientIp } from '@/lib/chat/auth'
import { checkAndIncrementRateLimit } from '@/lib/chat/rate-limit'
import { loadContextPayload, loadGeneralPlatformContext } from '@/lib/chat/context-loader'
import { buildSystemPrompt } from '@/lib/chat/system-prompt'
import type { ChatRequestBody, ChatStreamEvent } from '@/lib/chat/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300
export const runtime = 'nodejs'

const MODEL = 'deepseek-v4-flash'
const MAX_USER_MESSAGES = 30 // hard cap on per-request history length
const MAX_CONTENT_LEN = 8000 // hard cap per individual user message

export async function POST(req: NextRequest) {
  let body: ChatRequestBody
  try {
    body = (await req.json()) as ChatRequestBody
  } catch {
    return jsonError('Invalid JSON', 400)
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return jsonError('messages required', 400)
  }
  if (body.messages.length > MAX_USER_MESSAGES) {
    return jsonError(`Conversation too long (max ${MAX_USER_MESSAGES} messages)`, 400)
  }
  for (const m of body.messages) {
    if (!m || typeof m.content !== 'string' || !['user', 'assistant', 'system'].includes(m.role)) {
      return jsonError('Invalid message in messages array', 400)
    }
    if (m.content.length > MAX_CONTENT_LEN) {
      return jsonError(`Message exceeds ${MAX_CONTENT_LEN} chars`, 400)
    }
  }

  // ── Auth + rate limit ──
  const user = await getUserFromRequest(req)
  if (!user) {
    const ip = getClientIp(req)
    const rl = await checkAndIncrementRateLimit(ip)
    if (rl.exceeded) {
      return jsonError(
        `Daily message limit reached (${rl.limit}/day for anonymous users). Sign in for unlimited.`,
        429
      )
    }
  }

  // ── Context resolution ──
  let contextPayload: string | undefined
  let generalPayload: string | undefined
  if (body.context) {
    // Entity-grounded mode — strict, only the entity's data
    const payload = await loadContextPayload(body.context)
    if (!payload) {
      return jsonError(`Context not found: ${body.context.type}/${body.context.slug}`, 404)
    }
    contextPayload = payload
  } else {
    // General research mode — load platform-wide snapshot so the model can
    // answer "what are the most-funded sectors", "biggest companies", etc.
    // ~5-10K tokens. Without this the model has no live data and refuses.
    try {
      generalPayload = await loadGeneralPlatformContext()
    } catch (err) {
      console.error('loadGeneralPlatformContext failed:', err)
      // Fall through — model will still answer with general knowledge only
    }
  }

  const systemPrompt = buildSystemPrompt({
    context: body.context,
    contextPayload,
    generalPayload,
  })

  // ── Conversation persistence (signed-in only) ──
  let conversationId: string | null = body.conversationId ?? null
  if (user) {
    const supabase = createServerClient()
    const lastUserMsg = [...body.messages].reverse().find((m) => m.role === 'user')

    if (!conversationId) {
      const title = (lastUserMsg?.content ?? 'New conversation').slice(0, 80)
      const { data: conv, error } = await (supabase.from as any)('chat_conversations')
        .insert({
          user_id: user.id,
          title,
          context_type: body.context?.type ?? null,
          context_slug: body.context?.slug ?? null,
        })
        .select('id')
        .single()
      if (error) console.error('Failed to create conversation:', error)
      conversationId = conv?.id ?? null
    }

    if (conversationId && lastUserMsg) {
      await (supabase.from as any)('chat_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: lastUserMsg.content,
      })
      await (supabase.from as any)('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)
    }
  }

  // ── Stream ──
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return jsonError('DEEPSEEK_API_KEY not configured', 500)

  const openai = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' })

  const encoder = new TextEncoder()
  const writeEvent = (controller: ReadableStreamDefaultController, event: ChatStreamEvent) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
  }

  const stream = new ReadableStream({
    async start(controller) {
      let assistantText = ''
      try {
        writeEvent(controller, { type: 'meta', conversationId })

        const completion = await openai.chat.completions.create({
          model: MODEL,
          stream: true,
          temperature: 0.5,
          max_tokens: 1500,
          messages: [
            { role: 'system', content: systemPrompt },
            ...body.messages.map((m) => ({ role: m.role, content: m.content })),
          ],
        })

        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content
          if (delta) {
            assistantText += delta
            writeEvent(controller, { type: 'content', content: delta })
          }
        }

        // Persist assistant message after full generation
        if (user && conversationId && assistantText) {
          const supabase = createServerClient()
          await (supabase.from as any)('chat_messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: assistantText,
          })
        }

        writeEvent(controller, { type: 'done' })
      } catch (err) {
        console.error('Chat stream error:', err)
        writeEvent(controller, {
          type: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
          code: 'internal',
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
