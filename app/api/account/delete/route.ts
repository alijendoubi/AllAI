import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/db'

export async function DELETE() {
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

  // Cascade deletes all related data via FK ON DELETE CASCADE:
  // connected_accounts, threads, messages, follow_ups, ai_summaries,
  // ai_labels, action_suggestions, contacts, contact_identities, audit_logs
  const { error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', user.id)

  if (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete account data' }, { status: 500 })
  }

  // Delete from Clerk
  try {
    const clerk = await clerkClient()
    await clerk.users.deleteUser(clerkUserId)
  } catch (err) {
    // Log but don't fail — DB data is already gone
    console.error('Failed to delete Clerk user:', err)
  }

  return NextResponse.json({ ok: true })
}
