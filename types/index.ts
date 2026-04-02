export interface User {
  id: string
  clerk_user_id: string
  email: string
  display_name: string | null
  timezone: string
  preferences: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ConnectedAccount {
  id: string
  user_id: string
  provider: string
  provider_account_id: string
  email_address: string | null
  access_token_encrypted: string
  refresh_token_encrypted: string | null
  token_expires_at: string | null
  scopes: string[] | null
  history_id: string | null
  initial_sync_completed_at: string | null
  last_sync_at: string | null
  watch_expiry: string | null
  is_active: boolean
  created_at: string
}

export interface Contact {
  id: string
  user_id: string
  display_name: string | null
  is_vip: boolean
  vip_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ContactIdentity {
  id: string
  contact_id: string
  user_id: string
  type: string
  value: string
  created_at: string
}

export interface Thread {
  id: string
  user_id: string
  connected_account_id: string
  external_thread_id: string
  source: 'gmail' | 'slack'
  subject: string | null
  snippet: string | null
  participant_emails: string[]
  status: 'open' | 'resolved' | 'snoozed' | 'archived'
  snoozed_until: string | null
  priority_score: number
  priority_label: 'urgent' | 'high' | 'medium' | 'low'
  needs_reply: boolean
  needs_reply_confidence: number | null
  waiting_on: 'me' | 'them' | 'unclear' | null
  is_stale: boolean
  thread_type: string | null
  first_message_at: string | null
  latest_message_at: string | null
  last_reply_by_me_at: string | null
  last_reply_by_them_at: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  thread_id: string
  user_id: string
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
  created_at: string
}

export interface FollowUp {
  id: string
  user_id: string
  thread_id: string
  type: string
  status: 'pending' | 'completed' | 'dismissed'
  due_at: string | null
  detected_text: string | null
  notes: string | null
  ai_confidence: number | null
  created_by: 'ai' | 'user'
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface AiSummary {
  id: string
  thread_id: string
  summary_text: string
  key_points: string[]
  unresolved: string | null
  embedding: number[] | null
  model_used: string | null
  prompt_version: string | null
  processed_at: string
  tokens_used: number | null
}

export interface AiLabels {
  id: string
  thread_id: string
  needs_reply: boolean | null
  needs_reply_reason: string | null
  needs_reply_confidence: number | null
  waiting_on: 'me' | 'them' | 'unclear' | null
  urgency_score: number | null
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent' | null
  detected_deadlines: DetectedDeadline[]
  action_items: string[]
  promises_made_by_me: string[]
  promises_made_by_them: string[]
  topic_tags: string[] | null
  thread_type: string | null
  model_used: string | null
  processed_at: string
}

export interface DetectedDeadline {
  text: string
  normalized_date: string | null
  confidence: number
}

export interface ActionSuggestion {
  id: string
  thread_id: string
  user_id: string
  type: string
  content: string | null
  status: 'pending' | 'accepted' | 'dismissed'
  edited_content: string | null
  model_used: string | null
  created_at: string
  acted_on_at: string | null
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  resource: string | null
  resource_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface ThreadWithDetails extends Thread {
  messages: Message[]
  ai_summary: AiSummary | null
  ai_labels: AiLabels | null
  action_suggestions: ActionSuggestion[]
  follow_ups: FollowUp[]
}

export type DashboardView = 'urgent' | 'needs_reply' | 'waiting' | 'follow_ups' | 'all'
