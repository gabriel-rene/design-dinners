import { permanentRedirect, redirect } from "next/navigation";

import { buildIcs } from "@/lib/ics";
import { findPublicEvent } from "@/lib/queries";
import { eventPath } from "@/lib/slug";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lookup = await findPublicEvent(slug);
  if (!lookup) return new Response("No encontrado", { status: 404 });
  if (!lookup.canonical) {
    const to = `${eventPath(lookup.event)}/calendario.ics`;
    if (lookup.matchedBy === "old_slug") redirect(to);
    permanentRedirect(to);
  }

  const { event } = lookup;
  const body = buildIcs(event, `${SITE}${eventPath(event)}`);
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="design-dinners.ics"',
      "Cache-Control": "public, max-age=300",
    },
  });
}
