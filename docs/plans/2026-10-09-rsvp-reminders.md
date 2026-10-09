# RSVP Reminders + Self-Cancel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guests get a day-before and a day-of reminder email automatically, every RSVP email carries a "liberar mi puesto" button that leads to a cancel page, a freed seat goes to the first waitlisted guest, and every email shows the mascot.

**Architecture:** One migration adds a per-RSVP `cancel_token` and two reminder timestamps. A daily Vercel Cron hits `/api/cron/reminders`, which claims one guest at a time in SQL (Puerto Rico dates computed in Postgres) and sends through the existing `notifyRsvp` → `sendEmail` path. The cancel page shows details on GET and cancels only through a server action; cancel + promotion run in one transaction under the event's advisory lock.

**Tech Stack:** Next.js 16 (App Router, server actions, `after()`), Neon Postgres (`@neondatabase/serverless`), Resend REST, Vitest, sharp.

**Spec:** `docs/specs/2026-10-09-rsvp-reminders-design.md`

## Global Constraints

- Work in worktree `~/dev/design-dinners/site-rsvp-reminders`, branch `feat/rsvp-reminders` (from `origin/main` 47e1c4f).
- Neon has ONE database for prod/preview/dev. Migrations must be additive and safe for the currently deployed code.
- Migrations are idempotent and contain no function bodies or `DO` blocks (`scripts/migrate-neon.mjs` splits on `;`).
- Never log a guest's name or email. Log error objects and counts only.
- Emails: from `Design Dinners <hola@designdinners.com>`, reply-to `hola@gaborene.com`, Spanish (Puerto Rico), tables + inline styles, HTML-escape every guest/event string.
- Cancel happens only on POST (server action). GET never changes data.
- Cron route fails closed: no `CRON_SECRET` → 401.
- Cron: `0 14 * * *` (10:00 AM AST). Time zone for "day": `America/Puerto_Rico`.
- Copy: "No puedo ir: liberar mi puesto", "Salir de la lista de espera", "Cómo llegar", "¡Mañana es la cena!", "¡Nos vemos pronto!".
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File map

| File | Change | Responsibility |
|---|---|---|
| `db/004_rsvp_reminders.sql` | create | cancel_token + reminder timestamps |
| `src/lib/rsvp-db.ts` | modify | return cancel tokens; `getRsvpByCancelToken`, `cancelRsvpByToken`, `claimNextReminder`, `releaseReminder` |
| `src/lib/rsvp-db.int.test.ts` | modify | DB tests for all of the above |
| `src/lib/rsvp-email.ts` (+ test) | modify | kinds `reminder` / `final`, cancel + maps buttons, mascot |
| `public/brand/mascot-email.png` | create | PNG mascot for email clients |
| `scripts/make-mascot-email.mjs` | create | regenerates the PNG |
| `src/lib/rsvp-notify.ts` | modify | take `cancelToken`, return `SendResult`, support new kinds |
| `src/app/eventos/[id]/actions.ts`, `src/app/admin/(panel)/eventos/[id]/reservas/actions.ts` | modify | pass cancel tokens |
| `src/app/reservas/cancelar/[token]/page.tsx`, `actions.ts`, `CancelForm.tsx` | create | cancel page |
| `src/app/api/cron/reminders/route.ts` | create | cron endpoint |
| `src/lib/reminders.ts` (+ test) | create | the send loop, injectable for tests |
| `vercel.json` | create | cron schedule |

---

### Task 1: Migration + DB layer

**Files:**
- Create: `db/004_rsvp_reminders.sql`
- Modify: `src/lib/rsvp-db.ts`
- Test: `src/lib/rsvp-db.int.test.ts`

**Interfaces:**
- Produces:
  - `insertRsvp(...)` → `{ status: "confirmed" | "waitlist"; position: number; cancelToken: string } | null`
  - `setRsvpStatus(...)` → `{ previous: RsvpStatus; name: string; email: string; cancelToken: string } | null`
  - `type ReminderKind = "reminder" | "final"`
  - `type ReminderTarget = { id: string; eventId: string; name: string; email: string; cancelToken: string }`
  - `getRsvpByCancelToken(sql, token)` → `{ name; status: RsvpStatus; eventId; eventTitle; eventDate: string; location: string | null } | null`
  - `cancelRsvpByToken(sql, token)` → `{ outcome: "cancelled"; eventId: string; promoted: { name; email; cancelToken } | null } | { outcome: "already" | "past" | "invalid" }`
  - `claimNextReminder(sql, kind, now: Date)` → `ReminderTarget | null`
  - `releaseReminder(sql, kind, rsvpId)` → `void`

- [ ] **Step 1: Write the migration**

```sql
-- Per-RSVP secret for the "liberar mi puesto" link, and once-only reminder marks.
alter table rsvps add column if not exists cancel_token uuid not null default gen_random_uuid();
create unique index if not exists rsvps_cancel_token_uidx on rsvps (cancel_token);
alter table rsvps add column if not exists reminder_sent_at timestamptz;
alter table rsvps add column if not exists final_reminder_sent_at timestamptz;
```

- [ ] **Step 2: Apply it** (additive; the deployed code ignores the new columns)

Run: `npm run db:migrate` (with `.env.local` loaded the way `package.json` defines it)
Expected: `Applied 004_rsvp_reminders.sql`

- [ ] **Step 3: Write failing DB tests** — append to `rsvp-db.int.test.ts` inside the existing `describe` (reuse `makeEvent`, `stamp`, `sql`):

```ts
  it("returns a cancel token from insertRsvp and setRsvpStatus", async () => {
    const eventId = await makeEvent({ capacity: 1 });
    const result = await insertRsvp(sql, { eventId, name: "A", email: "tok@x.co", ipHash: null });
    expect(result?.cancelToken).toMatch(/^[0-9a-f-]{36}$/);
    const [{ id }] = (await sql`select id from rsvps where event_id = ${eventId}`) as { id: string }[];
    const change = await setRsvpStatus(sql, { eventId, rsvpId: id, status: "waitlist" });
    expect(change?.cancelToken).toBe(result?.cancelToken);
  });

  it("cancels by token and promotes the oldest waitlisted guest", async () => {
    const eventId = await makeEvent({ capacity: 1 });
    const a = await insertRsvp(sql, { eventId, name: "A", email: "c1@x.co", ipHash: null });
    await insertRsvp(sql, { eventId, name: "B", email: "c2@x.co", ipHash: null });
    await insertRsvp(sql, { eventId, name: "C", email: "c3@x.co", ipHash: null });

    const out = await cancelRsvpByToken(sql, a!.cancelToken);
    expect(out).toMatchObject({ outcome: "cancelled", eventId, promoted: { name: "B", email: "c2@x.co" } });

    const rows = (await sql`select name, status from rsvps where event_id = ${eventId} order by name`) as { name: string; status: string }[];
    expect(rows.map((r) => `${r.name}:${r.status}`)).toEqual(["A:cancelled", "B:confirmed", "C:waitlist"]);
    expect(await cancelRsvpByToken(sql, a!.cancelToken)).toEqual({ outcome: "already" });
  });

  it("a waitlisted guest leaving promotes nobody", async () => {
    const eventId = await makeEvent({ capacity: 1 });
    await insertRsvp(sql, { eventId, name: "A", email: "w1@x.co", ipHash: null });
    const b = await insertRsvp(sql, { eventId, name: "B", email: "w2@x.co", ipHash: null });
    await insertRsvp(sql, { eventId, name: "C", email: "w3@x.co", ipHash: null });
    expect(await cancelRsvpByToken(sql, b!.cancelToken)).toMatchObject({ outcome: "cancelled", promoted: null });
  });

  it("refuses unknown tokens and past events", async () => {
    expect(await cancelRsvpByToken(sql, randomUUID())).toEqual({ outcome: "invalid" });
    const eventId = await makeEvent({ capacity: null });
    const a = await insertRsvp(sql, { eventId, name: "A", email: "p@x.co", ipHash: null });
    await sql`update events set event_date = ${past} where id = ${eventId}`;
    expect(await cancelRsvpByToken(sql, a!.cancelToken)).toEqual({ outcome: "past" });
    expect(await getRsvpByCancelToken(sql, a!.cancelToken)).toMatchObject({ name: "A", status: "confirmed", eventId });
  });

  it("claims each reminder once, by Puerto Rico date", async () => {
    // 6:30 PM AST on 2030-03-10. "now" is passed in, so no real event matches.
    const eventId = await makeEvent({ capacity: null, date: "2030-03-10T22:30:00Z" });
    await insertRsvp(sql, { eventId, name: "A", email: "r1@x.co", ipHash: null });
    const dayBefore = new Date("2030-03-09T14:00:00Z");
    const dayOf = new Date("2030-03-10T14:00:00Z");

    expect(await claimNextReminder(sql, "final", dayBefore)).toBeNull();
    const first = await claimNextReminder(sql, "reminder", dayBefore);
    expect(first).toMatchObject({ eventId, name: "A", email: "r1@x.co" });
    expect(await claimNextReminder(sql, "reminder", dayBefore)).toBeNull();

    await releaseReminder(sql, "reminder", first!.id);
    expect(await claimNextReminder(sql, "reminder", dayBefore)).toMatchObject({ id: first!.id });

    expect(await claimNextReminder(sql, "final", dayOf)).toMatchObject({ id: first!.id });
    expect(await claimNextReminder(sql, "final", new Date("2030-03-10T23:00:00Z"))).toBeNull();
  });
```

Update the import line to add `cancelRsvpByToken, claimNextReminder, getRsvpByCancelToken, releaseReminder`. `makeEvent` already accepts `date`.

- [ ] **Step 4: Run, expect FAIL** — `npm run test:db` → missing exports.

- [ ] **Step 5: Implement in `rsvp-db.ts`**

`insertRsvp`: the CTE returns `status, cancel_token`; the outer select adds `ins.cancel_token::text as "cancelToken"`; `InsertResult` gains `cancelToken: string`.

`setRsvpStatus`: `returning prev.status as previous, r.name, r.email, r.cancel_token::text as "cancelToken"`; `RsvpStatusChange` gains `cancelToken: string`.

New code:

```ts
export type ReminderKind = "reminder" | "final";
export type ReminderTarget = { id: string; eventId: string; name: string; email: string; cancelToken: string };
export type CancelLookup = {
  name: string;
  status: RsvpStatus;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  location: string | null;
};
type Guest = { name: string; email: string; cancelToken: string };
export type CancelOutcome =
  | { outcome: "cancelled"; eventId: string; promoted: Guest | null }
  | { outcome: "already" | "past" | "invalid" };

export async function getRsvpByCancelToken(sql: Sql, token: string): Promise<CancelLookup | null> {
  const rows = (await sql`
    select r.name, r.status, e.id as "eventId", e.title as "eventTitle",
           e.event_date as "eventDate", e.location
    from rsvps r join events e on e.id = r.event_id
    where r.cancel_token = ${token}
  `) as CancelLookup[];
  const row = rows[0];
  return row ? { ...row, eventDate: new Date(row.eventDate).toISOString() } : null;
}

/**
 * Guest self-cancel. Under the event's advisory lock (same key as insertRsvp):
 * cancel the RSVP, and when it held a seat, hand that seat to the oldest
 * waitlisted guest if the table now has room. Data-modifying CTEs all read the
 * pre-statement snapshot, hence `count - 1` for the freed seat.
 */
export async function cancelRsvpByToken(sql: Sql, token: string): Promise<CancelOutcome> {
  const found = await getRsvpByCancelToken(sql, token);
  if (!found) return { outcome: "invalid" };
  if (found.status === "cancelled") return { outcome: "already" };
  if (new Date(found.eventDate).getTime() < Date.now()) return { outcome: "past" };

  const results = await sql.transaction((txn) => [
    txn`select pg_advisory_xact_lock(hashtext(${found.eventId}::uuid::text))`,
    txn`
      with target as (
        select id, status from rsvps where cancel_token = ${token} for update
      ),
      cancelled as (
        update rsvps r set status = 'cancelled', updated_at = now()
        from target
        where r.id = target.id and target.status in ('confirmed', 'waitlist')
        returning target.status as previous
      ),
      next as (
        select w.id from rsvps w
        join events e on e.id = w.event_id
        where w.event_id = ${found.eventId}
          and w.status = 'waitlist'
          and w.cancel_token <> ${token}
          and exists (select 1 from cancelled where previous = 'confirmed')
          and (
            e.capacity is null
            or (select count(*) from rsvps c where c.event_id = e.id and c.status = 'confirmed') - 1 < e.capacity
          )
        order by w.created_at
        limit 1
        for update of w
      ),
      promoted as (
        update rsvps r set status = 'confirmed', updated_at = now()
        from next where r.id = next.id
        returning r.name, r.email, r.cancel_token::text as "cancelToken"
      )
      select
        (select previous from cancelled) as previous,
        (select row_to_json(p) from promoted p) as promoted
    `,
  ]);
  const row = (results[1] as unknown as { previous: string | null; promoted: Guest | null }[])[0];
  if (!row?.previous) return { outcome: "already" };
  return { outcome: "cancelled", eventId: found.eventId, promoted: row.promoted ?? null };
}

/**
 * Marks and returns one confirmed guest who still needs this reminder, or null.
 * "reminder" = event on the Puerto Rico calendar day after `now`;
 * "final" = event on the same PR day as `now` that has not started yet.
 * SKIP LOCKED lets two overlapping runs never claim the same guest.
 */
export async function claimNextReminder(sql: Sql, kind: ReminderKind, now: Date): Promise<ReminderTarget | null> {
  const at = now.toISOString();
  const rows = (kind === "reminder"
    ? await sql`
        update rsvps set reminder_sent_at = now()
        where id = (
          select r.id from rsvps r join events e on e.id = r.event_id
          where r.status = 'confirmed' and r.reminder_sent_at is null
            and (e.event_date at time zone 'America/Puerto_Rico')::date
              = (${at}::timestamptz at time zone 'America/Puerto_Rico')::date + 1
          order by r.created_at limit 1
          for update of r skip locked
        )
        returning id, event_id as "eventId", name, email, cancel_token::text as "cancelToken"
      `
    : await sql`
        update rsvps set final_reminder_sent_at = now()
        where id = (
          select r.id from rsvps r join events e on e.id = r.event_id
          where r.status = 'confirmed' and r.final_reminder_sent_at is null
            and (e.event_date at time zone 'America/Puerto_Rico')::date
              = (${at}::timestamptz at time zone 'America/Puerto_Rico')::date
            and e.event_date > ${at}::timestamptz
          order by r.created_at limit 1
          for update of r skip locked
        )
        returning id, event_id as "eventId", name, email, cancel_token::text as "cancelToken"
      `) as ReminderTarget[];
  return rows[0] ?? null;
}

/** Undo a claim after a failed send, so the next run retries that guest. */
export async function releaseReminder(sql: Sql, kind: ReminderKind, rsvpId: string): Promise<void> {
  if (kind === "reminder") await sql`update rsvps set reminder_sent_at = null where id = ${rsvpId}`;
  else await sql`update rsvps set final_reminder_sent_at = null where id = ${rsvpId}`;
}
```

- [ ] **Step 6: Run, expect PASS** — `npm run test:db` → all pass. Also `npx tsc --noEmit`.

- [ ] **Step 7: Commit** — `git add db/004_rsvp_reminders.sql src/lib/rsvp-db.ts src/lib/rsvp-db.int.test.ts && git commit -m "RSVP cancel tokens, self-cancel with waitlist promotion, reminder claims"`

---

### Task 2: Email builder — new kinds, cancel + maps buttons, mascot

**Files:**
- Modify: `src/lib/rsvp-email.ts`, `src/lib/rsvp-email.test.ts`
- Create: `scripts/make-mascot-email.mjs`, `public/brand/mascot-email.png`

**Interfaces:**
- Produces:
  - `type RsvpEmailKind = "confirmed" | "waitlist" | "promoted" | "reminder" | "final"`
  - `RsvpEmailInput` gains `cancelUrl: string | null`
  - `mapsUrl(location: string): string`
  - Mascot URL = `new URL(eventUrl).origin + "/brand/mascot-email.png"`

- [ ] **Step 1: Make the PNG** — `scripts/make-mascot-email.mjs`:

```js
// Gmail does not render SVG, so emails use a PNG copy of the mascot.
// Run: node scripts/make-mascot-email.mjs
import sharp from "sharp";

await sharp("public/brand/mascot-full-color.svg", { density: 400 })
  .rotate(7, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .resize({ width: 192 })
  .png({ compressionLevel: 9 })
  .toFile("public/brand/mascot-email.png");
console.log("Wrote public/brand/mascot-email.png");
```

Run: `node scripts/make-mascot-email.mjs` → file under ~30 KB.

- [ ] **Step 2: Failing tests** — in `rsvp-email.test.ts`, add `cancelUrl: "https://designdinners.com/reservas/cancelar/tok"` to the `input()` defaults, then add:

```ts
  it("every kind shows the mascot from the site origin", () => {
    for (const kind of ["confirmed", "waitlist", "promoted", "reminder", "final"] as const) {
      expect(buildRsvpEmail(input({ kind })).html).toContain('src="https://designdinners.com/brand/mascot-email.png"');
    }
  });

  it("seat holders get the cancel button; the waitlist gets 'salir'", () => {
    const confirmed = buildRsvpEmail(input());
    expect(confirmed.html).toContain("No puedo ir: liberar mi puesto");
    expect(confirmed.html).toContain('href="https://designdinners.com/reservas/cancelar/tok"');
    expect(confirmed.text).toContain("https://designdinners.com/reservas/cancelar/tok");
    expect(confirmed.html).not.toContain("Contesta este correo");
    expect(buildRsvpEmail(input({ kind: "waitlist", position: 2 })).html).toContain("Salir de la lista de espera");
  });

  it("without a cancel URL it falls back to the reply line", () => {
    const email = buildRsvpEmail(input({ cancelUrl: null }));
    expect(email.html).not.toContain("liberar mi puesto");
    expect(email.html).toContain("Contesta este correo");
  });

  it("reminder: tomorrow subject, maps button, no calendar file", () => {
    const email = buildRsvpEmail(input({ kind: "reminder", position: null }));
    expect(email.subject).toBe("Mañana: Del Diseño al Impacto");
    expect(email.html).toContain("¡Mañana es la cena!");
    expect(email.html).toContain("Cómo llegar");
    expect(email.html).toContain("https://www.google.com/maps/search/?api=1&amp;query=Morena%20Coffee%2C%20Santurce");
    expect(email.ics).toBeUndefined();
  });

  it("final: today subject with the time", () => {
    const email = buildRsvpEmail(input({ kind: "final", position: null }));
    expect(email.subject).toBe("Hoy: Del Diseño al Impacto · 7:00 p. m.");
    expect(email.html).toContain("¡Nos vemos pronto!");
  });

  it("reminders without a location link to the event instead of maps", () => {
    const email = buildRsvpEmail(input({ kind: "reminder", event: { ...event, location: null } }));
    expect(email.html).not.toContain("Cómo llegar");
    expect(email.html).toContain("Ver el evento");
  });

  it("mapsUrl encodes the place", () => {
    expect(mapsUrl("Morena Coffee, Santurce")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Morena%20Coffee%2C%20Santurce",
    );
  });
```

Import `mapsUrl`. Run `npx vitest run src/lib/rsvp-email.test.ts` → FAIL.

- [ ] **Step 3: Implement** in `rsvp-email.ts`:
  - Extend `RsvpEmailKind`; add `cancelUrl` to the input.
  - `export function mapsUrl(location: string) { return \`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}\`; }`
  - `copyFor` new cases:
    - `reminder`: subject `Mañana: ${title}`, preheader `Mañana a las ${time}. Te esperamos en la mesa.`, kicker `Recordatorio`, title `¡Mañana es la cena!`, yellow header + black ink, lead `Te esperamos mañana. Si ya no puedes ir, libera tu puesto para que otra persona lo aproveche.`
    - `final`: subject `Hoy: ${title} · ${time}`, preheader `Hoy a las ${time}. Aquí tienes cómo llegar.`, kicker `Hoy`, title `¡Nos vemos pronto!`, red header + cream ink, lead `Hoy es el día. Aquí tienes cómo llegar.`
    - `time` = the non-breaking `formatEventTime` value; pass it into `copyFor`.
  - Primary button: `reminder`/`final` with a location → `Cómo llegar` to `mapsUrl(location)`; otherwise `Ver el evento` to `eventUrl`.
  - Cancel button (when `cancelUrl`): outlined (cream bg, black ink, black 2px border), under the primary button; label `Salir de la lista de espera` for `waitlist`, else `No puedo ir: liberar mi puesto`. Replaces the `Contesta este correo…` note; keep that note only when `cancelUrl` is null and the guest holds a seat.
  - Calendar note + `.ics` only for `confirmed`/`promoted`.
  - Mascot: the brand row becomes a 2-cell table — wordmark left (valign bottom), `<img src="${origin}/brand/mascot-email.png" width="96" alt="Design Dinners" style="display:block;width:96px;height:auto;border:0;">` right.
  - Plain text gets the same buttons as `Label: URL` lines.

- [ ] **Step 4: PASS** — `npx vitest run src/lib/rsvp-email.test.ts`

- [ ] **Step 5: Commit** — `git add scripts/make-mascot-email.mjs public/brand/mascot-email.png src/lib/rsvp-email.ts src/lib/rsvp-email.test.ts && git commit -m "Emails: mascot, cancel button, reminder and final kinds"`

---

### Task 3: Wire cancel tokens through notify + actions

**Files:**
- Modify: `src/lib/rsvp-notify.ts`, `src/app/eventos/[id]/actions.ts`, `src/app/admin/(panel)/eventos/[id]/reservas/actions.ts`

**Interfaces:**
- Consumes: `insertRsvp().cancelToken`, `setRsvpStatus().cancelToken` (Task 1); `cancelUrl` (Task 2)
- Produces: `notifyRsvp({ kind, eventId, name, email, position, cancelToken }): Promise<SendResult | "no-event">` and `cancelUrlFor(token: string): string`

- [ ] **Step 1: `rsvp-notify.ts`**

```ts
export function cancelUrlFor(token: string): string {
  return `${SITE}/reservas/cancelar/${token}`;
}
```

`notifyRsvp` takes `cancelToken: string | null`, passes `cancelUrl: input.cancelToken ? cancelUrlFor(input.cancelToken) : null`, returns the `sendEmail` result, returns `"no-event"` when the event is missing, and `"failed"` from its catch.

- [ ] **Step 2: callers** — `submitRsvp` passes `cancelToken: result.cancelToken`; `changeRsvpStatus` passes `cancelToken: change.cancelToken`.

- [ ] **Step 3: Verify** — `npx tsc --noEmit && npx vitest run` → clean.

- [ ] **Step 4: Commit** — `git commit -am "Pass cancel links into every RSVP email"`

---

### Task 4: Cancel page

**Files:**
- Create: `src/app/reservas/cancelar/[token]/page.tsx`, `src/app/reservas/cancelar/[token]/actions.ts`, `src/app/reservas/cancelar/[token]/CancelForm.tsx`

**Interfaces:**
- Consumes: `getRsvpByCancelToken`, `cancelRsvpByToken` (Task 1), `notifyRsvp` (Task 3), `isUuid` (`@/lib/rsvp`)
- Produces: route `/reservas/cancelar/<token>`; `cancelReservation(token: string, prev: CancelState, formData: FormData): Promise<CancelState>` with `type CancelState = { status: "idle" | "done" | "already" | "past" | "invalid" | "error" }`

- [ ] **Step 1: `actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { getDb, hasDatabaseConfig } from "@/lib/db";
import { isUuid } from "@/lib/rsvp";
import { cancelRsvpByToken } from "@/lib/rsvp-db";
import { notifyRsvp } from "@/lib/rsvp-notify";

export type CancelState = { status: "idle" | "done" | "already" | "past" | "invalid" | "error" };

export async function cancelReservation(token: string, _prev: CancelState, _formData: FormData): Promise<CancelState> {
  if (!hasDatabaseConfig || !isUuid(token)) return { status: "invalid" };
  try {
    const result = await cancelRsvpByToken(getDb(), token);
    if (result.outcome !== "cancelled") return { status: result.outcome };
    const { eventId, promoted } = result;
    revalidatePath("/");
    revalidatePath(`/eventos/${eventId}`);
    revalidatePath("/admin/eventos");
    revalidatePath(`/admin/eventos/${eventId}/reservas`);
    if (promoted) {
      after(() =>
        notifyRsvp({ kind: "promoted", eventId, name: promoted.name, email: promoted.email, position: null, cancelToken: promoted.cancelToken }),
      );
    }
    return { status: "done" };
  } catch (error) {
    console.error("cancelReservation failed", error);
    return { status: "error" };
  }
}
```

- [ ] **Step 2: `CancelForm.tsx`** — client component, `useActionState(cancelReservation.bind(null, token), { status: "idle" })`. Idle: big red pill button "Sí, liberar mi puesto" (`rounded-full border-2 border-dd-black bg-dd-red text-dd-cream dd-btn`, min-h 50px, pending text "Liberando…", disabled while pending) + secondary link "No, me quedo con mi puesto" to the event page. `done`: heading "Listo, liberaste tu puesto" + "Gracias por avisar. Alguien más podrá sentarse a la mesa." `already`/`past`/`invalid`/`error`: matching one-line messages (error: "No pudimos liberar tu puesto. Intenta de nuevo."). Result region `aria-live="polite"`.

- [ ] **Step 3: `page.tsx`** — server component, `export const dynamic = "force-dynamic"`, `metadata = { title: "Liberar mi puesto — Design Dinners", robots: { index: false, follow: false } }`. Loads `getRsvpByCancelToken` (guard `isUuid` + `hasDatabaseConfig`). Layout like `eventos/[id]/not-found.tsx` (centered, mascot SVG on top) with a ticket card (`rounded-2xl border-2 border-dd-black bg-dd-cream shadow-[4px_6px_0_0_var(--dd-black)]`):
  - unknown → "Este enlace no es válido" + link home
  - cancelled → "Ya liberaste tu puesto"
  - past → "Este evento ya pasó"
  - else → `¿No vas a poder llegar, {firstName}?`, event title, `formatEventDate · formatEventTime`, location, then `<CancelForm token eventId waitlist={status==="waitlist"} />` (waitlist wording: "Sí, salir de la lista de espera").
  - First name = `name.split(" ")[0]`.

- [ ] **Step 4: Verify in the browser** — add a launch config `rsvp-reminders` (port 3600) to the iCloud folder's `.claude/launch.json`, start it, create a throwaway RSVP on a `RSVPTEST-` event via SQL, open `/reservas/cancelar/<token>`, click the button, confirm the DB row is `cancelled`; also check an invalid token and the already-cancelled state. Delete the throwaway event.

- [ ] **Step 5: Commit** — `git add src/app/reservas && git commit -m "Cancel page: guests free their seat from the email link"`

---

### Task 5: Reminder job

**Files:**
- Create: `src/lib/reminders.ts`, `src/lib/reminders.test.ts`, `src/app/api/cron/reminders/route.ts`, `vercel.json`

**Interfaces:**
- Consumes: `claimNextReminder`, `releaseReminder`, `ReminderKind` (Task 1); `notifyRsvp` (Task 3); `isAuthorizedExport` from `@/lib/rsvp-export` (generic constant-time bearer check)
- Produces: `runReminders(deps): Promise<{ reminder: Counts; final: Counts }>` with `type Counts = { sent: number; failed: number }`

- [ ] **Step 1: Failing test** `src/lib/reminders.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import { runReminders, type ReminderDeps } from "./reminders";

function deps(queue: Record<string, string[]>, results: Record<string, string> = {}): ReminderDeps & { released: string[] } {
  const released: string[] = [];
  return {
    released,
    claim: vi.fn(async (kind) => {
      const id = queue[kind].shift();
      return id ? { id, eventId: "e", name: "N", email: "n@x.co", cancelToken: "t" } : null;
    }),
    release: vi.fn(async (_kind, id) => void released.push(id)),
    send: vi.fn(async (_kind, target) => (results[target.id] ?? "sent") as never),
    pauseMs: 0,
  };
}

describe("runReminders", () => {
  it("sends every claimed guest once per kind", async () => {
    const d = deps({ reminder: ["a", "b"], final: ["c"] });
    expect(await runReminders(d)).toEqual({ reminder: { sent: 2, failed: 0 }, final: { sent: 1, failed: 0 } });
    expect(d.released).toEqual([]);
  });

  it("releases failed sends after the loop so the next run retries them", async () => {
    const d = deps({ reminder: ["a", "b"], final: [] }, { a: "failed" });
    expect(await runReminders(d)).toEqual({ reminder: { sent: 1, failed: 1 }, final: { sent: 0, failed: 0 } });
    expect(d.released).toEqual(["a"]);
  });

  it("stops and releases when email is not configured", async () => {
    const d = deps({ reminder: ["a", "b"], final: ["c"] }, { a: "skipped" });
    const out = await runReminders(d);
    expect(out.reminder).toEqual({ sent: 0, failed: 1 });
    expect(d.released).toEqual(["a"]);
    expect(d.claim).toHaveBeenCalledTimes(1);
  });
});
```

Run → FAIL.

- [ ] **Step 2: `src/lib/reminders.ts`**

```ts
// The daily reminder loop, with its I/O injected so it can be unit tested.
import type { ReminderKind, ReminderTarget } from "./rsvp-db";

export type Counts = { sent: number; failed: number };
type SendOutcome = "sent" | "skipped" | "failed" | "no-event";

export type ReminderDeps = {
  claim: (kind: ReminderKind) => Promise<ReminderTarget | null>;
  release: (kind: ReminderKind, rsvpId: string) => Promise<void>;
  send: (kind: ReminderKind, target: ReminderTarget) => Promise<SendOutcome>;
  /** Pause between sends to stay under Resend's rate limit. */
  pauseMs?: number;
};

const MAX_PER_KIND = 1000;

export async function runReminders(deps: ReminderDeps): Promise<Record<ReminderKind, Counts>> {
  const out: Record<ReminderKind, Counts> = { reminder: { sent: 0, failed: 0 }, final: { sent: 0, failed: 0 } };
  for (const kind of ["reminder", "final"] as const) {
    const failed: string[] = [];
    let stop = false;
    for (let i = 0; i < MAX_PER_KIND; i++) {
      const target = await deps.claim(kind);
      if (!target) break;
      const result = await deps.send(kind, target);
      if (result === "sent") out[kind].sent++;
      else {
        out[kind].failed++;
        failed.push(target.id);
        // No API key: every send would skip. Stop the whole run; the next one retries.
        if (result === "skipped") {
          stop = true;
          break;
        }
      }
      if (deps.pauseMs) await new Promise((r) => setTimeout(r, deps.pauseMs));
    }
    // Released only after the loop, or the same guest would be claimed again at once.
    for (const id of failed) await deps.release(kind, id);
    if (stop) break;
  }
  return out;
}
```

- [ ] **Step 3: PASS** — `npx vitest run src/lib/reminders.test.ts`

- [ ] **Step 4: Route** `src/app/api/cron/reminders/route.ts`:

```ts
// Daily reminder job (vercel.json cron, 10 AM Puerto Rico). Vercel calls it with
// `Authorization: Bearer $CRON_SECRET`. No secret configured → 401 for everyone.
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { runReminders } from "@/lib/reminders";
import { claimNextReminder, releaseReminder } from "@/lib/rsvp-db";
import { isAuthorizedExport } from "@/lib/rsvp-export";
import { notifyRsvp } from "@/lib/rsvp-notify";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const HEADERS = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  if (!isAuthorizedExport(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return new Response("No autorizado", { status: 401, headers: HEADERS });
  }
  if (!hasDatabaseConfig) return Response.json({ skipped: "no database" }, { headers: HEADERS });

  const sql = getDb();
  const now = new Date();
  const counts = await runReminders({
    claim: (kind) => claimNextReminder(sql, kind, now),
    release: (kind, id) => releaseReminder(sql, kind, id),
    send: (kind, t) =>
      notifyRsvp({ kind, eventId: t.eventId, name: t.name, email: t.email, position: null, cancelToken: t.cancelToken }),
    pauseMs: 600,
  });
  console.log("reminders", JSON.stringify(counts));
  return Response.json(counts, { headers: HEADERS });
}
```

- [ ] **Step 5: `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [{ "path": "/api/cron/reminders", "schedule": "0 14 * * *" }]
}
```

- [ ] **Step 6: Verify** — `npx tsc --noEmit && npx eslint src && npx vitest run`; on the dev server `curl -i localhost:3600/api/cron/reminders` → 401.

- [ ] **Step 7: Commit** — `git add src/lib/reminders.ts src/lib/reminders.test.ts src/app/api/cron vercel.json && git commit -m "Daily reminder cron: day-before and day-of emails"`

---

### Task 6: Review, preview, PR

- [ ] Render all 5 emails (temporary test file writing HTML to the scratchpad, deleted after) and check them in the browser; fix layout issues.
- [ ] Opus code review of the full branch diff (security: token handling, GET never mutates, fail-closed cron, no PII logs; correctness: promotion SQL, PR-date math).
- [ ] Push, open PR with summary + the owner's one setup command:
  `openssl rand -hex 32 | npx vercel env add CRON_SECRET production --sensitive`
- [ ] After merge: owner clicks **Run** on the cron in Vercel (sends nothing before Oct 14); check logs. Test the cancel page in production with a throwaway RSVP; delete it.
