# RSVPs — design spec

**Date:** 2026-10-02
**Status:** approved in chat, pending written-spec review
**Scope:** public RSVP for events, seat limit + waitlist, admin RSVP management, and bringing the admin panel live with a cloud Supabase project.

Admin event creation already exists (`/admin/eventos`). This phase adds the RSVP layer on top of it.

## Decisions (from the owner)

| Topic | Decision |
|---|---|
| Fields collected | Name + email. No phone. |
| Full events | Optional seat limit per event; when full, new RSVPs join a waitlist. |
| Spam | Honeypot field + one RSVP per email per event + per-device rate limit. No CAPTCHA for now (Turnstile is the upgrade path). |
| Admin in production | Create a cloud Supabase project now so admins can manage RSVPs on the live site. |
| Where RSVP happens | A dedicated, shareable event page `/eventos/[id]`. |

## Out of scope (next phases)

- Confirmation / update emails (Resend).
- Guest self-cancel link.
- "Donar con ATH Móvil" button (the event page reserves a slot for it).
- Automatic waitlist promotion. Admins promote by hand.

## 1. Data model (Neon)

New migration `db/002_rsvps.sql`. It must be idempotent, because `scripts/migrate-neon.mjs` re-runs every file on each run and splits on `;` (so no function bodies or `DO` blocks).

```sql
alter table events add column if not exists capacity integer
  check (capacity is null or capacity > 0);

create table if not exists rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  status text not null default 'confirmed'
    check (status in ('confirmed', 'waitlist', 'cancelled')),
  ip_hash text,
  created_at timestamptz not null default now()
);

create unique index if not exists rsvps_event_email_uidx
  on rsvps (event_id, lower(email));
create index if not exists rsvps_event_status_idx
  on rsvps (event_id, status, created_at);
create index if not exists rsvps_ip_hash_created_idx
  on rsvps (ip_hash, created_at);
```

- `capacity = null` means no limit.
- Email is stored trimmed; uniqueness is case-insensitive via `lower(email)`.
- `ip_hash` = SHA-256 of `client IP + RSVP_IP_SALT` (new server-only secret). The raw IP is never stored.
- `src/lib/types.ts` gains `capacity: number | null` on `EventRow` and a new `RsvpRow`.
- Demo-data fallback (no `DATABASE_URL`) gets `capacity` on demo events; RSVP submit returns a friendly "not available" error in demo mode.

## 2. Public event page `/eventos/[id]`

- Server component. Loads the event, its speakers, and the confirmed count. 404 (`notFound()`) for unknown or malformed ids.
- Cached with `revalidate` and refreshed by `revalidatePath` after every RSVP or admin change, so "seats left" stays current.
- Shows: cover, type, title, date/time, location, description, speakers, seats left ("Quedan 4 asientos" / "Lleno — únete a la lista de espera" / nothing when no limit).
- **Form states**
  - Upcoming + no `registration_url` → RSVP form (name, email, hidden honeypot).
  - Upcoming + `registration_url` set → the external "Reservar" link, as today. No internal form.
  - Past event → "Este evento ya pasó" and no form.
- Has its own `<title>` / Open Graph metadata so WhatsApp link previews show the event.
- Built with the existing brand system and the `impeccable` skill. Spanish copy.

### Landing changes

- `NextEvent` and `EventCard` "Reservar" buttons link to `/eventos/[id]` when the event has no `registration_url`. External links stay as they are.

## 3. RSVP submit (server action)

`src/app/eventos/[id]/actions.ts` → `submitRsvp(prevState, formData)`.

1. Honeypot filled → return the normal success state, write nothing.
2. Validate: name 1–120 chars after trim; email trimmed, ≤254 chars, simple shape check. Errors are Spanish, per field.
3. Event must exist, be upcoming, and have no `registration_url`.
4. Rate limit: reject if the same `ip_hash` made ≥5 RSVPs in the last hour ("Demasiados intentos. Intenta más tarde.").
5. Insert inside one Neon non-interactive transaction (`sql.transaction([...])`):
   - `select pg_advisory_xact_lock(hashtext(event_id))` — serializes RSVPs per event.
   - `insert ... select` that sets `status` to `confirmed` when `capacity is null` or confirmed count `< capacity`, else `waitlist`; `on conflict do nothing`; `returning status`.
   - Each statement gets a fresh snapshot under READ COMMITTED, so the count after the lock sees all earlier commits. Seats can never be overbooked.
6. Result
   - `confirmed` → "¡Listo! Tu puesto está confirmado."
   - `waitlist` → "El evento está lleno. Quedaste en la lista de espera."
   - Duplicate (no row returned) → the same confirmed-style message, so the form does not reveal who already signed up.
7. `revalidatePath` for `/`, `/eventos/[id]`, and the admin event pages.

Pure helpers (validation, seat math, status labels, CSV building) live in `src/lib/rsvp.ts` and are unit-tested.

## 4. Admin

All pages and actions call `requireAdmin()` first (existing rule).

- **Event form:** new optional "Cupo (asientos)" number field → `capacity`. Validation: empty or an integer 1–1000. Lowering capacity below the confirmed count is allowed; the UI shows "sobrecupo" and nobody is removed automatically.
- **Events list:** shows `confirmed/capacity` (or `confirmed` when no limit) per event.
- **Event edit page:** new RSVP section with two lists — Confirmados and Lista de espera (ordered by `created_at`) — plus a collapsed Cancelados list.
  - Actions per row: "Subir a confirmado" (waitlist → confirmed, allowed even when it exceeds capacity — the admin decides), "Cancelar" (→ cancelled), "Restaurar" (cancelled → waitlist).
  - "Descargar CSV" → route handler `/admin/eventos/[id]/rsvps.csv` (admin-checked) with name, email, status, created_at. Cells are escaped against CSV formula injection (prefix `'` on values starting with `= + - @`).
- RSVP data is personal data: it is shown only in the admin panel and never on public pages.

## 5. Cloud Supabase (admin live)

- Owner creates a free Supabase project (steps written to `docs/supabase-cloud-setup.md`, plain language).
- Apply `supabase/migrations/20260714000000_init.sql` (admins allowlist, `is_admin()`, `images` bucket + policies) to the cloud project.
- Add the owner's admin email to `admins` in the cloud project only (never committed).
- Auth settings: Site URL `https://design-dinners.vercel.app` (later designdinners.com), redirect URL `/auth/callback`.
- Vercel env vars (production + preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `RSVP_IP_SALT`. Changing Vercel settings needs the owner's explicit OK at that step.
- Supabase's built-in email sender is rate-limited (a few emails per hour). That is enough for 1–3 admins' magic links. Custom SMTP comes with the emails phase.

## 6. Security checklist

- No service-role key anywhere. Neon writes happen only in server actions.
- `RSVP_IP_SALT` added to `.env.example` as a placeholder; real values only in `.env.local` and Vercel.
- All SQL through tagged templates (parameterized).
- Client IP read from `x-forwarded-for` (first hop, as set by Vercel); missing IP → `ip_hash = null`, rate limit skipped, other checks still apply.
- Public page never renders RSVP names or emails.

## 7. Testing

- **Unit (Vitest):** RSVP validation, honeypot handling, seat math (`seatsLeft`, status choice), capacity parsing, CSV escaping.
- **E2E (Playwright, local Neon + local Supabase):**
  1. RSVP on an upcoming event → confirmed message; admin sees the row.
  2. Event with capacity 1: second RSVP → waitlist message; admin promotes it.
  3. Duplicate email → same success message, still one row.
  4. Past event → no form.
  5. Event with `registration_url` → external link, no form.
- Concurrency: one test fires parallel RSVPs at a capacity-1 event and asserts exactly one confirmed.

## 8. Rollout

1. Migration `002` applied to Neon (`npm run db:migrate`).
2. Ship code to `main` → Vercel deploys.
3. Cloud Supabase set up + env vars → admin works live.
4. Owner smoke-tests: create event with a seat limit, RSVP from a phone, see it in admin.
