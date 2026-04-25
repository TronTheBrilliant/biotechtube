import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

/**
 * Extract Supabase user from a Bearer token in the Authorization header.
 * Returns null if no token, invalid token, or expired session.
 *
 * The browser obtains the token via `useSession()` (lib/auth.tsx) and
 * passes it as `Authorization: Bearer <token>` on each /api/chat request.
 *
 * We intentionally do NOT use createServerClient() here because that client
 * uses the service role key — it would happily return a user for any UUID.
 * We need real JWT verification, which requires the anon key client.
 */
export async function getUserFromRequest(req: NextRequest): Promise<{ id: string; email: string | null } | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice('Bearer '.length).trim()
  if (!token) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return { id: data.user.id, email: data.user.email ?? null }
}

/**
 * Best-effort client IP extraction. Vercel sets x-forwarded-for; we take the
 * first entry (the real client). Falls back to 'unknown' for local dev.
 */
export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}
