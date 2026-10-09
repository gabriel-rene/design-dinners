# RSVP reminders + self-cancel — design spec

**Date:** 2026-10-09
**Status:** draft, waiting for owner review
**Builds on:** `docs/specs/2026-10-02-rsvps-design.md`, PR #11 (RSVP emails via Resend)
**First real use:** "Del Diseño al Impacto", Oct 15 2026, 6:30 PM (49 confirmed of 50).

## Decisions (from the owner)

| Topic | Decision |
|---|---|
| Reminders | Two automatic emails: the day before ("¡Mañana es la cena!") and the day of ("¡Nos vemos pronto!"). |
| How they go out | Automatic daily job (Vercel Cron) at about 10 AM Puerto Rico time. Works for every future event. Each guest gets each email once. |
| Cancel | Every email has a prominent "No puedo ir: liberar mi puesto" button that opens a cancel page. |
| Freed seat | The first person on the waitlist gets it right away plus the "¡Se abrió un puesto!" email. Empty waitlist = seat opens on the site. |
| Branding | The mascot appears on every email (confirmation, waitlist, promoted, both reminders). |
| Directions | Reminders have a "Cómo llegar" button to Google Maps. |

## Out of scope

- Open/click tracking (owner decided not now).
- Admin UI to see who got which reminder.
- Auto-promotion when an **admin** cancels someone. Admin stays manual.
- Re-sending the Oct 9 confirmation (already sent to all 49).

## 1. Data model (Neon) — `db/004_rsvp_reminders.sql`

Idempotent, no function bodies (the migrator splits on `;`).

```sql
alter table rsvps add column if not exists cancel_token uuid not null default gen_random_uuid();
create unique index if not exists rsvps_cancel_token_uidx on rsvps (cancel_token);
alter table rsvps add column if not exists reminder_sent_at timestamptz;
alter table rsvps add column if not exists final_reminder_sent_at timestamptz;
```

- `cancel_token`: a random id only that guest's emails contain. Existing rows get one automatically. No new secret is needed.
- `*_sent_at`: marks a reminder as sent, so a retry or a second cron run never sends twice.

## 2. Cancel flow

- Link in emails: `https://designdinners.com/reservas/cancelar/<cancel_token>`.
- **GET shows a page, never cancels.** Email scanners open links on their own; only the button cancels.
- Page `/reservas/cancelar/[token]` (no index, no cache), styled like the RSVP ticket:
  - Shows the event, date, and the guest's first name.
  - Button: "Sí, liberar mi puesto" (server action, POST).
  - States: unknown token → "Este enlace no es válido"; already cancelled → "Ya liberaste tu puesto"; event in the past → "Este evento ya pasó".
- On cancel, in one transaction under the same per-event advisory lock as `insertRsvp`:
  1. Set the RSVP to `cancelled` (only if it was `confirmed` or `waitlist`).
  2. If it was `confirmed`, move the oldest `waitlist` RSVP (by `created_at`) to `confirmed`.
  3. Return the promoted guest, if any.
- After the response (`after()`), send "¡Se abrió un puesto!" to the promoted guest.
- Rate limit: the token is unguessable (122 random bits); no extra limit.
- Revalidate the event page, landing, and admin RSVP pages.

## 3. Reminder job

- `vercel.json` cron: `0 14 * * *` → `GET /api/cron/reminders` (14:00 UTC = 10:00 AM AST; Hobby plan may fire any time within that hour).
- Auth: `Authorization: Bearer ${CRON_SECRET}`. If `CRON_SECRET` is not set, the route answers 401 to everyone (fail closed).
- "Day" means the Puerto Rico calendar date (`America/Puerto_Rico`).
- Each run:
  - **Reminder:** events whose PR date is tomorrow → confirmed RSVPs with `reminder_sent_at is null`.
  - **Final:** events whose PR date is today and start later than now → confirmed RSVPs with `final_reminder_sent_at is null`.
- Per guest: claim the row (`update … set X_sent_at = now() where … and X_sent_at is null returning …`), send, and on failure set it back to null so the next run retries.
- Sends one at a time with a short pause (Resend rate limit). Function `maxDuration` 300 s; 50 guests take about 30 s.
- Response JSON: counts only (`{ reminder: {sent, failed}, final: {sent, failed} }`), never names or emails.

## 4. Emails

All built by `src/lib/rsvp-email.ts`, same ticket look. New kinds: `reminder`, `final`.

| Kind | Header | Title | Buttons |
|---|---|---|---|
| confirmed | red | ¡Tienes puesto! | Ver el evento · **No puedo ir: liberar mi puesto** |
| waitlist | yellow | Estás en la fila #N | Ver el evento · WhatsApp · Salir de la lista |
| promoted | red | ¡Se abrió un puesto! | Ver el evento · **No puedo ir: liberar mi puesto** |
| reminder | yellow | ¡Mañana es la cena! | Cómo llegar · **No puedo ir: liberar mi puesto** |
| final | red | ¡Nos vemos pronto! | Cómo llegar · **No puedo ir: liberar mi puesto** |

- Subjects: reminder `Mañana: <title>`, final `Hoy: <title> · <time>`.
- The cancel button replaces the old "Contesta este correo…" line. Full width, outlined (cream with black border), right under the main button.
- **Mascot:** `public/brand/mascot-email.png`, a PNG made from `mascot-full-color.svg` with `sharp` (Gmail does not show SVG). About 96 px wide (192 px file for sharp screens), tilted like on the site, sitting on the ticket's top-right corner. `alt="Design Dinners"`. Loaded from `https://designdinners.com/brand/mascot-email.png`.
- **Maps:** `https://www.google.com/maps/search/?api=1&query=<encoded location>`. If the event has no location, no "Cómo llegar" button.
- Reminders do not attach the calendar file again.

## 5. Setup the owner does

One command, the secret never appears on screen or in chat:

```bash
openssl rand -hex 32 | npx vercel env add CRON_SECRET production --sensitive
```

## 6. Testing

- Unit: email builder (new kinds, cancel and maps links, mascot, escaping), PR date math (tomorrow/today around midnight and DST-free AST), cron auth (no secret → 401, wrong → 401).
- DB integration (`npm run test:db`): cancel + auto-promote order, cancelling twice, waitlist cancel does not promote, reminder claim is once-only.
- Browser: cancel page states on the dev server; all 5 emails rendered and checked.
- Production smoke test: after deploy (before Oct 14), the owner clicks **Run** on the job in Vercel → Settings → Cron Jobs. No event is "tomorrow" or "today" yet, so it sends nothing; the logs prove auth and the query work. I also test the cancel page on production with a throwaway RSVP and delete it after.
- Oct 14 and 15: I check the cron logs and the counts after 10 AM.

## 7. Timeline

Must be live before **Oct 14, 10 AM AST**. Target: PR ready Oct 10.
