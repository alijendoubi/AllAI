import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/db'

export async function GET() {
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

  const { data: account } = await supabaseAdmin
    .from('connected_accounts')
    .select('initial_sync_completed_at, last_sync_at, is_active, email_address')
    .eq('user_id', user.id)
    .eq('provider', 'gmail')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!account) {
    return NextResponse.json({ connected: false, syncing: false, completed: false })
  }

  // Count processed threads
  const { count: threadCount } = await supabaseAdmin
    .from('threads')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: processedCount } = await supabaseAdmin
    .from('ai_summaries')
    .select('id', { count: 'exact', head: true })
    .in(
      'thread_id',
      (
        await supabaseAdmin
          .from('threads')
          .select('id')
          .eq('user_id', user.id)
      ).data?.map((t) => t.id) ?? []
    )

  return NextResponse.json({
    connected: true,
    syncing: !account.initial_sync_completed_at,
    completed: !!account.initial_sync_completed_at,
    email_address: account.email_address,
    thread_count: threadCount ?? 0,
    processed_count: processedCount ?? 0,
    last_sync_at: account.last_sync_at,
  })
}
