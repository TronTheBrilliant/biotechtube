import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Browser client (uses anon key, respects RLS)
export function createBrowserClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Server client (uses service role key, bypasses RLS)
// Use ONLY in API routes and scraper scripts
export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
