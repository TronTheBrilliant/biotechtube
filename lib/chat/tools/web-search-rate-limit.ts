import { createServerClient } from '@/lib/supabase'

/**
 * Per-day caps on the chatbot's `web_search` tool. Mirrors lib/chat/rate-limit.ts
 * but is a separate counter — message rate-limit and search rate-limit are
 * distinct cost surfaces. Anonymous users get fewer searches because each one
 * costs money to fulfill.
 */
export const ANON_DAILY_SEARCH_LIMIT = 20
export const SIGNED_IN_DAILY_SEARCH_LIMIT = 200

export interface SearchRateLimitResult {
  count: number
  limit: number
  exceeded: boolean
}

/**
 * Atomically increment the per-IP search counter for today. Falls open
 * (count=1) on transient DB failure rather than blocking traffic.
 *
 * Pass a stable per-user key (e.g. `user:<uuid>`) for signed-in users so
 * they get the higher limit on a separate counter from any IP they share.
 */
export async function checkAndIncrementSearchLimit(
  key: string,
  signedIn: boolean,
): Promise<SearchRateLimitResult> {
  const limit = signedIn ? SIGNED_IN_DAILY_SEARCH_LIMIT : ANON_DAILY_SEARCH_LIMIT
  const supabase = createServerClient()
  const { data, error } = await (supabase.rpc as any)('increment_chat_web_search_limit', {
    p_ip: key,
  })
  if (error) {
    console.error('Web-search rate limit RPC failed, failing open:', error)
    return { count: 1, limit, exceeded: false }
  }
  const count = typeof data === 'number' ? data : 1
  return { count, limit, exceeded: count > limit }
}
