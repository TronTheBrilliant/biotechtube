import { createServerClient } from '@/lib/supabase'

/**
 * Fire-and-forget audit log of a tool invocation. Always returns; on DB
 * failure we console.error but never throw (logging shouldn't break chat).
 */
export async function logToolCall(opts: {
  conversationId: string | null
  ip: string | null
  toolName: string
  args: Record<string, unknown>
  resultSize: number
  costUsd: number
}): Promise<void> {
  try {
    const supabase = createServerClient()
    await (supabase.from as any)('chat_tool_calls').insert({
      conversation_id: opts.conversationId,
      ip: opts.ip,
      tool_name: opts.toolName,
      args: opts.args,
      result_size: opts.resultSize,
      cost_estimate_usd: opts.costUsd,
    })
  } catch (err) {
    console.error('logToolCall failed (non-fatal):', err)
  }
}
