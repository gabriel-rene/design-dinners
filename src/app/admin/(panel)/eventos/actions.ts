"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdmin } from "@/lib/auth";
import { isValidHttpUrl, uploadImageIfPresent } from "@/lib/admin-helpers";
import type { FormState } from "@/components/admin/formStyles";

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

/** Validate + normalize the shared event fields. Returns an error string on the
 *  first problem, or the parsed record. Image is handled separately (needs the
 *  Supabase client). */
function parseEvent(formData: FormData): { error: string } | { value: ParsedEvent } {
  const title = String(formData.get("title") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "").trim();
  const eventType = String(formData.get("event_type") ?? "cena").trim();
  const registrationUrl = String(formData.get("registration_url") ?? "").trim();

  if (!title) {
    return { error: "El título es obligatorio." };
  }
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
  const speaker_ids = formData
    .getAll("speaker_ids")
    .map((value) => String(value))
    .filter(Boolean);

  return {
    value: {
      title,
      description: description || null,
      // The <input type="datetime-local"> value has no zone. Interpret it as
      // Puerto Rico local time (AST, always UTC-4 — PR observes no DST) so what
      // the admin types round-trips through storage and back to both the edit
      // form and the landing (which also formats in America/Puerto_Rico).
      event_date: new Date(`${eventDate}:00-04:00`).toISOString(),
      location: location || null,
      event_type: eventType,
      registration_url: registrationUrl || null,
      speaker_ids,
    },
  };
}

// Replace-all strategy for the join rows. NOTE: delete + insert are two separate
// statements (Supabase has no client-side transaction here); a crash between
// them could leave an event with no speakers. Acceptable for a low-volume admin
// tool — the next successful save fully reconciles the set.
async function setEventSpeakers(
  supabase: SupabaseClient,
  eventId: string,
  speakerIds: string[],
): Promise<{ error: string } | null> {
  const { error: deleteError } = await supabase
    .from("event_speakers")
    .delete()
    .eq("event_id", eventId);
  if (deleteError) {
    return { error: "No pudimos actualizar los speakers del evento." };
  }

  if (speakerIds.length > 0) {
    const { error: insertError } = await supabase
      .from("event_speakers")
      .insert(speakerIds.map((speaker_id) => ({ event_id: eventId, speaker_id })));
    if (insertError) {
      return { error: "No pudimos asignar los speakers seleccionados." };
    }
  }

  return null;
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

  const { speaker_ids, ...fields } = parsed.value;
  const { data, error } = await supabase
    .from("events")
    .insert({ ...fields, cover_image_url: image.url })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "No pudimos guardar el evento. Intenta de nuevo." };
  }

  const speakersError = await setEventSpeakers(supabase, data.id, speaker_ids);
  if (speakersError) return speakersError;

  revalidatePath("/");
  revalidatePath("/admin/eventos");
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

  // Read the current cover so an update without a new file keeps the old image.
  const { data: current } = await supabase
    .from("events")
    .select("cover_image_url")
    .eq("id", id)
    .maybeSingle();

  const image = await uploadImageIfPresent(
    supabase,
    formData,
    "cover_image",
    "events",
    current?.cover_image_url ?? null,
  );
  if ("error" in image) return image;

  const { speaker_ids, ...fields } = parsed.value;
  const { error } = await supabase
    .from("events")
    .update({ ...fields, cover_image_url: image.url })
    .eq("id", id);

  if (error) {
    return { error: "No pudimos guardar los cambios. Intenta de nuevo." };
  }

  const speakersError = await setEventSpeakers(supabase, id, speaker_ids);
  if (speakersError) return speakersError;

  revalidatePath("/");
  revalidatePath("/admin/eventos");
  redirect("/admin/eventos");
}

// Signature is just `(id)`; bound as `deleteEvent.bind(null, id)` it becomes the
// `() => Promise<FormState>` that DeleteButton's useActionState drives (the
// state/formData args it would pass are simply unused here).
export async function deleteEvent(id: string): Promise<FormState> {
  const { supabase } = await requireAdmin();

  // ON DELETE CASCADE on event_speakers removes only the join rows; the
  // speakers themselves are untouched (asserted in e2e).
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) {
    return { error: "No pudimos eliminar el evento. Intenta de nuevo." };
  }

  revalidatePath("/");
  revalidatePath("/admin/eventos");
  redirect("/admin/eventos");
}
