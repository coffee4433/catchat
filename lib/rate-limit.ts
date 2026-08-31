/**
 * Fixed-window rate limiter kept in process memory.
 *
 * It is per server instance, so it is a guard against a single abusive client
 * rather than a global quota. Swap the store for Redis/Upstash if the app is
 * ever deployed to more than one instance and the limit has to be exact.
 */
export type RateLimitResult = { allowed: boolean; remaining: number; retryAfter: number }

export type RateLimiterOptions = {
  /** Window length in milliseconds. */
  windowMs: number
  /** Requests allowed per key within a window. */
  maxRequests: number
  /** Injectable clock, so tests don't have to wait in real time. */
  now?: () => number
}

export function createRateLimiter({ windowMs, maxRequests, now = Date.now }: RateLimiterOptions) {
  const buckets = new Map<string, { count: number; resetAt: number }>()

  function check(key: string): RateLimitResult {
    const timestamp = now()
    const bucket = buckets.get(key)

    if (!bucket || timestamp >= bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: timestamp + windowMs })
      return { allowed: true, remaining: maxRequests - 1, retryAfter: 0 }
    }

    if (bucket.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.max(1, Math.ceil((bucket.resetAt - timestamp) / 1000)),
      }
    }

    bucket.count += 1
    return { allowed: true, remaining: maxRequests - bucket.count, retryAfter: 0 }
  }

  /** Drops expired buckets so the map can't grow without bound. */
  function sweep() {
    const timestamp = now()
    for (const [key, bucket] of buckets) {
      if (timestamp >= bucket.resetAt) buckets.delete(key)
    }
  }

  return { check, sweep, get size() { return buckets.size } }
}
