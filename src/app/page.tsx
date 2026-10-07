import Hero from "@/components/landing/Hero";
import NextEvent from "@/components/landing/NextEvent";
import PastEvents from "@/components/landing/PastEvents";
import Speakers from "@/components/landing/Speakers";
import About from "@/components/landing/About";
import VitrinaTeaser from "@/components/landing/VitrinaTeaser";
import { getEventsWithSpeakers, getSpeakers } from "@/lib/queries";
import { splitEvents } from "@/lib/derive";
import { getServiceClient, hasServiceConfig } from "@/lib/supabase/service";
import { listFeed } from "@/lib/vitrina/db";
import type { PublicWork } from "@/lib/vitrina/types";

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

// Daily time floor bounds the staleness of the time-derived upcoming/past
// split below (`now` is captured at prerender time, so without a ceiling a
// past event could linger in "Próximo evento" indefinitely between admin
// writes). The admin (Task 8) still refreshes the page on-demand via
// revalidatePath('/') after every mutation, which layers on top of this.
export const revalidate = 86400;

export default async function Home() {
  const [events, speakers, vitrina] = await Promise.all([
    getEventsWithSpeakers(),
    getSpeakers(),
    getVitrinaPreview(),
  ]);

  const now = new Date();
  const { upcoming, past } = splitEvents(events, now);
  const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_URL || "#";

  return (
    <main className="flex-1">
      <Hero whatsappUrl={whatsappUrl} />
      <NextEvent upcoming={upcoming} whatsappUrl={whatsappUrl} />
      <PastEvents past={past} />
      <VitrinaTeaser works={vitrina} />
      <Speakers speakers={speakers} events={events} now={now} />
      <About whatsappUrl={whatsappUrl} />
    </main>
  );
}
