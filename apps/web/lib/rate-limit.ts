type RateLimitWindow = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitWindow>;

declare global {
  var __snookerRateLimitStore: RateLimitStore | undefined;
}

function getStore() {
  if (!globalThis.__snookerRateLimitStore) {
    globalThis.__snookerRateLimitStore = new Map();
  }

  return globalThis.__snookerRateLimitStore;
}

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

export function consumeRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const store = getStore();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const nextWindow = { count: 1, resetAt: now + windowMs };
    store.set(key, nextWindow);
    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      resetAt: nextWindow.resetAt,
    };
  }

  existing.count += 1;
  store.set(key, existing);

  return {
    allowed: existing.count <= limit,
    remaining: Math.max(limit - existing.count, 0),
    resetAt: existing.resetAt,
  };
}
