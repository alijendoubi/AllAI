import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { Resend } from 'resend'
import OpenAI from 'openai'
import { DAILY_BRIEF_PROMPT } from '@/lib/ai/prompts'

function isInUserMorning(timezone: string): boolean {
  try {
    const now = new Date()
    const userTime = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    }).format(now)
    const hour = parseInt(userTime)
    return hour >= 7 && hour <= 9
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const cronSecret = request.headers.get('x-vercel-cron-signature')
  if (process.env.NODE_ENV === 'production' && !cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, email, display_name, timezone')
    .eq('preferences->daily_brief_enabled', true)

  if (!users || users.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  let sent = 0

  for (const user of users) {
    try {
      if (!isInUserMorning(user.timezone ?? 'UTC')) continue

      // Get urgent threads
      const { data: urgentThreads } = await supabaseAdmin
        .from('threads')
        .select('subject, participant_emails, priority_score, snippet')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .eq('priority_label', 'urgent')
        .order('priority_score', { ascending: false })
        .limit(5)

      // Get follow-ups due today
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      const { data: followUps } = await supabaseAdmin
        .from('follow_ups')
        .select('detected_text, type, due_at, threads(subject)')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .lte('due_at', today.toISOString())
        .limit(5)

      // Get waiting on them > 48h
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      const { data: waitingThreads } = await supabaseAdmin
        .from('threads')
        .select('subject, last_reply_by_me_at, participant_emails')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .eq('waiting_on', 'them')
        .lte('last_reply_by_me_at', twoDaysAgo)
        .limit(5)

      const urgentText = (urgentThreads ?? [])
        .map((t) => `- ${t.subject ?? '(no subject)'}: ${t.snippet ?? ''}`)
        .join('\n') || 'None'

      const followUpsText = (followUps ?? [])
        .map((f) => `- ${f.detected_text ?? f.type}`)
        .join('\n') || 'None'

      const waitingText = (waitingThreads ?? [])
        .map((t) => `- ${t.subject ?? '(no subject)'}`)
        .join('\n') || 'None'

      const prompt = DAILY_BRIEF_PROMPT(
        user.display_name ?? user.email,
        urgentText,
        followUpsText,
        waitingText
      )

      const aiResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0.3,
      })

      const briefText = aiResponse.choices[0]?.message?.content ?? ''

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'brief@yourdomain.com',
        to: user.email,
        subject: `Your daily email brief — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`,
        text: briefText,
      })

      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id,
        action: 'daily_brief_sent',
        resource: 'email',
        metadata: { urgent_count: urgentThreads?.length ?? 0 },
      })

      sent++
    } catch (err) {
      console.error(`Failed to send daily brief for user ${user.id}:`, err)
    }
  }

  return NextResponse.json({ ok: true, sent })
}
