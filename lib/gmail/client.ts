import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { decryptToken, encryptToken } from '@/lib/crypto/tokens'
import { supabaseAdmin } from '@/lib/db'
import type { ConnectedAccount } from '@/types'
import type { gmail_v1 } from 'googleapis'

export class GmailClient {
  private oauth2Client: OAuth2Client
  private account: ConnectedAccount

  constructor(account: ConnectedAccount) {
    this.account = account
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )
    this.oauth2Client.setCredentials({
      access_token: decryptToken(account.access_token_encrypted),
      refresh_token: account.refresh_token_encrypted
        ? decryptToken(account.refresh_token_encrypted)
        : undefined,
      expiry_date: account.token_expires_at
        ? new Date(account.token_expires_at).getTime()
        : undefined,
    })
    // Auto-refresh handler — update encrypted tokens in DB
    this.oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        await supabaseAdmin
          .from('connected_accounts')
          .update({
            access_token_encrypted: encryptToken(tokens.access_token),
            token_expires_at: tokens.expiry_date
              ? new Date(tokens.expiry_date).toISOString()
              : null,
          })
          .eq('id', account.id)
      }
    })
  }

  getGmail(): gmail_v1.Gmail {
    return google.gmail({ version: 'v1', auth: this.oauth2Client })
  }

  async listThreads(params: {
    maxResults?: number
    pageToken?: string
    labelIds?: string[]
    q?: string
  }): Promise<{ threads: gmail_v1.Schema$Thread[]; nextPageToken: string | null }> {
    const gmail = this.getGmail()
    const response = await gmail.users.threads.list({
      userId: 'me',
      maxResults: params.maxResults ?? 100,
      pageToken: params.pageToken,
      labelIds: params.labelIds,
      q: params.q,
    })

    return {
      threads: response.data.threads ?? [],
      nextPageToken: response.data.nextPageToken ?? null,
    }
  }

  async getThread(threadId: string): Promise<gmail_v1.Schema$Thread> {
    const gmail = this.getGmail()
    const response = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full',
    })
    return response.data
  }

  async getProfile(): Promise<{ emailAddress: string; historyId: string }> {
    const gmail = this.getGmail()
    const response = await gmail.users.getProfile({ userId: 'me' })
    return {
      emailAddress: response.data.emailAddress ?? '',
      historyId: response.data.historyId ?? '0',
    }
  }

  async getHistory(startHistoryId: string): Promise<{
    history: gmail_v1.Schema$History[]
    historyId: string
  }> {
    const gmail = this.getGmail()
    try {
      const response = await gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'],
      })
      return {
        history: response.data.history ?? [],
        historyId: response.data.historyId ?? startHistoryId,
      }
    } catch (err: unknown) {
      // 404 means history ID is too old — full re-sync needed
      if ((err as { code?: number }).code === 404) {
        return { history: [], historyId: startHistoryId }
      }
      throw err
    }
  }

  async watchInbox(topicName: string): Promise<{ historyId: string; expiration: string }> {
    const gmail = this.getGmail()
    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName,
        labelIds: ['INBOX'],
      },
    })
    return {
      historyId: response.data.historyId ?? '0',
      expiration: response.data.expiration ?? '',
    }
  }

  async sendMessage(raw: string): Promise<gmail_v1.Schema$Message> {
    const gmail = this.getGmail()
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    })
    return response.data
  }
}

export async function getGmailClientForAccount(
  accountId: string
): Promise<GmailClient | null> {
  const { data, error } = await supabaseAdmin
    .from('connected_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return new GmailClient(data as ConnectedAccount)
}
