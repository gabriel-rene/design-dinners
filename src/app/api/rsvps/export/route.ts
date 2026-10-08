// RSVP feed for the organizer's Google Sheet. Not linked anywhere: only a
// caller with `Authorization: Bearer $RSVP_EXPORT_TOKEN` gets data. With no
// token configured the route answers 404, so the feature is off by default.
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { buildExportRows, EXPORT_HEADER, isAuthorizedExport, type ExportRow } from "@/lib/rsvp-export";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request) {
  const token = process.env.RSVP_EXPORT_TOKEN;
  if (!token) return new Response("No encontrado", { status: 404, headers: HEADERS });
  if (!isAuthorizedExport(request.headers.get("authorization"), token)) {
    return new Response("No autorizado", { status: 401, headers: HEADERS });
  }
  if (!hasDatabaseConfig) return Response.json({ header: EXPORT_HEADER, rows: [] }, { headers: HEADERS });

  const sql = getDb();
  // Newest event first; inside an event, sign-up order.
  const rows = (await sql`
    select e.title as event_title, e.event_date, r.name, r.email, r.status, r.created_at
    from rsvps r
    join events e on e.id = r.event_id
    order by e.event_date desc, r.created_at asc
  `) as ExportRow[];

  return Response.json(
    { updatedAt: new Date().toISOString(), header: EXPORT_HEADER, rows: buildExportRows(rows) },
    { headers: HEADERS },
  );
}
