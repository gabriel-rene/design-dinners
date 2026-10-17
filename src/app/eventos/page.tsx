import type { Metadata } from "next";

import SiteHeader from "@/components/SiteHeader";
import NextEvent from "@/components/landing/NextEvent";
import PastEvents from "@/components/landing/PastEvents";
import AgendaFilters from "@/components/eventos/AgendaFilters";
import AgendaList from "@/components/eventos/AgendaList";
import ShareEventBox from "@/components/eventos/ShareEventBox";
import { buildAgenda, parseAgendaFilter } from "@/lib/agenda";
import { splitEvents } from "@/lib/derive";
import { getEventsWithSpeakers } from "@/lib/queries";
import { getServiceClient, hasServiceConfig } from "@/lib/supabase/service";
import { listUpcomingEvents } from "@/lib/otros-eventos/db";
import { loadEventsPreview } from "@/lib/otros-eventos/preview";
import type { PublicCommunityEvent } from "@/lib/otros-eventos/types";

const DESCRIPTION = "Las cenas de Design Dinners y lo que se mueve en la comunidad de diseño.";

export const metadata: Metadata = {
  title: "Eventos — Design Dinners",
  description: DESCRIPTION,
};

// Reads `?tipo=` per request; both reads are cheap and traffic is small.
export const dynamic = "force-dynamic";

/** Upcoming community events. Supabase down or not configured → [] (Design Dinners still shows). */
async function getCommunityEvents(): Promise<PublicCommunityEvent[]> {
  if (!hasServiceConfig) return [];
  return loadEventsPreview(() => listUpcomingEvents(getServiceClient(), 60));
}

export default async function EventosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string | string[] }>;
}) {
  const { tipo } = await searchParams;
  const filter = parseAgendaFilter(tipo);

  const [events, communityEvents] = await Promise.all([getEventsWithSpeakers(), getCommunityEvents()]);

  const now = new Date();
  const { upcoming, past } = splitEvents(events, now);
  const featured = upcoming[0] ?? null;
  const rows = buildAgenda({
    ddEvents: events,
    communityEvents,
    filter,
    now,
  });
  const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_URL || "#";

  return (
    <main className="flex-1">
      <div className="border-b-2 border-dd-black pb-12 md:pb-16">
        <SiteHeader whatsappUrl={whatsappUrl} current="eventos" />
        <div className="mx-auto w-full max-w-6xl px-5 pt-12 md:px-8 md:pt-20">
          <h1 className="font-display text-[clamp(3rem,10vw,6rem)] font-bold uppercase leading-[0.9] text-dd-red">
            Eventos
          </h1>
          <p className="mt-4 max-w-xl text-lg italic leading-relaxed text-dd-brown md:text-xl">{DESCRIPTION}</p>
        </div>
      </div>

      <NextEvent upcoming={featured ? [featured] : []} whatsappUrl={whatsappUrl} showRest={false} />

      <section id="agenda" aria-labelledby="agenda-titulo" className="border-b-2 border-dd-black py-16 md:py-24">
        <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
          <h2
            id="agenda-titulo"
            className="dd-reveal-title font-display text-[clamp(2.5rem,7vw,4.5rem)] font-bold uppercase leading-none text-dd-red"
          >
            Agenda
          </h2>

          <div className="mt-8 max-w-4xl md:mt-10">
            <AgendaFilters active={filter} />
            <div className="mt-6">
              <AgendaList rows={rows} filter={filter} />
            </div>
            <div className="mt-12 md:mt-16">
              <ShareEventBox />
            </div>
          </div>
        </div>
      </section>

      <PastEvents past={past} />
    </main>
  );
}
