import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { envInt } from "@/lib/security/env";

type MemoryEntry = { count: number; resetAt: number };

const memoryStores = new Map<string, Map<string, MemoryEntry>>();

function memoryLimit(
  storeKey: string,
  identifier: string,
  max: number,
  windowMs: number,
): { success: boolean; remaining: number } {
  let store = memoryStores.get(storeKey);
  if (!store) {
    store = new Map();
    memoryStores.set(storeKey, store);
  }
  const now = Date.now();
  const entry = store.get(identifier);
  if (!entry || now > entry.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: max - 1 };
  }
  if (entry.count >= max) {
    return { success: false, remaining: 0 };
  }
  entry.count += 1;
  return { success: true, remaining: max - entry.count };
}

let redisClient: Redis | null = null;
const ratelimiters = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!redisClient) {
    redisClient = new Redis({ url, token });
  }
  return redisClient;
}

function getLimiter(
  name: string,
  max: number,
  windowSec: number,
): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const key = `${name}:${max}:${windowSec}`;
  let lim = ratelimiters.get(key);
  if (!lim) {
    lim = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, `${windowSec} s`),
      prefix: `rl:${name}`,
    });
    ratelimiters.set(key, lim);
  }
  return lim;
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Sliding window rate limit per identifier. Uses Upstash when configured; otherwise in-memory fallback.
 */
export async function rateLimit(
  routeKey: string,
  identifier: string,
  defaults: { max: number; windowSec: number },
): Promise<RateLimitResult> {
  const max = envInt(`RATE_LIMIT_${routeKey}_MAX`, defaults.max);
  const windowSec = envInt(`RATE_LIMIT_${routeKey}_WINDOW_SEC`, defaults.windowSec);
  const windowMs = windowSec * 1000;

  const limiter = getLimiter(routeKey, max, windowSec);
  if (limiter) {
    const res = await limiter.limit(identifier);
    return {
      ok: res.success,
      limit: res.limit,
      remaining: res.remaining,
      reset: res.reset,
    };
  }

  const mem = memoryLimit(routeKey, identifier, max, windowMs);
  const now = Date.now();
  return {
    ok: mem.success,
    limit: max,
    remaining: mem.remaining,
    reset: now + windowMs,
  };
}
