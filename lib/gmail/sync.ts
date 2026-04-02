import { supabaseAdmin } from '@/lib/db'
import { upsertThread } from '@/lib/db/queries/threads'
import { upsertMessages } from '@/lib/db/queries/messages'
import { GmailClient } from './client'
import { parseGmailThread } from './parser'
import type { ConnectedAccount } from '@/types'

export async function syncThread(
  client: GmailClient,
  account: ConnectedAccount,
  userId: string,
  externalThreadId: string
): Promise<string | null> {
  try {
    const gmailThread = await client.getThread(externalThreadId)
    const parsed = parseGmailThread(gmailThread, account.email_address ?? '')

    const thread = await upsertThread({
      user_id: userId,
      connected_account_id: account.id,
      external_thread_id: parsed.external_thread_id,
      source: 'gmail',
      subject: parsed.subject,
      snippet: parsed.snippet,
      participant_emails: parsed.participant_emails,
      status: 'open',
      snoozed_until: null,
      priority_score: 50,
      priority_label: 'medium',
      needs_reply: false,
      needs_reply_confidence: null,
      waiting_on: null,
      is_stale: false,
      thread_type: null,
      first_message_at: parsed.first_message_at,
      latest_message_at: parsed.latest_message_at,
      last_reply_by_me_at: parsed.last_reply_by_me_at,
      last_reply_by_them_at: parsed.last_reply_by_them_at,
      resolved_at: null,
    })

    const messages = parsed.messages.map((msg) => ({
      thread_id: thread.id,
      user_id: userId,
      external_message_id: msg.external_message_id,
      from_email: msg.from_email,
      from_name: msg.from_name,
      to_emails: msg.to_emails,
      cc_emails: msg.cc_emails,
      subject: msg.subject,
      body_text: msg.body_text,
      body_html: msg.body_html,
      is_outbound: msg.is_outbound,
      sent_at: msg.sent_at,
      gmail_label_ids: msg.gmail_label_ids,
      attachments_count: msg.attachments_count,
    }))

    await upsertMessages(messages)

    return thread.id
  } catch (err) {
    console.error(`Failed to sync thread ${externalThreadId}:`, err)
    return null
  }
}

export async function updateAccountHistoryId(
  accountId: string,
  historyId: string
): Promise<void> {
  await supabaseAdmin
    .from('connected_accounts')
    .update({
      history_id: historyId,
      last_sync_at: new Date().toISOString(),
    })
    .eq('id', accountId)
}

export async function markInitialSyncComplete(accountId: string): Promise<void> {
  await supabaseAdmin
    .from('connected_accounts')
    .update({
      initial_sync_completed_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
    })
    .eq('id', accountId)
}
