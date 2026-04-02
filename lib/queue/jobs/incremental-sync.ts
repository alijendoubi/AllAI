import { supabaseAdmin } from '@/lib/db'
import { GmailClient } from '@/lib/gmail/client'
import { syncThread, updateAccountHistoryId } from '@/lib/gmail/sync'
import { aiProcessingQueue } from '@/lib/queue'
import type { ConnectedAccount } from '@/types'

export interface IncrementalSyncJobData {
  connectedAccountId: string
  userId: string
  historyId: string
}

export async function processIncrementalSync(data: IncrementalSyncJobData): Promise<void> {
  const { connectedAccountId, userId, historyId } = data

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

  const { history, historyId: newHistoryId } = await client.getHistory(
    connectedAccount.history_id ?? historyId
  )

  if (history.length === 0) {
    await updateAccountHistoryId(connectedAccountId, newHistoryId)
    return
  }

  // Collect unique thread IDs from history
  const threadIds = new Set<string>()
  for (const record of history) {
    for (const msg of record.messages ?? []) {
      if (msg.threadId) threadIds.add(msg.threadId)
    }
    for (const msg of record.messagesAdded ?? []) {
      if (msg.message?.threadId) threadIds.add(msg.message.threadId)
    }
  }

  for (const threadId of threadIds) {
    const internalThreadId = await syncThread(client, connectedAccount, userId, threadId)
    if (internalThreadId) {
      await aiProcessingQueue.add(
        'process-thread',
        { threadId: internalThreadId, userId },
        { jobId: `ai-${internalThreadId}-${Date.now()}` }
      )
    }
  }

  await updateAccountHistoryId(connectedAccountId, newHistoryId)
  console.log(
    `Incremental sync complete for account ${connectedAccountId}: ${threadIds.size} threads updated`
  )
}
