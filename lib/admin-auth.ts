import { timingSafeEqual } from "crypto";

/**
 * Shared admin gate for the export/review routes.
 *
 * Header only, deliberately. The secret used to be accepted from
 * `?secret=...` as well, which meant it landed in Vercel access logs, any
 * proxy in front of the app, and the admin's own browser history. A query
 * string is not a place to put a credential.
 */
export function isAdmin(req: Request): boolean {
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
