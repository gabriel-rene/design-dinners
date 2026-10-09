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
  /** Wait before the one retry pass for failed sends. */
  retryDelayMs?: number;
};

const MAX_PER_PASS = 1000;
const KINDS = ["reminder", "final"] as const;
const sleep = (ms?: number) => (ms ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

type Pass = { sent: number; failed: number; stop: boolean };

/**
 * Claims and sends until no guest is left for this kind. Every claimed guest
 * whose email did not go out is released — also when something throws — so a
 * later pass or run can try again. Released only at the end, or the same guest
 * would be claimed again at once.
 */
async function pass(deps: ReminderDeps, kind: ReminderKind): Promise<Pass> {
  const result: Pass = { sent: 0, failed: 0, stop: false };
  const unsent: string[] = [];
  try {
    for (let i = 0; i < MAX_PER_PASS; i++) {
      const target = await deps.claim(kind);
      if (!target) break;
      unsent.push(target.id);
      const outcome = await deps.send(kind, target);
      if (outcome === "sent") {
        unsent.pop();
        result.sent++;
      } else {
        result.failed++;
        // No API key: every send would skip. Stop the whole run.
        if (outcome === "skipped") {
          result.stop = true;
          break;
        }
      }
      await sleep(deps.pauseMs);
    }
  } finally {
    for (const id of unsent) await deps.release(kind, id).catch(() => {});
  }
  return result;
}

/** One pass per kind, then one retry pass for any kind that had failures. */
export async function runReminders(deps: ReminderDeps): Promise<Record<ReminderKind, Counts>> {
  const out: Record<ReminderKind, Counts> = { reminder: { sent: 0, failed: 0 }, final: { sent: 0, failed: 0 } };
  const retry: ReminderKind[] = [];
  for (const kind of KINDS) {
    const r = await pass(deps, kind);
    out[kind] = { sent: r.sent, failed: r.failed };
    if (r.stop) return out;
    if (r.failed) retry.push(kind);
  }
  if (retry.length) await sleep(deps.retryDelayMs);
  for (const kind of retry) {
    const r = await pass(deps, kind);
    // `failed` now counts only the guests still without the email.
    out[kind] = { sent: out[kind].sent + r.sent, failed: r.failed };
    if (r.stop) break;
  }
  return out;
}
