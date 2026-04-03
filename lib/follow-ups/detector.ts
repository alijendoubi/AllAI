import { supabaseAdmin } from '@/lib/db'
import { checkFollowUpExists } from '@/lib/db/queries/follow-ups'
import type { Thread, AiLabels, FollowUp } from '@/types'

function daysSince(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  return (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
}

export async function detectFollowUps(
  thread: Thread,
  aiLabels: AiLabels,
  userId: string
): Promise<void> {
  // Skip newsletters and notifications
  if (
    thread.thread_type === 'newsletter' ||
    thread.thread_type === 'notification'
  ) {
    return
  }

  const followUps: Omit<FollowUp, 'id' | 'created_at' | 'updated_at'>[] = []

  // Rule 1: Explicit deadlines from AI
  for (const deadline of aiLabels.detected_deadlines ?? []) {
    if (deadline.confidence > 0.75 && deadline.normalized_date) {
      try {
        const dueAt = new Date(deadline.normalized_date)
        if (dueAt > new Date()) {
          followUps.push({
            user_id: userId,
            thread_id: thread.id,
            type: 'deadline',
            status: 'pending',
            due_at: dueAt.toISOString(),
            detected_text: deadline.text,
            ai_confidence: deadline.confidence,
            created_by: 'ai',
            notes: null,
            completed_at: null,
          })
        }
      } catch {
        // Invalid date — skip
      }
    }
  }

  // Rule 2: Waiting on them too long
  if (aiLabels.waiting_on === 'them' && thread.last_reply_by_me_at) {
    const daysSinceMyReply = daysSince(thread.last_reply_by_me_at)
    if (daysSinceMyReply >= 3) {
      const exists = await checkFollowUpExists(thread.id, 'waiting_on_them')
      if (!exists) {
        followUps.push({
          user_id: userId,
          thread_id: thread.id,
          type: 'waiting_on_them',
          status: 'pending',
          due_at: new Date().toISOString(),
          detected_text: `No reply for ${Math.floor(daysSinceMyReply)} days`,
          ai_confidence: 1.0,
          created_by: 'ai',
          notes: null,
          completed_at: null,
        })
      }
    }
  }

  // Rule 3: My promises (AI-detected)
  if (
    aiLabels.waiting_on === 'me' &&
    aiLabels.promises_made_by_me &&
    aiLabels.promises_made_by_me.length > 0
  ) {
    const promise = aiLabels.promises_made_by_me[0]
    followUps.push({
      user_id: userId,
      thread_id: thread.id,
      type: 'waiting_on_me',
      status: 'pending',
      due_at: null,
      detected_text: promise ?? null,
      ai_confidence: 0.8,
      created_by: 'ai',
      notes: null,
      completed_at: null,
    })
  }

  // Rule 4: Stale thread (no activity 14+ days, open, not needing reply)
  const daysSinceLastMessage = daysSince(
    thread.latest_message_at ?? thread.created_at
  )
  if (
    daysSinceLastMessage >= 14 &&
    thread.status === 'open' &&
    !aiLabels.needs_reply
  ) {
    await supabaseAdmin
      .from('threads')
      .update({ is_stale: true, updated_at: new Date().toISOString() })
      .eq('id', thread.id)
  }

  // Batch insert, ignore duplicates
  if (followUps.length > 0) {
    await supabaseAdmin.from('follow_ups').upsert(followUps, {
      onConflict: 'thread_id,type',
      ignoreDuplicates: true,
    })
  }
}
