import { supabaseAdmin } from '@/lib/db'
import type { Message } from '@/types'

export async function upsertMessage(
  message: Omit<Message, 'id' | 'created_at'>
): Promise<Message> {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .upsert(message, { onConflict: 'thread_id,external_message_id' })
    .select()
    .single()

  if (error) throw error
  return data as Message
}

export async function upsertMessages(
  messages: Omit<Message, 'id' | 'created_at'>[]
): Promise<void> {
  if (messages.length === 0) return

  const { error } = await supabaseAdmin
    .from('messages')
    .upsert(messages, { onConflict: 'thread_id,external_message_id' })

  if (error) throw error
}

export async function getMessagesForThread(
  threadId: string,
  userId: string
): Promise<Message[]> {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('thread_id', threadId)
    .eq('user_id', userId)
    .order('sent_at', { ascending: true })

  if (error) throw error
  return (data as Message[]) ?? []
}

export async function getRecentOutboundMessages(
  userId: string,
  limit = 10
): Promise<Message[]> {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .eq('is_outbound', true)
    .order('sent_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data as Message[]) ?? []
}
