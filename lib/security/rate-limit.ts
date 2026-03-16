const GLOBAL_RATE_LIMIT_KEY = "__whoisfree_rate_limit_store__"

type RateEntry = {
  count: number
  resetAt: number
}

type RateLimitStore = Map<string, RateEntry>

const getStore = (): RateLimitStore => {
  const globalWithStore = globalThis as typeof globalThis & {
    [GLOBAL_RATE_LIMIT_KEY]?: RateLimitStore
  }

  if (!globalWithStore[GLOBAL_RATE_LIMIT_KEY]) {
    globalWithStore[GLOBAL_RATE_LIMIT_KEY] = new Map<string, RateEntry>()
  }

  return globalWithStore[GLOBAL_RATE_LIMIT_KEY]
}

interface RateLimitOptions {
  key: string
  limit: number
  windowMs: number
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now()
  const store = getStore()

  for (const [entryKey, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(entryKey)
    }
  }

  const existing = store.get(key)

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, existing.resetAt - now),
    }
  }

  existing.count += 1
  store.set(key, existing)

  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
  }
}
