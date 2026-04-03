interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key)
    }
  }, 5 * 60 * 1000)
}

interface RateLimitOptions {
  /** Maximum requests in the window */
  limit: number
  /** Window duration in seconds */
  windowSeconds: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const windowMs = options.windowSeconds * 1000

  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: options.limit - 1, resetAt: now + windowMs }
  }

  entry.count++

  if (entry.count > options.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return {
    allowed: true,
    remaining: options.limit - entry.count,
    resetAt: entry.resetAt,
  }
}

/** Convenience: rate limit by Clerk user ID — 60 req/min by default */
export function rateLimitUser(
  userId: string,
  route: string,
  opts: RateLimitOptions = { limit: 60, windowSeconds: 60 }
): RateLimitResult {
  return rateLimit(`${userId}:${route}`, opts)
}
