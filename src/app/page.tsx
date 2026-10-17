import Hero from "@/components/landing/Hero";
import NextEvent from "@/components/landing/NextEvent";
import PastEvents from "@/components/landing/PastEvents";
import About from "@/components/landing/About";
import VitrinaTeaser from "@/components/landing/VitrinaTeaser";
import OtrosEventosTeaser from "@/components/landing/OtrosEventosTeaser";
import SpeakerSpotlight from "@/components/SpeakerSpotlight";
import { getEventsWithSpeakers } from "@/lib/queries";
import { splitEvents, upcomingSpotlights } from "@/lib/derive";
import { formatDateParts, formatEventTime } from "@/lib/format";
import { getServiceClient, hasServiceConfig } from "@/lib/supabase/service";
import { listFeed } from "@/lib/vitrina/db";
import type { PublicWork } from "@/lib/vitrina/types";
import { listUpcomingEvents } from "@/lib/otros-eventos/db";
import { loadEventsPreview } from "@/lib/otros-eventos/preview";
import type { PublicCommunityEvent } from "@/lib/otros-eventos/types";

/** Latest Vitrina pieces for the storefront. The landing never fails over it. */
async function getVitrinaPreview(): Promise<PublicWork[]> {
  if (!hasServiceConfig) return [];
  try {
    const page = await listFeed(getServiceClient(), { cursor: null, onlyAvailable: false, fanId: null, limit: 3 });
    return page.works;
  } catch (error) {
    console.error("Vitrina preview failed", error);
    return [];
  }
}

/** Next community events for the teaser; empty when Supabase is not configured. */
async function getOtrosEventosPreview(): Promise<PublicCommunityEvent[]> {
  if (!hasServiceConfig) return [];
  return loadEventsPreview(() => listUpcomingEvents(getServiceClient(), 3));
}

// Hourly time floor bounds the staleness of the time-derived upcoming/past
// split below (`now` is captured at prerender time, so without a ceiling a
// past event could linger in "Próximo evento" indefinitely between admin
// writes) and lets a past community event leave the community teaser
// within an hour. The admin (Task 8) still refreshes the page on-demand via
// revalidatePath('/') after every mutation, which layers on top of this.
export const revalidate = 3600;

export default async function Home() {
  const [events, vitrina, otrosEventos] = await Promise.all([
    getEventsWithSpeakers(),
    getVitrinaPreview(),
    getOtrosEventosPreview(),
  ]);

  const now = new Date();
  const { upcoming, past } = splitEvents(events, now);
  const spotlights = upcomingSpotlights(events, now);
  const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_URL || "#";

  return (
    <main className="flex-1">
      <Hero whatsappUrl={whatsappUrl} />
      <NextEvent upcoming={upcoming} whatsappUrl={whatsappUrl} />
      {spotlights.map(({ speaker, event }) => {
        const parts = formatDateParts(event.event_date);
        return (
          <SpeakerSpotlight
            key={speaker.id}
            variant="band"
            speaker={speaker}
            event={{
              id: event.id,
              slug: event.slug,
              title: event.title,
              whenLabel: `${parts.weekday.charAt(0).toUpperCase()}${parts.weekday.slice(1)} ${parts.day} ${parts.month} · ${formatEventTime(event.event_date).replace(/\s/g, "\u00a0")}`,
            }}
          />
        );
      })}
      <PastEvents past={past} />
      <VitrinaTeaser works={vitrina} />
      <OtrosEventosTeaser events={otrosEventos} />
      {/* "Próximos Speakers" hidden for now (owner, 2026-10-16). */}
      <About whatsappUrl={whatsappUrl} />
    </main>
  );
}
