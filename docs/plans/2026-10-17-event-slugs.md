# Event slugs + community event pages — design and plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Event URLs use the event name (`/eventos/de-mad-men-a-la-era-del-meme`), old links keep working, and community events get their own page (`/eventos/comunidad/<slug>`) instead of linking straight out.

**Owner decisions (2026-10-17):** slugs from the event name; the name can change, so old links must keep working; community events need their own landing page. Owner skipped the questions — everything else below is Claude's call.

**Tech:** Next.js 16 (read `AGENTS.md`), Neon (Design Dinners events, `db/*.sql` run by `npm run db:migrate` — every file re-runs, so statements must be idempotent and contain no `;` inside), Supabase (community events, `supabase/migrations/`), Vitest.

## Design (Claude's calls)

**Slug rule** (`slugify`): lowercase; strip accents (NFD + remove combining marks; `ñ`→`n`); every run of non `[a-z0-9]` → `-`; trim `-`; cut to 80 chars at a `-` boundary when possible; empty result → `evento`. Reserved (never a slug): `enviar`, `comunidad`. Collisions get `-2`, `-3`, ….

**Design Dinners events (Neon):**
- `events.slug text` (nullable, unique index) and `events.old_slugs text[] not null default '{}'`. Nullable on purpose: the current production code keeps inserting events without a slug between migration and deploy; the app always sets it from now on, and links fall back to the id when it is null.
- Backfill in SQL (`unaccent` extension), deduped with `row_number()` by `created_at`.
- Admin create: slug from title. Admin update: if the title changed, compute a new unique slug, push the previous slug into `old_slugs` (no duplicates). The slug is not editable by hand.
- Route folder `src/app/eventos/[id]` → `src/app/eventos/[slug]` (page, actions, calendario.ics, not-found). Lookup order: current slug → render; uuid or an old slug → `permanentRedirect` to `/eventos/<current slug>` (query string dropped). Unknown → 404.
- One helper `eventPath(event: { id: string; slug: string | null })` → `/eventos/${slug ?? id}` used by every public link: EventCard, SpeakerSpotlight, NextEvent, AgendaList, admin reservas "Ver página", cancel page links, OG `url`, ICS URL and `calendarHref`, `rsvp-notify` `eventUrl`.
- `revalidatePath(\`/eventos/${eventId}\`)` calls become `revalidatePath("/eventos/[slug]", "page")`.

**Community events (Supabase):**
- `community_events.slug text` unique; backfill existing rows in the migration (`unaccent`, dedupe); recreate `community_events_public` with `slug`. Insert sets a unique slug (check `slug` among all rows; reserved words apply).
- New page `src/app/eventos/comunidad/[slug]/page.tsx` (cream page, `SiteHeader current="eventos"`, back link "← Agenda" → `/eventos?tipo=comunidad`):
  - Big poster (4:5), "Comunidad" tag, title, date + time, place with a Google Maps link (`mapsUrl` from `rsvp-email.ts`), "Organiza {organizer}" if set, "Gratis"/"Pago" if set, description (keeps line breaks).
  - Note: "Este evento lo organiza la comunidad, no Design Dinners."
  - Primary button "Ver evento en el sitio del organizador" → `link` (new tab, `rel="noopener noreferrer nofollow ugc"`). `ShareButton` (existing component) for sharing.
  - Shows any **published** event, also after its day; past ones show a banner "Este evento ya pasó." and hide the organizer button. Unknown, pending or rejected → 404.
  - Metadata: title "{title} — Eventos — Design Dinners", description, OG image = poster.
  - `revalidate = 3600`; admin actions also `revalidatePath("/eventos/comunidad/[slug]", "page")`.
- Links: Agenda community rows and the landing "En la comunidad" cards now go to this page (same tab, no external arrow). Approval email button → the event's page. Admin review card shows "Ver página" for published events.

**Not doing:** custom slugs in admin, slug history for community events (they are never renamed), a calendar file for community events, a sitemap.

## Global Constraints

- Work in `~/dev/design-dinners/site-eventos-hub` on branch `feat/event-slugs`. Neon is the PRODUCTION database (shared by dev): **do not run `npm run db:migrate` or any write against Neon** — the controller applies migrations after owner approval. Supabase integration tests run only against LOCAL Supabase.
- Spanish copy exactly as above. Commit messages end with a blank line then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never `pkill`. No dev server (controller checks).

## Review Focus

1. Title "Diseño & Café: ¿Qué sigue?" → `diseno-cafe-que-sigue`; title of only emoji → `evento`. (Task 1 tests.)
2. Two events named the same → second gets `-2`; renaming back to an old name of the SAME event reuses it without a suffix. (Task 1 tests on `uniqueSlug`.)
3. An event titled "Enviar" or "Comunidad" must not shadow `/eventos/enviar` or `/eventos/comunidad`. (Task 1 tests.)
4. Old uuid links from already-sent emails redirect, including `/eventos/<uuid>/calendario.ics`. (Task 3 check + controller browser.)
5. Community page for a pending event is 404 even if someone guesses the slug. (Task 4 int test.)

---

### Task 1: Slug helpers (pure)

**Files:** Create `src/lib/slug.ts`, `src/lib/slug.test.ts`.

**Produces:**
```ts
export const RESERVED_SLUGS: readonly string[]; // ["enviar", "comunidad"]
export function slugify(title: string): string;
/** First free of base, base-2, base-3… not in `taken` and not reserved. */
export function uniqueSlug(base: string, taken: Iterable<string>): string;
export function eventPath(event: { id: string; slug: string | null }): string;
export function communityEventPath(event: { slug: string }): string; // "/eventos/comunidad/<slug>"
```
- [ ] Tests: `slugify("De Mad Men a la era del meme")` → `de-mad-men-a-la-era-del-meme`; `"Diseño & Café: ¿Qué sigue?"` → `diseno-cafe-que-sigue`; `"  --Hola--  "` → `hola`; `"🎨🍟"` → `evento`; a 120-char title → ≤ 80 chars, no trailing `-`. `uniqueSlug("cena", [])` → `cena`; `uniqueSlug("cena", ["cena","cena-2"])` → `cena-3`; `uniqueSlug("enviar", [])` → `enviar-2`; `uniqueSlug("comunidad", [])` → `comunidad-2`. `eventPath({id:"u", slug:null})` → `/eventos/u`; with slug → `/eventos/<slug>`. `communityEventPath({slug:"x"})` → `/eventos/comunidad/x`.
- [ ] RED → implement → GREEN (`npx vitest run src/lib/slug.test.ts`), `npx tsc --noEmit`. Commit "Slug helpers for event URLs".

### Task 2: Neon slugs (migration + data)

**Files:** Create `db/006_event_slugs.sql`. Modify `src/lib/types.ts` (`EventRow.slug: string | null`, `old_slugs: string[]`), `src/lib/demo-data.ts` (add slugs), `src/lib/queries.ts`, `src/app/admin/(panel)/eventos/actions.ts`.

**Produces:**
```ts
// queries.ts
export type EventLookup = { event: EventWithSpeakers; canonical: boolean } | null;
/** By current slug (canonical) or by uuid / old slug (canonical=false → caller redirects to eventPath(event)). */
export async function findPublicEvent(slugOrId: string): Promise<EventLookup>;
```
- Migration (idempotent, no `;` inside a statement): `create extension if not exists unaccent`; add both columns `if not exists`; one `update … set slug = …` backfill only `where slug is null` using `lower(unaccent(title))`, `regexp_replace(…, '[^a-z0-9]+', '-', 'g')`, trim `-`, `left(…, 80)`, `nullif(…,'')` → `'evento'`, reserved words → append `-2`, dedupe with `row_number() over (partition by base order by created_at, id)` (n>1 → `base-n`); `create unique index if not exists events_slug_uidx on events (slug)`; `create index if not exists events_old_slugs_idx on events using gin (old_slugs)`.
- Admin create/update: load all `slug` + `old_slugs` of OTHER events as `taken` (an event may reuse its own current/old slugs), `uniqueSlug(slugify(title), taken)`; on update with a changed slug append the previous slug to `old_slugs` (`array_append` only if not already present) and remove the new slug from `old_slugs` if it was there.
- `getPublicEvent(id)` stays for internal callers (actions, ics, notify); `findPublicEvent` is for the page.
- [ ] Write the migration and code; `npx tsc --noEmit`, `npm run lint`, `npm test` pass (existing demo-data tests). Do NOT run the migration. Commit "Event slugs in Neon: columns, backfill, admin keeps them in sync".

### Task 3: Routes and links for Design Dinners events

**Files:** `git mv src/app/eventos/[id] src/app/eventos/[slug]` (page, actions, not-found, calendario.ics/route.ts); modify every link listed in Design → "One helper …" and every `revalidatePath(\`/eventos/${…}\`)`.
- Page: `const lookup = await loadEvent(slug)` (`cache(findPublicEvent)`); `null` → `notFound()`; `!canonical` → `permanentRedirect(eventPath(lookup.event))`. Same in `generateMetadata` (return the canonical URL in `openGraph.url` / `alternates.canonical`).
- ICS route: same lookup; non-canonical → `permanentRedirect(\`${eventPath(event)}/calendario.ics\`)`.
- RSVP server action in `[slug]/actions.ts` keeps working with the event id it already receives (check how it gets the id; it must not depend on the URL segment being a uuid).
- [ ] `grep -rnF 'eventos/${' src` shows no public link built from `.id` except `eventPath`'s fallback and admin `/admin/eventos/${id}` paths. `npx tsc --noEmit`, `npm run lint`, `npm test`, `npx next build` pass. Commit "Design Dinners event pages live at /eventos/<slug>; old links redirect".

### Task 4: Community slugs (Supabase)

**Files:** Create `supabase/migrations/20261017000000_community_event_slugs.sql`. Modify `src/lib/otros-eventos/types.ts` (`slug: string` on public + admin types), `db.ts` (select `slug`; `insertCommunityEvent` sets a unique slug — read existing slugs with `like '<base>%'`; new `getPublishedCommunityEventBySlug(db, slug): Promise<(PublicCommunityEvent & { isPast: boolean }) | null>` reading `community_events` where `status='published'` and `slug = $1` with PUBLIC columns only, `isPast` = its PR day before `prToday()`), `db.int.test.ts`.
- Migration: `create extension if not exists unaccent with schema extensions`; add `slug text`; backfill like Task 2 (by `created_at`); `create unique index if not exists community_events_slug_uidx`; `alter column slug set not null`; recreate `community_events_public` (same filter, `security_invoker = true`, add `slug`) and re-apply its revoke/grant lines.
- [ ] Int tests (local Supabase, `npm run test:otros-eventos-db`): insert two events with the same title → slugs `x` and `x-2`; `getPublishedCommunityEventBySlug` returns null for pending and rejected, returns the row (no `submitter_email` key) for published, `isPast` true for an event 3 days ago. Apply the migration locally with `docker exec -i supabase_db_site psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/migrations/20261017000000_community_event_slugs.sql`. Commit "Community event slugs".

### Task 5: Community event page + links

Use the `impeccable` skill for the page visuals (Design Dinners style, like `/eventos` and `/eventos/enviar`).

**Files:** Create `src/app/eventos/comunidad/[slug]/page.tsx` (and `not-found` reuse if simple). Modify `src/components/eventos/AgendaList.tsx` (community row → `communityEventPath`, same tab, remove "(abre en otra pestaña)" and the external arrow), `src/components/otros-eventos/CommunityEventCard.tsx` (same), `src/lib/otros-eventos/notify.ts` + `approveCommunityEvent` return value to carry `slug` (email button → `${SITE}${communityEventPath(...)}`), `src/lib/otros-eventos/email.test.ts` if the URL shape is asserted, `src/components/admin/CommunityEventReviewCard.tsx` ("Ver página" link for published), admin actions revalidate `/eventos/comunidad/[slug]`.
- Page content and rules exactly as in Design → "New page".
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run test:otros-eventos-db`, `npx next build` (lists `/eventos/[slug]` and `/eventos/comunidad/[slug]`). Commit "Community events get their own page".

### Task 6 (controller)

Ask the owner before applying `db/006` to Neon (production) and the Supabase migration to cloud. Then browser check (Review Focus 1–5, the community page at 375 px), final review, PR.

**Owner addition (2026-10-17):** the landing footer (`About`) also appears at the end of `/eventos`, `/eventos/enviar`, `/eventos/[slug]` and `/eventos/comunidad/[slug]` (Task 5).
