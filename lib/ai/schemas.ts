import { z } from 'zod'

export const ThreadSummarySchema = z.object({
  summary: z.string().max(500),
  key_points: z.array(z.string()).max(3),
  unresolved: z.string().nullable(),
})

export const ActionSignalsSchema = z.object({
  needs_reply: z.boolean(),
  needs_reply_reason: z.string().nullable(),
  waiting_on: z.enum(['me', 'them', 'unclear']),
  detected_deadlines: z.array(
    z.object({
      text: z.string(),
      normalized_date: z.string().nullable(),
      confidence: z.number().min(0).max(1),
    })
  ),
  action_items: z.array(z.string()),
  promises_made_by_me: z.array(z.string()),
  promises_made_by_them: z.array(z.string()),
  sentiment: z.enum(['positive', 'neutral', 'negative', 'urgent']),
  thread_type: z.enum([
    'client',
    'vendor',
    'internal',
    'newsletter',
    'notification',
    'personal',
    'other',
  ]),
})

export const DraftReplySchema = z.object({
  draft: z.string(),
  subject_line: z.string(),
  confidence: z.number().min(0).max(1),
  draft_notes: z.string(),
})

export type ThreadSummary = z.infer<typeof ThreadSummarySchema>
export type ActionSignals = z.infer<typeof ActionSignalsSchema>
export type DraftReply = z.infer<typeof DraftReplySchema>
