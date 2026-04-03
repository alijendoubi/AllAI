import OpenAI from 'openai'
import { z } from 'zod'
import {
  ThreadSummarySchema,
  ActionSignalsSchema,
  DraftReplySchema,
  type ThreadSummary,
  type ActionSignals,
  type DraftReply,
} from './schemas'
import {
  SUMMARIZE_THREAD_PROMPT,
  EXTRACT_ACTION_SIGNALS_PROMPT,
  DRAFT_REPLY_PROMPT,
} from './prompts'
import type { Message, ThreadWithDetails } from '@/types'

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

// Safe JSON parse with Zod validation
async function parseAIResponse<T>(
  response: string,
  schema: z.ZodSchema<T>
): Promise<T | null> {
  try {
    const cleaned = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    const parsed = JSON.parse(cleaned) as unknown
    return schema.parse(parsed)
  } catch (e) {
    console.error(
      'AI response parse failed:',
      e,
      'Response was:',
      response.substring(0, 200)
    )
    return null
  }
}

function formatMessages(messages: Message[], maxMessages = 20, maxCharsEach = 500): string {
  const recent = messages.slice(-maxMessages)
  return recent
    .map((msg) => {
      const body = (msg.body_text ?? '').substring(0, maxCharsEach)
      return `[${new Date(msg.sent_at).toISOString()}] From: ${msg.from_email}
${body}`
    })
    .join('\n\n---\n\n')
}

export async function summarizeThread(
  subject: string,
  messages: Message[]
): Promise<ThreadSummary | null> {
  try {
    const formattedMessages = formatMessages(messages)
    const prompt = SUMMARIZE_THREAD_PROMPT(subject ?? '(no subject)', formattedMessages)

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.2,
    })

    const content = response.choices[0]?.message?.content ?? ''
    return parseAIResponse(content, ThreadSummarySchema)
  } catch (err) {
    console.error('summarizeThread failed:', err)
    return null
  }
}

export async function extractActionSignals(
  userEmail: string,
  messages: Message[]
): Promise<ActionSignals | null> {
  try {
    const formattedMessages = formatMessages(messages, 20, 800)
    const prompt = EXTRACT_ACTION_SIGNALS_PROMPT(userEmail, formattedMessages)

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0.1,
    })

    const content = response.choices[0]?.message?.content ?? ''
    const signals = await parseAIResponse(content, ActionSignalsSchema)

    if (!signals) return null

    // Post-process: remove past deadlines older than 90 days
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    signals.detected_deadlines = signals.detected_deadlines.filter((d) => {
      if (!d.normalized_date) return true
      try {
        return new Date(d.normalized_date) > ninetyDaysAgo
      } catch {
        return false
      }
    })

    return signals
  } catch (err) {
    console.error('extractActionSignals failed:', err)
    return null
  }
}

export async function generateDraftReply(
  userName: string,
  thread: ThreadWithDetails,
  recentOutboundMessages: Message[]
): Promise<DraftReply | null> {
  if (!thread.needs_reply) return null

  try {
    const summaryText = thread.ai_summary?.summary_text ?? 'No summary available'
    const recentOutbound = recentOutboundMessages
      .slice(0, 3)
      .map((m) => m.body_text?.substring(0, 400) ?? '')
      .filter(Boolean)
      .join('\n\n---\n\n')

    const fullThread = formatMessages(thread.messages, 15, 600)
    const prompt = DRAFT_REPLY_PROMPT(userName, summaryText, recentOutbound, fullThread)

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.4,
    })

    const content = response.choices[0]?.message?.content ?? ''
    return parseAIResponse(content, DraftReplySchema)
  } catch (err) {
    console.error('generateDraftReply failed:', err)
    return null
  }
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await getOpenAI().embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000),
    })
    return response.data[0]?.embedding ?? null
  } catch (err) {
    console.error('generateEmbedding failed:', err)
    return null
  }
}
