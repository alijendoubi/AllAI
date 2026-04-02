import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/db'
import { updateThreadStatus } from '@/lib/db/queries/threads'
import { completeFollowUpsForThread } from '@/lib/db/queries/follow-ups'

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
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  await updateThreadStatus(id, user.id, 'resolved')
  await completeFollowUpsForThread(id, user.id)

  await supabaseAdmin.from('audit_logs').insert({
    user_id: user.id,
    action: 'thread_resolved',
    resource: 'threads',
    resource_id: id,
    metadata: {},
  })

  return NextResponse.json({ ok: true })
}
