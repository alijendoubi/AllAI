import type { Thread, Message } from '@/types'

export interface ParsedMessage {
  external_message_id: string
  from_email: string
  from_name: string | null
  to_emails: string[]
  cc_emails: string[]
  subject: string | null
  body_text: string | null
  body_html: string | null
  is_outbound: boolean
  sent_at: string
  gmail_label_ids: string[]
  attachments_count: number
}

export interface ParsedThread {
  external_thread_id: string
  subject: string | null
  snippet: string | null
  participant_emails: string[]
  first_message_at: string | null
  latest_message_at: string | null
  last_reply_by_me_at: string | null
  last_reply_by_them_at: string | null
  messages: ParsedMessage[]
}

export interface GmailWatchResponse {
  historyId: string
  expiration: string
}

export type NormalizedThread = Omit<Thread, 'id' | 'created_at' | 'updated_at'>
export type NormalizedMessage = Omit<Message, 'id' | 'created_at'>
