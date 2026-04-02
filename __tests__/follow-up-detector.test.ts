import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Thread, AiLabels } from '@/types'

// Mock supabaseAdmin
vi.mock('@/lib/db', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      upsert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
          })),
        })),
      })),
    })),
  },
}))

// Mock checkFollowUpExists
vi.mock('@/lib/db/queries/follow-ups', () => ({
  checkFollowUpExists: vi.fn(() => Promise.resolve(false)),
}))

function makeThread(overrides: Partial<Thread> = {}): Thread {
  const now = new Date().toISOString()
  return {
    id: 'thread-1',
    user_id: 'user-1',
    connected_account_id: 'account-1',
    external_thread_id: 'ext-1',
    source: 'gmail',
    subject: 'Test Thread',
    snippet: null,
    participant_emails: ['other@example.com'],
    status: 'open',
    snoozed_until: null,
    priority_score: 50,
    priority_label: 'medium',
    needs_reply: false,
    needs_reply_confidence: null,
    waiting_on: null,
    is_stale: false,
    thread_type: null,
    first_message_at: now,
    latest_message_at: now,
    last_reply_by_me_at: null,
    last_reply_by_them_at: null,
    resolved_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

function makeLabels(overrides: Partial<AiLabels> = {}): AiLabels {
  return {
    id: 'label-1',
    thread_id: 'thread-1',
    needs_reply: false,
    needs_reply_reason: null,
    needs_reply_confidence: null,
    waiting_on: null,
    urgency_score: null,
    sentiment: 'neutral',
    detected_deadlines: [],
    action_items: [],
    promises_made_by_me: [],
    promises_made_by_them: [],
    topic_tags: null,
    thread_type: null,
    model_used: null,
    processed_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('detectFollowUps', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips newsletter threads', async () => {
    const { detectFollowUps } = await import('@/lib/follow-ups/detector')
    const { supabaseAdmin } = await import('@/lib/db')

    const thread = makeThread({ thread_type: 'newsletter' })
    const labels = makeLabels({
      waiting_on: 'them',
      thread_type: 'newsletter',
    })

    await detectFollowUps(thread, labels, 'user-1')

    // supabaseAdmin.from should not have been called with 'follow_ups'
    const fromCalls = vi.mocked(supabaseAdmin.from).mock.calls.map((c) => c[0])
    expect(fromCalls).not.toContain('follow_ups')
  })

  it('skips notification threads', async () => {
    const { detectFollowUps } = await import('@/lib/follow-ups/detector')
    const { supabaseAdmin } = await import('@/lib/db')

    const thread = makeThread({ thread_type: 'notification' })
    const labels = makeLabels({ thread_type: 'notification' })

    await detectFollowUps(thread, labels, 'user-1')

    const fromCalls = vi.mocked(supabaseAdmin.from).mock.calls.map((c) => c[0])
    expect(fromCalls).not.toContain('follow_ups')
  })

  it('creates deadline follow-up for future deadline with high confidence', async () => {
    const { detectFollowUps } = await import('@/lib/follow-ups/detector')
    const { supabaseAdmin } = await import('@/lib/db')

    const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const thread = makeThread()
    const labels = makeLabels({
      detected_deadlines: [
        { text: 'by Friday', normalized_date: futureDate, confidence: 0.9 },
      ],
    })

    await detectFollowUps(thread, labels, 'user-1')

    const fromCalls = vi.mocked(supabaseAdmin.from).mock.calls.map((c) => c[0])
    expect(fromCalls).toContain('follow_ups')
  })

  it('ignores deadline with low confidence', async () => {
    const { detectFollowUps } = await import('@/lib/follow-ups/detector')
    const { supabaseAdmin } = await import('@/lib/db')

    const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const thread = makeThread()
    const labels = makeLabels({
      detected_deadlines: [
        { text: 'maybe by Friday', normalized_date: futureDate, confidence: 0.5 },
      ],
    })

    await detectFollowUps(thread, labels, 'user-1')

    const fromCalls = vi.mocked(supabaseAdmin.from).mock.calls.map((c) => c[0])
    expect(fromCalls).not.toContain('follow_ups')
  })

  it('ignores past deadlines', async () => {
    const { detectFollowUps } = await import('@/lib/follow-ups/detector')
    const { supabaseAdmin } = await import('@/lib/db')

    const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const thread = makeThread()
    const labels = makeLabels({
      detected_deadlines: [
        { text: 'was due yesterday', normalized_date: pastDate, confidence: 0.95 },
      ],
    })

    await detectFollowUps(thread, labels, 'user-1')

    const fromCalls = vi.mocked(supabaseAdmin.from).mock.calls.map((c) => c[0])
    expect(fromCalls).not.toContain('follow_ups')
  })

  it('creates waiting_on_them follow-up after 3 days no reply', async () => {
    const { detectFollowUps } = await import('@/lib/follow-ups/detector')
    const { supabaseAdmin } = await import('@/lib/db')

    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    const thread = makeThread({ last_reply_by_me_at: fourDaysAgo })
    const labels = makeLabels({ waiting_on: 'them' })

    await detectFollowUps(thread, labels, 'user-1')

    const fromCalls = vi.mocked(supabaseAdmin.from).mock.calls.map((c) => c[0])
    expect(fromCalls).toContain('follow_ups')
  })

  it('does not create waiting follow-up if reply sent < 3 days ago', async () => {
    const { detectFollowUps } = await import('@/lib/follow-ups/detector')
    const { supabaseAdmin } = await import('@/lib/db')

    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    const thread = makeThread({ last_reply_by_me_at: oneDayAgo })
    const labels = makeLabels({ waiting_on: 'them' })

    await detectFollowUps(thread, labels, 'user-1')

    const fromCalls = vi.mocked(supabaseAdmin.from).mock.calls.map((c) => c[0])
    expect(fromCalls).not.toContain('follow_ups')
  })

  it('marks thread stale when no activity for 14+ days', async () => {
    const { detectFollowUps } = await import('@/lib/follow-ups/detector')
    const { supabaseAdmin } = await import('@/lib/db')

    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    const thread = makeThread({
      latest_message_at: fifteenDaysAgo,
      status: 'open',
    })
    const labels = makeLabels({ needs_reply: false })

    await detectFollowUps(thread, labels, 'user-1')

    const fromCalls = vi.mocked(supabaseAdmin.from).mock.calls.map((c) => c[0])
    expect(fromCalls).toContain('threads')
  })
})
