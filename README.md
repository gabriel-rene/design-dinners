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
Every event has a seat limit. When it is full, new guests join a waitlist.
Admins manage reservations at `/admin/eventos/[id]/reservas`: change the seat
limit, review the list, and export it as CSV.

RSVPs are stored in Neon, so run `npm run db:migrate` before using them. The
migration only adds tables and columns.

## Tests

- `npm test`: unit tests (Vitest).
- `npm run test:db`: RSVP database tests against the Neon branch in
  `.env.local`.
- `npm run test:e2e`: Playwright end-to-end tests.
- `npm run test:e2e:rsvp`: RSVP end-to-end flow only (needs `.env.local`).

## Vercel deployment

1. Import `gabriel-rene/design-dinners` into Vercel.
2. Add the Neon integration or manually set `DATABASE_URL`.
3. Add the public environment variables and `RSVP_IP_SALT` listed above for
   Production and Preview, using the production domain for
   `NEXT_PUBLIC_SITE_URL`.
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
