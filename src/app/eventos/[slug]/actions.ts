"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";

import { dbErrorSummary, getDb, hasDatabaseConfig } from "@/lib/db";
import { parseDisciplineInput, type DisciplineErrors } from "@/lib/disciplines";
import {
  RATE_LIMIT_PER_HOUR,
  isHoneypotFilled,
  isUuid,
  parseRsvpInput,
  type RsvpFieldErrors,
} from "@/lib/rsvp";
import { clientIpFrom, hashIp, warnIfRateLimitDisabled } from "@/lib/ip-hash";
import { countRecentByIp, insertRsvp, isEventOpenForRsvp } from "@/lib/rsvp-db";
import { notifyRsvp } from "@/lib/rsvp-notify";
import { rememberJoined } from "@/lib/whatsapp";

type RsvpValues = { name: string; email: string; discipline: string; disciplineOther: string };

export type RsvpState =
  | { status: "idle" }
  | { status: "error"; message?: string; errors?: RsvpFieldErrors & DisciplineErrors; values: RsvpValues }
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

  const values: RsvpValues = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    discipline: String(formData.get("discipline") ?? ""),
    disciplineOther: String(formData.get("discipline_other") ?? ""),
  };
  const parsed = parseRsvpInput(values);
  const discipline = parseDisciplineInput(values);
  if (!parsed.ok || !discipline.ok) {
    return {
      status: "error",
      errors: { ...(parsed.ok ? {} : parsed.errors), ...(discipline.ok ? {} : discipline.errors) },
      values,
    };
  }

  if (!hasDatabaseConfig || !isUuid(eventId)) {
    return { status: "error", message: "Las reservas no están disponibles ahora mismo.", values };
  }

  const sql = getDb();
  const ip = clientIpFrom((await headers()).get("x-forwarded-for"));
  warnIfRateLimitDisabled(process.env.RSVP_IP_SALT);
  const ipHash = hashIp(ip, process.env.RSVP_IP_SALT);

  try {
    if (ipHash && (await countRecentByIp(sql, ipHash)) >= RATE_LIMIT_PER_HOUR) {
      return { status: "error", message: "Demasiados intentos. Intenta más tarde.", values };
    }

    const result = await insertRsvp(sql, {
      eventId,
      name: parsed.name,
      email: parsed.email,
      ipHash,
      discipline: discipline.discipline,
      disciplineOther: discipline.disciplineOther,
      rateLimitPerHour: RATE_LIMIT_PER_HOUR,
    });

    if (!result) {
      if (!(await isEventOpenForRsvp(sql, eventId))) {
        return { status: "error", message: "Este evento ya no acepta reservas.", values };
      }
      // Lost a parallel race for the last slots of this IP's hourly limit.
      if (ipHash && (await countRecentByIp(sql, ipHash)) >= RATE_LIMIT_PER_HOUR) {
        return { status: "error", message: "Demasiados intentos. Intenta más tarde.", values };
      }
      // Duplicate email: a neutral answer. A new RSVP shows its seat, so this
      // does tell a prober the email was already booked for this event; the
      // probe itself books (and emails) anyone who wasn't, so it's noisy.
      await rememberJoined();
      return { status: "received" };
    }

    // They gave the same answers as the WhatsApp sign-up: skip that form.
    await rememberJoined();

    revalidatePath("/");
    revalidatePath("/eventos/[slug]", "page");
    revalidatePath("/admin/eventos");
    revalidatePath(`/admin/eventos/${eventId}/reservas`);

    // Sent after the response, so the guest never waits on email.
    after(() =>
      notifyRsvp({
        kind: result.status,
        eventId,
        name: parsed.name,
        email: parsed.email,
        position: result.position,
        cancelToken: result.cancelToken,
      }),
    );

    return result.status === "confirmed"
      ? { status: "confirmed", name: parsed.name, position: result.position }
      : { status: "waitlist", name: parsed.name, email: parsed.email, position: result.position };
  } catch (error) {
    // Code and message only: a Postgres error's detail can echo the row.
    console.error("submitRsvp failed", dbErrorSummary(error));
    return { status: "error", message: "No pudimos guardar tu reserva. Intenta de nuevo.", values };
  }
}
