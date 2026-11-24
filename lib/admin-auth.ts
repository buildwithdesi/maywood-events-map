import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import { rateLimit, rateLimitPeek } from "@/lib/rate-limit";

/**
 * Shared admin gate for the export/review routes.
 *
 * Header only, deliberately. The secret used to be accepted from
 * `?secret=...` as well, which meant it landed in Vercel access logs, any
 * proxy in front of the app, and the admin's own browser history. A query
 * string is not a place to put a credential.
 */
function isAdmin(req: Request): boolean {
  const expected = process.env.ADMIN_EXPORT_SECRET;
  if (!expected) return false;

  const provided = req.headers.get("x-admin-secret") || bearer(req);
  if (!provided) return false;

  return safeEqual(provided, expected);
}

function bearer(req: Request): string {
  const header = req.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : "";
}

/**
 * Constant-time comparison. `===` on strings bails at the first differing
 * byte, so its runtime leaks how much of a guess was correct.
 * timingSafeEqual needs equal-length buffers, so hash both sides to a fixed
 * width first rather than returning early on a length mismatch (returning
 * early would leak the secret's length).
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Still burn a comparison so the length check itself is not a fast path.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/** Responses that carry admin data or PII must never be cached by a proxy or the browser. */
export const NO_STORE = { "Cache-Control": "no-store" } as const;

const FAIL_LIMIT = 10;
const FAIL_WINDOW_MS = 15 * 60_000;

/**
 * Address used for the failure bucket. Only headers the platform sets itself
 * are trusted: x-vercel-forwarded-for, then x-real-ip. x-forwarded-for is never
 * used because a caller can write to it. No usable address means the shared
 * "unknown" bucket, which is separate from every real IP.
 */
function failureBucketKey(req: Request): string {
  const vercel = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  const real = req.headers.get("x-real-ip")?.trim();
  return `admin-fail:${vercel || real || "unknown"}`;
}

/** Brute force is only infeasible if the secret is long and random. */
export const MIN_SECRET_LENGTH = 32;
let warnedShortSecret = false;

/**
 * Admin gate with brute-force throttling. Returns a Response to send back when
 * the request must stop, or null when the caller is the admin.
 *
 * - A request with the CORRECT secret always gets through, even when its bucket
 *   is locked, so a stranger sharing the admin's address (or the "unknown"
 *   bucket) can never lock the real admin out.
 * - Wrong guesses count against the bucket. After 10 in 15 minutes, further
 *   wrong guesses get 429 + Retry-After.
 * - Assumes ADMIN_EXPORT_SECRET is at least MIN_SECRET_LENGTH random characters.
 */
export function requireAdmin(req: Request): NextResponse | null {
  const expected = process.env.ADMIN_EXPORT_SECRET;
  if (expected && expected.length < MIN_SECRET_LENGTH && !warnedShortSecret) {
    warnedShortSecret = true;
    console.warn(
      `ADMIN_EXPORT_SECRET is shorter than ${MIN_SECRET_LENGTH} characters. Rotate it to a long random value.`
    );
  }

  if (isAdmin(req)) return null;

  const failKey = failureBucketKey(req);
  const lock = rateLimitPeek(failKey, FAIL_LIMIT, FAIL_WINDOW_MS);
  if (lock.blocked) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(lock.retryAfterSec) } }
    );
  }

  rateLimit(failKey, FAIL_LIMIT, FAIL_WINDOW_MS);
  return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
}
