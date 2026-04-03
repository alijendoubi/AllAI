import { Worker } from 'bullmq'
import { processInitialSync } from '@/lib/queue/jobs/initial-sync'
import { processIncrementalSync } from '@/lib/queue/jobs/incremental-sync'
import { redisConnection } from '@/lib/queue'

type JobData =
  | { connectedAccountId: string; userId: string; historyId?: string }

export function createIngestionWorker() {
  return new Worker<JobData>(
    'ingestion',
    async (job) => {
      const jobId = job.id ?? 'unknown'
      const jobName = job.name

      try {
        if (jobName === 'initial-sync') {
          await processInitialSync({
            connectedAccountId: job.data.connectedAccountId,
            userId: job.data.userId,
          })
        } else if (jobName === 'incremental-sync') {
          await processIncrementalSync({
            connectedAccountId: job.data.connectedAccountId,
            userId: job.data.userId,
            historyId: job.data.historyId ?? '0',
          })
        } else {
          console.warn(`[ingestion-worker:${jobId}] Unknown job name: ${jobName}`)
        }
      } catch (err) {
        console.error(`[ingestion-worker:${jobId}] Error in job ${jobName}:`, err)
        throw err
      }
    },
    {
      connection: redisConnection(),
      concurrency: 5,
    }
  )
}
