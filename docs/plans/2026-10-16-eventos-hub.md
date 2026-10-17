# Eventos hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One `/eventos` page with all events (Design Dinners featured first, then a date-sorted Agenda with filters, a share box, and past dinners), the send form moved to `/eventos/enviar`, and `/otros-eventos` removed.

**Architecture:** A pure `buildAgenda` merges Design Dinners events (Neon) and community events (Supabase view) into typed, sorted rows. The page is a dynamic Server Component that reads `?tipo=` and reuses `NextEvent` (featured only) and `PastEvents`. The header nav moves into a shared `SiteHeader`.

**Tech Stack:** Next.js 16 App Router (read `AGENTS.md`), React 19, Tailwind v4, Vitest.

**Spec:** `docs/specs/2026-10-16-eventos-hub-design.md` (read the whole spec, including "Calls made after the builder check"). Approved mockup B: `~/dev/design-dinners/.superpowers/brainstorm/22602-1792186303/content/eventos-page.html`.

## Global Constraints

- Work only in `~/dev/design-dinners/site-eventos-hub` (branch `feat/eventos-hub`).
- Spanish (Puerto Rico) copy, exact strings from the spec.
- Design Dinners always above community: featured card on every filter; red rows for Design Dinners; plain rows + "Comunidad" tag for community.
- Filter param `tipo`: `design-dinners`, `comunidad`; missing or unknown = Todos.
- Community links: `target="_blank" rel="noopener noreferrer nofollow ugc"`, accessible name ends "(abre en otra pestaña)".
- Supabase failure or missing config must not break `/eventos` or `/` (Design Dinners still shows). Log with `logSafe`.
- 375 px: no horizontal scroll. Visible focus on every link (black outline on cream; cream outline on red).
- Commit messages end with a blank line then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never run `pkill`. Do not start a dev server (the controller checks in the browser).

## Review Focus

1. **Featured Design Dinners event is also the soonest event overall:** it must not appear twice (card + Agenda row). Test in Task 1 (`excludes the featured event`).
2. **A Design Dinners event happens today but its time already passed:** it drops out (Design Dinners use exact time via `isUpcoming`), while a community event today stays until midnight PR (view rule). Test in Task 1 (`drops past Design Dinners events by time`).
3. **`?tipo=COMUNIDAD`, `?tipo=` or `?tipo=x&tipo=y`:** treated as Todos except an exact lowercase match; arrays take the first value. Test in Task 1 (`parseAgendaFilter`).
4. **Supabase down:** `/eventos` still renders Design Dinners rows and the Comunidad empty text. Covered by Task 5's loader using `loadEventsPreview` (already returns `[]` on throw); reviewer checks it.
5. **`/eventos/enviar` vs `/eventos/[id]`:** both work; `/otros-eventos` is 404. Controller browser check (Task 6).

---

### Task 1: Agenda logic (pure)

**Files:**
- Create: `src/lib/agenda.ts`
- Test: `src/lib/agenda.test.ts`

**Interfaces:**
- Consumes: `isUpcoming` (`src/lib/derive.ts`), `EventWithSpeakers` (`src/lib/types.ts`), `PublicCommunityEvent` (`src/lib/otros-eventos/types.ts`, has `startsAt`).
- Produces:
  ```ts
  export type AgendaFilter = "todos" | "design-dinners" | "comunidad";
  export const AGENDA_FILTERS: { value: AgendaFilter; label: string }[]; // Todos / Design Dinners / Comunidad
  export function parseAgendaFilter(raw: string | string[] | undefined): AgendaFilter;
  export type AgendaRow =
    | { kind: "dd"; startsAt: string; event: EventWithSpeakers }
    | { kind: "comunidad"; startsAt: string; event: PublicCommunityEvent };
  export function buildAgenda(input: {
    ddEvents: EventWithSpeakers[];
    communityEvents: PublicCommunityEvent[];
    featuredId: string | null;
    filter: AgendaFilter;
    now?: Date;
  }): AgendaRow[];
  export function agendaHref(filter: AgendaFilter): string; // "/eventos", "/eventos?tipo=design-dinners", "/eventos?tipo=comunidad"
  ```

- [ ] **Step 1: Write the failing tests** (`agenda.test.ts`; build minimal fixtures with a local `dd(id, iso)` / `com(id, iso)` helper casting partial objects):
  - `parseAgendaFilter`: `undefined`→`"todos"`, `"design-dinners"`→`"design-dinners"`, `"comunidad"`→`"comunidad"`, `"COMUNIDAD"`→`"todos"`, `""`→`"todos"`, `["comunidad","x"]`→`"comunidad"`, `"x"`→`"todos"`.
  - `excludes the featured event`: dd `a` (featured), dd `b`, filter todos → ids `["b"]`.
  - `merges and sorts both kinds by start time`: dd `b` 2026-11-12T23:00Z, com `c1` 2026-10-19T23:00Z, com `c2` 2026-10-24T03:30Z → order `c1, c2, b`, kinds `comunidad, comunidad, dd`.
  - `ties put Design Dinners first`: dd and com at the same instant → dd first.
  - `filters`: same input; `design-dinners` → only dd rows; `comunidad` → only community rows.
  - `drops past Design Dinners events by time`: now 2026-10-15T23:30Z, dd at 2026-10-15T23:00Z is excluded; community events are kept as given (no time filter applied to them).
  - `empty inputs` → `[]`; `featuredId: null` keeps all upcoming dd.
  - `agendaHref` returns the three exact strings above.
- [ ] **Step 2:** `npx vitest run src/lib/agenda.test.ts` → FAIL (module not found).
- [ ] **Step 3:** Implement `src/lib/agenda.ts` (pure, no imports from server modules; `import type` only for `PublicCommunityEvent`). `startsAt` for dd rows = `event.event_date`.
- [ ] **Step 4:** `npx vitest run src/lib/agenda.test.ts` → PASS; `npx tsc --noEmit` clean.
- [ ] **Step 5:** Commit `src/lib/agenda.ts src/lib/agenda.test.ts` — "Agenda: merge, sort and filter all events".

---

### Task 2: Shared site header

**Files:**
- Create: `src/components/SiteHeader.tsx`
- Modify: `src/components/landing/Hero.tsx` (replace the `<header>` block with `<SiteHeader whatsappUrl={whatsappUrl} />`)

**Interfaces:**
- Produces: `SiteHeader({ whatsappUrl, current }: { whatsappUrl: string; current?: "eventos" | "vitrina" })` — the logo + nav row exactly as today's Hero header (same classes, wrap behavior), nav order **Eventos (`/eventos`), Vitrina, Instagram, WhatsApp**. The link matching `current` gets `aria-current="page"` and a stronger style (e.g. `text-dd-red`). Add `focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-dd-black` to every nav link. Logo links to `/` when `current` is set (on the landing it stays a plain image).

- [ ] **Step 1:** Implement `SiteHeader.tsx` (server component, no state) and use it in `Hero.tsx`. No `/otros-eventos` link remains in `Hero.tsx`.
- [ ] **Step 2:** `npx tsc --noEmit && npm run lint && npm test` → clean / PASS.
- [ ] **Step 3:** Commit — "SiteHeader: shared nav, Eventos first".

---

### Task 3: NextEvent featured-only mode

**Files:**
- Modify: `src/components/landing/NextEvent.tsx`

**Interfaces:**
- Produces: `NextEvent({ upcoming, whatsappUrl, showRest = true }: { …; showRest?: boolean })`. With `showRest={false}` the "También en el horno" block is not rendered; everything else (featured card, month colors, empty state) is unchanged. Landing call stays as is.

- [ ] **Step 1:** Add the prop; gate the `rest` block on `showRest && rest.length > 0`.
- [ ] **Step 2:** `npx tsc --noEmit && npm run lint && npm test` → clean / PASS.
- [ ] **Step 3:** Commit — "NextEvent: option to show only the featured event".

---

### Task 4: Move the form, retire /otros-eventos, update links and copy

**Files:**
- Move: `src/app/otros-eventos/enviar/` → `src/app/eventos/enviar/` (`git mv`; `page.tsx`, `actions.ts`)
- Delete: `src/app/otros-eventos/page.tsx` (and the now-empty folder)
- Modify: `src/components/otros-eventos/SubmitEventForm.tsx` (import path of actions; done-state button)
- Modify: `src/app/eventos/enviar/page.tsx` (back link, mailto subject, metadata)
- Modify: `src/app/admin/(panel)/otros-eventos/actions.ts` (`revalidatePath("/otros-eventos")` → `revalidatePath("/eventos")`)
- Modify: `src/lib/otros-eventos/notify.ts` (pageUrl), `src/lib/otros-eventos/email.ts` (copy), `src/lib/otros-eventos/email.test.ts`
- Modify: `src/components/landing/OtrosEventosTeaser.tsx`

**Exact values (spec):**
- Form page back link: "← Eventos" → `/eventos`. Mailto subject: "Quitar evento de la agenda". Metadata title: "Comparte un evento — Eventos — Design Dinners".
- Form done-state button: "Ver la agenda" → `/eventos?tipo=comunidad`.
- Email: `pageUrl` = `${SITE}/eventos?tipo=comunidad`; line "Ya aparece en la agenda de Design Dinners."; button "Ver la agenda"; header kicker "Agenda".
- Teaser: title "En la comunidad"; line "Eventos de diseño organizados por la comunidad."; link "Ver la agenda" (keep the `aria-hidden` arrow) → `/eventos?tipo=comunidad`. Still returns `null` when empty.

- [ ] **Step 1: Update `email.test.ts`**: `pageUrl: "https://designdinners.com/eventos?tipo=comunidad"`; expect text to contain "Ya aparece en la agenda de Design Dinners."; expect html to contain `href="https://designdinners.com/eventos?tipo=comunidad"` and "Ver la agenda". Run `npx vitest run src/lib/otros-eventos/email.test.ts` → FAIL.
- [ ] **Step 2:** Make all the changes above. Then `grep -rn '"/otros-eventos' src` returns nothing (admin `/admin/otros-eventos` paths stay).
- [ ] **Step 3:** `npm test && npx tsc --noEmit && npm run lint` → PASS / clean.
- [ ] **Step 4:** Commit — "Move the share form to /eventos/enviar; retire /otros-eventos".

---

### Task 5: The /eventos page

Use the `impeccable` skill for the row and box visuals, following mockup B and the Design Dinners style (`globals.css` tokens, `font-display` Jost uppercase, black 2px borders).

**Files:**
- Create: `src/components/eventos/AgendaFilters.tsx`, `src/components/eventos/AgendaList.tsx`, `src/components/eventos/ShareEventBox.tsx`
- Create: `src/app/eventos/page.tsx`

**Interfaces:**
- Consumes: Task 1 (`parseAgendaFilter`, `buildAgenda`, `AGENDA_FILTERS`, `agendaHref`, `AgendaRow`), Task 2 (`SiteHeader`), Task 3 (`NextEvent showRest={false}`), `PastEvents`, `splitEvents`, `getEventsWithSpeakers`, `listUpcomingEvents` + `loadEventsPreview` (pattern from `src/app/page.tsx`), `formatDateParts`, `formatEventTime`, `EVENT_TYPE_LABEL`, `PRICE_LABEL`.
- Produces:
  - `AgendaFilters({ active }: { active: AgendaFilter })` — three links from `AGENDA_FILTERS` to `agendaHref(value)`; active has `aria-current="true"` and filled black style. Wrapped in `<nav aria-label="Filtrar eventos">`.
  - `AgendaList({ rows, filter, hasFeatured }: { rows: AgendaRow[]; filter: AgendaFilter; hasFeatured: boolean })` — `<ul>` of rows; empty texts:
    - todos: "No hay más eventos en la agenda por ahora."
    - design-dinners: `hasFeatured` ? "La próxima cena está arriba. Pronto anunciamos más." : "Pronto anunciamos la próxima cena."
    - comunidad: "No hay eventos de la comunidad por ahora."
  - Design Dinners row: brand-red band (`bg-dd-red text-dd-cream`, black 2px border), date block (day + month from `formatDateParts`), title (link to `/eventos/[id]`), place, type label, time; "Reservar" button: `registration_url` → that URL in a new tab (`rel="noopener noreferrer"`), else `/eventos/[id]`. On phones the button sits under the text.
  - Community row: cream, black rule on top, date block, title, place, "Organiza …" if set, price label if set, "Comunidad" tag, external arrow (`aria-hidden`); whole row is one link per Global Constraints.
  - `ShareEventBox()` — dashed black border box: heading "¿Organizas un evento de diseño?", text "Compártelo con la comunidad. Lo revisamos y lo publicamos aquí.", button "Comparte un evento" → `/eventos/enviar`.
- Page `src/app/eventos/page.tsx`:
  - `export const dynamic = "force-dynamic";` metadata title "Eventos — Design Dinners", description "Las cenas de Design Dinners y lo que se mueve en la comunidad de diseño."
  - `searchParams: Promise<{ tipo?: string | string[] }>`; `filter = parseAgendaFilter(tipo)`.
  - Loads in parallel: `getEventsWithSpeakers()` and community events (`hasServiceConfig ? loadEventsPreview(() => listUpcomingEvents(getServiceClient(), 60)) : []`).
  - `const { upcoming, past } = splitEvents(events, now); featured = upcoming[0] ?? null`.
  - Order: `<SiteHeader whatsappUrl current="eventos" />`, title block (H1 "Eventos" + description line), `<NextEvent upcoming={featured ? [featured] : []} whatsappUrl showRest={false} />`, Agenda section (H2 "Agenda", `AgendaFilters`, `AgendaList`), `ShareEventBox`, `<PastEvents past={past} />`.

- [ ] **Step 1:** Build the three components and the page.
- [ ] **Step 2:** `npx tsc --noEmit && npm run lint && npm test` → clean / PASS; `npx next build` → succeeds and lists `/eventos` (ƒ dynamic) and `/eventos/enviar`, and no `/otros-eventos`.
- [ ] **Step 3:** Commit — "Eventos page: featured dinner, agenda with filters, share box".

---

### Task 6: Browser check, final review, PR (controller)

- [ ] Start a dev server for this worktree (add launch config "eventos-hub", port 3800). Seed two community events through `/eventos/enviar` and approve them in local admin.
- [ ] Check: `/eventos` at 1280 px and 375 px (no horizontal scroll); each filter link; featured card shown on every filter; a DD row opens `/eventos/[id]`; a community row opens the organizer link in a new tab; share box → `/eventos/enviar` → submit works; `/otros-eventos` → 404; `/eventos/not-a-uuid` → 404; landing header "Eventos" → `/eventos`; landing "En la comunidad" section → `/eventos?tipo=comunidad`.
- [ ] Whole-branch review; fix wave; push; PR body lists the removed page and the email copy change.
