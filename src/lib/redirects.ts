// Open-redirect guard for post-auth navigation targets.
//
// `/auth/callback` reads `next` from the query string and redirects to
// `${origin}${next}` after a successful session exchange. Without
// validation, `next=.evil.com` produces `https://yoursite.example.evil.com`
// (origin has no trailing slash) and `next=//evil.com` is protocol-relative
// — both attacker-controlled hosts, chainable with session fixation.

const DEFAULT_NEXT = "/admin";

/**
 * Returns `value` only when it is a same-origin absolute path: starts with
 * exactly one `/` (rejecting protocol-relative `//host` and backslash
 * variants like `/\evil.com`, which browsers normalize to `//`). Anything
 * else falls back to `/admin`.
 */
export function sanitizeNextPath(value: string | null): string {
  if (value && /^\/(?![/\\])/.test(value)) {
    return value;
  }
  return DEFAULT_NEXT;
}
