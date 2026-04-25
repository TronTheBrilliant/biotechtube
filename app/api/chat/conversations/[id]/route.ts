import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/chat/auth'
import type { ChatMessage } from '@/lib/chat/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  // Verify ownership before returning messages.
  const { data: conv } = await (supabase.from as any)('chat_conversations')
    .select('id, user_id, title, context_type, context_slug')
    .eq('id', params.id)
    .single()

  if (!conv || conv.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: messages } = await (supabase.from as any)('chat_messages')
    .select('role, content, created_at')
    .eq('conversation_id', params.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({
    conversation: {
      id: conv.id,
      title: conv.title,
      context_type: conv.context_type,
      context_slug: conv.context_slug,
    },
    messages: (messages ?? []) as ChatMessage[],
  })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const { data: conv } = await (supabase.from as any)('chat_conversations')
    .select('user_id')
    .eq('id', params.id)
    .single()

  if (!conv || conv.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // chat_messages cascade-deletes via FK
  await (supabase.from as any)('chat_conversations').delete().eq('id', params.id)
  return NextResponse.json({ ok: true })
}
