import { supabaseAdmin } from '@/lib/db'
import type { Contact, ContactIdentity } from '@/types'

export async function getContactByEmail(
  userId: string,
  email: string
): Promise<Contact | null> {
  const { data } = await supabaseAdmin
    .from('contact_identities')
    .select('contact_id, contacts(*)')
    .eq('user_id', userId)
    .eq('type', 'email')
    .eq('value', email.toLowerCase())
    .maybeSingle()

  if (!data) return null
  return (data as unknown as { contacts: Contact }).contacts ?? null
}

export async function isVipSender(
  userId: string,
  email: string
): Promise<boolean> {
  const contact = await getContactByEmail(userId, email)
  return contact?.is_vip ?? false
}

export async function setContactVip(
  userId: string,
  contactId: string,
  isVip: boolean,
  reason?: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('contacts')
    .update({
      is_vip: isVip,
      vip_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contactId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function upsertContactIdentity(
  identity: Omit<ContactIdentity, 'id' | 'created_at'>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('contact_identities')
    .upsert(
      { ...identity, value: identity.value.toLowerCase() },
      { onConflict: 'user_id,type,value' }
    )

  if (error) throw error
}
