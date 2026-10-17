"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/components/admin/formStyles";
import { isValidHttpUrl, uploadImageIfPresent } from "@/lib/admin-helpers";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { parseCapacity } from "@/lib/rsvp";
import { slugify, uniqueSlug } from "@/lib/slug";

const EVENT_TYPES = new Set(["cena", "taller", "otro"]);

type ParsedEvent = {
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  event_type: string;
  registration_url: string | null;
  capacity: number | null;
  host_name: string | null;
  theme_bg: string | null;
  theme_ink: string | null;
  theme_accent: string | null;
  speaker_ids: string[];
};

const HEX = /^#[0-9a-f]{6}$/i;
const THEME_FIELDS = ["theme_bg", "theme_ink", "theme_accent"] as const;

function parseEvent(formData: FormData): { error: string } | { value: ParsedEvent } {
  const title = String(formData.get("title") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "").trim();
  const eventType = String(formData.get("event_type") ?? "cena").trim();
  const registrationUrl = String(formData.get("registration_url") ?? "").trim();

  if (!title) return { error: "El título es obligatorio." };
  if (!eventDate || Number.isNaN(Date.parse(eventDate))) {
    return { error: "La fecha del evento no es válida." };
  }
  if (!EVENT_TYPES.has(eventType)) {
    return { error: "El tipo de evento no es válido." };
  }
  if (registrationUrl && !isValidHttpUrl(registrationUrl)) {
    return { error: "El enlace de registro debe ser una URL http(s) válida." };
  }

  const capacity = parseCapacity(formData.get("capacity"));
  if ("error" in capacity) return { error: capacity.error };

  const description = String(formData.get("description") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const hostName = String(formData.get("host_name") ?? "").trim();
  if (hostName.length > 80) return { error: "El nombre del host es muy largo." };

  // All three colors or none: a half-set theme would mix with brand red.
  const useTheme = formData.get("use_theme") === "on";
  const theme = THEME_FIELDS.map((f) => String(formData.get(f) ?? "").trim());
  if (useTheme && theme.some((c) => !HEX.test(c))) {
    return { error: "Los colores del mes deben ser #rrggbb." };
  }
  const [themeBg, themeInk, themeAccent] = useTheme ? theme : [null, null, null];

  return {
    value: {
      title,
      description: description || null,
      event_date: new Date(`${eventDate}:00-04:00`).toISOString(),
      location: location || null,
      event_type: eventType,
      registration_url: registrationUrl || null,
      capacity: capacity.value,
      host_name: hostName || null,
      theme_bg: themeBg,
      theme_ink: themeInk,
      theme_accent: themeAccent,
      speaker_ids: formData
        .getAll("speaker_ids")
        .map(String)
        .filter(Boolean),
    },
  };
}

function refreshEventPages() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/eventos");
  // Dynamic-segment form: refreshes every public event page at once.
  revalidatePath("/eventos/[slug]", "page");
}

/** Slugs and old slugs of every event except `exceptId` (an event may reuse its own). */
async function takenSlugs(exceptId: string | null): Promise<string[]> {
  const sql = getDb();
  const rows = (await sql`
    select slug, old_slugs from events
    where ${exceptId}::uuid is null or id <> ${exceptId}::uuid
  `) as { slug: string | null; old_slugs: string[] | null }[];
  return rows.flatMap((r) => [...(r.slug ? [r.slug] : []), ...(r.old_slugs ?? [])]);
}

export async function createEvent(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = parseEvent(formData);
  if ("error" in parsed) return parsed;

  const image = await uploadImageIfPresent(
    supabase,
    formData,
    "cover_image",
    "events",
    null,
  );
  if ("error" in image) return image;

  const id = crypto.randomUUID();
  const sql = getDb();
  const { speaker_ids, ...event } = parsed.value;

  let slug: string;
  try {
    slug = uniqueSlug(slugify(event.title), await takenSlugs(null));
  } catch {
    return { error: "No pudimos guardar el evento. Intenta de nuevo." };
  }

  try {
    await sql.transaction((txn) => [
      txn`
        insert into events (
          id, slug, title, description, event_date, location, event_type,
          registration_url, capacity, cover_image_url,
          host_name, theme_bg, theme_ink, theme_accent
        ) values (
          ${id}, ${slug}, ${event.title}, ${event.description}, ${event.event_date},
          ${event.location}, ${event.event_type}, ${event.registration_url},
          ${event.capacity}, ${image.url},
          ${event.host_name}, ${event.theme_bg}, ${event.theme_ink}, ${event.theme_accent}
        )
      `,
      ...speaker_ids.map(
        (speakerId) => txn`
          insert into event_speakers (event_id, speaker_id)
          values (${id}, ${speakerId})
        `,
      ),
    ]);
  } catch {
    return { error: "No pudimos guardar el evento. Intenta de nuevo." };
  }

  refreshEventPages();
  redirect("/admin/eventos");
}

export async function updateEvent(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = parseEvent(formData);
  if ("error" in parsed) return parsed;

  const sql = getDb();
  const currentRows = await sql`
    select cover_image_url, title, slug from events where id = ${id} limit 1
  `;
  const current = currentRows[0] as
    | { cover_image_url: string | null; title: string; slug: string | null }
    | undefined;
  const currentUrl = current?.cover_image_url ?? null;

  const image = await uploadImageIfPresent(
    supabase,
    formData,
    "cover_image",
    "events",
    currentUrl,
  );
  if ("error" in image) return image;

  const { speaker_ids, ...event } = parsed.value;

  // Keep the slug while the title is unchanged; otherwise derive a new unique
  // one and remember the previous slug so old links redirect.
  let slug: string;
  try {
    slug =
      current?.slug && current.title === event.title
        ? current.slug
        : uniqueSlug(slugify(event.title), await takenSlugs(id));
  } catch {
    return { error: "No pudimos guardar los cambios. Intenta de nuevo." };
  }

  try {
    await sql.transaction((txn) => [
      txn`
        update events set
          old_slugs = array_remove(
            case
              when slug is not null and slug <> ${slug}::text and not (slug = any(old_slugs))
                then array_append(old_slugs, slug)
              else old_slugs
            end,
            ${slug}::text
          ),
          slug = ${slug},
          title = ${event.title},
          description = ${event.description},
          event_date = ${event.event_date},
          location = ${event.location},
          event_type = ${event.event_type},
          registration_url = ${event.registration_url},
          capacity = ${event.capacity},
          cover_image_url = ${image.url},
          host_name = ${event.host_name},
          theme_bg = ${event.theme_bg},
          theme_ink = ${event.theme_ink},
          theme_accent = ${event.theme_accent}
        where id = ${id}
      `,
      txn`delete from event_speakers where event_id = ${id}`,
      ...speaker_ids.map(
        (speakerId) => txn`
          insert into event_speakers (event_id, speaker_id)
          values (${id}, ${speakerId})
        `,
      ),
    ]);
  } catch {
    return { error: "No pudimos guardar los cambios. Intenta de nuevo." };
  }

  refreshEventPages();
  redirect("/admin/eventos");
}

export async function deleteEvent(id: string): Promise<FormState> {
  await requireAdmin();
  const sql = getDb();

  try {
    await sql`delete from events where id = ${id}`;
  } catch {
    return { error: "No pudimos eliminar el evento. Intenta de nuevo." };
  }

  refreshEventPages();
  redirect("/admin/eventos");
}
