import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { ingestionQueue } from '@/lib/queue'

interface PubSubMessage {
  data: string
  messageId: string
  publishTime: string
}

interface PubSubBody {
  message: PubSubMessage
  subscription: string
}

interface GmailNotification {
  emailAddress: string
  historyId: number
}

export async function POST(request: NextRequest) {
  // Always return 200 — if we return non-200, Google retries aggressively
  try {
    const body = (await request.json()) as PubSubBody

    if (!body.message?.data) {
      return NextResponse.json({ ok: true })
    }

    // Decode the Pub/Sub message data
    const decoded = Buffer.from(body.message.data, 'base64').toString('utf-8')
    const notification = JSON.parse(decoded) as GmailNotification

    const { emailAddress, historyId } = notification

    if (!emailAddress || !historyId) {
      return NextResponse.json({ ok: true })
    }

    // Find connected account
    const { data: accounts } = await supabaseAdmin
      .from('connected_accounts')
      .select('id, user_id, history_id')
      .eq('email_address', emailAddress)
      .eq('is_active', true)
      .eq('provider', 'gmail')

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ ok: true })
    }

    for (const account of accounts) {
      await ingestionQueue.add(
        'incremental-sync',
        {
          connectedAccountId: account.id,
          userId: account.user_id,
          historyId: historyId.toString(),
        },
        {
          jobId: `incremental-${account.id}-${historyId}`,
        }
      )
    }
  } catch (err) {
    // Log but never throw — must return 200
    console.error('Gmail webhook error:', err)
  }

  return NextResponse.json({ ok: true })
}
