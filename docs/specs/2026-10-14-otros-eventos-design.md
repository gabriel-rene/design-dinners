# Otros eventos — design spec

**Date:** 2026-10-14
**Status:** approved design, not built
**Plan:** `docs/plans/2026-10-14-otros-eventos.md` (next step)
**Scope:** a public list of design events in Puerto Rico that other people organize. Anyone can send an event. An admin approves it before it shows. A click on an event opens the organizer's own link. There is no RSVP on our site.

**Goal:** make designdinners.com the place to find what is happening in the design community, between our own dinners.

## Decisions (from the owner)

| Topic | Decision |
|---|---|
| Name + URL | "Otros eventos", at `/otros-eventos`. Form at `/otros-eventos/enviar`. |
| Who adds | Anyone, through a public form. Nothing shows until an admin approves it. |
| Where it shows | Its own page, plus a landing teaser with the next 3 events. |
| Click | Opens the organizer's link in a new tab. No detail page on our site. |
| Past events | Hidden automatically after the event's day ends (Puerto Rico time). Rows stay in the database. |
| Form | Short form with a poster image (see §4). |
| Email | One email to the sender when an admin approves. No email on reject. |
| Storage | Supabase, the same as La Vitrina (tables, upload tickets, images). Our own events stay in Neon. |

## Out of scope (later)

- Editing an event after it is sent (sender or admin). To fix one, the admin rejects or deletes it and the sender sends it again.
- Recurring events, multi-day events, end times.
- A detail page per event, RSVPs, calendar files.
- Email alerts to the admin, and an email on reject.
- A "past events" archive.
- Cleanup of uploaded images whose form was never sent (same as La Vitrina).
- Turnstile (upgrade path if spam shows up).

## 1. Data model (Supabase Postgres)

New migration `supabase/migrations/20261014000000_otros_eventos.sql`. It follows the La Vitrina pattern: deny by default, service role only.

### `community_events`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | `gen_random_uuid()` |
| `status` | text | `pending` \| `published` \| `rejected`. Default `pending`. |
| `title` | text | 1–100 chars |
| `starts_at` | timestamptz | Entered as a Puerto Rico date + time. |
| `venue` | text | 1–120 chars, e.g. "Morena Coffee, Santurce" |
| `link` | text | `http(s)` URL only (table check, same regex as Vitrina hardening) |
| `description` | text null | max 300 chars |
| `organizer` | text null | max 120 chars |
| `price` | text null | `free` \| `paid` \| null (not said) |
| `submitter_email` | text | 3–254 chars. **Private.** Admin only. |
| `image_path` | text | Object path. Bucket depends on `status` (see §2). Unique. |
| `image_width`, `image_height` | int | From the browser at upload; replaced by the real size on approve. |
| `ip_hash` | text null | **Private.** For the rate limit. |
| `created_at`, `reviewed_at`, `published_at` | timestamptz | `published` requires `published_at` (table check). |

Index on `(status, starts_at)` for the public list. Index on `(ip_hash, created_at)` for the rate limit.

### `community_event_uploads`

One row per signed upload URL handed out: `path` (pk), `ip_hash`, `created_at`. Same job as `vitrina_uploads`: it rate-limits uploads, and the submit action only accepts a `path` that has a row here.

### View `community_events_public`

`security_invoker = true`. Published rows whose day has not ended yet:

```sql
where status = 'published'
  and (starts_at at time zone 'America/Puerto_Rico')::date
      >= (now() at time zone 'America/Puerto_Rico')::date
```

Columns: everything except `submitter_email`, `ip_hash`, `status`, `reviewed_at`. Ordered by the caller (`starts_at asc, id asc`).

### RLS and grants

RLS on for both tables. `anon` and `authenticated` get no privileges on the tables or the view. `service_role` gets all on the tables and select on the view. All server code uses the service client, public code after validation and rate limits, admin code after `requireAdmin()`.

## 2. Image storage

Two new buckets in the same migration, same limits as La Vitrina (4.5 MB, `image/jpeg`, `image/png`, `image/webp`):

| Bucket | Public? |
|---|---|
| `otros-eventos-pending` | private |
| `otros-eventos` | public read |

**Shared code, not a copy.** The upload ticket, the pending-object check, the re-encode (`encodePublicImage`), `publishObject`, and `moveObject` in `src/lib/vitrina/db.ts` move to a new `src/lib/storage/images.ts`. They take the bucket names (and the uploads table name) as arguments. La Vitrina calls them with its own names and keeps working exactly as now; its existing tests must still pass. The image rules in `src/lib/vitrina/validate.ts` (`MAX_IMAGE_BYTES`, `IMAGE_EXT`, `checkImageFile`, `isImageMime`, `mimeForPath`, `isPendingPath`) move to `src/lib/storage/image-rules.ts`, re-exported from the old place.

**Upload flow:** the same two steps as La Vitrina. `startEventUpload(mime, size)` → signed upload URL for `otros-eventos-pending/{uuid}.{ext}` → browser uploads → `submitCommunityEvent(formData)` checks the ticket and the stored object, then inserts the row as `pending`.

**On approve:** re-encode into `otros-eventos` (strips EXIF/GPS, fits 2560 px), remove the pending copy.
**On reject:** the image stays in the private bucket.
**On delete:** remove the image from both buckets, then the row and the upload ticket.

Posters are usually 4:5 or 3:4. Cards show the image in a fixed 4:5 box with `object-cover`, so a poster of any shape keeps the grid even.

## 3. Public page `/otros-eventos`

- **Header:** title "Otros eventos", one line: "Eventos de diseño en Puerto Rico organizados por la comunidad." Button "Enviar un evento" → `/otros-eventos/enviar`.
- **Grid:** upcoming published events, soonest first. 1 column on phone, 2 on tablet, 3 on desktop.
- **Card:** the whole card is one link to `link` (`target="_blank"`, `rel="noopener noreferrer nofollow ugc"`). It shows the poster, the date chip (weekday, day, month, from `formatDateParts`), the time, the title, the venue, the organizer (if set), and a "Gratis" / "Pago" tag (if set). The description shows under the title, max 3 lines (`line-clamp-3`). An external-link icon says it leaves the site; the link's accessible name ends with "(abre en otra pestaña)".
- **Empty state:** "No hay eventos de la comunidad por ahora. ¿Organizas uno?" + the send button.
- **Metadata:** page title and description; OG image = the site default.
- **Freshness:** `export const revalidate = 3600`. Admin actions also call `revalidatePath("/otros-eventos")`. A past event drops off within one hour after its day ends.
- **Nav:** add "Eventos" to the landing header nav (`Hero.tsx`), next to "Vitrina".
- The visual design of the card, the page, and the teaser is done with the `impeccable` skill, in the existing Design Dinners style (cream, black borders, Jost headings).

## 4. Send form `/otros-eventos/enviar`

| Field | Rules |
|---|---|
| Nombre del evento * | 1–100 |
| Fecha * | a date from today (PR time) to 365 days ahead |
| Hora * | `HH:MM`. Fecha + hora are read as Puerto Rico time. |
| Lugar * | 1–120. Hint: "Nombre del sitio y pueblo." |
| Enlace * | `http(s)` URL. A value without a scheme gets `https://`. Hint: "Eventbrite, Instagram, la página del evento…" |
| Afiche * | 1 image, JPG/PNG/WebP, ≤ 4.5 MB, with a preview |
| Tu email * | valid email. Hint: "No se muestra. Te avisamos cuando se publique." |
| Descripción | ≤ 300, with a counter |
| Organiza | ≤ 120 |
| Costo | No sé / Gratis / Pago (radio, default "No sé" = null) |
| Permission checkbox * | "Tengo permiso para compartir este evento y su afiche." |
| Honeypot | hidden field `empresa`. If it has a value, fake success and save nothing. |

- **Rate limits:** max 3 events sent and 6 uploads per IP hash per 24 h. Same salted hash as RSVPs and La Vitrina (`requestIpHash`).
- **Success screen:** "¡Gracias! Revisamos cada evento antes de publicarlo. Te escribimos cuando esté en la página."
- **Footer note:** to remove an event, write to hola@gaborene.com (`mailto:` with the subject "Quitar evento de Otros eventos").
- Errors show in Spanish next to the field. The form keeps the values the person typed. Required fields are marked with a red `*`, as on the Vitrina form.
- The form component reuses the Vitrina upload widget logic; if `SubmitWorkForm.tsx` has an upload part that can be pulled out cleanly, pull it into a shared component. Otherwise keep a separate form and do not force it.

## 5. Landing teaser

- New component `src/components/landing/OtrosEventosTeaser.tsx`, placed after `VitrinaTeaser` on the landing.
- Shows the next 3 upcoming events as small cards (same card, compact size) and a link "Ver todos los eventos" → `/otros-eventos`.
- **No events → the section does not render at all.**
- If Supabase is not configured or the query fails, the section does not render (same as the Vitrina teaser). The landing never breaks because of it.
- **Freshness:** the landing is ISR with `revalidate = 86400`. Change it to `3600`, so a past event leaves the teaser within one hour, the same as the page. Admin actions also call `revalidatePath("/")`.

## 6. Admin `/admin/otros-eventos`

- New item "Otros eventos" in `AdminNav`, with a count of pending events (like "Vitrina").
- **Tabs:** Pendientes (oldest sent first), Publicados (soonest first, past ones included and marked "Pasó"), Rechazados.
- **Card:** the poster (signed URL when not public), all fields, the link (clickable), the sender's email as a `mailto:` link, and the dates.
- **Actions:**
  - Pending → **Aprobar** or **Rechazar**.
  - Rejected → **Aprobar** (in case of a mistake).
  - Published → **Ocultar** (back to rejected, image back to the private bucket).
  - Any → **Eliminar** (asks first; deletes the row and the image).
- Every action calls `requireAdmin()` first. Each status change only applies if the row is still in the expected status (same `transition` guard as Vitrina).

## 7. Approval email

- Sent with `sendEmail` (`src/lib/email.ts`) inside `after()`, only when **Aprobar** really changed the row to `published`. Never on reject, hide, or delete. A second approve (after hide) sends it again; that is fine.
- **To:** `submitter_email`. **From / reply-to:** the existing constants.
- **Subject:** "¡Tu evento está en Design Dinners!"
- **Body (Spanish, html + text):** the event title, date, and time; one line "Ya aparece en Otros eventos."; a button to `https://designdinners.com/otros-eventos`; the mascot image like the RSVP emails.
- Builder `src/lib/otros-eventos/email.ts` returns `{ subject, html, text }`. All user text is HTML-escaped (same helper the RSVP emails use).
- An email failure is logged (code only, no email address) and never undoes the approval.
- Without `RESEND_API_KEY` (local, previews) it skips quietly, like today.

## 8. Code layout

| Path | Job |
|---|---|
| `src/lib/storage/images.ts`, `src/lib/storage/image-rules.ts` | Shared image upload + publish code, moved out of `vitrina/` (see §2). |
| `src/lib/otros-eventos/validate.ts` | Field rules, `parseEventInput`, PR date + time → ISO, link normalize. Pure, unit-tested. |
| `src/lib/otros-eventos/db.ts` | Server-only data access: insert, list upcoming, list by status, count pending, approve/reject/hide/delete. |
| `src/lib/otros-eventos/types.ts` | `PublicCommunityEvent`, `AdminCommunityEvent`, `CommunityEventStatus`. |
| `src/lib/otros-eventos/email.ts` | Approval email builder. |
| `src/app/otros-eventos/page.tsx` | Public page. |
| `src/app/otros-eventos/enviar/{page,actions}.ts(x)` | Form page + server actions. |
| `src/app/admin/(panel)/otros-eventos/{page,actions}.ts(x)` | Admin review. |
| `src/components/otros-eventos/{CommunityEventCard,SubmitEventForm}.tsx` | UI. |
| `src/components/admin/CommunityEventReviewCard.tsx` | Admin card. |
| `src/components/landing/OtrosEventosTeaser.tsx` | Landing section. |

## 9. Security checklist

- `submitter_email` and `ip_hash` never reach the browser outside admin pages. Public reads use `community_events_public` only.
- Pending posters are in a private bucket. No SVG uploads.
- `link` is `http(s)` only, checked in code and by a table check. It renders with `nofollow ugc`.
- All user text renders as plain text (React escaping; email builder escapes HTML).
- Honeypot + rate limits on upload and submit.
- Logs never include the sender's email or the row (use `logSafe`).

## 10. Testing

- **Unit (Vitest):** field rules (lengths, required, price values, link normalize and `javascript:` rejection, date range, PR date + time → correct UTC instant, including that 23:30 PR time is the next day in UTC), the approval email builder (escapes HTML, has the title and date), the moved image rules (existing Vitrina tests keep passing unchanged).
- **Integration (local Supabase):** `community_events_public` hides pending, rejected, and past events, shows an event for its whole PR day, and never exposes `submitter_email` / `ip_hash`. Anon cannot read the tables, the view, or the pending bucket. Status guards: approve on an already-published row returns false.
- **Browser check:** send an event on the local site → not on the page → approve in admin → it shows on `/otros-eventos` and on the landing → hide → gone from both. Check phone and desktop widths.

## 11. Rollout

1. Apply the migration locally, build and test.
2. Open a PR from `feat/otros-eventos`.
3. After merge: apply the migration to cloud Supabase with `supabase db push --db-url` (the Vercel `SB_POSTGRES_URL_NON_POOLING` URL), the same way as the Vitrina migrations.
4. Send one test event on production, approve it, check the email arrives, then delete it.
