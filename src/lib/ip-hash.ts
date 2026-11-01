// Server-only IP helpers shared by RSVPs and La Vitrina. Kept apart from the pure modules so client components never pull node:crypto into the browser bundle.
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

/** Production without `RSVP_IP_SALT` silently disables the RSVP and Vitrina per-IP rate limits.
 *  Say so once per server instance. Never logs the salt or any IP. */
export function warnIfRateLimitDisabled(salt: string | undefined): void {
  if (warnedNoSalt || salt || process.env.NODE_ENV !== "production") return;
  warnedNoSalt = true;
  console.warn("RSVP_IP_SALT is not set: the RSVP and Vitrina rate limits are disabled.");
}

/** The rate-limit bucket for an IP. IPv4 as is; IPv6 by its /64 prefix,
 *  since one home or phone usually gets a whole /64 and can rotate freely
 *  inside it. IPv4-mapped IPv6 ("::ffff:1.2.3.4") counts as the IPv4. */
export function ipBucket(ip: string): string {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) return mapped[1];
  if (!ip.includes(":")) return ip;
  const [head, tail = ""] = ip.toLowerCase().split("::");
  const left = head ? head.split(":") : [];
  const right = ip.includes("::") && tail ? tail.split(":") : [];
  const groups = ip.includes("::")
    ? [...left, ...Array(Math.max(8 - left.length - right.length, 0)).fill("0"), ...right]
    : left;
  return `${groups
    .slice(0, 4)
    .map((g) => g.replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}

/** Salted SHA-256 of the IP's bucket, so the raw IP is never stored. */
export function hashIp(ip: string | null, salt: string | undefined): string | null {
  if (!ip || !salt) return null;
  return createHash("sha256").update(`${salt}:${ipBucket(ip)}`).digest("hex");
}
