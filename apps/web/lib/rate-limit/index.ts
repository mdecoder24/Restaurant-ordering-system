import "server-only";

/**
 * Fixed-window rate limiter held in process memory (Architecture §12: order placement,
 * PIN attempts). Good for a single Node instance; swap the store for Redis/Upstash when
 * running more than one instance (docs/decisions.md, T05).
 */
type Window = { count: number; resetAt: number };
const store = new Map<string, Window>();
let lastSweep = Date.now();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    for (const [k, w] of store) if (w.resetAt <= now) store.delete(k);
    lastSweep = now;
  }
  const w = store.get(key);
  if (!w || w.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (w.count >= limit) return { ok: false, retryAfterSeconds: Math.ceil((w.resetAt - now) / 1000) };
  w.count += 1;
  return { ok: true };
}

/** Best-effort client IP behind Vercel/proxies; used only as a rate-limit key. */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
