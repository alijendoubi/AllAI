import type { gmail_v1 } from 'googleapis'
import type { ParsedThread, ParsedMessage } from './types'

export function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

export function extractTextFromParts(
  parts: gmail_v1.Schema$MessagePart[]
): { text: string; html: string } {
  let text = ''
  let html = ''

  function walk(part: gmail_v1.Schema$MessagePart): void {
    const mimeType = part.mimeType ?? ''
    if (mimeType === 'text/plain' && part.body?.data) {
      text += decodeBase64Url(part.body.data)
    } else if (mimeType === 'text/html' && part.body?.data) {
      html += decodeBase64Url(part.body.data)
    } else if (mimeType.startsWith('multipart/') && part.parts) {
      for (const child of part.parts) {
        walk(child)
      }
    }
  }

  for (const part of parts) {
    walk(part)
  }

  return { text, html }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseEmailAddress(raw: string): { email: string; name: string | null } {
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) {
    return {
      name: match[1].trim().replace(/^["']|["']$/g, ''),
      email: match[2].trim().toLowerCase(),
    }
  }
  return { name: null, email: raw.trim().toLowerCase() }
}

function parseEmailList(header: string): string[] {
  if (!header) return []
  return header
    .split(',')
    .map((addr) => parseEmailAddress(addr.trim()).email)
    .filter(Boolean)
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[], name: string): string {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function countAttachments(parts: gmail_v1.Schema$MessagePart[] | undefined): number {
  if (!parts) return 0
  let count = 0
  for (const part of parts) {
    if (
      part.filename &&
      part.filename.length > 0 &&
      part.body?.attachmentId
    ) {
      count++
    }
    if (part.parts) {
      count += countAttachments(part.parts)
    }
  }
  return count
}

function parseGmailMessage(
  msg: gmail_v1.Schema$Message,
  accountEmail: string
): ParsedMessage {
  const headers = msg.payload?.headers ?? []

  const fromRaw = getHeader(headers, 'From')
  const { email: fromEmail, name: fromName } = parseEmailAddress(fromRaw)
  const toRaw = getHeader(headers, 'To')
  const ccRaw = getHeader(headers, 'Cc')
  const subjectRaw = getHeader(headers, 'Subject')
  const dateRaw = getHeader(headers, 'Date')

  let bodyText = ''
  let bodyHtml = ''

  if (msg.payload?.mimeType === 'text/plain' && msg.payload.body?.data) {
    bodyText = decodeBase64Url(msg.payload.body.data)
  } else if (msg.payload?.mimeType === 'text/html' && msg.payload.body?.data) {
    bodyHtml = decodeBase64Url(msg.payload.body.data)
  } else if (msg.payload?.parts) {
    const extracted = extractTextFromParts(msg.payload.parts)
    bodyText = extracted.text
    bodyHtml = extracted.html
  }

  // Fallback: strip HTML if no plain text
  if (!bodyText && bodyHtml) {
    bodyText = stripHtml(bodyHtml)
  }

  const isOutbound = fromEmail === accountEmail.toLowerCase()

  let sentAt: string
  try {
    sentAt = dateRaw
      ? new Date(dateRaw).toISOString()
      : new Date(parseInt(msg.internalDate ?? '0')).toISOString()
  } catch {
    sentAt = new Date(parseInt(msg.internalDate ?? '0')).toISOString()
  }

  return {
    external_message_id: msg.id ?? '',
    from_email: fromEmail,
    from_name: fromName,
    to_emails: parseEmailList(toRaw),
    cc_emails: parseEmailList(ccRaw),
    subject: subjectRaw || null,
    body_text: bodyText || null,
    body_html: bodyHtml || null,
    is_outbound: isOutbound,
    sent_at: sentAt,
    gmail_label_ids: msg.labelIds ?? [],
    attachments_count: countAttachments(msg.payload?.parts),
  }
}

export function parseGmailThread(
  gmailThread: gmail_v1.Schema$Thread,
  accountEmail: string
): ParsedThread {
  const messages = (gmailThread.messages ?? []).map((m) =>
    parseGmailMessage(m, accountEmail)
  )

  if (messages.length === 0) {
    return {
      external_thread_id: gmailThread.id ?? '',
      subject: null,
      snippet: gmailThread.snippet ?? null,
      participant_emails: [],
      first_message_at: null,
      latest_message_at: null,
      last_reply_by_me_at: null,
      last_reply_by_them_at: null,
      messages: [],
    }
  }

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
  )

  // Collect all participant emails
  const participantSet = new Set<string>()
  for (const msg of sortedMessages) {
    participantSet.add(msg.from_email)
    msg.to_emails.forEach((e) => participantSet.add(e))
    msg.cc_emails.forEach((e) => participantSet.add(e))
  }

  const subject = sortedMessages[0]?.subject ?? null

  let lastReplyByMeAt: string | null = null
  let lastReplyByThemAt: string | null = null

  for (const msg of sortedMessages) {
    if (msg.is_outbound) {
      lastReplyByMeAt = msg.sent_at
    } else {
      lastReplyByThemAt = msg.sent_at
    }
  }

  return {
    external_thread_id: gmailThread.id ?? '',
    subject,
    snippet: gmailThread.snippet ?? null,
    participant_emails: Array.from(participantSet),
    first_message_at: sortedMessages[0]?.sent_at ?? null,
    latest_message_at: sortedMessages[sortedMessages.length - 1]?.sent_at ?? null,
    last_reply_by_me_at: lastReplyByMeAt,
    last_reply_by_them_at: lastReplyByThemAt,
    messages: sortedMessages,
  }
}
