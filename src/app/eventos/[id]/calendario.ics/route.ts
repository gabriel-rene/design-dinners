import { buildIcs } from "@/lib/ics";
import { getPublicEvent } from "@/lib/queries";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getPublicEvent(id);
  if (!event) return new Response("No encontrado", { status: 404 });

  const body = buildIcs(event, `${SITE}/eventos/${event.id}`);
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="design-dinners.ics"',
      "Cache-Control": "public, max-age=300",
    },
  });
}
