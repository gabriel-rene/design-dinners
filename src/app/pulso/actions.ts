"use server";

import { after } from "next/server";

import { getDb, hasDatabaseConfig } from "@/lib/db";
import { EMAIL_REPLY_TO, sendEmail } from "@/lib/email";
import { countRecentInterest, insertInterest } from "@/lib/pulso/db";
import { buildInterestEmail } from "@/lib/pulso/email";
import { INTEREST_PER_DAY, parsePulsoInput, pulsoRawFromFormData, type PulsoFieldErrors } from "@/lib/pulso/validate";
import { isHoneypotFilled } from "@/lib/rsvp";
import { logSafe } from "@/lib/vitrina/log";
import { requestIpHash } from "@/lib/vitrina/request";

export type PulsoFormState =
  | { status: "idle" }
  | { status: "error"; problem?: "unavailable" | "limit" | "failed"; errors?: PulsoFieldErrors }
  | { status: "received" };

/** Who gets the notice. Defaults to the Design Dinners inbox. */
const NOTIFY_TO = process.env.PULSO_NOTIFY_TO || EMAIL_REPLY_TO;

export async function submitPulsoInterest(_prev: PulsoFormState, formData: FormData): Promise<PulsoFormState> {
  // Bots fill the hidden field: pretend it worked, store nothing.
  if (isHoneypotFilled(formData.get("website"))) return { status: "received" };

  const parsed = parsePulsoInput(pulsoRawFromFormData(formData));
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  if (!hasDatabaseConfig) return { status: "error", problem: "unavailable" };

  const sql = getDb();
  const ipHash = await requestIpHash();
  try {
    if (ipHash && (await countRecentInterest(sql, ipHash)) >= INTEREST_PER_DAY) {
      return { status: "error", problem: "limit" };
    }
    await insertInterest(sql, parsed.value, ipHash);
  } catch (error) {
    // Code + message only: never the sender's email or the failing row.
    logSafe("submitPulsoInterest failed", error);
    return { status: "error", problem: "failed" };
  }

  // The row is saved; the notice must not slow down or break the reply.
  after(async () => {
    const result = await sendEmail({ to: NOTIFY_TO, ...buildInterestEmail(parsed.value) });
    if (result === "failed") console.error("pulso interest email failed");
  });
  return { status: "received" };
}
