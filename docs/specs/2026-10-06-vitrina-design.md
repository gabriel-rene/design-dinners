# La Vitrina — design spec

**Date:** 2026-10-06
**Status:** implemented on branch feat/vitrina (2026-10-06)
**Plan:** `docs/plans/2026-10-06-vitrina.md`
**Scope:** a public, vertical-swipe feed of work by community members. Anyone can submit a piece. An admin approves it before it shows. Visitors give "papitas" (a fries-shaped like) by double-tapping.

**Goals:** give members a stage, give the public a reason to come back between dinners, and help members get hired.

## Decisions (from the owner)

| Topic | Decision |
|---|---|
| Name | "La Vitrina", at `/vitrina`. |
| Who submits | Anyone, through a public form. Nothing shows until an admin approves it. |
| Media | One image per piece. JPG, PNG or WebP. Max 4.5 MB. No video. |
| Feed | Vertical swipe only, one piece at a time. Desktop works the same way, like YouTube Shorts. |
| Promos | No promo posts. A creator can add a badge: "Disponible para trabajo" or "Acepto proyectos". |
| Credit | Every piece shows the creator's name, role, and links (website, Instagram, Behance, LinkedIn, Dribbble). |
| Likes | "Papitas". Double-tap or double-click the image to give one, with a fries animation. A button also toggles it. The count is public. |
| Storage | Everything for La Vitrina lives in Supabase (tables, likes, images). Events and RSVPs stay in Neon. |
| Rights | The creator must tick "Esta obra es mía y autorizo que se muestre en Design Dinners." |

## Out of scope (later)

- Video, more than one image per piece.
- Creator accounts, profiles, or self-editing. The creator asks to remove a piece, and an admin removes it.
- Email alerts (to the admin or to the creator).
- Comments.
- A "shown at dinner #N" tag.
- A Vitrina teaser on the landing page.
- Cleanup of uploaded images whose form was never submitted.

## 1. Data model (Supabase Postgres)

New migration `supabase/migrations/20261006000000_vitrina.sql`.

### `vitrina_works`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | `gen_random_uuid()` |
| `status` | text | `pending` \| `published` \| `rejected`. Default `pending`. |
| `title` | text | 1–80 chars |
| `description` | text null | max 300 chars |
| `creator_name` | text | 1–120 chars |
| `creator_email` | text | 3–254 chars. **Private.** Admin only. |
| `creator_role` | text | 1–60 chars, e.g. "Diseñadora gráfica" |
| `badge` | text null | `open_to_work` \| `open_to_projects` \| null |
| `link_website`, `link_instagram`, `link_behance`, `link_linkedin`, `link_dribbble` | text null | Each one a valid `http(s)` URL. At least one must be set (table check). |
| `image_path` | text | Object path. Bucket depends on `status` (see §2). |
| `image_width`, `image_height` | int | From the browser at upload. Used to lay out the image without a jump. |
| `fries_count` | int | Default 0. Updated only by `toggle_fry`. |
| `ip_hash` | text null | **Private.** For the submit rate limit. |
| `created_at`, `reviewed_at`, `published_at` | timestamptz | |

Index on `(status, published_at desc, id)` for the feed.

### `vitrina_fries`

| Column | Type | Notes |
|---|---|---|
| `work_id` | uuid | FK → `vitrina_works` on delete cascade |
| `fan_id` | uuid | Anonymous browser id (see §5) |
| `ip_hash` | text | For the fries rate limit |
| `created_at` | timestamptz | |

Primary key `(work_id, fan_id)`. One papita per browser per piece.

### `vitrina_uploads`

One row per signed upload URL handed out: `path` (pk), `ip_hash`, `created_at`. It rate-limits uploads (max 6 per IP hash per 24 h), and `submitVitrinaWork` only accepts a `path` that has a row here. `vitrina_works.image_path` is unique.

### View `vitrina_public` and function `list_vitrina`

`vitrina_public` selects published rows only, **without** `creator_email` and `ip_hash`. `list_vitrina(before_ts, before_id, only_available, limit)` returns feed pages from that view (keyset order `published_at desc, id desc`). Public pages read only through these, so the private columns are never even queried.

### Function `toggle_fry(work_id, fan_id, ip_hash, on boolean) returns int`

One statement block (one transaction). It inserts or deletes the `vitrina_fries` row, changes `fries_count` by +1 or −1 only when a row really changed, and returns the new count. It does nothing for works that are not `published`. Execute is granted to `service_role` only.

### RLS and grants (deny by default)

- RLS is on for all three tables. `anon` and `authenticated` have **no** privileges on the tables, the view, or the functions.
- Every read and write goes through server code that uses the **service role key** (`SUPABASE_SERVICE_ROLE_KEY`): public code only after validation and rate limits, admin code only after `requireAdmin()`. The key is server-only (`import "server-only"`, never `NEXT_PUBLIC_`).

## 2. Image storage (Supabase Storage)

Two buckets:

| Bucket | Public? | Limits |
|---|---|---|
| `vitrina-pending` | **private** | `file_size_limit` = 4.5 MB (4,718,592 bytes); `allowed_mime_types` = `image/jpeg, image/png, image/webp` |
| `vitrina` | public read | same limits |

Pending images are private. A stranger cannot use the site as free image hosting before approval.

**Upload flow** (the file goes straight to Supabase, not through Vercel):

1. The browser checks the type and size first (a courtesy only).
2. Server action `startVitrinaUpload(mime)` checks the upload rate limit, records a `vitrina_uploads` row, calls `createSignedUploadUrl` for `vitrina-pending/{uuid}.{ext}`, and returns the token and path.
3. The browser uploads with `uploadToSignedUrl`. The bucket enforces the size and type.
4. Server action `submitVitrinaWork(formData)` validates every field. It checks that the object exists in `vitrina-pending` (size and mimetype from the storage metadata). Then it inserts the row as `pending`.

**On approve:** move the object from `vitrina-pending` to `vitrina` (same path) and set `status = published` and `published_at = now()`.
**On reject or delete:** remove the object from whichever bucket holds it.

Show images with a plain `<img>` (same convention as `BrandImage.tsx`). Admin pages show non-published images through short-lived signed URLs.

## 3. Public feed `/vitrina` and `/vitrina/[id]`

### Layout

- A full-height feed with CSS scroll-snap (`snap-y snap-mandatory`, each slide `100dvh`). No carousel library.
- **Phone:** the slide fills the screen.
- **Desktop:** the slide is a tall card in the middle of the screen (about 9:16, max height = viewport minus padding), like YouTube Shorts. Up and down buttons sit at the right side. ↑/↓ and J/K keys move between pieces. The mouse wheel and trackpad snap too.
- **Image:** `object-contain` on top of a blurred, darkened copy of the same image. Any aspect ratio looks good.
- **Overlay (bottom):** title, `creator_name · creator_role`, badge chip, link icons (open in a new tab, `rel="noopener noreferrer nofollow ugc"`). "Ver más" expands the description.
- **Side rail (right):** papitas button + count, share button (Web Share API, falls back to copying the link).
- **Header:** small back-to-site link, "Disponible" filter chip, and an "Enviar mi trabajo" button.

### Data

- Newest published first. Load 8, then fetch the next 8 when the viewer is 2 slides from the end (cursor = `published_at, id`).
- `?disponible=1` shows only pieces with a badge.
- `/vitrina/[id]` opens the feed at that piece. The pieces after it in the feed load below it.
- While scrolling, the URL updates to the current piece's `/vitrina/[id]` (`history.replaceState`). Share and copy always point to the visible piece.
- `/vitrina/[id]` has its own metadata: title, "por {creator_name}", and the image as the OG image. Links look good in WhatsApp and LinkedIn.
- An id that is unknown or not published → 404.

### States

- **Empty:** "Todavía no hay obras. Sé la primera persona en compartir la tuya." + button to the form.
- **End of feed:** a last slide: "Llegaste al final" + "Enviar mi trabajo".
- **Load error:** an inline retry, not a broken page.

### Navigation

Add "Vitrina" to the landing header nav (`Hero.tsx`), next to Instagram and WhatsApp.

## 4. Submit form `/vitrina/enviar`

| Field | Rules |
|---|---|
| Nombre * | 1–120 |
| Email * | valid email. Hint: "No se muestra públicamente." |
| Rol / disciplina * | 1–60 |
| Título de la obra * | 1–80 |
| Descripción | ≤ 300, with a counter |
| Imagen * | 1 file, JPG/PNG/WebP, ≤ 4.5 MB, with a preview |
| Links | website, Instagram, Behance, LinkedIn, Dribbble. At least one. `http(s)` only. |
| Badge | Ninguno / Disponible para trabajo / Acepto proyectos |
| Ownership checkbox * | must be ticked |
| Honeypot | hidden field. If it has a value, fake success and save nothing. |

- **Rate limit:** max 3 submissions per IP hash per 24 h. Use the same salted hash as RSVPs. Move `hashIp` from `rsvp-server.ts` to a shared `src/lib/ip-hash.ts`.
- **Success screen:** "¡Gracias! Revisamos cada obra antes de publicarla."
- **Footer note:** to remove a piece, write to rodz.gabriel@gmail.com (a `mailto:` link with the subject "Quitar obra de La Vitrina").
- Errors show in Spanish next to the field. The form keeps the values the person typed.

## 5. Papitas (fries like)

- **Fan id:** a random UUID in an `httpOnly`, `secure`, `sameSite=lax` cookie `dd_fan`, valid for 1 year. The fries server action sets it the first time.
- **Double-tap / double-click on the image:** gives a papita if the viewer has not given one yet. It never removes one. It always plays the animation where the tap happened.
- **Button:** toggles (give / take back). It has `aria-pressed` and a label: "Dar papitas" / "Quitar papitas".
- **Optimistic UI:** the count changes at once. If the server fails, it goes back.
- **What the viewer gave is remembered:** the feed query returns `given` for each piece, from the `dd_fan` cookie.
- **Rate limit:** max 60 papitas given per IP hash per hour (count the `vitrina_fries` rows with that `ip_hash` from the last hour). Above that, a "give" returns the current count and does nothing. A "take back" always works.
- **Animation:** 6–8 small custom SVG fries burst out from the tap point, spin, and fall out over about 700 ms. Use CSS / Web Animations only, no library. The button gets a small pop. With `prefers-reduced-motion`, there is no burst, only the count and button state change.
- Design the fries illustration and motion with the `impeccable` skill.

## 6. Admin `/admin/vitrina`

- A new item in the admin nav, with a count of pending pieces.
- **Tabs:** Pendientes (oldest first), Publicados (newest first), Rechazados.
- **Card:** the image, all fields (including the email as a `mailto:` link), the links, the badge, the fries count, and the dates.
- **Actions:**
  - Pending → **Aprobar** (moves the image, publishes) or **Rechazar**.
  - Published → **Ocultar** (back to rejected, image moves back to the private bucket).
  - Any → **Eliminar** (asks first. Deletes the row and the image.)
- Every action calls `requireAdmin()` first, then uses the service client.

## 7. Security checklist

- `creator_email` and `ip_hash` never reach the browser outside admin pages. Public reads use `vitrina_public` only.
- The service role key is server-only. Add a test that fails if any `NEXT_PUBLIC_*` env var holds it.
- No SVG uploads (bucket mime allowlist + server check).
- Pending images are in a private bucket.
- Links: `http(s)` only, checked on the server. They render with `nofollow ugc`.
- All user text renders as plain text (React escaping, no `dangerouslySetInnerHTML`).
- Honeypot + rate limits on submit and fries. Turnstile is the upgrade path if spam shows up.

## 8. Testing

- **Unit (Vitest):** field validation (lengths, links, at-least-one-link, badge values), cursor encode/decode, the fan cookie helper, `hashIp`.
- **Integration (local Supabase):** `toggle_fry` is idempotent (give twice = +1, take back = −1, never below 0, no effect on unpublished work). `vitrina_public` never exposes `creator_email` / `ip_hash`. Anon cannot read the tables or the pending bucket.
- **E2E (Playwright):** submit a piece → it is not in the feed → admin approves → it shows first in the feed → double-tap → count +1 → button → count −1. Plus a mobile-viewport swipe check and a desktop keyboard check.

## 9. Rollout

1. Feature branch + PR, like the RSVP phase.
2. Run the migration on local Supabase, then push it to the cloud project `design-dinners-auth`.
3. Check that the service role key env var exists on Vercel (Production + Preview). Add it with the `npx vercel` CLI if it is missing.
4. Merge → Vercel deploys → seed 2–3 real pieces so the feed is not empty on launch day.
