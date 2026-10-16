# Eventos hub — design spec

**Date:** 2026-10-16
**Status:** design for owner approval
**Replaces:** the public page `/otros-eventos` from `docs/specs/2026-10-14-otros-eventos-design.md` (data, form, admin and email from that spec stay).
**Approved mockup:** version B, "Lista por fecha", in `~/dev/design-dinners/.superpowers/brainstorm/22602-1792186303/content/eventos-page.html`.

## Why

The landing header has a link "Eventos" that opens `/otros-eventos`, a page that has only community events. Visitors expect "Eventos" to mean Design Dinners events first. The site has no page that lists Design Dinners events at all: today they live only on the landing and on `/eventos/[id]`.

## Intent

One events page, `/eventos`, for everything. Design Dinners always comes first and looks clearly different. Community events are there too, clearly marked as from the community, so people find them without thinking they are ours.

## Goals

- "Eventos" in the header opens `/eventos`, and the page matches the word: all events.
- Design Dinners has priority over community events, everywhere (page and landing).
- Community events are easy to find on `/eventos` and can be filtered.
- One clear way to share a community event: a call-to-action box on `/eventos`.

## Non-goals

- No change to the community events data, the send form fields, admin review, rate limits, or the approval rules.
- No change to the Design Dinners event page `/eventos/[id]` or RSVPs.
- No calendar view, no search, no map, no export.
- No past community events anywhere.

## Anti-goals (would make this a failure even if it works)

- A community event that looks like a Design Dinners event (same color, same "Reservar" button, or above the featured dinner).
- The landing gets busier: the community section must stay small and stay hidden when empty.
- A broken landing or events page when Supabase (community data) is down. Design Dinners events come from Neon and must still show.

## Decisions (from the owner)

| Topic | Decision |
|---|---|
| Structure | One page `/eventos` with all events, Design Dinners first. |
| Agenda style | Version B: a compact list sorted by date. Design Dinners rows are red bands; community rows are plain with a "Comunidad" tag. |
| Filters | "Todos" (default), "Design Dinners", "Comunidad". |
| Share CTA | A "Comparte un evento" box on `/eventos`. It is the main way to reach the form. |
| Old page | `/otros-eventos` is removed. No redirect (it was never used). |
| Landing community section | Stays hidden when there are no community events. |
| Priority | Design Dinners above community, always. |

## The page `/eventos`

Top to bottom:

1. **Header.** Same site header as the landing (logo + nav), with "Eventos" marked as the current page (`aria-current="page"`). *(Builder's call: extract the header from `Hero.tsx` into a small shared component, or render the same markup; do not duplicate the nav list in two places.)*
2. **Title** "Eventos" and one line: "Las cenas de Design Dinners y lo que se mueve en la comunidad de diseño." *(My call, copy can change.)*
3. **"Próximo evento" — the featured Design Dinners event.** The soonest upcoming Design Dinners event (same rule as the landing's `NextEvent`: `splitEvents(...).upcoming[0]`). It shows the same thing the landing block shows: poster, type label (Cena / Taller / Otro), title, date + time, place, seats line, and the "Reservar puesto" (or waitlist) button linking to `/eventos/[id]`. It wears that month's colors (`theme_bg/ink/accent`) like the landing. **Reuse `NextEvent`** (or the part of it that draws the card) instead of building a second version. With no upcoming Design Dinners event, show NextEvent's existing "Estamos cocinando" empty state.
4. **"Agenda" — the list.** All upcoming events, sorted by start time, soonest first:
   - Upcoming Design Dinners events **except the featured one** (it is already above).
   - Upcoming community events (from `community_events_public`, same rule as today: hidden after their Puerto Rico day).
   - **Filter buttons** above the list: "Todos", "Design Dinners", "Comunidad". They are links that set `?tipo=` on the URL (`?tipo=design-dinners`, `?tipo=comunidad`; no param = Todos), so a filtered view can be shared and works without JavaScript. The active one has `aria-current="true"` and the filled style. An unknown `tipo` value means Todos.
   - **Design Dinners row:** a red band (or the event's month `theme_bg` — *builder's call; red is the default*) with a date block (day + month), title, place, type label, and a "Reservar" button. The whole row links to `/eventos/[id]`, same tab.
   - **Community row:** plain (cream, black rule above), date block, title, place, organizer if set, "Gratis"/"Pago" if set, a "Comunidad" tag, and an external-link arrow. The whole row links to the organizer's `link` in a new tab with `rel="noopener noreferrer nofollow ugc"` and an accessible name ending in "(abre en otra pestaña)". No poster in the row. *(My call: posters stay in admin and the landing teaser; the list stays compact as in the mockup.)*
   - **Empty states** (text in the list area, no illustration needed):
     - Todos, nothing at all: "No hay más eventos en la agenda por ahora."
     - Design Dinners filter, nothing besides the featured one: "La próxima cena está arriba. Pronto anunciamos más."
     - Comunidad filter, nothing: "No hay eventos de la comunidad por ahora."
5. **"Comparte un evento" box.** Always shown, under the list, whatever the filter. A dashed-border box: "¿Organizas un evento de diseño?" / "Compártelo con la comunidad. Lo revisamos y lo publicamos aquí." + button "Comparte un evento" → `/eventos/enviar`.
6. **"Eventos pasados".** Reuse the landing's `PastEvents` section as-is (past Design Dinners events, host line, empty state). Past community events never show.

**Data and failure:** Design Dinners events come from Neon (`getEventsWithSpeakers`), community events from Supabase (`listUpcomingEvents`). If the Supabase read fails or is not configured, the page renders with Design Dinners only and the "Comunidad" filter shows its empty state (log with `logSafe`). If Neon fails, behave like the landing does today.

**Rendering:** the page reads `searchParams`, so it renders per request. *(My call: traffic is small and both reads are cheap; this keeps filter links working without JS.)* Admin actions keep calling `revalidatePath` for `/eventos` and `/`.

**Metadata:** title "Eventos — Design Dinners", description = the line in item 2.

**Layout:** works at 375 px with no horizontal scroll. On phones the list rows stack the date block left and text right as in the mockup; the "Reservar" button moves under the text. Visible focus on every link (black outline on cream, cream/black on red).

## The send form

- Moves from `/otros-eventos/enviar` to **`/eventos/enviar`** (same page, same form, same server actions — move the route folder). This static segment must not clash with `/eventos/[id]`: confirm Next 16 serves the static `enviar` route before the dynamic `[id]` (it should), and add a guard so `/eventos/[id]` with a non-uuid id still 404s as today.
- Back link "← Eventos" → `/eventos`. Done-state button "Ver la agenda" → `/eventos?tipo=comunidad`.
- Footer removal note stays, subject "Quitar evento de la agenda". *(My call.)*

## Removed

- `src/app/otros-eventos/` (page and the moved `enviar` folder). No redirect.
- The "Eventos" nav link to `/otros-eventos` (replaced by `/eventos`).

## Landing changes

- Header nav: "Eventos" → `/eventos`. Order: Eventos, Vitrina, Instagram, WhatsApp. *(My call: Eventos first because it is the main thing.)*
- The Design Dinners sections stay exactly as they are (Hero, NextEvent, spotlight, PastEvents).
- Community section (`OtrosEventosTeaser`): still hidden when empty; same 3 compact poster cards. Only changes: title **"En la comunidad"**, line "Eventos de diseño organizados por la comunidad." *(My call)*, link "Ver la agenda" → `/eventos?tipo=comunidad`. Keep its place after the Vitrina section, so it stays below every Design Dinners section.

## Email and admin

- Approval email: the button and link go to `${SITE}/eventos?tipo=comunidad`; copy "Ya aparece en la agenda de Design Dinners." and button "Ver la agenda". *(My call.)* Update `email.test.ts` expectations.
- Admin actions revalidate `/eventos` instead of `/otros-eventos`.
- Admin page name stays "Otros eventos" (`/admin/otros-eventos`). No other admin change.

## Testing

- Unit: a pure function that builds the agenda from (Design Dinners events, community events, featured id, filter) → sorted, typed rows. Test: featured excluded; sort across both kinds by start time; each filter; unknown filter = all; past Design Dinners events excluded; empty inputs.
- Existing tests keep passing (`email.test.ts` updated for the new link/copy).
- Browser check (local): `/eventos` with and without community events, each filter, the share box, a Design Dinners row opens `/eventos/[id]`, a community row opens the external link in a new tab, `/eventos/enviar` works end to end, `/otros-eventos` is a 404, `/eventos/not-a-uuid` is a 404, landing header link and community section link, 375 px.

## Left to the builder

- Visual details of the rows and the box inside the Design Dinners style (use the `impeccable` skill), following the approved mockup B.
- How to share the header between the landing and `/eventos`.
- Whether Design Dinners rows use brand red or the event's month color.

## Calls made after the builder check (Claude's calls — owner to confirm)

1. **NextEvent reuse.** Add a prop to `NextEvent` (e.g. `showRest={false}`) so `/eventos` shows only the featured card, not the "También en el horno" grid. The landing keeps the grid. Other upcoming Design Dinners events appear only in the Agenda on `/eventos`.
2. **"Reservar" target.** Design Dinners rows follow the same rule as the featured card: if `registration_url` is set, the button opens it in a new tab; otherwise the row and button go to `/eventos/[id]`. The row title always links to `/eventos/[id]`.
3. **Featured card and filters.** The featured Design Dinners card shows on every filter, including "Comunidad" (Design Dinners has priority everywhere). Filters change only the Agenda list. With no featured event (NextEvent shows "Estamos cocinando"), the "Design Dinners" filter empty text is "Pronto anunciamos la próxima cena."
4. **Rendering.** `/eventos` is dynamic per request (`searchParams`); no extra caching. `revalidatePath("/eventos")` calls stay (harmless, and right if caching is added later).
5. **Route clash.** `/eventos/enviar` is a static segment and wins over `/eventos/[id]` in Next. `/eventos/[id]` already 404s on a non-uuid id (`getPublicEvent` checks `isUuid`), so `[id]/page.tsx` is not touched. Browser check confirms both.
6. **Moved form.** The form has no path-keyed config (no Turnstile, no CSP/sitemap entries; `proxy.ts` matches only `/admin` and `/vitrina`). Builder greps once to confirm.
7. **Agenda function contract.** `buildAgenda({ ddEvents, communityEvents, featuredId, filter, now })`:
   - `ddEvents`: all Design Dinners events; the function keeps only upcoming ones (`isUpcoming(e, now)`) and drops `featuredId` (may be `null`).
   - `communityEvents`: already filtered upstream by `listUpcomingEvents` (Puerto Rico day rule); used as given.
   - `filter`: `"todos" | "design-dinners" | "comunidad"`; parse unknown `?tipo` to `"todos"` in a separate `parseAgendaFilter`.
   - Returns rows `{ kind: "dd", event } | { kind: "comunidad", event }` sorted by start time ascending; ties: Design Dinners first, then by id.
8. **"Eventos pasados"** shows under every filter (it is its own section, not part of the Agenda).
9. **Header.** Extract the nav row from `Hero.tsx` into `SiteHeader` with a `current` prop (no client state exists today). `/eventos` uses a plain cream header row, no hero treatment.
