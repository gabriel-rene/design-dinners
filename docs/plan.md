# Design Dinners Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spanish-language community landing page + admin dashboard for Design Dinners (events, speakers, resources), on Next.js + Supabase, published as public repo `gabriel-rene/design-dinners`.

**Architecture:** Single Next.js App Router app. Public landing at `/` (server-rendered, on-demand revalidation). Admin at `/admin` behind Supabase Auth magic link + `admins` allowlist table. Postgres with RLS (public read, admin-only write). Supabase Storage bucket `images` for covers/photos. Server Actions for all mutations.

**Tech Stack:** Next.js (latest, TypeScript, Tailwind v4), @supabase/supabase-js + @supabase/ssr, Vitest (unit), Playwright (smoke), Supabase CLI (local stack via Docker), gh CLI.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-14-design-dinners-website-design.md` (project root, copied into `site/docs/` in Task 1). All brand/section/RLS details there are binding.
- **Repo root is `site/`** inside the project folder; published as PUBLIC `gabriel-rene/design-dinners`.
- **Secrets:** `.env*` gitignored from commit 0; only `.env.example` committed. No service-role key used anywhere in app code. Real admin emails never committed (seed uses `admin@example.com` for local dev only).
- **Fonts:** Futura Condensed TTFs are NOT committed (commercial license unconfirmed; public repo = redistribution). They live in gitignored `public/fonts/futura/`; CSS falls back to Oswald (Google font, bundled). Inter loads via `next/font/google`.
- **Brand tokens (from style sheet):** `--dd-red:#D21432; --dd-yellow:#FAA61A; --dd-brown:#964220; --dd-cream:#F8E3CA; --dd-blue:#1687FF; --dd-black:#000000`. Cream background, red primary, yellow/brown accents, blue only as punctual detail. No shadows/strokes on the logo. Tints <60% used as background require dark text.
- **Site copy is Spanish.** Admin UI is Spanish.
- **Design execution:** every UI task's implementer MUST invoke the `impeccable` skill before writing markup/styles.
- **Models:** orchestrator = Fable; implementation subagents = Sonnet; design-heavy tasks (4, 5, 8) and final review = Opus.
- **Commits:** conventional commits, one per green test cycle. Never `git push --force`.
- Node 22, npm. Local Supabase requires Docker running.

---

### Task 1: Scaffold, repo hygiene, GitHub

**Files:**
- Create: `site/` via create-next-app (TypeScript, Tailwind, App Router, src dir, no import alias changes — keep `@/*`)
- Create: `site/.env.example`, `site/.gitignore` (extend), `site/README.md`
- Create: `site/docs/spec.md`, `site/docs/plan.md` (copies of project spec + this plan)

**Interfaces:**
- Produces: working `npm run dev`, repo `gabriel-rene/design-dinners` (public) with initial commit pushed.

- [ ] **Step 1: Scaffold**

```bash
cd "/Users/gabrielrodriguez/Library/Mobile Documents/com~apple~CloudDocs/gabo/projects/design-dinners"
npx -y create-next-app@latest site --ts --tailwind --app --src-dir --turbopack --eslint --import-alias "@/*" --use-npm --yes
cd site && npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Extend .gitignore** — append:

```gitignore
# secrets — never commit env files
.env
.env.*
!.env.example
# licensed fonts (Futura Condensed) — see README
/public/fonts/futura/
# local supabase state
/supabase/.temp/
```

- [ ] **Step 3: Create `.env.example`**

```bash
# Supabase — copy to .env.local and fill (local values come from `npx supabase start`)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-anon-key
# Site URL used in magic-link redirects
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 4: Copy spec + plan into `site/docs/`** (spec → `docs/spec.md`, this plan → `docs/plan.md`).

- [ ] **Step 5: README.md** — project intro (ES), local setup (Docker + `npx supabase start` + `.env.local`), font licensing note (Futura gitignored; how to restore: copy TTFs from brand kit to `public/fonts/futura/`), security model summary (RLS + allowlist; anon key is public by design; no service role in app).

- [ ] **Step 6: Verify dev server** — `npm run dev` responds 200 on http://localhost:3000, then stop it.

- [ ] **Step 7: Secret scan + initial commit + publish**

```bash
git add -A
git grep -nE '(service_role|sb_secret|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9|ghp_|gho_)' -- . ':!package-lock.json' && echo "SECRETS FOUND - STOP" || echo clean
git commit -m "feat: scaffold Next.js app with security hygiene"
gh repo create gabriel-rene/design-dinners --public --source=. --push --description "Sitio de la comunidad Design Dinners — Delicious Collective"
```

Expected: repo visible at github.com/gabriel-rene/design-dinners.

---

### Task 2: Supabase schema, RLS, storage, seed (local stack)

**Files:**
- Create: `site/supabase/migrations/20260714000000_init.sql`
- Create: `site/supabase/seed.sql`
- Modify: `site/supabase/config.toml` (created by `npx supabase init`; set `auth.site_url = "http://localhost:3000"`, add `auth.additional_redirect_urls = ["http://localhost:3000/auth/callback"]`)

**Interfaces:**
- Produces: tables `events`, `speakers`, `event_speakers`, `resources`, `admins`; function `public.is_admin()`; public storage bucket `images` with admin-only write; local stack running with seed data. Column names exactly as below — all later tasks depend on them.

- [ ] **Step 1: Init supabase project files**

```bash
cd site && npx -y supabase init
```

- [ ] **Step 2: Write migration** `supabase/migrations/20260714000000_init.sql`:

```sql
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date timestamptz not null,
  location text,
  event_type text not null default 'cena' check (event_type in ('cena','taller','otro')),
  registration_url text,
  cover_image_url text,
  created_at timestamptz not null default now()
);

create table public.speakers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role_title text,
  bio text,
  photo_url text,
  social_links jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.event_speakers (
  event_id uuid not null references public.events(id) on delete cascade,
  speaker_id uuid not null references public.speakers(id) on delete cascade,
  primary key (event_id, speaker_id)
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  url text not null,
  category text not null,
  created_at timestamptz not null default now()
);

create table public.admins (
  email text primary key
);

alter table public.events enable row level security;
alter table public.speakers enable row level security;
alter table public.event_speakers enable row level security;
alter table public.resources enable row level security;
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.admins where email = (auth.jwt() ->> 'email')) $$;

-- public read on content tables
create policy "public read" on public.events for select using (true);
create policy "public read" on public.speakers for select using (true);
create policy "public read" on public.event_speakers for select using (true);
create policy "public read" on public.resources for select using (true);
-- admins table: RLS enabled, NO select policy → not readable by anon/authenticated.

-- admin-only writes
create policy "admin write" on public.events for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.speakers for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.event_speakers for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.resources for all using (public.is_admin()) with check (public.is_admin());

-- storage: public-read images bucket, admin-only write
insert into storage.buckets (id, name, public) values ('images', 'images', true);
create policy "public read images" on storage.objects for select using (bucket_id = 'images');
create policy "admin insert images" on storage.objects for insert with check (bucket_id = 'images' and public.is_admin());
create policy "admin update images" on storage.objects for update using (bucket_id = 'images' and public.is_admin());
create policy "admin delete images" on storage.objects for delete using (bucket_id = 'images' and public.is_admin());
```

- [ ] **Step 3: Write seed** `supabase/seed.sql` — local dev/test data ONLY (no real emails):

```sql
insert into public.admins (email) values ('admin@example.com');

insert into public.events (id, title, description, event_date, location, event_type, registration_url) values
 ('00000000-0000-0000-0000-000000000001','Design Dinners Vol. 9','Una cena para hablar de IA en industrias creativas.', now() + interval '21 days','San Juan, PR','cena','https://example.com/rsvp'),
 ('00000000-0000-0000-0000-000000000002','Human Centered Design','Cena y conversatorio sobre diseño centrado en las personas.', now() - interval '60 days','Santurce, PR','cena',null),
 ('00000000-0000-0000-0000-000000000003','Taller: fundamentos de desarrollo','GitHub, Supabase y Vercel dirigidos con Claude.', now() - interval '10 days','Online','taller',null);

insert into public.speakers (id, name, role_title, bio, social_links) values
 ('00000000-0000-0000-0000-00000000000a','Ana Rivera','Directora de Diseño','Lidera equipos de producto hace 10 años.','[{"label":"LinkedIn","url":"https://linkedin.com/in/example"}]'),
 ('00000000-0000-0000-0000-00000000000b','Luis Ortiz','Design Engineer','Puentes entre diseño y código.','[]');

insert into public.event_speakers (event_id, speaker_id) values
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a'),
 ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000b');

insert into public.resources (title, description, url, category) values
 ('Hoja de estilo de marca','Colores, tipografía y logos de Design Dinners.','https://example.com/style-sheet','plantillas'),
 ('Slides del taller de desarrollo','Materiales del taller GitHub + Supabase + Vercel.','https://example.com/taller','talleres');
```

- [ ] **Step 4: Start local stack + verify**

```bash
npx supabase start   # prints API URL + anon key
npx supabase db reset  # applies migration + seed
```

Write printed URL/anon key into `.env.local` (NOT committed). Verify: `curl -s "http://127.0.0.1:54321/rest/v1/events?select=title" -H "apikey: $ANON"` returns the 3 seeded events; same query on `admins` returns `[]` or error (blocked).

- [ ] **Step 5: Commit** — `git add supabase .env.example && git commit -m "feat: supabase schema, RLS, storage policies, local seed"` (confirm `.env.local` untracked first).

---

### Task 3: Types, Supabase clients, derivation logic + unit tests

**Files:**
- Create: `site/src/lib/types.ts`, `site/src/lib/supabase/server.ts`, `site/src/lib/supabase/client.ts`, `site/src/lib/supabase/middleware.ts`, `site/src/lib/derive.ts`, `site/src/lib/queries.ts`
- Create: `site/src/lib/derive.test.ts`, `site/vitest.config.ts`
- Modify: `site/package.json` (scripts: `"test": "vitest run"`, `"test:unit": "vitest"`)

**Interfaces:**
- Produces (exact — later tasks import these):
  - `types.ts`: `SocialLink {label:string; url:string}`, `EventRow`, `SpeakerRow`, `ResourceRow` (mirror SQL columns; `EventWithSpeakers = EventRow & {speakers: SpeakerRow[]}`).
  - `derive.ts`: `isUpcoming(event: {event_date: string}, now?: Date): boolean`; `splitEvents<T extends {event_date: string}>(events: T[], now?: Date): {upcoming: T[]; past: T[]}` (upcoming asc, past desc); `speakerStatus(speakerId: string, events: EventWithSpeakers[], now?: Date): 'past'|'upcoming'` ('upcoming' when speaker has no past events); `groupResources(resources: ResourceRow[]): Map<string, ResourceRow[]>` (categories alphabetical, items by created_at desc).
  - `queries.ts` (server-only): `getEventsWithSpeakers(): Promise<EventWithSpeakers[]>`, `getSpeakers(): Promise<SpeakerRow[]>`, `getResources(): Promise<ResourceRow[]>`.
  - `supabase/server.ts`: `createClient(): Promise<SupabaseClient>` (cookie-bound via `@supabase/ssr` `createServerClient` + `next/headers` cookies).
  - `supabase/client.ts`: `createClient()` browser client via `createBrowserClient`.
  - `supabase/middleware.ts`: `updateSession(request: NextRequest): Promise<{response: NextResponse; user: User | null}>` per @supabase/ssr docs pattern.

- [ ] **Step 1:** `npm i -D vitest` + `vitest.config.ts` (node env, include `src/**/*.test.ts`).
- [ ] **Step 2:** Write failing tests in `derive.test.ts` — cases: event dated tomorrow → upcoming; yesterday → past; `splitEvents` ordering (upcoming soonest-first, past most-recent-first); speaker with only future event → 'upcoming'; speaker with one past + one future event → 'past'; speaker with no events → 'upcoming'; `groupResources` groups by category alphabetically. Use fixed `now = new Date('2026-07-14T12:00:00Z')` injected as parameter — no real clock.
- [ ] **Step 3:** Run `npm test` → FAIL (module not found).
- [ ] **Step 4:** Implement `derive.ts` (pure functions, no Supabase imports).
- [ ] **Step 5:** `npm test` → PASS.
- [ ] **Step 6:** Implement types + clients + `queries.ts` (queries select `*, event_speakers(speaker_id, speakers(*))` for events and map to `EventWithSpeakers`). `npm run build` must pass.
- [ ] **Step 7:** Commit `feat: data layer with derived event/speaker logic`.

---

### Task 4: Brand foundation (fonts, tokens, global styles) — **invoke `impeccable` skill; model: Opus**

**Files:**
- Create: `site/src/app/fonts.ts`, `site/scripts/copy-fonts.sh`
- Modify: `site/src/app/globals.css`, `site/src/app/layout.tsx`
- Copy (gitignored): Futura TTFs from `../design dinners/Design Dinners Fonts/` → `site/public/fonts/futura/`

**Interfaces:**
- Produces: CSS custom props `--dd-red|yellow|brown|cream|blue|black`; font stacks: headings `var(--font-futura)` → `@font-face 'Futura Condensed'` (local files) with Oswald (via `next/font/google`, weights 500/700) as fallback; body Inter (`next/font/google`). `<html lang="es">`. Metadata: title "Design Dinners — Delicious Collective", description in Spanish.

- [ ] **Step 1:** `scripts/copy-fonts.sh` — copies the two Futura TTFs from the brand kit path into `public/fonts/futura/` (idempotent, warns if source missing). Run it.
- [ ] **Step 2:** `globals.css` — Tailwind v4 `@theme` tokens mapping brand colors + `@font-face` for Futura Condensed Medium (weight 500) and ExtraBold (weight 800) with `font-display: swap`, `src: url('/fonts/futura/...')`. Heading utility uses `'Futura Condensed', var(--font-oswald), sans-serif`.
- [ ] **Step 3:** `layout.tsx` — lang="es", Inter + Oswald via next/font, metadata, cream body background, black text.
- [ ] **Step 4:** Verify in dev: headings render Futura when files present; delete files temporarily → Oswald renders (no build failure). Restore.
- [ ] **Step 5:** Commit `feat: brand foundation — tokens, typography, es locale`.

---

### Task 5: Landing page — **invoke `impeccable` skill; model: Opus**

**Files:**
- Create: `site/src/components/landing/Hero.tsx`, `NextEvent.tsx`, `PastEvents.tsx`, `Speakers.tsx`, `Resources.tsx`, `About.tsx`, `site/src/components/EventCard.tsx`, `site/src/components/BrandImage.tsx` (image with brand-pattern fallback)
- Create: `site/public/brand/` — copy from brand kit: primary logo SVG (papita yellow + black variants), mascot logo, logo icon SVG. (Logos ARE committed — the style sheet explicitly authorizes the community to use brand elements.)
- Modify: `site/src/app/page.tsx`

**Interfaces:**
- Consumes: `getEventsWithSpeakers`, `getSpeakers`, `getResources`, `splitEvents`, `speakerStatus`, `groupResources`.
- Produces: sections with stable ids/test hooks: `#hero`, `#proximo-evento`, `#eventos-pasados`, `#speakers`, `#recursos`, `#sobre`. WhatsApp CTA href from `NEXT_PUBLIC_WHATSAPP_URL` env (add to `.env.example`; fallback `#` + TODO note in README, not in code).

**Behavior (binding):** page is a server component fetching all data; `export const revalidate = false` with on-demand revalidation (Task 8 calls `revalidatePath('/')`). Section rules from spec §5: NextEvent shows soonest upcoming large (cover, date es-PR long format, location, type badge, registration button when `registration_url` present); extra upcoming events as smaller cards; empty state "Estamos cocinando la próxima cena" + WhatsApp CTA. PastEvents grid with speakers names. Speakers grid with photo/role/social links; "Próximamente" badge when `speakerStatus === 'upcoming'`. Resources grouped by category; Speakers/Resources sections hidden entirely when empty. Mobile-first responsive.

- [ ] **Step 1:** Invoke `impeccable` skill; design the page per spec §5 brand rules.
- [ ] **Step 2:** Copy logo assets to `public/brand/`.
- [ ] **Step 3:** Implement components + `page.tsx` wiring real data.
- [ ] **Step 4:** Verify against local seed: 1 upcoming + 2 past events, 2 speakers, 2 resource categories render; then empty-DB check (`truncate` content tables in a psql shell, reload, confirm empty states, `npx supabase db reset` to restore).
- [ ] **Step 5:** `npm run build` passes. Commit `feat: landing page with brand execution`.

---

### Task 6: Playwright smoke — landing

**Files:**
- Create: `site/playwright.config.ts`, `site/e2e/landing.spec.ts`
- Modify: `site/package.json` (script `"test:e2e": "playwright test"`)

- [ ] **Step 1:** `npm i -D @playwright/test && npx playwright install chromium`. Config: `webServer: {command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true}`.
- [ ] **Step 2:** Failing-first spec: expects `#hero` visible with WhatsApp CTA link, `#proximo-evento` shows seeded "Design Dinners Vol. 9" with RSVP link, `#eventos-pasados` contains both past events, `#speakers` has 2 cards, `#recursos` shows both categories, page `lang="es"`.
- [ ] **Step 3:** Run `npm run test:e2e` → PASS (fix page until green).
- [ ] **Step 4:** Commit `test: landing smoke suite`.

---

### Task 7: Auth — magic link, middleware, allowlist gate

**Files:**
- Create: `site/src/middleware.ts`, `site/src/app/admin/login/page.tsx`, `site/src/app/admin/login/actions.ts`, `site/src/app/auth/callback/route.ts`, `site/src/app/admin/no-autorizado/page.tsx`, `site/src/lib/auth.ts`
- Test: `site/e2e/auth.spec.ts`

**Interfaces:**
- Produces: `lib/auth.ts` → `requireAdmin(): Promise<{supabase: SupabaseClient; user: User}>` — creates server client, gets user, calls `supabase.rpc('is_admin')`; throws redirect to `/admin/login` (no user) or `/admin/no-autorizado` (not allowlisted). Every admin page and server action calls this.
- `middleware.ts`: matcher `['/admin/:path*']`, refreshes session via `updateSession`, redirects unauthenticated to `/admin/login` (except `/admin/login` itself). Middleware is UX only; `requireAdmin` is the enforcement.
- Login action: `signInWithOtp({email, options: {emailRedirectTo: NEXT_PUBLIC_SITE_URL + '/auth/callback?next=/admin'}})`; callback route exchanges code (`exchangeCodeForSession`) then redirects to `next`.

- [ ] **Step 1:** Failing e2e: anonymous `/admin` → redirected to `/admin/login`; login page shows email form.
- [ ] **Step 2:** Implement middleware + login + callback + no-autorizado (branded, with "cerrar sesión").
- [ ] **Step 3:** Manual verification of full flow with local mail catcher: submit `admin@example.com` → open Mailpit (`http://127.0.0.1:54324`) → click link → land on `/admin` (placeholder page for now). Then log in as `otro@example.com` → `/admin/no-autorizado`.
- [ ] **Step 4:** e2e green. Commit `feat: magic-link auth with admin allowlist`.

---

### Task 8: Admin dashboard CRUD — **invoke `impeccable` skill; model: Opus**

**Files:**
- Create: `site/src/app/admin/page.tsx` (nav dashboard), `site/src/app/admin/layout.tsx` (calls `requireAdmin`, branded chrome)
- Create per entity: `site/src/app/admin/eventos/page.tsx` (list), `eventos/nuevo/page.tsx`, `eventos/[id]/page.tsx` (edit), `site/src/app/admin/eventos/actions.ts`; same trio + actions for `speakers/` and `recursos/`
- Create: `site/src/components/admin/EventForm.tsx`, `SpeakerForm.tsx`, `ResourceForm.tsx`, `DeleteButton.tsx` (confirm dialog), `ImageField.tsx`
- Test: `site/e2e/admin.spec.ts`

**Interfaces:**
- Consumes: `requireAdmin`, queries, types.
- Produces server actions (all: `'use server'`, call `requireAdmin()` first, validate, mutate, `revalidatePath('/')` + `revalidatePath('/admin/...')`, return `{error?: string}` for inline display):
  - eventos: `createEvent(formData)`, `updateEvent(id, formData)`, `deleteEvent(id)` — fields per schema + `speaker_ids: string[]` (replace-all into `event_speakers`) + optional image file uploaded to `images/events/{uuid}.{ext}` via the session-bound server client (RLS enforces admin), storing public URL in `cover_image_url`.
  - speakers: `createSpeaker/updateSpeaker/deleteSpeaker` — social links as repeatable label+URL pairs serialized to jsonb; photo upload to `images/speakers/`.
  - recursos: `createResource/updateResource/deleteResource` — category text input with datalist of existing categories.
- Validation (server-side): title/name/url/category required per spec; `event_date` valid date; URLs must parse as http(s). Invalid → return error, no partial write.

- [ ] **Step 1:** Invoke `impeccable` skill (branded-utilitarian direction per spec §6).
- [ ] **Step 2:** Failing e2e: seeded-admin session can create an event and see it listed; new event appears on `/` without rebuild. (Session for tests: programmatic login via magic-link email from Mailpit API, encapsulated in `e2e/helpers/login.ts`.)
- [ ] **Step 3:** Implement eventos (layout + list + forms + actions + upload) → e2e green → commit `feat: admin eventos CRUD`.
- [ ] **Step 4:** Implement speakers → extend e2e → commit `feat: admin speakers CRUD`.
- [ ] **Step 5:** Implement recursos → extend e2e → commit `feat: admin recursos CRUD`.
- [ ] **Step 6:** Delete-confirmation and error-state pass: deleting event keeps speakers; Supabase error surfaces as inline message. Commit.

---

### Task 9: Final review, audit, docs, push

- [ ] **Step 1:** Full suite: `npm test && npm run build && npm run test:e2e` — all green.
- [ ] **Step 2:** Invoke `impeccable` skill (critique/audit mode) on landing + admin in the browser; fix findings worth fixing.
- [ ] **Step 3:** Security pass: `git grep` secret-pattern scan on full history (`git log -p | grep -cE 'service_role|sb_secret'` → 0); confirm `.env.local` untracked; confirm `admins` table unreadable via anon REST; confirm anon insert to `events` REST returns 401/403.
- [ ] **Step 4:** README final: deploy runbook (create cloud Supabase project → `npx supabase link` + `db push` → insert real admin email via SQL editor → set Vercel env vars → import repo in Vercel → set auth redirect URLs → point domain). List of owner-only steps (accounts, WhatsApp URL, Futura license).
- [ ] **Step 5:** Push. Commit `docs: deploy runbook`.

---

## Self-review notes

- Spec coverage: §3 architecture → Tasks 2/3/7/8; §4 model → Task 2; §5 landing → Tasks 4/5/6; §6 admin → Task 8; §6b security → Tasks 1/2/9; §7 errors/empty states → Tasks 5/8; §8 testing → Tasks 3/6/7/8/9; §10 external deps → Task 9 runbook.
- Deploy itself (Vercel/cloud Supabase/domain) is owner-gated and intentionally out of task scope; runbook covers it.
