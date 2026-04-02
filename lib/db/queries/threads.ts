import { supabaseAdmin } from '@/lib/db'
import type { Thread, ThreadWithDetails, DashboardView } from '@/types'

export async function getThreadsForDashboard(
  userId: string,
  view: DashboardView,
  limit = 50,
  offset = 0
): Promise<Thread[]> {
  let query = supabaseAdmin
    .from('threads')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'archived')
    .order('priority_score', { ascending: false })
    .order('latest_message_at', { ascending: false })
    .range(offset, offset + limit - 1)

  switch (view) {
    case 'urgent':
      query = query.eq('priority_label', 'urgent').eq('status', 'open')
      break
    case 'needs_reply':
      query = query.eq('needs_reply', true).eq('status', 'open')
      break
    case 'waiting':
      query = query.eq('waiting_on', 'them').eq('status', 'open')
      break
    case 'follow_ups':
      // Threads with pending follow-ups — join handled below
      query = query.eq('status', 'open')
      break
    case 'all':
      query = query.in('status', ['open', 'snoozed'])
      break
  }

  if (view === 'follow_ups') {
    // Get thread IDs that have pending follow-ups
    const { data: followUpThreadIds } = await supabaseAdmin
      .from('follow_ups')
      .select('thread_id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lte('due_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())

    const ids = followUpThreadIds?.map((f) => f.thread_id) ?? []
    if (ids.length === 0) return []

    query = supabaseAdmin
      .from('threads')
      .select('*')
      .eq('user_id', userId)
      .in('id', ids)
      .order('priority_score', { ascending: false })
      .range(offset, offset + limit - 1)
  }

  const { data, error } = await query
  if (error) throw error
  return (data as Thread[]) ?? []
}

export async function getThreadWithDetails(
  threadId: string,
  userId: string
): Promise<ThreadWithDetails | null> {
  const [threadResult, messagesResult, summaryResult, labelsResult, suggestionsResult, followUpsResult] =
    await Promise.all([
      supabaseAdmin
        .from('threads')
        .select('*')
        .eq('id', threadId)
        .eq('user_id', userId)
        .single(),
      supabaseAdmin
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .eq('user_id', userId)
        .order('sent_at', { ascending: true }),
      supabaseAdmin
        .from('ai_summaries')
        .select('*')
        .eq('thread_id', threadId)
        .maybeSingle(),
      supabaseAdmin
        .from('ai_labels')
        .select('*')
        .eq('thread_id', threadId)
        .maybeSingle(),
      supabaseAdmin
        .from('action_suggestions')
        .select('*')
        .eq('thread_id', threadId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(3),
      supabaseAdmin
        .from('follow_ups')
        .select('*')
        .eq('thread_id', threadId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('due_at', { ascending: true }),
    ])

  if (threadResult.error || !threadResult.data) return null

  return {
    ...(threadResult.data as Thread),
    messages: messagesResult.data ?? [],
    ai_summary: summaryResult.data ?? null,
    ai_labels: labelsResult.data ?? null,
    action_suggestions: suggestionsResult.data ?? [],
    follow_ups: followUpsResult.data ?? [],
  } as ThreadWithDetails
}

export async function updateThreadStatus(
  threadId: string,
  userId: string,
  status: Thread['status'],
  snoozedUntil?: Date
): Promise<void> {
  const update: Partial<Thread> & { snoozed_until?: string | null } = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'snoozed' && snoozedUntil) {
    update.snoozed_until = snoozedUntil.toISOString()
  } else if (status !== 'snoozed') {
    update.snoozed_until = null
  }

  if (status === 'resolved') {
    update.resolved_at = new Date().toISOString()
  }

  const { error } = await supabaseAdmin
    .from('threads')
    .update(update)
    .eq('id', threadId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function upsertThread(
  thread: Omit<Thread, 'id' | 'created_at' | 'updated_at'>
): Promise<Thread> {
  const { data, error } = await supabaseAdmin
    .from('threads')
    .upsert(
      { ...thread, updated_at: new Date().toISOString() },
      { onConflict: 'connected_account_id,external_thread_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data as Thread
}

export async function getThreadsPendingAI(
  userId: string,
  limit = 20
): Promise<Thread[]> {
  // Threads that don't have an ai_summary yet
  const { data: processedIds } = await supabaseAdmin
    .from('ai_summaries')
    .select('thread_id')
    .eq('thread_id', userId) // filter by joining to threads

  // Simpler: select threads not in ai_summaries
  const { data, error } = await supabaseAdmin
    .from('threads')
    .select('*, ai_summaries!left(id)')
    .eq('user_id', userId)
    .eq('status', 'open')
    .is('ai_summaries.id', null)
    .order('latest_message_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data as Thread[]) ?? []
}

export async function searchThreads(
  userId: string,
  query: string,
  limit = 20
): Promise<Thread[]> {
  const { data, error } = await supabaseAdmin
    .from('threads')
    .select('*')
    .eq('user_id', userId)
    .textSearch(
      'subject',
      query.split(' ').filter(Boolean).join(' & '),
      { type: 'websearch' }
    )
    .limit(limit)

  if (error) throw error
  return (data as Thread[]) ?? []
}

export async function getDashboardCounts(userId: string): Promise<{
  urgent: number
  needs_reply: number
  waiting: number
  follow_ups: number
}> {
  const [urgentResult, needsReplyResult, waitingResult, followUpsResult] = await Promise.all([
    supabaseAdmin
      .from('threads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('priority_label', 'urgent')
      .eq('status', 'open'),
    supabaseAdmin
      .from('threads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('needs_reply', true)
      .eq('status', 'open'),
    supabaseAdmin
      .from('threads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('waiting_on', 'them')
      .eq('status', 'open'),
    supabaseAdmin
      .from('follow_ups')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lte('due_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()),
  ])

  return {
    urgent: urgentResult.count ?? 0,
    needs_reply: needsReplyResult.count ?? 0,
    waiting: waitingResult.count ?? 0,
    follow_ups: followUpsResult.count ?? 0,
  }
}
