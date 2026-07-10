type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

/**
 * In-memory sliding-window rate limiter.
 * Fine for a single Vercel instance / local. Fail-open if something goes weird.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSec: number } {
  try {
    const now = Date.now();
    const bucket = buckets.get(key) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

    if (bucket.timestamps.length >= limit) {
      const oldest = bucket.timestamps[0] ?? now;
      const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
      buckets.set(key, bucket);
      return { ok: false, retryAfterSec };
    }

    bucket.timestamps.push(now);
    buckets.set(key, bucket);
    return { ok: true, retryAfterSec: 0 };
  } catch {
    return { ok: true, retryAfterSec: 0 };
  }
}
