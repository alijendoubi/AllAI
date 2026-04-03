import { describe, it, expect } from 'vitest'
import {
  ThreadSummarySchema,
  ActionSignalsSchema,
  DraftReplySchema,
} from '@/lib/ai/schemas'

describe('ThreadSummarySchema', () => {
  it('accepts valid summary', () => {
    const result = ThreadSummarySchema.parse({
      summary: 'This is a valid summary',
      key_points: ['Point 1', 'Point 2'],
      unresolved: null,
    })
    expect(result.summary).toBe('This is a valid summary')
  })

  it('rejects summary over 500 chars', () => {
    expect(() =>
      ThreadSummarySchema.parse({
        summary: 'x'.repeat(501),
        key_points: [],
        unresolved: null,
      })
    ).toThrow()
  })

  it('accepts unresolved as string', () => {
    const result = ThreadSummarySchema.parse({
      summary: 'Test',
      key_points: [],
      unresolved: 'Still waiting for response',
    })
    expect(result.unresolved).toBe('Still waiting for response')
  })
})

describe('ActionSignalsSchema', () => {
  const validSignals = {
    needs_reply: true,
    needs_reply_reason: 'Client asked a question',
    waiting_on: 'me',
    detected_deadlines: [
      { text: 'by Friday', normalized_date: '2025-04-04', confidence: 0.9 },
    ],
    action_items: ['Send proposal'],
    promises_made_by_me: ['Will send by end of week'],
    promises_made_by_them: [],
    sentiment: 'neutral',
    thread_type: 'client',
  }

  it('accepts valid action signals', () => {
    const result = ActionSignalsSchema.parse(validSignals)
    expect(result.needs_reply).toBe(true)
    expect(result.waiting_on).toBe('me')
  })

  it('rejects invalid waiting_on value', () => {
    expect(() =>
      ActionSignalsSchema.parse({ ...validSignals, waiting_on: 'unknown' })
    ).toThrow()
  })

  it('rejects confidence out of range', () => {
    expect(() =>
      ActionSignalsSchema.parse({
        ...validSignals,
        detected_deadlines: [{ text: 'test', normalized_date: null, confidence: 1.5 }],
      })
    ).toThrow()
  })

  it('rejects invalid thread_type', () => {
    expect(() =>
      ActionSignalsSchema.parse({ ...validSignals, thread_type: 'meeting' })
    ).toThrow()
  })

  it('accepts all valid sentiment values', () => {
    for (const sentiment of ['positive', 'neutral', 'negative', 'urgent'] as const) {
      const result = ActionSignalsSchema.parse({ ...validSignals, sentiment })
      expect(result.sentiment).toBe(sentiment)
    }
  })
})

describe('DraftReplySchema', () => {
  it('accepts valid draft', () => {
    const result = DraftReplySchema.parse({
      draft: 'Hi, thanks for reaching out...',
      subject_line: 'Re: Project update',
      confidence: 0.85,
      draft_notes: 'Addresses the pricing question directly',
    })
    expect(result.confidence).toBe(0.85)
  })

  it('rejects confidence below 0', () => {
    expect(() =>
      DraftReplySchema.parse({
        draft: 'test',
        subject_line: 'test',
        confidence: -0.1,
        draft_notes: 'test',
      })
    ).toThrow()
  })
})
