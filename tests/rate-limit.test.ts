import { describe, expect, it } from 'vitest'
import { createRateLimiter } from '@/lib/rate-limit'

/** Manual clock, so the window can be advanced without waiting. */
function clock(start = 1_000_000) {
  let current = start
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms
    },
  }
}

describe('createRateLimiter', () => {
  it('allows requests up to the limit and then blocks', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 3, now: clock().now })

    expect(limiter.check('user-a')).toMatchObject({ allowed: true, remaining: 2 })
    expect(limiter.check('user-a')).toMatchObject({ allowed: true, remaining: 1 })
    expect(limiter.check('user-a')).toMatchObject({ allowed: true, remaining: 0 })

    const blocked = limiter.check('user-a')
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  it('tracks each key independently', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1, now: clock().now })

    expect(limiter.check('user-a').allowed).toBe(true)
    expect(limiter.check('user-b').allowed).toBe(true)
    expect(limiter.check('user-a').allowed).toBe(false)
    expect(limiter.check('user-b').allowed).toBe(false)
  })

  it('resets once the window has elapsed', () => {
    const time = clock()
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 2, now: time.now })

    limiter.check('user-a')
    limiter.check('user-a')
    expect(limiter.check('user-a').allowed).toBe(false)

    time.advance(59_999)
    expect(limiter.check('user-a').allowed).toBe(false)

    time.advance(1)
    expect(limiter.check('user-a')).toMatchObject({ allowed: true, remaining: 1 })
  })

  it('reports retryAfter in whole seconds, never below one', () => {
    const time = clock()
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1, now: time.now })

    limiter.check('user-a')
    expect(limiter.check('user-a').retryAfter).toBe(60)

    time.advance(59_500)
    expect(limiter.check('user-a').retryAfter).toBe(1)
  })

  it('sweep drops only expired buckets', () => {
    const time = clock()
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5, now: time.now })

    limiter.check('old-user')
    time.advance(60_000)
    limiter.check('fresh-user')

    expect(limiter.size).toBe(2)
    limiter.sweep()
    expect(limiter.size).toBe(1)
  })
})
