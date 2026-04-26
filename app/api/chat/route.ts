import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase'
import { getUserFromRequest, getClientIp } from '@/lib/chat/auth'
import { checkAndIncrementRateLimit } from '@/lib/chat/rate-limit'
import { loadContextPayload, loadGeneralPlatformContext } from '@/lib/chat/context-loader'
import { buildSystemPrompt } from '@/lib/chat/system-prompt'
import { TOOLS } from '@/lib/chat/tools/definitions'
import { searchWeb, estimateSearchCostUsd } from '@/lib/chat/tools/web-search'
import { checkAndIncrementSearchLimit } from '@/lib/chat/tools/web-search-rate-limit'
import { logToolCall } from '@/lib/chat/tools/log'
import type { ChatRequestBody, ChatStreamEvent } from '@/lib/chat/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300
export const runtime = 'nodejs'

const MODEL = 'deepseek-v4-flash'
const MAX_USER_MESSAGES = 30
const MAX_CONTENT_LEN = 8000
const MAX_TOOL_ROUNDS = 2 // hard cap on web_search invocations per user message

type ChatMsg = OpenAI.Chat.Completions.ChatCompletionMessageParam

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

  // ── Auth + message rate limit ──
  const user = await getUserFromRequest(req)
  const ip = getClientIp(req)
  if (!user) {
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
    const payload = await loadContextPayload(body.context)
    if (!payload) {
      return jsonError(`Context not found: ${body.context.type}/${body.context.slug}`, 404)
    }
    contextPayload = payload
  } else {
    try {
      generalPayload = await loadGeneralPlatformContext()
    } catch (err) {
      console.error('loadGeneralPlatformContext failed:', err)
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
  const writeEvent = (
    controller: ReadableStreamDefaultController,
    event: ChatStreamEvent
  ) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
  }

  // Per-conversation cap on web_search calls within a single request.
  // Belt-and-braces alongside the per-day rate limit and the 2-round loop cap.
  const searchLimitKey = user ? `user:${user.id}` : `ip:${ip}`
  const searchAvailable = !!process.env.FIRECRAWL_API_KEY

  const stream = new ReadableStream({
    async start(controller) {
      try {
        writeEvent(controller, { type: 'meta', conversationId })

        // Conversation history seed (system + prior turns).
        const conversation: ChatMsg[] = [
          { role: 'system', content: systemPrompt },
          ...body.messages.map((m) => ({ role: m.role, content: m.content }) as ChatMsg),
        ]

        // ── Tool-calling loop (up to MAX_TOOL_ROUNDS rounds, then forced final stream) ──
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          // Probe for tool calls without streaming. DeepSeek (OpenAI-compat) returns
          // tool_calls atomically; streaming tool_call deltas would complicate the loop.
          const probe = await openai.chat.completions.create({
            model: MODEL,
            stream: false,
            temperature: 0.5,
            max_tokens: 1500,
            messages: conversation,
            tools: searchAvailable ? TOOLS : undefined,
          })

          const choice = probe.choices[0]
          const toolCalls = choice?.message?.tool_calls

          if (!toolCalls || toolCalls.length === 0) {
            // No tool call — emit the model's text and we're done.
            const text = choice?.message?.content ?? ''
            if (text) {
              writeEvent(controller, { type: 'content', content: text })
            }
            await persistAssistant(user, conversationId, text)
            writeEvent(controller, { type: 'done' })
            controller.close()
            return
          }

          // Push the assistant's tool-call message into history, then resolve each call.
          conversation.push({
            role: 'assistant',
            content: choice.message.content ?? '',
            tool_calls: toolCalls,
          })

          for (const call of toolCalls) {
            if (call.type !== 'function') {
              conversation.push({
                role: 'tool',
                tool_call_id: call.id,
                content: JSON.stringify({ error: `Unsupported tool call type: ${call.type}` }),
              })
              continue
            }
            if (call.function.name !== 'web_search') {
              conversation.push({
                role: 'tool',
                tool_call_id: call.id,
                content: JSON.stringify({ error: `Unknown tool: ${call.function.name}` }),
              })
              continue
            }

            let parsedArgs: { query?: string }
            try {
              parsedArgs = JSON.parse(call.function.arguments || '{}')
            } catch {
              parsedArgs = {}
            }
            const query = (parsedArgs.query ?? '').toString().trim()

            if (!query) {
              writeEvent(controller, {
                type: 'tool_error',
                tool: 'web_search',
                error: 'Empty query',
              })
              conversation.push({
                role: 'tool',
                tool_call_id: call.id,
                content: JSON.stringify({ error: 'Empty query' }),
              })
              continue
            }

            // Surface the call to the UI before doing the work.
            writeEvent(controller, { type: 'tool_call', tool: 'web_search', query })

            const limit = await checkAndIncrementSearchLimit(searchLimitKey, !!user)
            if (limit.exceeded) {
              writeEvent(controller, {
                type: 'tool_error',
                tool: 'web_search',
                error: `Daily search limit reached (${limit.limit}/day)`,
              })
              conversation.push({
                role: 'tool',
                tool_call_id: call.id,
                content: JSON.stringify({
                  error: `Search rate limit exceeded (${limit.limit}/day). Answer from training/context only.`,
                }),
              })
              continue
            }

            try {
              const results = await searchWeb(query)
              const cost = estimateSearchCostUsd(results.length)

              writeEvent(controller, {
                type: 'tool_result',
                tool: 'web_search',
                sources: results.map((r) => ({ url: r.url, title: r.title })),
              })

              // Fire-and-forget audit log.
              logToolCall({
                conversationId,
                ip,
                toolName: 'web_search',
                args: { query },
                resultSize: results.length,
                costUsd: cost,
              }).catch(() => {})

              conversation.push({
                role: 'tool',
                tool_call_id: call.id,
                content: JSON.stringify({ query, results }),
              })
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Search failed'
              writeEvent(controller, { type: 'tool_error', tool: 'web_search', error: msg })
              conversation.push({
                role: 'tool',
                tool_call_id: call.id,
                content: JSON.stringify({ error: msg }),
              })
            }
          }
          // Loop continues — model decides whether to call again or answer.
        }

        // Hit MAX_TOOL_ROUNDS without an answer. Force a final answer with
        // streaming and no further tools available.
        let assistantText = ''
        const finalCompletion = await openai.chat.completions.create({
          model: MODEL,
          stream: true,
          temperature: 0.5,
          max_tokens: 1500,
          messages: conversation,
          // tools omitted — model must answer with what it has
        })
        for await (const chunk of finalCompletion) {
          const delta = chunk.choices[0]?.delta?.content
          if (delta) {
            assistantText += delta
            writeEvent(controller, { type: 'content', content: delta })
          }
        }
        await persistAssistant(user, conversationId, assistantText)
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

async function persistAssistant(
  user: { id: string } | null,
  conversationId: string | null,
  text: string,
): Promise<void> {
  if (!user || !conversationId || !text) return
  try {
    const supabase = createServerClient()
    await (supabase.from as any)('chat_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: text,
    })
  } catch (err) {
    console.error('Failed to persist assistant message:', err)
  }
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
