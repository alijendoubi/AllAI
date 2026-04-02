import { describe, it, expect } from 'vitest'
import { parseGmailThread, decodeBase64Url, extractTextFromParts } from '@/lib/gmail/parser'
import type { gmail_v1 } from 'googleapis'

function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function makeMessage(overrides: {
  id: string
  from: string
  to: string
  subject: string
  date: string
  body: string
  labelIds?: string[]
}): gmail_v1.Schema$Message {
  return {
    id: overrides.id,
    threadId: 'thread-1',
    labelIds: overrides.labelIds ?? ['INBOX'],
    internalDate: new Date(overrides.date).getTime().toString(),
    payload: {
      mimeType: 'text/plain',
      headers: [
        { name: 'From', value: overrides.from },
        { name: 'To', value: overrides.to },
        { name: 'Subject', value: overrides.subject },
        { name: 'Date', value: overrides.date },
      ],
      body: { data: base64UrlEncode(overrides.body) },
    },
  }
}

describe('decodeBase64Url', () => {
  it('decodes standard base64url', () => {
    const encoded = base64UrlEncode('Hello, World!')
    expect(decodeBase64Url(encoded)).toBe('Hello, World!')
  })

  it('handles characters that differ from standard base64', () => {
    const text = 'test+/test'
    const encoded = base64UrlEncode(text)
    expect(decodeBase64Url(encoded)).toBe(text)
  })
})

describe('extractTextFromParts', () => {
  it('extracts plain text from text/plain part', () => {
    const parts: gmail_v1.Schema$MessagePart[] = [
      {
        mimeType: 'text/plain',
        body: { data: base64UrlEncode('Hello plain text') },
      },
    ]
    const { text } = extractTextFromParts(parts)
    expect(text).toBe('Hello plain text')
  })

  it('extracts html from text/html part', () => {
    const parts: gmail_v1.Schema$MessagePart[] = [
      {
        mimeType: 'text/html',
        body: { data: base64UrlEncode('<p>Hello HTML</p>') },
      },
    ]
    const { html } = extractTextFromParts(parts)
    expect(html).toBe('<p>Hello HTML</p>')
  })

  it('walks multipart structure recursively', () => {
    const parts: gmail_v1.Schema$MessagePart[] = [
      {
        mimeType: 'multipart/alternative',
        parts: [
          {
            mimeType: 'text/plain',
            body: { data: base64UrlEncode('Plain version') },
          },
          {
            mimeType: 'text/html',
            body: { data: base64UrlEncode('<p>HTML version</p>') },
          },
        ],
      },
    ]
    const { text, html } = extractTextFromParts(parts)
    expect(text).toBe('Plain version')
    expect(html).toBe('<p>HTML version</p>')
  })
})

describe('parseGmailThread', () => {
  const accountEmail = 'user@example.com'

  it('parses a single message thread', () => {
    const thread: gmail_v1.Schema$Thread = {
      id: 'thread-1',
      snippet: 'Thread snippet',
      messages: [
        makeMessage({
          id: 'msg-1',
          from: 'sender@other.com',
          to: 'user@example.com',
          subject: 'Hello',
          date: 'Mon, 31 Mar 2025 10:00:00 +0000',
          body: 'Hi there!',
        }),
      ],
    }

    const parsed = parseGmailThread(thread, accountEmail)
    expect(parsed.external_thread_id).toBe('thread-1')
    expect(parsed.subject).toBe('Hello')
    expect(parsed.messages).toHaveLength(1)
    expect(parsed.messages[0].from_email).toBe('sender@other.com')
    expect(parsed.messages[0].is_outbound).toBe(false)
    expect(parsed.messages[0].body_text).toBe('Hi there!')
  })

  it('detects outbound messages correctly', () => {
    const thread: gmail_v1.Schema$Thread = {
      id: 'thread-2',
      snippet: '',
      messages: [
        makeMessage({
          id: 'msg-1',
          from: 'user@example.com',
          to: 'client@company.com',
          subject: 'Following up',
          date: 'Mon, 31 Mar 2025 09:00:00 +0000',
          body: 'Just checking in',
        }),
      ],
    }

    const parsed = parseGmailThread(thread, accountEmail)
    expect(parsed.messages[0].is_outbound).toBe(true)
    expect(parsed.last_reply_by_me_at).toBeTruthy()
    expect(parsed.last_reply_by_them_at).toBeNull()
  })

  it('sets last_reply_by_me_at and last_reply_by_them_at', () => {
    const thread: gmail_v1.Schema$Thread = {
      id: 'thread-3',
      snippet: '',
      messages: [
        makeMessage({
          id: 'msg-1',
          from: 'client@company.com',
          to: 'user@example.com',
          subject: 'Question',
          date: 'Mon, 31 Mar 2025 08:00:00 +0000',
          body: 'Can you help?',
        }),
        makeMessage({
          id: 'msg-2',
          from: 'user@example.com',
          to: 'client@company.com',
          subject: 'Re: Question',
          date: 'Mon, 31 Mar 2025 09:00:00 +0000',
          body: 'Sure!',
        }),
        makeMessage({
          id: 'msg-3',
          from: 'client@company.com',
          to: 'user@example.com',
          subject: 'Re: Question',
          date: 'Mon, 31 Mar 2025 10:00:00 +0000',
          body: 'Thanks!',
        }),
      ],
    }

    const parsed = parseGmailThread(thread, accountEmail)
    expect(parsed.messages).toHaveLength(3)
    expect(parsed.last_reply_by_me_at).toBeTruthy()
    expect(parsed.last_reply_by_them_at).toBeTruthy()
    // last reply by them should be after last reply by me
    const meAt = new Date(parsed.last_reply_by_me_at!).getTime()
    const themAt = new Date(parsed.last_reply_by_them_at!).getTime()
    expect(themAt).toBeGreaterThan(meAt)
  })

  it('collects all participant emails', () => {
    const thread: gmail_v1.Schema$Thread = {
      id: 'thread-4',
      snippet: '',
      messages: [
        makeMessage({
          id: 'msg-1',
          from: 'alice@example.com',
          to: 'user@example.com, bob@example.com',
          subject: 'Group',
          date: 'Mon, 31 Mar 2025 10:00:00 +0000',
          body: 'Group email',
        }),
      ],
    }

    const parsed = parseGmailThread(thread, accountEmail)
    expect(parsed.participant_emails).toContain('alice@example.com')
    expect(parsed.participant_emails).toContain('user@example.com')
    expect(parsed.participant_emails).toContain('bob@example.com')
  })

  it('handles empty thread gracefully', () => {
    const thread: gmail_v1.Schema$Thread = {
      id: 'thread-empty',
      snippet: 'Empty',
      messages: [],
    }

    const parsed = parseGmailThread(thread, accountEmail)
    expect(parsed.messages).toHaveLength(0)
    expect(parsed.subject).toBeNull()
    expect(parsed.first_message_at).toBeNull()
  })
})
