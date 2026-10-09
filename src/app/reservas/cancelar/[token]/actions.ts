"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { getDb, hasDatabaseConfig } from "@/lib/db";
import { isUuid } from "@/lib/rsvp";
import { cancelRsvpByToken } from "@/lib/rsvp-db";
import { notifyRsvp } from "@/lib/rsvp-notify";

export type CancelState = { status: "idle" | "done" | "already" | "past" | "invalid" | "error" };

/** The only way a guest cancels: a POST from the button, never the email link itself. */
export async function cancelReservation(token: string, _prev: CancelState): Promise<CancelState> {
  if (!hasDatabaseConfig || !isUuid(token)) return { status: "invalid" };
  try {
    const result = await cancelRsvpByToken(getDb(), token);
    if (result.outcome !== "cancelled") return { status: result.outcome };

    const { eventId, promoted } = result;
    revalidatePath("/");
    revalidatePath(`/eventos/${eventId}`);
    revalidatePath("/admin/eventos");
    revalidatePath(`/admin/eventos/${eventId}/reservas`);
    if (promoted) {
      // The freed seat went to the first guest in line: tell them.
      after(() =>
        notifyRsvp({
          kind: "promoted",
          eventId,
          name: promoted.name,
          email: promoted.email,
          position: null,
          cancelToken: promoted.cancelToken,
        }),
      );
    }
    return { status: "done" };
  } catch (error) {
    // Log the error object only, never the guest's details.
    console.error("cancelReservation failed", error);
    return { status: "error" };
  }
}
