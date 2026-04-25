import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/chat/auth'
import type { ConversationSummary } from '@/lib/chat/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const { data, error } = await (supabase.from as any)('chat_conversations')
    .select('id, title, context_type, context_slug, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('List conversations error:', error)
    return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 })
  }

  return NextResponse.json({ conversations: (data ?? []) as ConversationSummary[] })
}
