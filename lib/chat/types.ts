// Shared types for the Ask BiotechTube chatbot.

export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  role: ChatRole
  content: string
  /** ISO timestamp; only set on persisted messages. */
  created_at?: string
  /**
   * Tool invocations that ran while producing this assistant message.
   * Client-side only — not persisted to chat_messages.
   */
  toolEvents?: ToolEvent[]
}

/** A tool invocation surfaced to the user above the assistant bubble. */
export type ToolEvent =
  | { kind: 'searching'; query: string }
  | { kind: 'searched'; query: string; sources: { url: string; title: string }[] }
  | { kind: 'search_error'; query: string; error: string }

export type ChatContextType = 'company' | 'drug' | 'sector'

export interface ChatContext {
  type: ChatContextType
  slug: string
}

/** Body the client POSTs to /api/chat. */
export interface ChatRequestBody {
  messages: ChatMessage[]
  /** When set, server fetches entity data and prepends to system prompt. */
  context?: ChatContext
  /** When set on signed-in requests, server appends new messages to this conversation. Null on first message. */
  conversationId?: string | null
}

/** Single SSE event the server emits. */
export type ChatStreamEvent =
  | { type: 'meta'; conversationId: string | null }
  | { type: 'content'; content: string }
  | { type: 'tool_call'; tool: 'web_search'; query: string }
  | { type: 'tool_result'; tool: 'web_search'; sources: { url: string; title: string }[] }
  | { type: 'tool_error'; tool: 'web_search'; error: string }
  | { type: 'error'; error: string; code?: 'rate_limit' | 'context_not_found' | 'internal' }
  | { type: 'done' }

export interface ConversationSummary {
  id: string
  title: string
  context_type: ChatContextType | null
  context_slug: string | null
  created_at: string
  updated_at: string
}
