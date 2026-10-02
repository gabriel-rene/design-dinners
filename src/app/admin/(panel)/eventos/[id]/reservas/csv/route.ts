import { requireAdmin } from "@/lib/auth";
import { getEventById, getEventRsvps } from "@/lib/queries";
import { buildRsvpCsv } from "@/lib/rsvp";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) return new Response("No encontrado", { status: 404 });

  const rows = await getEventRsvps(id);
  // NFD splits "é" into "e" + a combining accent; drop the accents so
  // "Música" becomes "musica", not "mu-sica".
  const slug =
    event.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "evento";
  return new Response(buildRsvpCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reservas-${slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
