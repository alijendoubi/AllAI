import { supabaseAdmin } from '@/lib/db'
import type { FollowUp } from '@/types'

export async function checkFollowUpExists(
  threadId: string,
  type: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('follow_ups')
    .select('id')
    .eq('thread_id', threadId)
    .eq('type', type)
    .eq('status', 'pending')
    .maybeSingle()

  return data !== null
}

export async function getFollowUpsDueToday(userId: string): Promise<FollowUp[]> {
  const now = new Date()
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

  const { data, error } = await supabaseAdmin
    .from('follow_ups')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .lte('due_at', endOfDay.toISOString())
    .order('due_at', { ascending: true })

  if (error) throw error
  return (data as FollowUp[]) ?? []
}

export async function completeFollowUpsForThread(
  threadId: string,
  userId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('follow_ups')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('thread_id', threadId)
    .eq('user_id', userId)
    .eq('status', 'pending')

  if (error) throw error
}
