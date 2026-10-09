// The daily reminder loop, with its I/O injected so it can be unit tested.
import type { ReminderKind, ReminderTarget } from "./rsvp-db";

export type Counts = { sent: number; failed: number };
type SendOutcome = "sent" | "skipped" | "failed" | "no-event";

export type ReminderDeps = {
  claim: (kind: ReminderKind) => Promise<ReminderTarget | null>;
  release: (kind: ReminderKind, rsvpId: string) => Promise<void>;
  send: (kind: ReminderKind, target: ReminderTarget) => Promise<SendOutcome>;
  /** Pause between sends to stay under Resend's rate limit. */
  pauseMs?: number;
};

const MAX_PER_KIND = 1000;

export async function runReminders(deps: ReminderDeps): Promise<Record<ReminderKind, Counts>> {
  const out: Record<ReminderKind, Counts> = { reminder: { sent: 0, failed: 0 }, final: { sent: 0, failed: 0 } };
  for (const kind of ["reminder", "final"] as const) {
    const failed: string[] = [];
    let stop = false;
    for (let i = 0; i < MAX_PER_KIND; i++) {
      const target = await deps.claim(kind);
      if (!target) break;
      const result = await deps.send(kind, target);
      if (result === "sent") out[kind].sent++;
      else {
        out[kind].failed++;
        failed.push(target.id);
        // No API key: every send would skip. Stop the whole run; the next one retries.
        if (result === "skipped") {
          stop = true;
          break;
        }
      }
      if (deps.pauseMs) await new Promise((r) => setTimeout(r, deps.pauseMs));
    }
    // Released only after the loop, or the same guest would be claimed again at once.
    for (const id of failed) await deps.release(kind, id);
    if (stop) break;
  }
  return out;
}
