import type { Thread } from '@/types'

interface ScoringInput {
  thread: Thread
  senderIsVip: boolean
  hasDetectedDeadline: boolean
  deadlineDaysAway: number | null
  aiUrgencySignals: {
    explicit_deadline: boolean
    urgent_language: boolean
    financial_language: boolean
    escalation_language: boolean
  }
  aiSentiment: 'positive' | 'neutral' | 'negative' | 'urgent'
  hasPromiseDetected: boolean
}

function daysSince(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  return (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
}

function hoursSince(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  return (now.getTime() - date.getTime()) / (1000 * 60 * 60)
}

export function calculatePriorityScore(input: ScoringInput): {
  score: number
  label: 'urgent' | 'high' | 'medium' | 'low'
  breakdown: Record<string, number>
} {
  const breakdown: Record<string, number> = {}

  // 1. Sender VIP: 0 or 25
  breakdown.vip = input.senderIsVip ? 25 : 0

  // 2. Unanswered duration: 0-20 (only if needs_reply)
  if (input.thread.needs_reply) {
    const referenceDate =
      input.thread.last_reply_by_me_at ??
      input.thread.first_message_at ??
      input.thread.created_at
    const daysSinceLastReply = daysSince(referenceDate)
    breakdown.unanswered = Math.min(20, Math.floor(daysSinceLastReply * 2.85))
  } else {
    breakdown.unanswered = 0
  }

  // 3. AI urgency language: 0-15
  const urgencySignalCount = Object.values(input.aiUrgencySignals).filter(Boolean).length
  breakdown.urgencyLanguage = Math.round(urgencySignalCount * 3.75)

  // 4. Deadline proximity: 0-15
  if (input.hasDetectedDeadline && input.deadlineDaysAway !== null) {
    if (input.deadlineDaysAway <= 1) breakdown.deadline = 15
    else if (input.deadlineDaysAway <= 3) breakdown.deadline = 12
    else if (input.deadlineDaysAway <= 7) breakdown.deadline = 8
    else breakdown.deadline = 3
  } else {
    breakdown.deadline = 0
  }

  // 5. Recency: 0-10
  const hoursAgo = hoursSince(
    input.thread.latest_message_at ?? input.thread.created_at
  )
  if (hoursAgo < 1) breakdown.recency = 10
  else if (hoursAgo < 24) breakdown.recency = 7
  else if (hoursAgo < 72) breakdown.recency = 4
  else breakdown.recency = 0

  // 6. Sentiment: 0-5
  breakdown.sentiment =
    input.aiSentiment === 'urgent' || input.aiSentiment === 'negative'
      ? 5
      : input.aiSentiment === 'neutral'
      ? 2
      : 0

  // 7. Financial/client language: 0-5
  breakdown.financial = input.aiUrgencySignals.financial_language ? 5 : 0

  // 8. Promise detected: 0-5
  breakdown.promise = input.hasPromiseDetected ? 5 : 0

  let score = Object.values(breakdown).reduce((a, b) => a + b, 0)
  score = Math.min(100, score)

  // Thread type overrides
  if (input.thread.thread_type === 'newsletter') score = Math.min(10, score)
  if (input.thread.thread_type === 'notification') score = Math.min(5, score)

  const label: 'urgent' | 'high' | 'medium' | 'low' =
    score >= 75
      ? 'urgent'
      : score >= 50
      ? 'high'
      : score >= 25
      ? 'medium'
      : 'low'

  return { score, label, breakdown }
}

export function detectUrgencySignals(text: string): {
  explicit_deadline: boolean
  urgent_language: boolean
  financial_language: boolean
  escalation_language: boolean
} {
  const lower = text.toLowerCase()
  return {
    explicit_deadline:
      /\b(deadline|due by|due on|by (monday|tuesday|wednesday|thursday|friday|saturday|sunday)|by (today|tomorrow|end of (week|day|month)))\b/.test(
        lower
      ),
    urgent_language:
      /\b(urgent|asap|immediately|right away|as soon as possible|time.sensitive|critical|emergency)\b/.test(
        lower
      ),
    financial_language:
      /\b(invoice|payment|contract|proposal|budget|pricing|quote|purchase order|billing)\b/.test(
        lower
      ),
    escalation_language:
      /\b(escalat|follow.up|remind|no response|still waiting|chase|not heard|getting concerned)\b/.test(
        lower
      ),
  }
}
