// Server-only RSVP helpers. Kept apart from rsvp.ts so client components that
// import the pure logic never pull node:crypto into the browser bundle.
import "server-only";

import { createHash } from "node:crypto";

const LOOPBACK = new Set(["::1", "127.0.0.1", "::ffff:127.0.0.1"]);

/** First hop of `x-forwarded-for` (set by Vercel). Loopback is never a real
 *  visitor (Next dev sends `::1`), so it counts as no IP: no rate limit. */
export function clientIpFrom(forwardedFor: string | null): string | null {
  const first = forwardedFor?.split(",")[0]?.trim();
  if (!first || LOOPBACK.has(first)) return null;
  return first;
}

let warnedNoSalt = false;

/** Production without `RSVP_IP_SALT` silently disables the per-IP rate limit.
 *  Say so once per server instance. Never logs the salt or any IP. */
export function warnIfRateLimitDisabled(salt: string | undefined): void {
  if (warnedNoSalt || salt || process.env.NODE_ENV !== "production") return;
  warnedNoSalt = true;
  console.warn("RSVP_IP_SALT is not set: the RSVP rate limit is disabled.");
}

/** Salted SHA-256 so the raw IP is never stored. */
export function hashIp(ip: string | null, salt: string | undefined): string | null {
  if (!ip || !salt) return null;
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
