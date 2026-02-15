const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000");
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "60");
const store = new Map<string, number[]>();

export { maxRequests };

export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const windowStart = now - windowMs;

  let timestamps = store.get(identifier) || [];

  // Remove expired timestamps
  timestamps = timestamps.filter((t) => t > windowStart);

  const remaining = Math.max(0, maxRequests - timestamps.length);
  const allowed = timestamps.length < maxRequests;

  if (allowed) {
    timestamps.push(now);
  }

  store.set(identifier, timestamps);

  return {
    allowed,
    remaining: allowed ? remaining - 1 : 0,
    resetAt: Math.ceil((windowStart + windowMs) / 1000),
  };
}

// Cleanup stale entries every 5 minutes
if (typeof globalThis !== "undefined") {
  const cleanupKey = "__rateLimitCleanupInitialized";
  const g = globalThis as unknown as Record<string, boolean>;
  if (!g[cleanupKey]) {
    g[cleanupKey] = true;
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamps] of store.entries()) {
        const valid = timestamps.filter((t) => t > now - windowMs);
        if (valid.length === 0) store.delete(key);
        else store.set(key, valid);
      }
    }, 5 * 60 * 1000).unref?.();
  }
}
