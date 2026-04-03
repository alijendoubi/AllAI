import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/db'
import { getThreadWithDetails } from '@/lib/db/queries/threads'
import { getRecentOutboundMessages } from '@/lib/db/queries/messages'
import { generateDraftReply } from '@/lib/ai'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, display_name, email')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const thread = await getThreadWithDetails(id, user.id)
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  }

  const recentOutbound = await getRecentOutboundMessages(user.id, 10)
  const draft = await generateDraftReply(
    user.display_name ?? user.email ?? 'User',
    thread,
    recentOutbound
  )

  if (!draft) {
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 })
  }

  const { data: suggestion } = await supabaseAdmin
    .from('action_suggestions')
    .insert({
      thread_id: id,
      user_id: user.id,
      type: 'draft_reply',
      content: draft.draft,
      status: 'pending',
      model_used: 'gpt-4o',
    })
    .select()
    .single()

  return NextResponse.json({ draft, suggestion })
}
