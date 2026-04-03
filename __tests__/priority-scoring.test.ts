import { describe, it, expect } from 'vitest'
import { calculatePriorityScore } from '@/lib/scoring/priority'
import type { Thread } from '@/types'

function makeThread(overrides: Partial<Thread> = {}): Thread {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  return {
    id: 'test-id',
    user_id: 'user-id',
    connected_account_id: 'account-id',
    external_thread_id: 'ext-id',
    source: 'gmail',
    subject: 'Test',
    snippet: null,
    participant_emails: [],
    status: 'open',
    snoozed_until: null,
    priority_score: 50,
    priority_label: 'medium',
    needs_reply: false,
    needs_reply_confidence: null,
    waiting_on: null,
    is_stale: false,
    thread_type: null,
    first_message_at: oneDayAgo,
    latest_message_at: oneDayAgo,
    last_reply_by_me_at: null,
    last_reply_by_them_at: null,
    resolved_at: null,
    created_at: oneDayAgo,
    updated_at: oneDayAgo,
    ...overrides,
  }
}

const defaultInput = {
  senderIsVip: false,
  hasDetectedDeadline: false,
  deadlineDaysAway: null,
  aiUrgencySignals: {
    explicit_deadline: false,
    urgent_language: false,
    financial_language: false,
    escalation_language: false,
  },
  aiSentiment: 'neutral' as const,
  hasPromiseDetected: false,
}

describe('Priority Scoring', () => {
  it('VIP sender adds 25 points', () => {
    const { score: withVip } = calculatePriorityScore({
      thread: makeThread(),
      ...defaultInput,
      senderIsVip: true,
    })
    const { score: withoutVip } = calculatePriorityScore({
      thread: makeThread(),
      ...defaultInput,
      senderIsVip: false,
    })
    expect(withVip - withoutVip).toBe(25)
  })

  it('newsletter threads cap at 10', () => {
    const { score, label } = calculatePriorityScore({
      thread: makeThread({ thread_type: 'newsletter' }),
      ...defaultInput,
      senderIsVip: true,
      aiSentiment: 'urgent',
      aiUrgencySignals: {
        explicit_deadline: true,
        urgent_language: true,
        financial_language: true,
        escalation_language: true,
      },
    })
    expect(score).toBeLessThanOrEqual(10)
    expect(label).toBe('low')
  })

  it('notification threads cap at 5', () => {
    const { score } = calculatePriorityScore({
      thread: makeThread({ thread_type: 'notification' }),
      ...defaultInput,
      senderIsVip: true,
    })
    expect(score).toBeLessThanOrEqual(5)
  })

  it('urgent label when score >= 75', () => {
    const { label } = calculatePriorityScore({
      thread: makeThread({ needs_reply: true }),
      ...defaultInput,
      senderIsVip: true,
      hasDetectedDeadline: true,
      deadlineDaysAway: 1,
      aiUrgencySignals: {
        explicit_deadline: true,
        urgent_language: true,
        financial_language: true,
        escalation_language: true,
      },
      aiSentiment: 'urgent',
      hasPromiseDetected: true,
    })
    expect(label).toBe('urgent')
  })

  it('low priority for non-urgent thread with no signals', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const { label } = calculatePriorityScore({
      thread: makeThread({ latest_message_at: threeDaysAgo }),
      ...defaultInput,
    })
    expect(label).toBe('low')
  })

  it('recent message boosts recency score', () => {
    const veryRecent = new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 mins ago
    const old = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago

    const { score: recentScore } = calculatePriorityScore({
      thread: makeThread({ latest_message_at: veryRecent }),
      ...defaultInput,
    })
    const { score: oldScore } = calculatePriorityScore({
      thread: makeThread({ latest_message_at: old }),
      ...defaultInput,
    })
    expect(recentScore).toBeGreaterThan(oldScore)
  })

  it('deadline urgency scales correctly', () => {
    const { breakdown: bd1 } = calculatePriorityScore({
      thread: makeThread(),
      ...defaultInput,
      hasDetectedDeadline: true,
      deadlineDaysAway: 1,
    })
    const { breakdown: bd7 } = calculatePriorityScore({
      thread: makeThread(),
      ...defaultInput,
      hasDetectedDeadline: true,
      deadlineDaysAway: 7,
    })
    expect(bd1.deadline).toBeGreaterThan(bd7.deadline)
  })

  it('score never exceeds 100', () => {
    const { score } = calculatePriorityScore({
      thread: makeThread({ needs_reply: true }),
      senderIsVip: true,
      hasDetectedDeadline: true,
      deadlineDaysAway: 0,
      aiUrgencySignals: {
        explicit_deadline: true,
        urgent_language: true,
        financial_language: true,
        escalation_language: true,
      },
      aiSentiment: 'urgent',
      hasPromiseDetected: true,
    })
    expect(score).toBeLessThanOrEqual(100)
  })

  it('financial language adds 5 points', () => {
    const { breakdown: withFinancial } = calculatePriorityScore({
      thread: makeThread(),
      ...defaultInput,
      aiUrgencySignals: { ...defaultInput.aiUrgencySignals, financial_language: true },
    })
    const { breakdown: withoutFinancial } = calculatePriorityScore({
      thread: makeThread(),
      ...defaultInput,
    })
    expect(withFinancial.financial).toBe(5)
    expect(withoutFinancial.financial).toBe(0)
  })

  it('promise detected adds 5 points', () => {
    const { breakdown } = calculatePriorityScore({
      thread: makeThread(),
      ...defaultInput,
      hasPromiseDetected: true,
    })
    expect(breakdown.promise).toBe(5)
  })

  it('returns breakdown object with all keys', () => {
    const { breakdown } = calculatePriorityScore({
      thread: makeThread(),
      ...defaultInput,
    })
    expect(breakdown).toHaveProperty('vip')
    expect(breakdown).toHaveProperty('unanswered')
    expect(breakdown).toHaveProperty('urgencyLanguage')
    expect(breakdown).toHaveProperty('deadline')
    expect(breakdown).toHaveProperty('recency')
    expect(breakdown).toHaveProperty('sentiment')
    expect(breakdown).toHaveProperty('financial')
    expect(breakdown).toHaveProperty('promise')
  })
})
