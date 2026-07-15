import type { BrowserContext } from "@playwright/test";

// Failure-safe removal of rows the admin e2e creates. Runs in a `finally`, so
// it must work even when the test died mid-flow: instead of driving the (maybe
// broken) UI, it calls Supabase REST directly, authenticated as the logged-in
// admin by lifting the access token out of the browser session cookie. RLS
// still enforces `is_admin()` — no service-role key anywhere, and the anon key
// used as `apikey` is the public client key the browser already ships with
// (read from env; required — see below).

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `cleanup: ${name} is not set. Set it in the e2e environment (e.g. from ` +
        "`supabase start` output or .env.local) before running the e2e suite.",
    );
  }
  return value;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** Reassemble the @supabase/ssr auth cookie (possibly chunked as `.0`, `.1`, …)
 *  and pull the admin access token out of it. Returns null when no session
 *  cookie exists (login never completed → nothing was created anyway). */
async function adminAccessToken(context: BrowserContext): Promise<string | null> {
  const cookies = await context.cookies();
  const chunks = cookies
    .filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  if (chunks.length === 0) return null;

  let raw = chunks.map((c) => c.value).join("");
  if (raw.startsWith("base64-")) {
    raw = Buffer.from(raw.slice("base64-".length), "base64").toString("utf8");
  } else {
    raw = decodeURIComponent(raw);
  }

  try {
    const session = JSON.parse(raw) as { access_token?: string };
    return session.access_token ?? null;
  } catch {
    return null;
  }
}

async function restDelete(token: string, table: string, filter: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`cleanup: DELETE ${table}?${filter} -> ${res.status}`);
  }
}

/**
 * Deletes every row whose title/name starts with the test marker (`E2E <stamp>`),
 * restoring the seeded baseline that the landing spec's exact-count assertions
 * depend on. Safe to call unconditionally: no session → no-op.
 */
export async function cleanupTestRows(
  context: BrowserContext,
  stamp: string | number,
): Promise<void> {
  const token = await adminAccessToken(context);
  if (!token) return;

  // PostgREST `like` uses `*` as the wildcard; the pattern is URL-encoded.
  const pattern = encodeURIComponent(`E2E*${stamp}*`);
  // Events first: their event_speakers join rows cascade away with them.
  await restDelete(token, "events", `title=like.${pattern}`);
  await restDelete(token, "speakers", `name=like.${pattern}`);
  await restDelete(token, "resources", `title=like.${pattern}`);
}
