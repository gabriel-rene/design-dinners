# Otros eventos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public, admin-moderated list of community design events at `/otros-eventos`, with a send form, a landing teaser, admin review, and an approval email.

**Architecture:** Same shape as La Vitrina: Supabase tables + private/public buckets, service-role-only access from Next.js server code, two-step signed upload. The image upload/publish code in `src/lib/vitrina/db.ts` moves to a shared `src/lib/storage/` module so both features use one copy. Public reads go through a view that hides private columns and past events.

**Tech Stack:** Next.js 16 (App Router, server actions, `after()`), React 19, Tailwind v4, Supabase (Postgres + Storage, `@supabase/supabase-js`), sharp, Vitest, Resend REST (existing `sendEmail`).

**Spec:** `docs/specs/2026-10-14-otros-eventos-design.md` — read it before any task.

## Global Constraints

- Work only in the worktree `~/dev/design-dinners/site-otros-eventos` (branch `feat/otros-eventos`). Never edit `~/dev/design-dinners/site` or the iCloud copy.
- Read `AGENTS.md`: this Next.js version differs from training data. Check `node_modules/next/dist/docs/` before using a Next API you are unsure of.
- All UI copy is Spanish (Puerto Rico). Required fields marked with a red `*` (`<span aria-hidden="true" className="text-dd-red">*</span>`), as on `/vitrina/enviar`.
- Time zone is `America/Puerto_Rico` (UTC−4 all year, no DST).
- Buckets: `otros-eventos-pending` (private), `otros-eventos` (public). 4.5 MB = 4,718,592 bytes. Mime allowlist `image/jpeg`, `image/png`, `image/webp`.
- Rate limits: 3 events sent and 6 uploads per IP hash per 24 h.
- `submitter_email` and `ip_hash` never reach a public page. Log errors only with `logSafe` (code + message).
- External links: `target="_blank" rel="noopener noreferrer nofollow ugc"`.
- Unit tests: `npm test`. Supabase integration tests run only against LOCAL Supabase (`http://127.0.0.1:54321`) with `node --env-file=.env.local ./node_modules/vitest/vitest.mjs run <path>`.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Never run `pkill`. Dev server for this worktree uses port 3700.

## Review Focus

1. **An event at 11:30 PM on its own day** — it must still show until midnight PR time, and `starts_at` must be stored as the next day 03:30 UTC (not shifted a day). Test in Task 3 (`toStartsAt`) and Task 2 (view keeps an event whose PR day is today even when its UTC date is tomorrow).
2. **Someone pastes a link without `https://`, or a `javascript:` link** — the first is fixed to `https://…`, the second is refused with a Spanish error. Test in Task 3.
3. **The same upload path used twice, or a path that never got a ticket** — refused with "Vuelve a subir la imagen." Test in Task 4 (`insertCommunityEvent` unique path → 23505) and the action handles 23505.
4. **Admin clicks Aprobar twice (two tabs)** — only one email, the second click says "Ese evento ya cambió." Test in Task 4 (`approveCommunityEvent` returns false on a published row).
5. **Supabase down or service key missing** — the landing still renders without the teaser; `/otros-eventos` shows the empty state, not a crash. Test in Task 8 (teaser loader returns `[]` on throw).

---

## Setup (controller does this once, before Task 1)

```bash
cd ~/dev/design-dinners/site-otros-eventos
cp ../site/.env.local .env.local
cp -c -R ../site/node_modules ./node_modules   # APFS clone; Turbopack rejects a symlink
npm test                                       # all existing unit tests pass
```

Local Supabase must be running (`supabase_db_site` container). The worktree shares it with `site/`.

---

### Task 1: Shared image storage module

Move the generic image code out of La Vitrina so Otros eventos can reuse it. La Vitrina's behavior must not change.

**Files:**
- Create: `src/lib/storage/image-rules.ts`
- Create: `src/lib/storage/images.ts`
- Create: `src/lib/storage/image-rules.test.ts`
- Modify: `src/lib/vitrina/validate.ts` (re-export the moved rules)
- Modify: `src/lib/vitrina/db.ts` (delegate to the shared module)

**Interfaces:**
- Produces (`image-rules.ts`, pure, client-safe): `MAX_IMAGE_BYTES`, `IMAGE_EXT`, `type ImageMime`, `isImageMime(v)`, `mimeForPath(path)`, `checkImageFile({type,size}): string|null`, `isPendingPath(v)`, `isImageDimension(n)`.
- Produces (`images.ts`, server-only):
  ```ts
  export type ImageStore = { pendingBucket: string; publicBucket: string; uploadsTable: string };
  export const PUBLIC_MAX_EDGE = 2560;
  export function publicImageUrl(store: ImageStore, path: string): string;
  export async function createUploadTicket(db, store, path, ipHash): Promise<{ token: string }>;
  export async function isRecordedUpload(db, store, path): Promise<boolean>;
  export async function pendingObjectInfo(db, store, path): Promise<{ size: number; mimetype: string } | null>;
  export async function encodePublicImage(input: Buffer, mime: ImageMime): Promise<{ body: Buffer; width: number; height: number }>;
  export async function publishObject(db, store, path): Promise<{ width: number; height: number } | null>;
  export async function unpublishObject(db, store, path): Promise<void>; // public → pending (old moveObject)
  export async function removeImage(db, store, path): Promise<void>;     // both buckets + uploads row
  export async function signedPendingUrls(db, store, paths: string[]): Promise<Map<string, string>>;
  ```

- [ ] **Step 1: Write the failing test** `src/lib/storage/image-rules.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { checkImageFile, isImageDimension, isPendingPath, mimeForPath } from "./image-rules";

describe("image rules", () => {
  it("accepts jpg/png/webp up to 4.5 MB", () => {
    expect(checkImageFile({ type: "image/png", size: 4_718_592 })).toBeNull();
    expect(checkImageFile({ type: "image/png", size: 4_718_593 })).toMatch(/4\.5 MB/);
    expect(checkImageFile({ type: "image/svg+xml", size: 10 })).toMatch(/JPG, PNG o WebP/);
  });
  it("maps extensions back to mime types", () => {
    expect(mimeForPath("a.jpg")).toBe("image/jpeg");
    expect(mimeForPath("a.gif")).toBeNull();
  });
  it("only accepts {uuid}.{ext} pending paths", () => {
    expect(isPendingPath("0f8fad5b-d9cb-469f-a165-70867728950e.webp")).toBe(true);
    expect(isPendingPath("../0f8fad5b-d9cb-469f-a165-70867728950e.webp")).toBe(false);
  });
  it("checks image dimensions", () => {
    expect(isImageDimension(1080)).toBe(true);
    expect(isImageDimension(0)).toBe(false);
    expect(isImageDimension(20_001)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it** — `npx vitest run src/lib/storage/image-rules.test.ts` → FAIL (module not found).

- [ ] **Step 3: Create `image-rules.ts`** by MOVING (not copying) these from `src/lib/vitrina/validate.ts`: `MAX_IMAGE_BYTES`, `IMAGE_EXT`, `ImageMime`, `isImageMime`, `mimeForPath`, `checkImageFile`, `PENDING_PATH_RE`, `isPendingPath`. Add:

```ts
/** A sane pixel size reported by the browser. */
export function isImageDimension(n: number): boolean {
  return Number.isInteger(n) && n > 0 && n <= 20_000;
}
```

Header comment: pure rules shared by La Vitrina and Otros eventos; client and server import it. Update the `MAX_IMAGE_BYTES` comment: "Must equal `file_size_limit` of every image bucket (Vitrina and Otros eventos migrations)."

In `src/lib/vitrina/validate.ts`, replace the moved code with:

```ts
export {
  IMAGE_EXT,
  MAX_IMAGE_BYTES,
  checkImageFile,
  isImageMime,
  isPendingPath,
  mimeForPath,
  type ImageMime,
} from "@/lib/storage/image-rules";
import { isImageDimension, isPendingPath } from "@/lib/storage/image-rules";
```

and make `parseWorkInput` use `isImageDimension` instead of its local `isDimension` (delete `isDimension`).

- [ ] **Step 4: Create `images.ts`** by MOVING from `src/lib/vitrina/db.ts`: `objectExists`, `moveObject` (rename to internal), `encodePublicImage`, `publishObject`, the upload-ticket / `isRecordedUpload` / `pendingObjectInfo` code, the signed-URL block from `listWorksByStatus`, and the constants `SIGNED_URL_SECONDS`, `PUBLIC_MAX_EDGE`, `PUBLIC_CACHE_SECONDS`. Replace every hard-coded `PENDING_BUCKET` / `PUBLIC_BUCKET` / `"vitrina_uploads"` with `store.pendingBucket` / `store.publicBucket` / `store.uploadsTable`. Start the file with `import "server-only";`. New helpers:

```ts
/** Public → private bucket (used when an admin hides a published item). */
export async function unpublishObject(db: SupabaseClient, store: ImageStore, path: string): Promise<void> {
  await moveObject(db, store.publicBucket, store.pendingBucket, path);
}

/** Removes the image from both buckets and its upload ticket. Throws on any failure. */
export async function removeImage(db: SupabaseClient, store: ImageStore, path: string): Promise<void> {
  for (const bucket of [store.pendingBucket, store.publicBucket]) {
    const { error } = await db.storage.from(bucket).remove([path]);
    if (error) throw error;
  }
  const { error } = await db.from(store.uploadsTable).delete().eq("path", path);
  if (error) throw error;
}

export async function signedPendingUrls(
  db: SupabaseClient,
  store: ImageStore,
  paths: string[],
): Promise<Map<string, string>> {
  const signed = new Map<string, string>();
  if (paths.length === 0) return signed;
  const { data, error } = await db.storage.from(store.pendingBucket).createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) throw error;
  for (const item of data ?? []) if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl);
  return signed;
}
```

- [ ] **Step 5: Make `src/lib/vitrina/db.ts` delegate.** Keep every exported name and signature it has today (`PENDING_BUCKET`, `PUBLIC_BUCKET`, `PUBLIC_MAX_EDGE`, `publicImageUrl(path)`, `createUploadTicket(db, path, ipHash)`, `isRecordedUpload(db, path)`, `pendingObjectInfo(db, path)`, `encodePublicImage`, `approveWork`, `hideWork`, `deleteWork`, …) so no caller or test changes. Add:

```ts
const STORE: ImageStore = { pendingBucket: PENDING_BUCKET, publicBucket: PUBLIC_BUCKET, uploadsTable: "vitrina_uploads" };
export const publicImageUrl = (path: string) => sharedPublicImageUrl(STORE, path);
export const createUploadTicket = (db: SupabaseClient, path: string, ipHash: string | null) =>
  sharedCreateUploadTicket(db, STORE, path, ipHash);
// … same one-liners for isRecordedUpload, pendingObjectInfo; re-export encodePublicImage and PUBLIC_MAX_EDGE.
```

`approveWork` calls `publishObject(db, STORE, row.image_path)`; `hideWork` calls `unpublishObject(db, STORE, …)`; `deleteWork` calls `removeImage(db, STORE, row.image_path)` then deletes the row (keep its order: images first, then row; the upload-ticket delete now happens inside `removeImage`, before the row delete — that is fine). `listWorksByStatus` uses `signedPendingUrls`.

- [ ] **Step 6: Run all tests**

```bash
npm test
node --env-file=.env.local ./node_modules/vitest/vitest.mjs run src/lib/vitrina src/lib/storage
npx tsc --noEmit && npm run lint
```

Expected: all PASS, including the existing Vitrina unit and local-Supabase integration tests, unchanged.

- [ ] **Step 7: Commit** — `git add src/lib/storage src/lib/vitrina && git commit -m "Share image upload and publish code between features"`

---

### Task 2: Database migration

**Files:**
- Create: `supabase/migrations/20261014000000_otros_eventos.sql`
- Create: `src/lib/otros-eventos/schema.int.test.ts`

**Interfaces:**
- Produces tables `community_events`, `community_event_uploads`; view `community_events_public`; buckets `otros-eventos-pending`, `otros-eventos`.

- [ ] **Step 1: Write the migration**

```sql
-- Otros eventos: community design events (spec: docs/specs/2026-10-14-otros-eventos-design.md).
-- Deny by default, like La Vitrina: only the service role reads or writes,
-- after the app's own validation, rate limits, and requireAdmin() checks.

create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending', 'published', 'rejected')),
  title text not null check (char_length(title) between 1 and 100),
  starts_at timestamptz not null,
  venue text not null check (char_length(venue) between 1 and 120),
  link text not null check (char_length(link) <= 300 and link ~* '^https?://'),
  description text check (description is null or char_length(description) <= 300),
  organizer text check (organizer is null or char_length(organizer) between 1 and 120),
  price text check (price in ('free', 'paid')),
  submitter_email text not null check (char_length(submitter_email) between 3 and 254),
  image_path text not null,
  image_width integer not null check (image_width > 0),
  image_height integer not null check (image_height > 0),
  ip_hash text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  published_at timestamptz,
  constraint community_events_published_at check (status <> 'published' or published_at is not null)
);

create unique index if not exists community_events_image_path_uidx on public.community_events (image_path);
create index if not exists community_events_list_idx on public.community_events (status, starts_at);
create index if not exists community_events_ip_idx on public.community_events (ip_hash, created_at);

create table if not exists public.community_event_uploads (
  path text primary key,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists community_event_uploads_ip_idx on public.community_event_uploads (ip_hash, created_at);

alter table public.community_events enable row level security;
alter table public.community_event_uploads enable row level security;

-- Published events whose Puerto Rico day has not ended. No private columns.
create or replace view public.community_events_public
with (security_invoker = true) as
select id, title, starts_at, venue, link, description, organizer, price,
       image_path, image_width, image_height, published_at
from public.community_events
where status = 'published'
  and (starts_at at time zone 'America/Puerto_Rico')::date
      >= (now() at time zone 'America/Puerto_Rico')::date;

revoke all on public.community_events, public.community_event_uploads, public.community_events_public
  from anon, authenticated;
grant all on public.community_events, public.community_event_uploads to service_role;
grant select on public.community_events_public to service_role;

-- 4718592 bytes = 4.5 MB. Keep in sync with MAX_IMAGE_BYTES in src/lib/storage/image-rules.ts.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('otros-eventos-pending', 'otros-eventos-pending', false, 4718592, array['image/jpeg', 'image/png', 'image/webp']),
  ('otros-eventos', 'otros-eventos', true, 4718592, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
```

- [ ] **Step 2: Apply it locally** — `cd ~/dev/design-dinners/site-otros-eventos && npx supabase migration up --local` (if the CLI asks for a project, use `supabase migration up --db-url postgresql://postgres:postgres@127.0.0.1:55322/postgres`). Expected: the new migration applies with no error.

- [ ] **Step 3: Write `schema.int.test.ts`** — copy the setup block of `src/lib/vitrina/schema.int.test.ts` (local-only guard, `service`, `anon` clients, `stamp`). Helper `makeEvent(overrides)` inserts a valid row (`title: \`${stamp} evento\``, `venue: "Morena Coffee"`, `link: "https://example.com"`, `submitter_email: "ana@ejemplo.com"`, `image_path: \`${randomUUID()}.png\``, `image_width: 1080`, `image_height: 1350`, `starts_at` = tomorrow). `afterAll` deletes rows whose title starts with `stamp`. Tests:

```ts
it("gives anon nothing", async () => {
  for (const table of ["community_events", "community_event_uploads", "community_events_public"]) {
    const { data, error } = await anon.from(table).select("*").limit(1);
    expect(error ?? data?.length === 0).toBeTruthy();
    expect(data ?? []).toHaveLength(0);
  }
  const { data } = await anon.storage.from("otros-eventos-pending").list();
  expect(data ?? []).toHaveLength(0);
});

it("public view hides pending, rejected and past events", async () => {
  const now = new Date().toISOString();
  const live = await makeEvent({ status: "published", published_at: now });
  const pending = await makeEvent();
  const rejected = await makeEvent({ status: "rejected" });
  const past = await makeEvent({ status: "published", published_at: now,
    starts_at: new Date(Date.now() - 3 * 864e5).toISOString() });
  const { data } = await service.from("community_events_public").select("id").like("title", `${stamp}%`);
  const ids = (data ?? []).map((r) => r.id);
  expect(ids).toContain(live);
  expect(ids).not.toContain(pending);
  expect(ids).not.toContain(rejected);
  expect(ids).not.toContain(past);
});

it("keeps an event for its whole Puerto Rico day", async () => {
  // 23:59 PR today = 03:59 UTC tomorrow.
  const prToday = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Puerto_Rico" }).format(new Date());
  const lateTonight = new Date(`${prToday}T23:59:00-04:00`).toISOString();
  const earlyToday = new Date(`${prToday}T00:30:00-04:00`).toISOString();
  const now = new Date().toISOString();
  const late = await makeEvent({ status: "published", published_at: now, starts_at: lateTonight });
  const early = await makeEvent({ status: "published", published_at: now, starts_at: earlyToday });
  const { data } = await service.from("community_events_public").select("id").in("id", [late, early]);
  expect((data ?? []).map((r) => r.id).sort()).toEqual([late, early].sort());
});

it("never exposes submitter_email or ip_hash", async () => {
  await makeEvent({ status: "published", published_at: new Date().toISOString() });
  const { error } = await service.from("community_events_public").select("submitter_email").limit(1);
  expect(error).not.toBeNull();
  const { error: ipError } = await service.from("community_events_public").select("ip_hash").limit(1);
  expect(ipError).not.toBeNull();
});

it("rejects non-web links and published rows without published_at", async () => {
  await expect(makeEvent({ link: "javascript:alert(1)" })).rejects.toBeTruthy();
  await expect(makeEvent({ status: "published" })).rejects.toBeTruthy();
});
```

- [ ] **Step 4: Run** — `node --env-file=.env.local ./node_modules/vitest/vitest.mjs run src/lib/otros-eventos/schema.int.test.ts` → PASS. Add `"test:otros-eventos-db": "node --env-file=.env.local ./node_modules/vitest/vitest.mjs run src/lib/otros-eventos"` to `package.json` scripts.

- [ ] **Step 5: Commit** — `git add supabase/migrations src/lib/otros-eventos package.json && git commit -m "Otros eventos: tables, public view, buckets"`

---

### Task 3: Field rules (pure)

**Files:**
- Create: `src/lib/otros-eventos/validate.ts`
- Create: `src/lib/otros-eventos/validate.test.ts`

**Interfaces:**
- Consumes: `EMAIL_RE` from `@/lib/rsvp`; `isPendingPath`, `isImageDimension` from `@/lib/storage/image-rules`.
- Produces:
  ```ts
  export type Price = "free" | "paid";
  export const PRICE_LABEL: Record<Price, string>; // { free: "Gratis", paid: "Pago" }
  export const LIMITS = { title: 100, venue: 120, organizer: 120, description: 300, email: 254, link: 300 } as const;
  export const EVENTS_PER_DAY = 3;
  export const UPLOADS_PER_DAY = 6;
  export const MAX_DAYS_AHEAD = 365;
  export function prToday(now?: Date): string;                 // "YYYY-MM-DD" in PR
  export function toStartsAt(date: string, time: string): string | null; // ISO UTC, or null if malformed
  export function normalizeEventLink(raw: string): string | null;
  export type EventFields = { title: string; startsAt: string; venue: string; link: string;
    description: string | null; organizer: string | null; price: Price | null; email: string };
  export type EventFieldErrors = Partial<Record<"title"|"date"|"time"|"venue"|"link"|"description"|"organizer"|"price"|"email"|"permission"|"image", string>>;
  export type RawEvent = Record<"title"|"date"|"time"|"venue"|"link"|"description"|"organizer"|"price"|"email"|"permission"|"imagePath"|"imageWidth"|"imageHeight", unknown>;
  export function parseEventFields(raw: Partial<RawEvent>, now?: Date): { ok: true; value: EventFields } | { ok: false; errors: EventFieldErrors };
  export type EventInput = EventFields & { imagePath: string; imageWidth: number; imageHeight: number };
  export function parseEventInput(raw: Partial<RawEvent>, now?: Date): { ok: true; value: EventInput } | { ok: false; errors: EventFieldErrors };
  export function eventRawFromFormData(fd: FormData): Partial<RawEvent>;
  ```

- [ ] **Step 1: Write the failing tests** `validate.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { normalizeEventLink, parseEventFields, parseEventInput, prToday, toStartsAt } from "./validate";

const NOW = new Date("2026-10-14T16:00:00Z"); // 12:00 PM in PR
const good = {
  title: "  Charla de tipografía  ", date: "2026-10-20", time: "19:00", venue: "Morena Coffee, Santurce",
  link: "eventbrite.com/e/123", description: "", organizer: "", price: "", email: "ana@ejemplo.com", permission: "on",
};

describe("toStartsAt", () => {
  it("reads date + time as Puerto Rico time", () => {
    expect(toStartsAt("2026-10-20", "19:00")).toBe("2026-10-20T23:00:00.000Z");
  });
  it("keeps 23:30 on the same PR day (next day in UTC)", () => {
    expect(toStartsAt("2026-10-20", "23:30")).toBe("2026-10-21T03:30:00.000Z");
  });
  it("refuses malformed or impossible values", () => {
    expect(toStartsAt("2026-02-30", "19:00")).toBeNull();
    expect(toStartsAt("2026-10-20", "25:00")).toBeNull();
    expect(toStartsAt("20-10-2026", "19:00")).toBeNull();
  });
});

describe("prToday", () => {
  it("uses the PR calendar day", () => {
    expect(prToday(new Date("2026-10-15T02:00:00Z"))).toBe("2026-10-14"); // 10 PM in PR
  });
});

describe("normalizeEventLink", () => {
  it("adds https:// when missing", () => {
    expect(normalizeEventLink("eventbrite.com/e/123")).toBe("https://eventbrite.com/e/123");
  });
  it("refuses non-web schemes, credentials and bare words", () => {
    expect(normalizeEventLink("javascript:alert(1)")).toBeNull();
    expect(normalizeEventLink("https://instagram.com@evil.com")).toBeNull();
    expect(normalizeEventLink("hola")).toBeNull();
  });
});

describe("parseEventFields", () => {
  it("accepts a good event and trims text", () => {
    const result = parseEventFields(good, NOW);
    expect(result).toEqual({
      ok: true,
      value: {
        title: "Charla de tipografía", startsAt: "2026-10-20T23:00:00.000Z", venue: "Morena Coffee, Santurce",
        link: "https://eventbrite.com/e/123", description: null, organizer: null, price: null, email: "ana@ejemplo.com",
      },
    });
  });
  it("requires the fields and the permission box", () => {
    const result = parseEventFields({}, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        ["date", "email", "link", "permission", "time", "title", "venue"].sort(),
      );
    }
  });
  it("allows today but not yesterday, and not more than 365 days ahead", () => {
    expect(parseEventFields({ ...good, date: "2026-10-14", time: "08:00" }, NOW).ok).toBe(true);
    const past = parseEventFields({ ...good, date: "2026-10-13" }, NOW);
    expect(!past.ok && past.errors.date).toMatch(/ya pasó/);
    const far = parseEventFields({ ...good, date: "2027-10-15" }, NOW);
    expect(!far.ok && far.errors.date).toMatch(/un año/);
  });
  it("only takes free / paid / nothing for price", () => {
    expect(parseEventFields({ ...good, price: "free" }, NOW)).toMatchObject({ ok: true, value: { price: "free" } });
    expect(parseEventFields({ ...good, price: "gratis" }, NOW).ok).toBe(false);
  });
  it("enforces lengths", () => {
    const result = parseEventFields({ ...good, title: "x".repeat(101), description: "y".repeat(301) }, NOW);
    expect(!result.ok && result.errors.title).toBeTruthy();
    expect(!result.ok && result.errors.description).toBeTruthy();
  });
});

describe("parseEventInput", () => {
  it("needs a valid uploaded image", () => {
    const bad = parseEventInput({ ...good, imagePath: "x.png", imageWidth: "1080", imageHeight: "1350" }, NOW);
    expect(!bad.ok && bad.errors.image).toBe("Vuelve a subir la imagen.");
    const ok = parseEventInput(
      { ...good, imagePath: "0f8fad5b-d9cb-469f-a165-70867728950e.png", imageWidth: "1080", imageHeight: "1350" },
      NOW,
    );
    expect(ok).toMatchObject({ ok: true, value: { imageWidth: 1080, imageHeight: 1350 } });
  });
});
```

- [ ] **Step 2: Run** — `npx vitest run src/lib/otros-eventos/validate.test.ts` → FAIL.

- [ ] **Step 3: Implement `validate.ts`**

```ts
// Pure Otros eventos rules — no network, no Next, no Node built-ins. The send
// form (client) and the server actions both import this file, so their checks
// never drift apart.
import { isImageDimension, isPendingPath } from "@/lib/storage/image-rules";
import { EMAIL_RE } from "@/lib/rsvp";

export type Price = "free" | "paid";
export const PRICES: Price[] = ["free", "paid"];
export const PRICE_LABEL: Record<Price, string> = { free: "Gratis", paid: "Pago" };

export const LIMITS = { title: 100, venue: 120, organizer: 120, description: 300, email: 254, link: 300 } as const;
export const EVENTS_PER_DAY = 3;
export const UPLOADS_PER_DAY = 6;
export const MAX_DAYS_AHEAD = 365;

const TIME_ZONE = "America/Puerto_Rico";
/** Puerto Rico is UTC−4 all year (no daylight saving time). */
const PR_OFFSET = "-04:00";
const DAY_MS = 864e5;

const prDay = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });

/** Today's date in Puerto Rico, "YYYY-MM-DD". */
export function prToday(now: Date = new Date()): string {
  return prDay.format(now);
}

/** A PR date + "HH:MM" as an ISO UTC instant, or null when it is not a real date/time. */
export function toStartsAt(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const instant = new Date(`${date}T${time}:00${PR_OFFSET}`);
  if (Number.isNaN(instant.getTime())) return null;
  // "2026-02-30" rolls over to March: the PR day must read back the same.
  if (prDay.format(instant) !== date) return null;
  return instant.toISOString();
}

/** http(s) URL, "https://" added when missing; null when it cannot be a safe web link. */
export function normalizeEventLink(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (!url.hostname.includes(".")) return null;
  const normalized = url.toString();
  return normalized.length > LIMITS.link ? null : normalized;
}

export type EventFields = {
  title: string;
  startsAt: string;
  venue: string;
  link: string;
  description: string | null;
  organizer: string | null;
  price: Price | null;
  email: string;
};

export type EventFieldErrors = Partial<
  Record<"title" | "date" | "time" | "venue" | "link" | "description" | "organizer" | "price" | "email" | "permission" | "image", string>
>;

export type RawEvent = Record<
  "title" | "date" | "time" | "venue" | "link" | "description" | "organizer" | "price" | "email" | "permission" | "imagePath" | "imageWidth" | "imageHeight",
  unknown
>;

const oneLine = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ");

export function parseEventFields(
  raw: Partial<RawEvent>,
  now: Date = new Date(),
): { ok: true; value: EventFields } | { ok: false; errors: EventFieldErrors } {
  const errors: EventFieldErrors = {};
  const title = oneLine(raw.title);
  const date = String(raw.date ?? "").trim();
  const time = String(raw.time ?? "").trim();
  const venue = oneLine(raw.venue);
  const linkText = String(raw.link ?? "").trim();
  const description = String(raw.description ?? "").replace(/\r\n?/g, "\n").trim();
  const organizer = oneLine(raw.organizer);
  const priceText = String(raw.price ?? "");
  const email = String(raw.email ?? "").trim();

  if (!title) errors.title = "Escribe el nombre del evento.";
  else if (title.length > LIMITS.title) errors.title = "Usa 100 letras o menos.";

  if (!date) errors.date = "Elige la fecha.";
  if (!time) errors.time = "Elige la hora.";
  let startsAt: string | null = null;
  if (date && time) {
    startsAt = toStartsAt(date, time);
    if (!startsAt) errors.date = "Esa fecha u hora no es válida.";
    else {
      const today = prToday(now);
      const last = prToday(new Date(now.getTime() + MAX_DAYS_AHEAD * DAY_MS));
      if (date < today) errors.date = "Esa fecha ya pasó.";
      else if (date > last) errors.date = "Solo aceptamos eventos de aquí a un año.";
    }
  }

  if (!venue) errors.venue = "Escribe dónde es.";
  else if (venue.length > LIMITS.venue) errors.venue = "Usa 120 letras o menos.";

  const link = normalizeEventLink(linkText);
  if (!linkText) errors.link = "Añade el enlace del evento.";
  else if (!link) errors.link = "Revisa el enlace. Debe ser una dirección web, como https://eventbrite.com/…";

  if (description.length > LIMITS.description) errors.description = "Usa 300 letras o menos.";
  if (organizer.length > LIMITS.organizer) errors.organizer = "Usa 120 letras o menos.";

  let price: Price | null = null;
  if (priceText) {
    if ((PRICES as string[]).includes(priceText)) price = priceText as Price;
    else errors.price = "Elige una opción.";
  }

  if (!email) errors.email = "Escribe tu correo.";
  else if (email.length > LIMITS.email || !EMAIL_RE.test(email)) {
    errors.email = "A ese correo le falta algo. Revisa que termine en algo como .com";
  }

  if (raw.permission !== true && raw.permission !== "on") {
    errors.permission = "Confirma que tienes permiso para compartirlo.";
  }

  if (Object.keys(errors).length > 0 || !startsAt || !link) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title, startsAt, venue, link,
      description: description || null,
      organizer: organizer || null,
      price, email,
    },
  };
}

export type EventInput = EventFields & { imagePath: string; imageWidth: number; imageHeight: number };

/** Server-side: the fields plus the already-uploaded poster. */
export function parseEventInput(
  raw: Partial<RawEvent>,
  now: Date = new Date(),
): { ok: true; value: EventInput } | { ok: false; errors: EventFieldErrors } {
  const fields = parseEventFields(raw, now);
  const errors: EventFieldErrors = fields.ok ? {} : { ...fields.errors };
  const imagePath = String(raw.imagePath ?? "");
  const imageWidth = Number(raw.imageWidth);
  const imageHeight = Number(raw.imageHeight);
  if (!isPendingPath(imagePath) || !isImageDimension(imageWidth) || !isImageDimension(imageHeight)) {
    errors.image = "Vuelve a subir la imagen.";
  }
  if (!fields.ok || errors.image) return { ok: false, errors };
  return { ok: true, value: { ...fields.value, imagePath, imageWidth, imageHeight } };
}

export function eventRawFromFormData(fd: FormData): Partial<RawEvent> {
  const keys = ["title", "date", "time", "venue", "link", "description", "organizer", "price", "email", "permission",
    "imagePath", "imageWidth", "imageHeight"] as const;
  return Object.fromEntries(keys.map((key) => [key, fd.get(key)]));
}
```

Note the test "requires the fields" expects exactly `date, email, link, permission, time, title, venue` — `price`, `organizer`, `description` are optional and must not appear.

- [ ] **Step 4: Run** — `npx vitest run src/lib/otros-eventos/validate.test.ts` → PASS.
- [ ] **Step 5: Commit** — `git commit -am` is not enough for new files: `git add src/lib/otros-eventos && git commit -m "Otros eventos: field rules"`

---

### Task 4: Data access

**Files:**
- Create: `src/lib/otros-eventos/types.ts`
- Create: `src/lib/otros-eventos/db.ts`
- Create: `src/lib/otros-eventos/db.int.test.ts`

**Interfaces:**
- Consumes: Task 1 `images.ts`; Task 3 `EventInput`, `Price`.
- Produces:
  ```ts
  // types.ts
  export type CommunityEventStatus = "pending" | "published" | "rejected";
  export type PublicCommunityEvent = { id: string; title: string; startsAt: string; venue: string; link: string;
    description: string | null; organizer: string | null; price: Price | null;
    imageUrl: string; imageWidth: number; imageHeight: number };
  export type AdminCommunityEvent = Omit<PublicCommunityEvent, "imageUrl"> & { status: CommunityEventStatus;
    submitterEmail: string; imageUrl: string | null; createdAt: string; reviewedAt: string | null; publishedAt: string | null };
  // db.ts (server-only)
  export const EVENT_STORE: ImageStore; // { pendingBucket: "otros-eventos-pending", publicBucket: "otros-eventos", uploadsTable: "community_event_uploads" }
  export function eventImageUrl(path: string): string;
  export async function listUpcomingEvents(db, limit?: number): Promise<PublicCommunityEvent[]>; // default 60
  export const countRecentEventUploads: (db, ipHash) => Promise<number>;
  export const countRecentEventSubmissions: (db, ipHash) => Promise<number>;
  export const createEventUploadTicket: (db, path, ipHash) => Promise<{ token: string }>;
  export const isRecordedEventUpload: (db, path) => Promise<boolean>;
  export const pendingEventObjectInfo: (db, path) => Promise<{ size: number; mimetype: string } | null>;
  export async function insertCommunityEvent(db, input: EventInput, ipHash: string | null): Promise<string>;
  export async function listCommunityEventsByStatus(db, status): Promise<AdminCommunityEvent[]>;
  export async function countPendingEvents(db): Promise<number>;
  /** Returns the approved row's email data, or null when nothing changed. */
  export async function approveCommunityEvent(db, id): Promise<{ email: string; title: string; startsAt: string } | null>;
  export async function rejectCommunityEvent(db, id): Promise<boolean>;  // pending → rejected
  export async function hideCommunityEvent(db, id): Promise<boolean>;    // published → rejected, image back to private
  export async function deleteCommunityEvent(db, id): Promise<boolean>;
  ```

- [ ] **Step 1: Write `db.int.test.ts`** — same guard/setup as `src/lib/vitrina/db.int.test.ts` (local only, `stamp = \`OTROS-DB-${Date.now()}\``, the 1×1 `PNG` buffer). Helper:

```ts
async function submitted(daysAhead = 2) {
  const path = `${randomUUID()}.png`;
  await createEventUploadTicket(db, path, ipHash);
  await db.storage.from(EVENT_STORE.pendingBucket).upload(path, PNG, { contentType: "image/png" });
  const startsAt = new Date(Date.now() + daysAhead * 864e5).toISOString();
  const id = await insertCommunityEvent(db, {
    title: `${stamp} evento`, startsAt, venue: "Morena Coffee", link: "https://example.com/",
    description: null, organizer: null, price: "free", email: "ana@ejemplo.com",
    imagePath: path, imageWidth: 1, imageHeight: 1,
  }, ipHash);
  return { id, path };
}
```

`afterAll`: for every row with title like `${stamp}%`, call `deleteCommunityEvent`. Tests:

```ts
it("submit → pending, not public, counted", async () => {
  const { id } = await submitted();
  expect((await listUpcomingEvents(db)).map((e) => e.id)).not.toContain(id);
  expect(await countPendingEvents(db)).toBeGreaterThan(0);
  expect(await countRecentEventSubmissions(db, ipHash)).toBeGreaterThan(0);
});

it("approve publishes once, moves the image, returns email data", async () => {
  const { id, path } = await submitted();
  const first = await approveCommunityEvent(db, id);
  expect(first).toMatchObject({ email: "ana@ejemplo.com", title: `${stamp} evento` });
  expect(await approveCommunityEvent(db, id)).toBeNull(); // second click: nothing, no second email
  const upcoming = await listUpcomingEvents(db);
  const shown = upcoming.find((e) => e.id === id);
  expect(shown?.imageUrl).toContain(`/otros-eventos/${path}`);
  expect(JSON.stringify(shown)).not.toContain("ana@ejemplo.com");
});

it("lists upcoming soonest first", async () => {
  const later = await submitted(9);
  const sooner = await submitted(3);
  await approveCommunityEvent(db, later.id);
  await approveCommunityEvent(db, sooner.id);
  const ids = (await listUpcomingEvents(db)).map((e) => e.id);
  expect(ids.indexOf(sooner.id)).toBeLessThan(ids.indexOf(later.id));
});

it("reject only from pending; hide sends it back; delete removes it", async () => {
  const { id } = await submitted();
  expect(await rejectCommunityEvent(db, id)).toBe(true);
  expect(await rejectCommunityEvent(db, id)).toBe(false);
  expect(await approveCommunityEvent(db, id)).not.toBeNull(); // rejected → published is allowed
  expect(await hideCommunityEvent(db, id)).toBe(true);
  expect((await listUpcomingEvents(db)).map((e) => e.id)).not.toContain(id);
  const rejected = await listCommunityEventsByStatus(db, "rejected");
  expect(rejected.find((e) => e.id === id)?.imageUrl).toContain("token="); // signed private URL
  expect(await deleteCommunityEvent(db, id)).toBe(true);
  expect(await deleteCommunityEvent(db, id)).toBe(false);
});

it("refuses a reused upload path", async () => {
  const { path } = await submitted();
  await expect(insertCommunityEvent(db, {
    title: `${stamp} dup`, startsAt: new Date(Date.now() + 864e5).toISOString(), venue: "x", link: "https://x.com/",
    description: null, organizer: null, price: null, email: "b@ejemplo.com", imagePath: path, imageWidth: 1, imageHeight: 1,
  }, ipHash)).rejects.toMatchObject({ code: "23505" });
});
```

- [ ] **Step 2: Run** — `npm run test:otros-eventos-db` → FAIL (module not found).

- [ ] **Step 3: Implement `types.ts`** with the types above (import `Price` from `./validate`).

- [ ] **Step 4: Implement `db.ts`**

```ts
// Server-only data access for Otros eventos. Every function takes the Supabase
// service client. Public reads go through `community_events_public` only, so
// submitter_email and ip_hash are never selected outside the admin functions.
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createUploadTicket, isRecordedUpload, pendingObjectInfo, publicImageUrl, publishObject,
  removeImage, signedPendingUrls, unpublishObject, type ImageStore,
} from "@/lib/storage/images";

import type { AdminCommunityEvent, CommunityEventStatus, PublicCommunityEvent } from "./types";
import type { EventInput, Price } from "./validate";

export const EVENT_STORE: ImageStore = {
  pendingBucket: "otros-eventos-pending",
  publicBucket: "otros-eventos",
  uploadsTable: "community_event_uploads",
};

const DAY_MS = 864e5;
const PUBLIC_COLUMNS = "id,title,starts_at,venue,link,description,organizer,price,image_path,image_width,image_height";
const ADMIN_COLUMNS = `${PUBLIC_COLUMNS},status,submitter_email,created_at,reviewed_at,published_at`;

type PublicRow = {
  id: string; title: string; starts_at: string; venue: string; link: string;
  description: string | null; organizer: string | null; price: Price | null;
  image_path: string; image_width: number; image_height: number;
};
type AdminRow = PublicRow & {
  status: CommunityEventStatus; submitter_email: string;
  created_at: string; reviewed_at: string | null; published_at: string | null;
};

export const eventImageUrl = (path: string) => publicImageUrl(EVENT_STORE, path);

function base(row: PublicRow) {
  return {
    id: row.id, title: row.title, startsAt: row.starts_at, venue: row.venue, link: row.link,
    description: row.description, organizer: row.organizer, price: row.price,
    imageWidth: row.image_width, imageHeight: row.image_height,
  };
}

// ── Public ────────────────────────────────────────────────────────────────

export async function listUpcomingEvents(db: SupabaseClient, limit = 60): Promise<PublicCommunityEvent[]> {
  const { data, error } = await db
    .from("community_events_public")
    .select(PUBLIC_COLUMNS)
    .order("starts_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as PublicRow[]).map((row) => ({ ...base(row), imageUrl: eventImageUrl(row.image_path) }));
}

// ── Rate limits + submissions ─────────────────────────────────────────────

async function countSince(db: SupabaseClient, table: string, ipHash: string): Promise<number> {
  const { count, error } = await db
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gt("created_at", new Date(Date.now() - DAY_MS).toISOString());
  if (error) throw error;
  return count ?? 0;
}

export const countRecentEventUploads = (db: SupabaseClient, ipHash: string) =>
  countSince(db, EVENT_STORE.uploadsTable, ipHash);
export const countRecentEventSubmissions = (db: SupabaseClient, ipHash: string) =>
  countSince(db, "community_events", ipHash);
export const createEventUploadTicket = (db: SupabaseClient, path: string, ipHash: string | null) =>
  createUploadTicket(db, EVENT_STORE, path, ipHash);
export const isRecordedEventUpload = (db: SupabaseClient, path: string) => isRecordedUpload(db, EVENT_STORE, path);
export const pendingEventObjectInfo = (db: SupabaseClient, path: string) => pendingObjectInfo(db, EVENT_STORE, path);

export async function insertCommunityEvent(db: SupabaseClient, input: EventInput, ipHash: string | null): Promise<string> {
  const { data, error } = await db
    .from("community_events")
    .insert({
      title: input.title, starts_at: input.startsAt, venue: input.venue, link: input.link,
      description: input.description, organizer: input.organizer, price: input.price,
      submitter_email: input.email, image_path: input.imagePath,
      image_width: input.imageWidth, image_height: input.imageHeight, ip_hash: ipHash,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

// ── Admin (call only after requireAdmin()) ────────────────────────────────

const ADMIN_ORDER: Record<CommunityEventStatus, { column: string; ascending: boolean }> = {
  pending: { column: "created_at", ascending: true },
  published: { column: "starts_at", ascending: true },
  rejected: { column: "reviewed_at", ascending: false },
};

export async function listCommunityEventsByStatus(
  db: SupabaseClient,
  status: CommunityEventStatus,
): Promise<AdminCommunityEvent[]> {
  const order = ADMIN_ORDER[status];
  const { data, error } = await db
    .from("community_events")
    .select(ADMIN_COLUMNS)
    .eq("status", status)
    .order(order.column, { ascending: order.ascending, nullsFirst: false })
    .limit(200);
  if (error) throw error;
  const rows = (data ?? []) as unknown as AdminRow[];
  const signed = await signedPendingUrls(db, EVENT_STORE, rows.filter((r) => r.status !== "published").map((r) => r.image_path));
  return rows.map((row) => ({
    ...base(row),
    status: row.status,
    submitterEmail: row.submitter_email,
    imageUrl: row.status === "published" ? eventImageUrl(row.image_path) : (signed.get(row.image_path) ?? null),
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    publishedAt: row.published_at,
  }));
}

export async function countPendingEvents(db: SupabaseClient): Promise<number> {
  const { count, error } = await db
    .from("community_events")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

async function getRow(db: SupabaseClient, id: string) {
  const { data, error } = await db
    .from("community_events")
    .select("status,image_path,submitter_email,title,starts_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as { status: CommunityEventStatus; image_path: string; submitter_email: string; title: string; starts_at: string } | null;
}

/** Updates only while the row is still in one of `expected`; false when it lost a race. */
async function transition(db: SupabaseClient, id: string, expected: CommunityEventStatus[], patch: Record<string, unknown>) {
  const { data, error } = await db.from("community_events").update(patch).eq("id", id).in("status", expected).select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function approveCommunityEvent(
  db: SupabaseClient,
  id: string,
): Promise<{ email: string; title: string; startsAt: string } | null> {
  const row = await getRow(db, id);
  if (!row || row.status === "published") return null;
  const size = await publishObject(db, EVENT_STORE, row.image_path);
  const now = new Date().toISOString();
  const changed = await transition(db, id, ["pending", "rejected"], {
    status: "published", published_at: now, reviewed_at: now,
    ...(size ? { image_width: size.width, image_height: size.height } : {}),
  });
  return changed ? { email: row.submitter_email, title: row.title, startsAt: row.starts_at } : null;
}

export async function rejectCommunityEvent(db: SupabaseClient, id: string): Promise<boolean> {
  const row = await getRow(db, id);
  if (!row || row.status !== "pending") return false;
  return transition(db, id, ["pending"], { status: "rejected", reviewed_at: new Date().toISOString() });
}

export async function hideCommunityEvent(db: SupabaseClient, id: string): Promise<boolean> {
  const row = await getRow(db, id);
  if (!row || row.status !== "published") return false;
  await unpublishObject(db, EVENT_STORE, row.image_path);
  return transition(db, id, ["published"], { status: "rejected", reviewed_at: new Date().toISOString() });
}

/** Image first (throws on failure), so a row never outlives a stranded public image. */
export async function deleteCommunityEvent(db: SupabaseClient, id: string): Promise<boolean> {
  const row = await getRow(db, id);
  if (!row) return false;
  await removeImage(db, EVENT_STORE, row.image_path);
  const { error } = await db.from("community_events").delete().eq("id", id);
  if (error) throw error;
  return true;
}
```

- [ ] **Step 5: Run** — `npm run test:otros-eventos-db && npx tsc --noEmit` → PASS.
- [ ] **Step 6: Commit** — `git add src/lib/otros-eventos && git commit -m "Otros eventos: data access"`

---

### Task 5: Approval email

**Files:**
- Modify: `src/lib/rsvp-email.ts` (export `esc` as `escapeHtml`; keep internal callers working)
- Create: `src/lib/otros-eventos/email.ts`
- Create: `src/lib/otros-eventos/email.test.ts`
- Create: `src/lib/otros-eventos/notify.ts`

**Interfaces:**
- Produces:
  ```ts
  // email.ts (pure)
  export function buildApprovalEmail(input: { title: string; startsAt: string; pageUrl: string; now?: Date }): { subject: string; html: string; text: string };
  // notify.ts (server-only, never throws)
  export async function notifyEventApproved(input: { email: string; title: string; startsAt: string }): Promise<void>;
  ```

- [ ] **Step 1: Write the failing test** `email.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { buildApprovalEmail } from "./email";

const input = {
  title: `Charla <script>alert("x")</script> & más`,
  startsAt: "2026-10-20T23:00:00.000Z",
  pageUrl: "https://designdinners.com/otros-eventos",
  now: new Date("2026-10-14T16:00:00Z"),
};

describe("buildApprovalEmail", () => {
  it("has the fixed subject", () => {
    expect(buildApprovalEmail(input).subject).toBe("¡Tu evento está en Design Dinners!");
  });
  it("escapes the title in HTML", () => {
    const { html } = buildApprovalEmail(input);
    expect(html).not.toContain("<script>");
    expect(html).toContain("Charla &lt;script&gt;");
    expect(html).toContain("&amp; más");
  });
  it("gives date, time, page link and mascot", () => {
    const { html, text } = buildApprovalEmail(input);
    expect(text).toContain("martes, 20 de octubre");
    expect(text).toMatch(/7:00\sp\.\sm\./);
    expect(text).toContain("https://designdinners.com/otros-eventos");
    expect(text).toContain("Ya aparece en Otros eventos.");
    expect(html).toContain("https://designdinners.com/brand/mascot-email.png");
    expect(html).toContain('href="https://designdinners.com/otros-eventos"');
  });
});
```

- [ ] **Step 2: Run** — `npx vitest run src/lib/otros-eventos/email.test.ts` → FAIL.

- [ ] **Step 3: In `src/lib/rsvp-email.ts`** rename `function esc` to `export function escapeHtml` and replace every `esc(` call in that file with `escapeHtml(`. Run `npx vitest run src/lib/rsvp-email.test.ts` → still PASS.

- [ ] **Step 4: Implement `email.ts`.** Visual style: reuse the RSVP email look (cream page `#f8e3ca`, black 2px borders, red header `#d21432` with cream ink, Jost/Inter font stacks, a black pill button, the mascot PNG 96 px in the header, table layout with inline styles). Copy the constants `C`, `DISPLAY`, `BODY` from `rsvp-email.ts` (they are not exported; do not export them just for this). Structure:

```ts
// Pure builder for the "your event is live" email sent when an admin approves
// a community event. Same look as the RSVP emails (tables + inline styles).
import { formatEventDate, formatEventTime } from "@/lib/format";
import { escapeHtml } from "@/lib/rsvp-email";

export type ApprovalEmailInput = { title: string; startsAt: string; pageUrl: string; now?: Date };

export function buildApprovalEmail(input: ApprovalEmailInput) {
  const title = input.title.replace(/\s+/g, " ").trim();
  const time = formatEventTime(input.startsAt);
  const when = `${formatEventDate(input.startsAt, input.now ?? new Date())} · ${time}`;
  const mascotSrc = `${new URL(input.pageUrl).origin}/brand/mascot-email.png`;
  const subject = "¡Tu evento está en Design Dinners!";
  const text = [
    "¡Tu evento está publicado!",
    "",
    title,
    when,
    "",
    "Ya aparece en Otros eventos.",
    `Míralo aquí: ${input.pageUrl}`,
    "",
    "— Design Dinners",
  ].join("\n");
  const html = /* full HTML document: preheader "Ya aparece en Otros eventos.", red header with kicker
    "Otros eventos" + title "¡Tu evento está publicado!" + mascot img (src=escapeHtml(mascotSrc), width 96, alt "Design Dinners"),
    a details block with labels "Evento" (escapeHtml(title)) and "Cuándo" (escapeHtml(when)),
    the line "Ya aparece en Otros eventos.", and a black pill button "Ver Otros eventos" with href=escapeHtml(input.pageUrl). */;
  return { subject, html, text };
}
```

Write the HTML template literal in full (model it on the `<table>` skeleton in `buildRsvpEmail`). Every interpolated value goes through `escapeHtml`.

- [ ] **Step 5: Implement `notify.ts`**

```ts
// Sends the approval email. Call inside `after()`; never throws.
import "server-only";

import { sendEmail } from "@/lib/email";
import { logSafe } from "@/lib/vitrina/log";

import { buildApprovalEmail } from "./email";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function notifyEventApproved(input: { email: string; title: string; startsAt: string }): Promise<void> {
  try {
    const message = buildApprovalEmail({ title: input.title, startsAt: input.startsAt, pageUrl: `${SITE}/otros-eventos` });
    const result = await sendEmail({ to: input.email, ...message });
    if (result === "failed") console.error("otros-eventos approval email failed");
  } catch (error) {
    logSafe("otros-eventos approval email failed", error);
  }
}
```

- [ ] **Step 6: Run** — `npm test && npx tsc --noEmit` → PASS.
- [ ] **Step 7: Commit** — `git add src/lib && git commit -m "Otros eventos: approval email"`

---

### Task 6: Send form `/otros-eventos/enviar`

**Files:**
- Create: `src/app/otros-eventos/enviar/actions.ts`
- Create: `src/app/otros-eventos/enviar/page.tsx`
- Create: `src/components/otros-eventos/SubmitEventForm.tsx`

**Interfaces:**
- Consumes: Task 3 rules, Task 4 db functions, `requestIpHash` (`@/lib/vitrina/request`), `logSafe`, `isHoneypotFilled` (`@/lib/rsvp`), `getServiceClient`/`hasServiceConfig`.
- Produces: `startEventUpload(mime: string, size: number): Promise<StartUploadResult>`, `submitCommunityEvent(prev: SubmitEventState, fd: FormData): Promise<SubmitEventState>`, where `SubmitEventState = { status: "idle" } | { status: "error"; message?: string; errors?: EventFieldErrors } | { status: "received" }`.

- [ ] **Step 1: `actions.ts`** — mirror `src/app/vitrina/enviar/actions.ts` line for line, with these swaps:
  - `UNAVAILABLE = "Otros eventos no está disponible ahora mismo. Intenta más tarde."`
  - Upload: `countRecentEventUploads` vs `UPLOADS_PER_DAY` ("Subiste muchas imágenes hoy. Intenta mañana."), `createEventUploadTicket`, `IMAGE_EXT` from `@/lib/storage/image-rules`.
  - Submit: honeypot `empresa` → `{ status: "received" }`; `parseEventInput(eventRawFromFormData(formData))`; `countRecentEventSubmissions` vs `EVENTS_PER_DAY` ("Ya enviaste 3 eventos hoy. Intenta mañana."); `isRecordedEventUpload`; `pendingEventObjectInfo` checks (size > 0, ≤ `MAX_IMAGE_BYTES`, `isImageMime`); `insertCommunityEvent`; code `23505` → `{ status: "error", errors: { image: "Vuelve a subir la imagen." } }`; other errors → `logSafe("submitCommunityEvent failed", error)` and "No pudimos enviar tu evento. Intenta de nuevo."
  - On success: `revalidatePath("/admin/otros-eventos")`, `revalidatePath("/admin", "layout")`.

- [ ] **Step 2: `SubmitEventForm.tsx`** — model on `src/components/vitrina/SubmitWorkForm.tsx` (same `ErrorText`, `describedBy`, `ensureUploaded` with the `uploaded` ref, `imageSize`, honeypot, transition). Upload goes to bucket `"otros-eventos-pending"`. Client-side check uses `parseEventFields(eventRawFromFormData(formData))`. Fields in this order (all classes from `@/components/admin/formStyles`):
  1. Afiche * — file input `name="image"`, hint "Una imagen. JPG, PNG o WebP, hasta 4.5 MB.", preview `<img>` in a 4:5 box (`aspect-[4/5] w-48 object-cover`). Missing → "Elige el afiche del evento."
  2. Nombre del evento * — `name="title"`, `maxLength={LIMITS.title}`.
  3. Fecha * (`type="date"`, `name="date"`, `min={prToday()}`) and Hora * (`type="time"`, `name="time"`) side by side on `md:`. Hint under them: "Hora de Puerto Rico."
  4. Lugar * — `name="venue"`, hint "Nombre del sitio y pueblo."
  5. Enlace * — `name="link"`, `inputMode="url"`, placeholder `https://`, hint "Eventbrite, Instagram, la página del evento…"
  6. Descripción (opcional) — textarea with `n/300` counter.
  7. Organiza (opcional) — `name="organizer"`.
  8. Costo — radio group `name="price"`: "No sé" (value `""`, default checked), "Gratis" (`free`), "Pago" (`paid`), as a `<fieldset>` with `<legend>`.
  9. Tu email * — `name="email"`, `type="email"`, hint "No se muestra. Te avisamos cuando se publique."
  10. Checkbox * `name="permission"`: "Tengo permiso para compartir este evento y su afiche."
  - Submit button: "Enviar a revisión" / "Enviando…".
  - Done state: heading "¡Gracias!", text "Revisamos cada evento antes de publicarlo. Te escribimos cuando esté en la página.", button link "Ver Otros eventos" → `/otros-eventos`.

- [ ] **Step 3: `page.tsx`** — model on `src/app/vitrina/enviar/page.tsx`. Back link "← Otros eventos" → `/otros-eventos`. H1 "Comparte un evento". Lead: "¿Organizas algo para la comunidad de diseño? Envíalo. Lo revisamos y lo publicamos con tu afiche y tu enlace." Footer: "¿Quieres quitar un evento? Escríbenos a hola@gaborene.com." with `mailto:hola@gaborene.com?subject=Quitar%20evento%20de%20Otros%20eventos`. Metadata title "Comparte un evento — Otros eventos — Design Dinners".

- [ ] **Step 4: Check** — `npx tsc --noEmit && npm run lint && npm test` → PASS. Start the dev server (`.claude/launch.json` entry "otros-eventos", port 3700 — see Task 10) and send one event through the form with a real JPG; check the row exists as `pending` in local Supabase and the file is in `otros-eventos-pending`. Also submit with empty fields and confirm every Spanish error shows next to its field.

- [ ] **Step 5: Commit** — `git add src/app/otros-eventos src/components/otros-eventos && git commit -m "Otros eventos: send form"`

---

### Task 7: Public page `/otros-eventos` + card + nav

Use the `impeccable` skill for the card and page visuals, inside the existing Design Dinners style (cream `bg-dd-cream`, black 2px borders, `font-display` Jost uppercase headings, `text-dd-red` accents, date sticker idea from `NextEvent`). Keep it consistent with `/vitrina/enviar` and the landing.

**Files:**
- Create: `src/components/otros-eventos/CommunityEventCard.tsx`
- Create: `src/app/otros-eventos/page.tsx`
- Modify: `src/components/landing/Hero.tsx` (nav link)

**Interfaces:**
- Consumes: `PublicCommunityEvent`, `listUpcomingEvents`, `PRICE_LABEL`, `formatDateParts`, `formatEventTime`.
- Produces: `CommunityEventCard({ event, compact?: boolean })` — `compact` is used by the landing teaser (Task 8).

- [ ] **Step 1: `CommunityEventCard.tsx`** (server component). The whole card is one `<a href={event.link} target="_blank" rel="noopener noreferrer nofollow ugc">`. Inside: poster `<img>` in `aspect-[4/5] object-cover` box with `alt=""` (title is in text); date sticker (weekday/day/month from `formatDateParts(event.startsAt)`); time `formatEventTime`; `<h3>` title; venue; organizer as "Organiza {organizer}" when set; a "Gratis"/"Pago" chip when `price` is set; description `line-clamp-3` (hidden when `compact`); an external-link icon (inline SVG, `aria-hidden`). Add `<span className="sr-only"> (abre en otra pestaña)</span>` at the end of the link text. Visible focus ring (`focus-visible:outline-3 focus-visible:outline-dd-yellow`).

- [ ] **Step 2: `page.tsx`**

```tsx
export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Otros eventos — Design Dinners",
  description: "Eventos de diseño en Puerto Rico organizados por la comunidad.",
};

async function loadEvents(): Promise<PublicCommunityEvent[]> {
  if (!hasServiceConfig) return [];
  try {
    return await listUpcomingEvents(getServiceClient());
  } catch (error) {
    logSafe("otros-eventos page failed", error);
    return [];
  }
}
```

Layout: back link "← Design Dinners" → `/`; H1 "Otros eventos"; line "Eventos de diseño en Puerto Rico organizados por la comunidad."; button "Enviar un evento" → `/otros-eventos/enviar`; grid `grid gap-6 sm:grid-cols-2 lg:grid-cols-3` of `CommunityEventCard`. Empty: "No hay eventos de la comunidad por ahora. ¿Organizas uno?" + the same button.

- [ ] **Step 3: `Hero.tsx`** — add a `<Link href="/otros-eventos">Eventos</Link>` right after the "Vitrina" link, same className.

- [ ] **Step 4: Check** — tsc + lint + tests PASS. In the browser at 375 px and 1280 px: approve the Task 6 event via SQL (`update community_events set status='published', published_at=now() where …` — and move the file with the admin later; for now the image may 404, that is fine) or wait for Task 9. Confirm empty state renders when nothing is published.

- [ ] **Step 5: Commit** — `git add src/app/otros-eventos src/components && git commit -m "Otros eventos: public page and nav link"`

---

### Task 8: Landing teaser

**Files:**
- Create: `src/components/landing/OtrosEventosTeaser.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `CommunityEventCard` (compact), `listUpcomingEvents(db, 3)`.

- [ ] **Step 1: `OtrosEventosTeaser.tsx`** — `export default function OtrosEventosTeaser({ events }: { events: PublicCommunityEvent[] })`. Returns `null` when `events.length === 0`. Otherwise a `<section id="otros-eventos" aria-labelledby="otros-eventos-titulo">` with heading "Otros eventos", line "Lo que se está cocinando en la comunidad.", a grid of up to 3 compact cards, and a link "Ver todos los eventos" → `/otros-eventos`. Design with `impeccable`, matching the section rhythm of the landing (full-width band, `border-b-2 border-dd-black`).

- [ ] **Step 2: `page.tsx`** — add a loader next to `getVitrinaPreview`:

```ts
/** Next community events for the teaser. The landing never fails over it. */
async function getOtrosEventosPreview(): Promise<PublicCommunityEvent[]> {
  if (!hasServiceConfig) return [];
  try {
    return await listUpcomingEvents(getServiceClient(), 3);
  } catch (error) {
    console.error("Otros eventos preview failed", error);
    return [];
  }
}
```

Add it to the `Promise.all`, render `<OtrosEventosTeaser events={otrosEventos} />` right after `<VitrinaTeaser … />`, and change `export const revalidate = 86400;` to `3600`. Update the comment above it: hourly so a past community event (and a past Design Dinners event) leaves the page within an hour.

- [ ] **Step 3: Write a unit test for the loader's fallback.** Move `getOtrosEventosPreview` into `src/lib/otros-eventos/preview.ts` as `export async function loadEventsPreview(load: () => Promise<PublicCommunityEvent[]>): Promise<PublicCommunityEvent[]>` (try `load()`, on throw `console.error("Otros eventos preview failed", safeError(error))` and return `[]`), and call it from `page.tsx` with `() => listUpcomingEvents(getServiceClient(), 3)` after the `hasServiceConfig` check. Test `preview.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { loadEventsPreview } from "./preview";

describe("loadEventsPreview", () => {
  it("returns [] when the query throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await loadEventsPreview(async () => { throw new Error("down"); })).toEqual([]);
  });
});
```

Then: tsc + lint + `npm test` PASS. With no published events, the landing has no "Otros eventos" section (check in the browser). Do NOT stop local Supabase (it is shared with other worktrees).

- [ ] **Step 4: Commit** — `git add src && git commit -m "Otros eventos: landing teaser, hourly landing refresh"`

---

### Task 9: Admin review `/admin/otros-eventos`

**Files:**
- Create: `src/app/admin/(panel)/otros-eventos/actions.ts`
- Create: `src/app/admin/(panel)/otros-eventos/page.tsx`
- Create: `src/components/admin/CommunityEventReviewCard.tsx`
- Modify: `src/components/admin/AdminNav.tsx`
- Modify: `src/app/admin/(panel)/layout.tsx`

**Interfaces:**
- Consumes: Task 4 admin functions, Task 5 `notifyEventApproved`.
- Produces: `approveEventAction`, `rejectEventAction`, `hideEventAction`, `deleteEventAction` — each `(id: string, _state: FormState, _formData: FormData) => Promise<FormState>`.

- [ ] **Step 1: `actions.ts`** — mirror `src/app/admin/(panel)/vitrina/actions.ts` (`apply` helper with `requireAdmin()`, `isUuid`, `logSafe`). Messages: not a uuid → "No encontramos ese evento."; transition false/null → "Ese evento ya cambió. Recarga la página."; throw → "No pudimos guardar el cambio. Intenta de nuevo." Revalidate `/admin/otros-eventos`, `/admin` (layout), `/otros-eventos`, `/`. Approve is special:

```ts
export async function approveEventAction(id: string, _state: FormState, _formData: FormData): Promise<FormState> {
  await requireAdmin();
  if (!isUuid(id)) return { error: "No encontramos ese evento." };
  let approved: Awaited<ReturnType<typeof approveCommunityEvent>>;
  try {
    approved = await approveCommunityEvent(getServiceClient(), id);
  } catch (error) {
    logSafe("otros-eventos approve failed", error);
    return { error: "No pudimos guardar el cambio. Intenta de nuevo." };
  }
  if (!approved) return { error: "Ese evento ya cambió. Recarga la página." };
  const mail = approved;
  after(() => notifyEventApproved(mail));
  revalidateAll();
  return {};
}
```

(`after` from `next/server`; `revalidateAll()` is the shared revalidate block.)

- [ ] **Step 2: `CommunityEventReviewCard.tsx`** — model on `VitrinaReviewCard.tsx`. Show poster (or "Imagen no disponible"), title, a "Pasó" chip when the PR day of `startsAt` is before `prToday()`, when (`formatEventDate` + `formatEventTime`), venue, organizer, price label, link (clickable, `nofollow ugc`), description (`whitespace-pre-line`), sender email as `mailto:`, "Enviado {date}" and "Publicado {date}". Buttons: pending → Aprobar + Rechazar; published → Ocultar; rejected → Aprobar (label "Publicar"); always Eliminar with confirm "¿Eliminar este evento y su afiche? No se puede deshacer."

- [ ] **Step 3: `page.tsx`** — copy `src/app/admin/(panel)/vitrina/page.tsx` with: heading "Otros eventos", tabs base href `/admin/otros-eventos`, empty texts "No hay eventos esperando revisión." / "No hay eventos publicados." / "No hay eventos rechazados.", data from `listCommunityEventsByStatus`.

- [ ] **Step 4: Nav count.** In `layout.tsx`, fetch `countPendingEvents` next to `countPending` (same `.catch(() => 0)`) and pass `eventsPending`. In `AdminNav.tsx`, add `{ href: "/admin/otros-eventos", label: "Otros eventos" }` to `sections`, accept `eventsPending = 0`, and generalize the badge: build `const pendingBy: Record<string, number> = { "/admin/vitrina": vitrinaPending, "/admin/otros-eventos": eventsPending };` and render the yellow count for any section where `pendingBy[section.href] > 0`.

- [ ] **Step 5: Check** — tsc + lint + tests PASS. In the browser (admin login works on local — magic link via local Inbucket at `http://127.0.0.1:54324`): the Task 6 event shows in Pendientes with its poster; Aprobar → it moves to Publicados, appears on `/otros-eventos` and on the landing; Ocultar → gone from both; Eliminar → gone. Nav shows the pending count. The dev server log shows `sendEmail skipped: RESEND_API_KEY is not set` on approve (proves `after()` ran) unless `.env.local` has the key — if it does, the email goes to the test address you used; use `rodz.gabriel+ddtest@gmail.com`.

- [ ] **Step 6: Commit** — `git add src && git commit -m "Otros eventos: admin review and nav count"`

---

### Task 10: End-to-end browser check and PR (controller)

- [ ] **Step 1:** Add to the iCloud folder's `.claude/launch.json` (cwd must be relative there; use `bash -c`):

```json
{ "name": "otros-eventos", "runtimeExecutable": "bash", "runtimeArgs": ["-c", "cd ~/dev/design-dinners/site-otros-eventos && PORT=3700 NEXT_PUBLIC_SITE_URL=http://localhost:3700 npx next dev -p 3700"], "port": 3700 }
```

- [ ] **Step 2:** Full flow in the browser at 375 px and 1280 px: send → not public → approve → on page + landing → hide → gone → delete. An event at 23:30 today still shows. Screenshots of the page, the teaser, the form, and the admin.
- [ ] **Step 3:** `npm test && npm run test:otros-eventos-db && npm run test:vitrina-db && npx tsc --noEmit && npm run lint && npm run build` → all PASS.
- [ ] **Step 4:** Whole-branch review (superpowers:requesting-code-review), fix findings.
- [ ] **Step 5:** Push and open the PR (body ends with the Claude Code line). The PR body lists the post-merge step: apply `20261014000000_otros_eventos.sql` to cloud Supabase with `supabase db push --db-url "$SB_POSTGRES_URL_NON_POOLING"` BEFORE or right at merge, since the landing teaser query fails (and is caught) until the view exists.
