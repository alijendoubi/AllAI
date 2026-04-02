import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/db'
import { getThreadWithDetails } from '@/lib/db/queries/threads'
import { DashboardShell } from '../../DashboardShell'

export default async function ThreadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) redirect('/sign-in')

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!user) redirect('/')

  const thread = await getThreadWithDetails(id, user.id)
  if (!thread) redirect('/')

  return <DashboardShell initialView="all" />
}
