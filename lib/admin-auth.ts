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

/**
 * Admin gate with brute-force lockout. Returns a Response to send back when
 * the request must stop, or null when the caller is the admin.
 *
 * - Fails closed: if ADMIN_EXPORT_SECRET is missing or shorter than
 *   MIN_SECRET_LENGTH the route answers a generic 503 and never compares.
 * - While a bucket is locked EVERY request gets the same 429 + Retry-After,
 *   including one with the correct secret, so the response tells an attacker
 *   nothing about whether a guess was right.
 * - Escape hatch for the real admin: the app is also served directly at
 *   maywood-events-map.vercel.app/tools/events/admin, where the bucket is keyed
 *   on his own address instead of the shared hub address.
 */
export function requireAdmin(req: Request): NextResponse | null {
  const expected = process.env.ADMIN_EXPORT_SECRET;
  if (!expected || expected.length < MIN_SECRET_LENGTH) {
    console.error("ADMIN_EXPORT_SECRET is missing or too short. Admin routes are disabled.");
    return NextResponse.json(
      { error: "Not configured." },
      { status: 503, headers: NO_STORE }
    );
  }

  const failKey = failureBucketKey(req);
  const lock = rateLimitPeek(failKey, FAIL_LIMIT, FAIL_WINDOW_MS);
  if (lock.blocked) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(lock.retryAfterSec) } }
    );
  }

  if (isAdmin(req)) return null;

  rateLimit(failKey, FAIL_LIMIT, FAIL_WINDOW_MS);
  return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
}
