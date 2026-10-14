// Sends the approval email. Call inside `after()`; never throws.
import "server-only";

import { sendEmail } from "@/lib/email";
import { logSafe } from "@/lib/vitrina/log";

import { buildApprovalEmail } from "./email";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function notifyEventApproved(input: { email: string; title: string; startsAt: string }): Promise<void> {
  try {
    const message = buildApprovalEmail({ title: input.title, startsAt: input.startsAt, pageUrl: `${SITE}/otros-eventos` });
    const result = await sendEmail({ to: input.email, ...message });
    if (result === "failed") console.error("otros-eventos approval email failed");
  } catch (error) {
    logSafe("otros-eventos approval email failed", error);
  }
}
