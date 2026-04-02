import { supabaseAdmin } from '@/lib/db'
import { GmailClient } from '@/lib/gmail/client'
import { syncThread, markInitialSyncComplete, updateAccountHistoryId } from '@/lib/gmail/sync'
import { aiProcessingQueue } from '@/lib/queue'
import type { ConnectedAccount } from '@/types'

export interface InitialSyncJobData {
  connectedAccountId: string
  userId: string
}

export async function processInitialSync(data: InitialSyncJobData): Promise<void> {
  const { connectedAccountId, userId } = data

  const { data: account, error } = await supabaseAdmin
    .from('connected_accounts')
    .select('*')
    .eq('id', connectedAccountId)
    .single()

  if (error || !account) {
    throw new Error(`Connected account ${connectedAccountId} not found`)
  }

  const connectedAccount = account as ConnectedAccount
  const client = new GmailClient(connectedAccount)

  // 90 days ago
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 90)
  const cutoffUnix = Math.floor(cutoffDate.getTime() / 1000)

  let pageToken: string | undefined
  let processedCount = 0
  let latestHistoryId = connectedAccount.history_id ?? '0'

  do {
    const { threads, nextPageToken } = await client.listThreads({
      maxResults: 100,
      pageToken,
      labelIds: ['INBOX'],
      q: `after:${cutoffUnix}`,
    })

    for (const gmailThread of threads) {
      if (!gmailThread.id) continue

      const threadId = await syncThread(client, connectedAccount, userId, gmailThread.id)

      if (threadId) {
        await aiProcessingQueue.add(
          'process-thread',
          { threadId, userId },
          { jobId: `ai-${threadId}` }
        )
        processedCount++
      }

      // Small delay to respect Gmail API rate limits
      if (processedCount % 40 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    // Update history ID progressively
    if (threads.length > 0) {
      const profile = await client.getProfile()
      latestHistoryId = profile.historyId
      await updateAccountHistoryId(connectedAccountId, latestHistoryId)
    }

    pageToken = nextPageToken ?? undefined
  } while (pageToken)

  await markInitialSyncComplete(connectedAccountId)

  console.log(
    `Initial sync complete for account ${connectedAccountId}: ${processedCount} threads processed`
  )
}
