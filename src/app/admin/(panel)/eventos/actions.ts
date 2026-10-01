"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/components/admin/formStyles";
import { isValidHttpUrl, uploadImageIfPresent } from "@/lib/admin-helpers";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

const EVENT_TYPES = new Set(["cena", "taller", "otro"]);

type ParsedEvent = {
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  event_type: string;
  registration_url: string | null;
  speaker_ids: string[];
};

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

  const description = String(formData.get("description") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();

  return {
    value: {
      title,
      description: description || null,
      event_date: new Date(`${eventDate}:00-04:00`).toISOString(),
      location: location || null,
      event_type: eventType,
      registration_url: registrationUrl || null,
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

  try {
    await sql.transaction((txn) => [
      txn`
        insert into events (
          id, title, description, event_date, location, event_type,
          registration_url, cover_image_url
        ) values (
          ${id}, ${event.title}, ${event.description}, ${event.event_date},
          ${event.location}, ${event.event_type}, ${event.registration_url},
          ${image.url}
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
    select cover_image_url from events where id = ${id} limit 1
  `;
  const currentUrl =
    (currentRows[0] as { cover_image_url: string | null } | undefined)
      ?.cover_image_url ?? null;

  const image = await uploadImageIfPresent(
    supabase,
    formData,
    "cover_image",
    "events",
    currentUrl,
  );
  if ("error" in image) return image;

  const { speaker_ids, ...event } = parsed.value;

  try {
    await sql.transaction((txn) => [
      txn`
        update events set
          title = ${event.title},
          description = ${event.description},
          event_date = ${event.event_date},
          location = ${event.location},
          event_type = ${event.event_type},
          registration_url = ${event.registration_url},
          cover_image_url = ${image.url}
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
