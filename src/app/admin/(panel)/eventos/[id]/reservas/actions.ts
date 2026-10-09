"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isUuid, parseCapacity } from "@/lib/rsvp";
import { setEventCapacity, setRsvpStatus } from "@/lib/rsvp-db";
import { notifyRsvp } from "@/lib/rsvp-notify";
import type { RsvpStatus } from "@/lib/types";

const STATUSES = new Set<RsvpStatus>(["confirmed", "waitlist", "cancelled"]);

function refresh(eventId: string) {
  revalidatePath(`/admin/eventos/${eventId}/reservas`);
  revalidatePath("/admin/eventos");
  revalidatePath(`/eventos/${eventId}`);
  revalidatePath("/");
}

export async function changeRsvpStatus(eventId: string, rsvpId: string, status: RsvpStatus): Promise<void> {
  await requireAdmin();
  if (!isUuid(eventId) || !isUuid(rsvpId) || !STATUSES.has(status)) return;
  let change;
  try {
    change = await setRsvpStatus(getDb(), { eventId, rsvpId, status });
  } catch (error) {
    console.error("changeRsvpStatus failed", error);
    return;
  }
  refresh(eventId);
  // Only a waitlist → confirmed move tells the guest a seat opened.
  if (change?.previous === "waitlist" && status === "confirmed") {
    const { name, email } = change;
    after(() => notifyRsvp({ kind: "promoted", eventId, name, email, position: null }));
  }
}

export async function updateCapacity(
  eventId: string,
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin();
  if (!isUuid(eventId)) return { error: "Evento no válido." };
  const parsed = parseCapacity(formData.get("capacity"));
  if ("error" in parsed) return { error: parsed.error };
  try {
    const updated = await setEventCapacity(getDb(), eventId, parsed.value);
    if (!updated) return { error: "Ese evento ya no existe." };
  } catch (error) {
    console.error("updateCapacity failed", error);
    return { error: "No pudimos guardar el cupo. Intenta de nuevo." };
  }
  refresh(eventId);
  return { ok: true };
}
