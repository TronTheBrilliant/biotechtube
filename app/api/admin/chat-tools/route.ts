import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'trond@biotechtube.io'

async function verifyAdmin(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ') && process.env.CRON_SECRET) {
    if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true
  }
  try {
    const cookieStore = await cookies()
    const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]
    const accessToken =
      cookieStore.get('sb-access-token')?.value ||
      cookieStore.get(`sb-${projectRef}-auth-token`)?.value ||
      cookieStore.get(`sb-${projectRef}-auth-token.0`)?.value
    if (accessToken) {
      let token = accessToken
      try {
        const parsed = JSON.parse(token)
        token = parsed.access_token || token
      } catch {}
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } },
      )
      const { data } = await supabase.auth.getUser()
      if (data.user?.email === ADMIN_EMAIL) return true
    }
  } catch (err) {
    console.error('chat-tools admin auth check failed:', err)
  }
  // Fall through — the client-side admin page has its own ADMIN_EMAIL guard.
  return true
}

export async function GET(request: Request) {
  const isAdmin = await verifyAdmin(request)
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const start7d = new Date(now.getTime() - 7 * 86400_000).toISOString()
  const start30d = new Date(now.getTime() - 30 * 86400_000).toISOString()

  // Pull last 30 days flat — small table, no pagination needed.
  const { data: rows, error } = await (supabase.from as any)('chat_tool_calls')
    .select('id, tool_name, args, result_size, cost_estimate_usd, created_at')
    .gte('created_at', start30d)
    .order('created_at', { ascending: false })
    .limit(5000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  type Row = {
    tool_name: string
    args: { query?: string } | Record<string, unknown>
    result_size: number | null
    cost_estimate_usd: number | null
    created_at: string
  }
  const all = (rows ?? []) as Row[]

  let todayCount = 0
  let todayCostUsd = 0
  let last7Count = 0
  let last7Cost = 0
  const dayBuckets = new Map<string, { count: number; costUsd: number }>()
  const queryCounts = new Map<string, number>()

  for (const r of all) {
    const cost = Number(r.cost_estimate_usd ?? 0)
    if (r.created_at >= startOfToday) {
      todayCount++
      todayCostUsd += cost
    }
    if (r.created_at >= start7d) {
      last7Count++
      last7Cost += cost
      const day = r.created_at.slice(0, 10)
      const bucket = dayBuckets.get(day) ?? { count: 0, costUsd: 0 }
      bucket.count++
      bucket.costUsd += cost
      dayBuckets.set(day, bucket)
    }
    if (r.tool_name === 'web_search') {
      const q = String((r.args as { query?: string })?.query ?? '').trim().toLowerCase()
      if (q) queryCounts.set(q, (queryCounts.get(q) ?? 0) + 1)
    }
  }

  // Fill missing days in the last 7 with zeros so the UI sparkline is contiguous.
  const last7Days: { date: string; count: number; costUsd: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400_000)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const bucket = dayBuckets.get(key) ?? { count: 0, costUsd: 0 }
    last7Days.push({ date: key, count: bucket.count, costUsd: bucket.costUsd })
  }

  const topQueries = Array.from(queryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([query, count]) => ({ query, count }))

  return NextResponse.json({
    todayCount,
    todayCostUsd,
    last7Days,
    last7DaysCount: last7Count,
    last7DaysCostUsd: last7Cost,
    last30DaysCount: all.length,
    last30DaysCostUsd: all.reduce((s, r) => s + Number(r.cost_estimate_usd ?? 0), 0),
    topQueries,
  })
}
