import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/db'
import { ConnectGmail } from '@/components/onboarding/ConnectGmail'
import { SyncProgress } from '@/components/onboarding/SyncProgress'
import { DashboardShell } from './(dashboard)/DashboardShell'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ syncing?: string; error?: string }>
}) {
  const { userId: clerkUserId } = await auth()

  if (!clerkUserId) {
    redirect('/sign-in')
  }

  const params = await searchParams

  // Ensure user record exists
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  if (!existingUser) {
    // Create user record from Clerk data
    const { data: clerkUser } = await supabaseAdmin
      .from('users')
      .insert({ clerk_user_id: clerkUserId, email: clerkUserId + '@pending.local' })
      .select('id')
      .single()

    if (!clerkUser) {
      return <ConnectGmail />
    }
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!user) return <ConnectGmail />

  // Check for connected Gmail account
  const { data: account } = await supabaseAdmin
    .from('connected_accounts')
    .select('id, initial_sync_completed_at')
    .eq('user_id', user.id)
    .eq('provider', 'gmail')
    .eq('is_active', true)
    .maybeSingle()

  if (!account) {
    return <ConnectGmail />
  }

  if (params.syncing === 'true' || !account.initial_sync_completed_at) {
    return <SyncProgress />
  }

  return <DashboardShell initialView="needs_reply" />
}
