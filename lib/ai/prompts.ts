export const SUMMARIZE_THREAD_PROMPT = (
  subject: string,
  messages: string
): string => `You are summarizing an email thread. Be concise and factual. Ground every claim in the messages.

Thread subject: ${subject}
Messages (oldest first):
${messages}

Respond ONLY with valid JSON matching this exact schema. No markdown, no preamble:
{
  "summary": "2-3 sentence summary of what this thread is about and current status",
  "key_points": ["point 1", "point 2"],
  "unresolved": "what still needs resolution, or null if resolved"
}`

export const EXTRACT_ACTION_SIGNALS_PROMPT = (
  userEmail: string,
  messages: string
): string => `You are analyzing an email thread to extract action signals. Be conservative.
Only mark needs_reply=true if there is a clear, open question or request directed at ${userEmail}.

The user's email address: ${userEmail}

Thread messages:
${messages}

Respond ONLY with valid JSON. No markdown, no preamble, no explanation:
{
  "needs_reply": boolean,
  "needs_reply_reason": "why it needs reply, or null",
  "waiting_on": "me" | "them" | "unclear",
  "detected_deadlines": [{"text": "raw text", "normalized_date": "YYYY-MM-DD or null", "confidence": 0.0-1.0}],
  "action_items": ["things the user needs to do"],
  "promises_made_by_me": ["commitments the user made"],
  "promises_made_by_them": ["commitments others made"],
  "sentiment": "positive" | "neutral" | "negative" | "urgent",
  "thread_type": "client" | "vendor" | "internal" | "newsletter" | "notification" | "personal" | "other"
}`

export const DRAFT_REPLY_PROMPT = (
  userName: string,
  threadSummary: string,
  recentOutbound: string,
  fullThread: string
): string => `You are drafting a reply email for ${userName}.

Rules:
- Match the tone and style of their recent emails shown below
- Be concise (3-5 sentences unless the topic requires detail)
- Do not make commitments you cannot verify from the thread
- Do not use filler phrases like "I hope this finds you well"
- Do not invent information not present in the thread
- Address the most recent unanswered question or request directly

${userName}'s recent writing style (last sent emails):
${recentOutbound}

Thread summary: ${threadSummary}

Full thread:
${fullThread}

Respond ONLY with valid JSON:
{
  "draft": "the email body text",
  "subject_line": "subject line",
  "confidence": 0.0-1.0,
  "draft_notes": "brief note explaining what this draft does"
}`

export const DAILY_BRIEF_PROMPT = (
  userName: string,
  urgentThreads: string,
  followUps: string,
  waitingOn: string
): string => `You are writing a concise daily email brief for ${userName}.

Urgent threads needing attention:
${urgentThreads}

Follow-ups due today:
${followUps}

Waiting on others (no reply for 48h+):
${waitingOn}

Write a brief, scannable email summary in plain text. No more than 200 words.
Lead with the most urgent item. Use bullet points. Be direct.`
