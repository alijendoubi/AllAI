import { Worker } from 'bullmq'
import { supabaseAdmin } from '@/lib/db'
import { getThreadWithDetails } from '@/lib/db/queries/threads'
import { getRecentOutboundMessages } from '@/lib/db/queries/messages'
import { isVipSender } from '@/lib/db/queries/contacts'
import {
  summarizeThread,
  extractActionSignals,
  generateDraftReply,
  generateEmbedding,
} from '@/lib/ai'
import { calculatePriorityScore, detectUrgencySignals } from '@/lib/scoring/priority'
import { detectFollowUps } from '@/lib/follow-ups/detector'
import { redisConnection } from '@/lib/queue'
import type { ProcessThreadJobData } from '@/lib/queue/jobs/process-thread'

const PROCESSING_CACHE_MINUTES = 30

export function createAiProcessingWorker() {
  return new Worker<ProcessThreadJobData>(
    'ai-processing',
    async (job) => {
      const { threadId, userId } = job.data
      const jobId = job.id ?? 'unknown'

      try {
        const thread = await getThreadWithDetails(threadId, userId)
        if (!thread) {
          console.error(`[ai-worker:${jobId}] Thread ${threadId} not found`)
          return
        }

        // Check if processed recently
        if (thread.ai_summary?.processed_at) {
          const processedAt = new Date(thread.ai_summary.processed_at)
          const minutesAgo =
            (Date.now() - processedAt.getTime()) / (1000 * 60)
          if (minutesAgo < PROCESSING_CACHE_MINUTES) {
            console.log(
              `[ai-worker:${jobId}] Thread ${threadId} processed recently, skipping`
            )
            return
          }
        }

        const messages = thread.messages
        if (messages.length === 0) return

        // Step 1: Summarize
        const summary = await summarizeThread(thread.subject ?? '', messages)

        if (summary) {
          await supabaseAdmin.from('ai_summaries').upsert(
            {
              thread_id: threadId,
              summary_text: summary.summary,
              key_points: summary.key_points,
              unresolved: summary.unresolved,
              model_used: 'gpt-4o',
              prompt_version: 'v1',
              processed_at: new Date().toISOString(),
            },
            { onConflict: 'thread_id' }
          )
        }

        // Step 2: Extract action signals
        // Get user email from connected account
        const { data: accountData } = await supabaseAdmin
          .from('connected_accounts')
          .select('email_address')
          .eq('id', thread.connected_account_id)
          .single()

        const userEmail = accountData?.email_address ?? ''
        const signals = await extractActionSignals(userEmail, messages)

        if (signals) {
          await supabaseAdmin.from('ai_labels').upsert(
            {
              thread_id: threadId,
              needs_reply: signals.needs_reply,
              needs_reply_reason: signals.needs_reply_reason,
              needs_reply_confidence: signals.needs_reply ? 0.8 : 0.2,
              waiting_on: signals.waiting_on,
              urgency_score: signals.sentiment === 'urgent' ? 80 : 50,
              sentiment: signals.sentiment,
              detected_deadlines: signals.detected_deadlines,
              action_items: signals.action_items,
              promises_made_by_me: signals.promises_made_by_me,
              promises_made_by_them: signals.promises_made_by_them,
              thread_type: signals.thread_type,
              model_used: 'gpt-4o-mini',
              processed_at: new Date().toISOString(),
            },
            { onConflict: 'thread_id' }
          )
        }

        // Step 3: Priority scoring
        const participantEmails = thread.participant_emails ?? []
        let senderIsVip = false
        for (const email of participantEmails) {
          if (await isVipSender(userId, email)) {
            senderIsVip = true
            break
          }
        }

        const allText = messages
          .map((m) => m.body_text ?? '')
          .join(' ')
          .substring(0, 2000)
        const urgencySignals = detectUrgencySignals(allText)

        let closestDeadlineDays: number | null = null
        if (signals?.detected_deadlines && signals.detected_deadlines.length > 0) {
          const futureDates = signals.detected_deadlines
            .filter((d) => d.normalized_date && d.confidence > 0.5)
            .map((d) => {
              const daysAway =
                (new Date(d.normalized_date!).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
              return daysAway
            })
            .filter((d) => d >= 0)

          if (futureDates.length > 0) {
            closestDeadlineDays = Math.min(...futureDates)
          }
        }

        const { score, label } = calculatePriorityScore({
          thread: {
            ...thread,
            needs_reply: signals?.needs_reply ?? thread.needs_reply,
          },
          senderIsVip,
          hasDetectedDeadline: (closestDeadlineDays ?? Infinity) < Infinity,
          deadlineDaysAway: closestDeadlineDays,
          aiUrgencySignals: urgencySignals,
          aiSentiment: signals?.sentiment ?? 'neutral',
          hasPromiseDetected: (signals?.promises_made_by_me?.length ?? 0) > 0,
        })

        // Step 4: Update thread denormalized fields
        await supabaseAdmin
          .from('threads')
          .update({
            needs_reply: signals?.needs_reply ?? false,
            needs_reply_confidence: signals?.needs_reply ? 0.8 : 0.2,
            waiting_on: signals?.waiting_on ?? null,
            priority_score: score,
            priority_label: label,
            thread_type: signals?.thread_type ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', threadId)

        // Step 5: Draft reply if needed
        if (signals?.needs_reply) {
          const existingDraft = thread.action_suggestions.find(
            (s) => s.type === 'draft_reply' && s.status === 'pending'
          )
          if (!existingDraft) {
            const recentOutbound = await getRecentOutboundMessages(userId, 10)
            const { data: userData } = await supabaseAdmin
              .from('users')
              .select('display_name, email')
              .eq('id', userId)
              .single()

            const updatedThread = {
              ...thread,
              needs_reply: true,
              ai_summary: summary
                ? { ...thread.ai_summary, summary_text: summary.summary }
                : thread.ai_summary,
            }

            const draft = await generateDraftReply(
              userData?.display_name ?? userData?.email ?? 'User',
              updatedThread as typeof thread,
              recentOutbound
            )

            if (draft) {
              await supabaseAdmin.from('action_suggestions').insert({
                thread_id: threadId,
                user_id: userId,
                type: 'draft_reply',
                content: draft.draft,
                status: 'pending',
                model_used: 'gpt-4o',
              })
            }
          }
        }

        // Step 6: Follow-up detection
        if (signals) {
          const { data: updatedLabels } = await supabaseAdmin
            .from('ai_labels')
            .select('*')
            .eq('thread_id', threadId)
            .single()

          if (updatedLabels) {
            await detectFollowUps(
              { ...thread, thread_type: signals.thread_type },
              updatedLabels,
              userId
            )
          }
        }

        // Step 7: Generate embedding for semantic search
        if (summary) {
          const embedding = await generateEmbedding(summary.summary)
          if (embedding) {
            await supabaseAdmin
              .from('ai_summaries')
              .update({ embedding })
              .eq('thread_id', threadId)
          }
        }

        console.log(
          `[ai-worker:${jobId}] Processed thread ${threadId}: score=${score}, label=${label}`
        )
      } catch (err) {
        console.error(`[ai-worker:${jobId}] Error processing thread ${threadId}:`, err)
        throw err
      }
    },
    {
      connection: redisConnection(),
      concurrency: 3,
    }
  )
}
