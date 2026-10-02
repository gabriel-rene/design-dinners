"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { getDb, hasDatabaseConfig } from "@/lib/db";
import {
  RATE_LIMIT_PER_HOUR,
  isHoneypotFilled,
  isUuid,
  parseRsvpInput,
  type RsvpFieldErrors,
} from "@/lib/rsvp";
import { clientIpFrom, hashIp } from "@/lib/rsvp-server";
import { countRecentByIp, insertRsvp, isEventOpenForRsvp } from "@/lib/rsvp-db";

export type RsvpState =
  | { status: "idle" }
  | { status: "error"; message?: string; errors?: RsvpFieldErrors; values: { name: string; email: string } }
  | { status: "confirmed"; name: string; position: number }
  | { status: "waitlist"; name: string; email: string; position: number }
  | { status: "received" };

export async function submitRsvp(
  eventId: string,
  _prev: RsvpState,
  formData: FormData,
): Promise<RsvpState> {
  // Bots fill the hidden field: pretend it worked, store nothing.
  if (isHoneypotFilled(formData.get("website"))) return { status: "received" };

  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const parsed = parseRsvpInput(values);
  if (!parsed.ok) return { status: "error", errors: parsed.errors, values };

  if (!hasDatabaseConfig || !isUuid(eventId)) {
    return { status: "error", message: "Las reservas no están disponibles ahora mismo.", values };
  }

  const sql = getDb();
  const ip = clientIpFrom((await headers()).get("x-forwarded-for"));
  const ipHash = hashIp(ip, process.env.RSVP_IP_SALT);

  try {
    if (ipHash && (await countRecentByIp(sql, ipHash)) >= RATE_LIMIT_PER_HOUR) {
      return { status: "error", message: "Demasiados intentos. Intenta más tarde.", values };
    }

    const result = await insertRsvp(sql, { eventId, name: parsed.name, email: parsed.email, ipHash });

    if (!result) {
      if (!(await isEventOpenForRsvp(sql, eventId))) {
        return { status: "error", message: "Este evento ya no acepta reservas.", values };
      }
      // Duplicate email: same neutral answer for everyone, so the form never
      // reveals who already signed up.
      return { status: "received" };
    }

    revalidatePath("/");
    revalidatePath(`/eventos/${eventId}`);
    revalidatePath("/admin/eventos");
    revalidatePath(`/admin/eventos/${eventId}/reservas`);

    return result.status === "confirmed"
      ? { status: "confirmed", name: parsed.name, position: result.position }
      : { status: "waitlist", name: parsed.name, email: parsed.email, position: result.position };
  } catch (error) {
    // Log the error object only, never the visitor's name or email.
    console.error("submitRsvp failed", error);
    return { status: "error", message: "No pudimos guardar tu reserva. Intenta de nuevo.", values };
  }
}
