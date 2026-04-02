import { createIngestionWorker } from '@/lib/queue/workers/ingestion.worker'
import { createAiProcessingWorker } from '@/lib/queue/workers/ai-processing.worker'

console.log('Starting InboxPilot workers...')

const ingestionWorker = createIngestionWorker()
const aiProcessingWorker = createAiProcessingWorker()

ingestionWorker.on('completed', (job) => {
  console.log(`[ingestion] Job ${job.id} (${job.name}) completed`)
})

ingestionWorker.on('failed', (job, err) => {
  console.error(`[ingestion] Job ${job?.id} (${job?.name}) failed:`, err)
})

aiProcessingWorker.on('completed', (job) => {
  console.log(`[ai-processing] Job ${job.id} completed for thread ${job.data.threadId}`)
})

aiProcessingWorker.on('failed', (job, err) => {
  console.error(`[ai-processing] Job ${job?.id} failed:`, err)
})

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down workers...')
  await Promise.all([
    ingestionWorker.close(),
    aiProcessingWorker.close(),
  ])
  console.log('Workers stopped')
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

console.log('Workers started:')
console.log('  - ingestion (concurrency: 5)')
console.log('  - ai-processing (concurrency: 3)')
