# Design Dinners

Public community site plus a small protected CMS for future events, past events,
and speakers.

## Architecture

- Next.js App Router on Vercel
- Neon Postgres for events, speakers, and event–speaker relationships
- Supabase Auth for passwordless admin sessions
- Supabase Storage for event covers and speaker photos
- Server Actions for CMS mutations

The public landing falls back to local demo content when `DATABASE_URL` is not
configured. The CMS requires Neon and Supabase configuration.

## Local setup

Requirements: Node 22 and npm.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and provide:

   - `DATABASE_URL`: pooled Neon connection string
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase publishable/anon key
   - `NEXT_PUBLIC_SITE_URL`: `http://localhost:3000`
   - `NEXT_PUBLIC_WHATSAPP_URL`: WhatsApp group invitation
   - `RSVP_IP_SALT`: secret salt for hashing RSVP IPs (generate with
     `openssl rand -hex 32`)
   - `SUPABASE_SERVICE_ROLE_KEY`: server-only key used by La Vitrina. Locally,
     copy `SERVICE_ROLE_KEY` from `npx supabase status`. Never give it a
     `NEXT_PUBLIC_` prefix.

3. Create the Neon schema:

   ```bash
   npm run db:migrate
   ```

4. Apply `supabase/migrations/20260714000000_init.sql` to the Supabase project.
   This creates only the admin allowlist helper and the image bucket/policies.

5. Add each authorized admin through the Supabase SQL editor:

   ```sql
   insert into public.admins (email) values ('organizer@example.com');
   ```

6. Enable email magic-link authentication in Supabase and add:

   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/auth/callback`

7. Start the app:

   ```bash
   npm run dev
   ```

The CMS lives at `/admin`.

## RSVPs

Each event has a public page at `/eventos/[id]` with a reservation form.
Events can have a seat limit; when full, new guests join a waitlist.
Admins manage reservations at `/admin/eventos/[id]/reservas`: change the seat
limit, review the list, and export it as CSV.

RSVPs are stored in Neon, so run `npm run db:migrate` before using them. The
migration only adds tables and columns.

## La Vitrina

`/vitrina` is a vertical, Shorts-style feed of work by community members.
Anyone can send a piece at `/vitrina/enviar`; it stays hidden until an admin
approves it at `/admin/vitrina`. Visitors give "papitas" (a fries-shaped like)
with a double-tap or the button. The data lives in Supabase (tables plus the
`vitrina-pending` and `vitrina` storage buckets); apply the migrations with
`npx supabase migration up` (never `db reset` on a shared local stack).

## Security model

- Admin access: Supabase Auth magic links plus the `admins` allowlist. Every
  admin page and server action calls `requireAdmin()` first; the proxy is UX
  only and is never the gate.
- The Supabase anon key is public by design and only reads what RLS allows.
- La Vitrina uses the Supabase service role on the server only
  (`SUPABASE_SERVICE_ROLE_KEY`, never `NEXT_PUBLIC_`). Its tables deny
  `anon`/`authenticated` entirely; public actions validate and rate-limit
  before using it, admin actions call `requireAdmin()` first.
- Submitter emails and IP hashes never reach public pages or the client.
- Neon (events, RSVPs) is reached only from Server Components and Server
  Actions.

## Tests

- `npm test`: unit tests (Vitest).
- `npm run test:db`: RSVP database tests against the Neon branch in
  `.env.local`.
- `npm run test:e2e`: Playwright end-to-end tests.
- `npm run test:e2e:rsvp`: RSVP end-to-end flow only (needs `.env.local`).
- `npm run test:vitrina-db`: La Vitrina data-layer tests against the local
  Supabase stack (needs `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`).
- `npm run test:e2e:vitrina`: La Vitrina end-to-end flow on port 3100, so it
  never reuses a dev server running on 3000. Needs local Supabase, the service
  role key and the seeded admin. It creates and deletes only rows whose title
  carries its own `E2E-VITRINA-` stamp.

## Vercel deployment

1. Import `gabriel-rene/design-dinners` into Vercel.
2. Add the Neon integration or manually set `DATABASE_URL`.
3. Add the environment variables listed above for Production and Preview,
   using the production domain for `NEXT_PUBLIC_SITE_URL`. `RSVP_IP_SALT` is a
   secret: mark it Sensitive in Vercel.
4. Add these Supabase Auth URLs:

   - `https://your-domain.com/auth/callback`
   - `https://your-project.vercel.app/auth/callback`

5. Run `npm run db:migrate` once against the production Neon branch.
6. Deploy.

For the non-technical, step-by-step Supabase setup (project, admin email,
login URLs, Vercel variables), see
[`docs/supabase-cloud-setup.md`](docs/supabase-cloud-setup.md).

Neon is accessed only from Server Components and Server Actions through the
official serverless driver. The database connection string must never use a
`NEXT_PUBLIC_` prefix.

## Image and font notes

Images remain in Supabase Storage so Neon stores only durable public URLs.
Uploads are limited to authenticated, allowlisted admins.

Headings use Jost and body text uses Inter, both from Google Fonts and
self-hosted at build time by `next/font`. No font license is needed.
