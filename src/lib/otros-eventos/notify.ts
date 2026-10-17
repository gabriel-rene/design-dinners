// Sends the approval email. Call inside `after()`; never throws.
import "server-only";

import { sendEmail } from "@/lib/email";
import { communityEventPath } from "@/lib/slug";
import { logSafe } from "@/lib/vitrina/log";

import { buildApprovalEmail } from "./email";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function notifyEventApproved(input: {
  email: string;
  title: string;
  startsAt: string;
  slug: string | null;
}): Promise<void> {
  try {
    // The event's own page; a row without a slug yet falls back to the agenda.
    const path = input.slug ? communityEventPath({ slug: input.slug }) : "/eventos?tipo=comunidad";
    const message = buildApprovalEmail({ title: input.title, startsAt: input.startsAt, pageUrl: `${SITE}${path}` });
    const result = await sendEmail({ to: input.email, ...message });
    if (result === "failed") console.error("otros-eventos approval email failed");
  } catch (error) {
    logSafe("otros-eventos approval email failed", error);
  }
}
