import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { google } from 'googleapis'
import { supabaseAdmin } from '@/lib/db'
import { randomBytes } from 'crypto'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
]

export async function GET() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get our internal user record
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const state = randomBytes(32).toString('hex')

  // Store state temporarily (we'll validate it on callback)
  await supabaseAdmin.from('audit_logs').insert({
    user_id: user.id,
    action: 'oauth_state_created',
    resource: 'gmail',
    metadata: { state, created_at: new Date().toISOString() },
  })

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent',
  })

  return NextResponse.redirect(authUrl)
}
