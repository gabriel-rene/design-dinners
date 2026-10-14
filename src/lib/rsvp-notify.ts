// Looks up the event and sends one RSVP email. Call it inside `after()` so the
// guest never waits on Resend. Never throws.
import "server-only";

import { sendEmail, type SendResult } from "./email";
import { getPublicEvent } from "./queries";
import { buildRsvpEmail, type RsvpEmailKind } from "./rsvp-email";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function cancelUrlFor(token: string): string {
  return `${SITE}/reservas/cancelar/${token}`;
}

export async function notifyRsvp(input: {
  kind: RsvpEmailKind;
  eventId: string;
  name: string;
  email: string;
  position: number | null;
  cancelToken: string | null;
}): Promise<SendResult | "no-event"> {
  try {
    const event = await getPublicEvent(input.eventId);
    if (!event) return "no-event";
    const email = buildRsvpEmail({
      kind: input.kind,
      guestName: input.name,
      position: input.position,
      capacity: event.capacity,
      event,
      eventUrl: `${SITE}/eventos/${event.id}`,
      whatsappGroupUrl: process.env.NEXT_PUBLIC_WHATSAPP_URL || null,
      cancelUrl: input.cancelToken ? cancelUrlFor(input.cancelToken) : null,
    });
    return await sendEmail({
      to: input.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: email.ics ? [{ filename: "design-dinners.ics", content: email.ics }] : undefined,
    });
  } catch (error) {
    // Log the error object only, never the guest's name or email.
    console.error("notifyRsvp failed", error);
    return "failed";
  }
}
