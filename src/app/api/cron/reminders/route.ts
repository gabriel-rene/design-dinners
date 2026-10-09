// Daily reminder job (vercel.json cron: 10 AM Puerto Rico, plus a noon run that
// only picks up guests a failed send left behind). Vercel calls it with
// `Authorization: Bearer $CRON_SECRET`. No secret configured → 401 for everyone.
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { runReminders } from "@/lib/reminders";
import { claimNextReminder, releaseReminder } from "@/lib/rsvp-db";
import { isAuthorizedExport } from "@/lib/rsvp-export";
import { notifyRsvp } from "@/lib/rsvp-notify";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const HEADERS = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  // Same constant-time bearer check as the Sheets feed.
  if (!isAuthorizedExport(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return new Response("No autorizado", { status: 401, headers: HEADERS });
  }
  if (!hasDatabaseConfig) return Response.json({ skipped: "no database" }, { headers: HEADERS });

  const sql = getDb();
  const now = new Date();
  const counts = await runReminders({
    claim: (kind) => claimNextReminder(sql, kind, now),
    release: (kind, id) => releaseReminder(sql, kind, id),
    send: (kind, t) =>
      notifyRsvp({ kind, eventId: t.eventId, name: t.name, email: t.email, position: null, cancelToken: t.cancelToken }),
    pauseMs: 600,
    retryDelayMs: 5_000,
  });
  // Counts only, never guest details.
  console.log("reminders", JSON.stringify(counts));
  return Response.json(counts, { headers: HEADERS });
}
