import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { GmailClient } from '@/lib/gmail/client'
import type { ConnectedAccount } from '@/types'

// Gmail push notification watches expire every 7 days.
// This cron runs daily and renews any watch expiring within 24 hours.
export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('x-vercel-cron-signature')
  if (process.env.NODE_ENV === 'production' && !cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const topicName = process.env.GMAIL_PUBSUB_TOPIC
  if (!topicName) {
    return NextResponse.json({ ok: true, skipped: 'GMAIL_PUBSUB_TOPIC not configured' })
  }

  // Find accounts whose watch expires within the next 24 hours
  const expiryThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data: accounts, error } = await supabaseAdmin
    .from('connected_accounts')
    .select('*')
    .eq('provider', 'gmail')
    .eq('is_active', true)
    .or(`watch_expiry.is.null,watch_expiry.lte.${expiryThreshold}`)

  if (error) {
    console.error('gmail-watch-renew: failed to fetch accounts', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  let renewed = 0
  let failed = 0

  for (const account of accounts ?? []) {
    try {
      const client = new GmailClient(account as ConnectedAccount)
      const result = await client.watchInbox(topicName)

      await supabaseAdmin
        .from('connected_accounts')
        .update({
          watch_expiry: new Date(parseInt(result.expiration)).toISOString(),
          history_id: result.historyId,
        })
        .eq('id', account.id)

      renewed++
    } catch (err) {
      console.error(`gmail-watch-renew: failed for account ${account.id}`, err)
      failed++
    }
  }

  return NextResponse.json({ ok: true, renewed, failed })
}
