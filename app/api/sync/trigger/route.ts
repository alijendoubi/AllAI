import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/db'
import { ingestionQueue } from '@/lib/queue'

export async function POST() {
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

  const { data: accounts } = await supabaseAdmin
    .from('connected_accounts')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .eq('provider', 'gmail')

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ error: 'No connected Gmail accounts' }, { status: 400 })
  }

  for (const account of accounts) {
    await ingestionQueue.add('initial-sync', {
      connectedAccountId: account.id,
      userId: user.id,
    })
  }

  return NextResponse.json({ ok: true, queued: accounts.length })
}
