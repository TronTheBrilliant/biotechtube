import { createServerClient } from '@/lib/supabase'

export const ANON_DAILY_LIMIT = 5

/** Soft warning threshold — UI shows "sign in for unlimited" banner. */
export const ANON_WARN_AT = 3

export interface RateLimitResult {
  count: number
  limit: number
  remaining: number
  exceeded: boolean
  warn: boolean
}

/**
 * Atomically increment the per-IP counter for today and return the new state.
 *
 * Uses the `increment_chat_rate_limit(p_ip text)` Postgres function defined in
 * the chat tables migration. This avoids a read-modify-write race where two
 * concurrent requests both read count=4 and both write count=5.
 *
 * Caller decides whether to refuse the request based on `exceeded`.
 */
export async function checkAndIncrementRateLimit(ip: string): Promise<RateLimitResult> {
  const supabase = createServerClient()
  const { data, error } = await (supabase.rpc as any)('increment_chat_rate_limit', { p_ip: ip })
  if (error) {
    // If the RPC fails (e.g. transient DB issue), fail open rather than
    // block paying-customer-equivalent traffic. We log and treat as count=1.
    console.error('Rate limit RPC failed, failing open:', error)
    return { count: 1, limit: ANON_DAILY_LIMIT, remaining: ANON_DAILY_LIMIT - 1, exceeded: false, warn: false }
  }
  const count = typeof data === 'number' ? data : 1
  return {
    count,
    limit: ANON_DAILY_LIMIT,
    remaining: Math.max(0, ANON_DAILY_LIMIT - count),
    exceeded: count > ANON_DAILY_LIMIT,
    warn: count >= ANON_WARN_AT,
  }
}
