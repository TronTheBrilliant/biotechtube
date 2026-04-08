import { NextResponse } from 'next/server'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const ALLOWED_PATHS = [
  '/api/cron/generate-news',
  '/api/cron/scrape-funding',
  '/api/cron/update-prices',
  '/api/cron/update-aggregations',
  '/api/cron/agents',
]

export async function POST(request: Request) {
  try {
    // Auth is handled by CRON_SECRET on the target endpoints
    // and client-side admin email check on the command center page
    const body = await request.json()
    const { path } = body

    if (!path || !ALLOWED_PATHS.includes(path)) {
      return NextResponse.json(
        { error: 'Invalid cron path', allowed: ALLOWED_PATHS },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://biotechtube.io'
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      )
    }

    const res = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
      },
    })

    const data = await res.json()

    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    console.error('POST /api/admin/trigger-cron error:', err)
    return NextResponse.json(
      { error: 'Failed to trigger cron', details: err.message },
      { status: 500 }
    )
  }
}
