import { createClient } from '@supabase/supabase-js'

// Browser client (uses anon key, respects RLS)
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('Missing Supabase env vars:', { url: !!url, key: !!key })
  }
  return createClient(url!, key!)
}

// Server client (uses service role key, bypasses RLS)
// Use ONLY in API routes and scraper scripts
export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
