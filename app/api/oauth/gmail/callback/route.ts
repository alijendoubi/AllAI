import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { google } from 'googleapis'
import { supabaseAdmin } from '@/lib/db'
import { encryptToken } from '@/lib/crypto/tokens'
import { GmailClient } from '@/lib/gmail/client'
import { ingestionQueue } from '@/lib/queue'

export async function GET(request: NextRequest) {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    return NextResponse.redirect(new URL('/sign-in', process.env.NEXT_PUBLIC_APP_URL!))
  }

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    console.error('Gmail OAuth error:', error)
    return NextResponse.redirect(
      new URL(`/?error=gmail_auth_failed`, process.env.NEXT_PUBLIC_APP_URL!)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`/?error=missing_params`, process.env.NEXT_PUBLIC_APP_URL!)
    )
  }

  // Get our internal user
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!user) {
    return NextResponse.redirect(new URL('/sign-in', process.env.NEXT_PUBLIC_APP_URL!))
  }

  // Validate state
  const { data: stateLog } = await supabaseAdmin
    .from('audit_logs')
    .select('metadata')
    .eq('user_id', user.id)
    .eq('action', 'oauth_state_created')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const storedState = (stateLog?.metadata as Record<string, string> | null)?.state
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL(`/?error=invalid_state`, process.env.NEXT_PUBLIC_APP_URL!)
    )
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  try {
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Get Gmail profile
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    const profile = await gmail.users.getProfile({ userId: 'me' })
    const emailAddress = profile.data.emailAddress ?? ''
    const historyId = profile.data.historyId ?? '0'

    // Upsert connected_accounts
    const { data: account, error: accountError } = await supabaseAdmin
      .from('connected_accounts')
      .upsert(
        {
          user_id: user.id,
          provider: 'gmail',
          provider_account_id: emailAddress,
          email_address: emailAddress,
          access_token_encrypted: encryptToken(tokens.access_token ?? ''),
          refresh_token_encrypted: tokens.refresh_token
            ? encryptToken(tokens.refresh_token)
            : null,
          token_expires_at: tokens.expiry_date
            ? new Date(tokens.expiry_date).toISOString()
            : null,
          scopes: tokens.scope?.split(' ') ?? [],
          history_id: historyId,
          is_active: true,
        },
        {
          onConflict: 'user_id,provider,provider_account_id',
        }
      )
      .select()
      .single()

    if (accountError || !account) {
      console.error('Failed to upsert connected account:', accountError)
      return NextResponse.redirect(
        new URL(`/?error=account_save_failed`, process.env.NEXT_PUBLIC_APP_URL!)
      )
    }

    // Set up Gmail push notifications (optional — requires Cloud Pub/Sub setup)
    try {
      const client = new GmailClient(account)
      const topicName = process.env.GMAIL_PUBSUB_TOPIC
      if (topicName) {
        const watchResult = await client.watchInbox(topicName)
        await supabaseAdmin
          .from('connected_accounts')
          .update({ watch_expiry: new Date(parseInt(watchResult.expiration)).toISOString() })
          .eq('id', account.id)
      }
    } catch (watchErr) {
      // Non-fatal — incremental sync via push is optional
      console.warn('Failed to set up Gmail watch:', watchErr)
    }

    // Trigger initial sync job
    await ingestionQueue.add('initial-sync', {
      connectedAccountId: account.id,
      userId: user.id,
    })

    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'gmail_connected',
      resource: 'connected_accounts',
      resource_id: account.id,
      metadata: { email_address: emailAddress },
    })

    return NextResponse.redirect(
      new URL(`/?syncing=true`, process.env.NEXT_PUBLIC_APP_URL!)
    )
  } catch (err) {
    console.error('Gmail OAuth callback error:', err)
    return NextResponse.redirect(
      new URL(`/?error=token_exchange_failed`, process.env.NEXT_PUBLIC_APP_URL!)
    )
  }
}
