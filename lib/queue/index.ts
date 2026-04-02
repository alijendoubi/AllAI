import { Queue } from 'bullmq'
import { Redis } from 'ioredis'

let connection: Redis | null = null

function getRedisConnection(): Redis {
  if (!connection) {
    connection = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
    connection.on('error', (err) => {
      console.error('Redis connection error:', err)
    })
  }
  return connection
}

export const ingestionQueue = new Queue('ingestion', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
})

export const aiProcessingQueue = new Queue('ai-processing', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
})

export { getRedisConnection as redisConnection }
