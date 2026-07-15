import Hero from "@/components/landing/Hero";
import NextEvent from "@/components/landing/NextEvent";
import PastEvents from "@/components/landing/PastEvents";
import Speakers from "@/components/landing/Speakers";
import Resources from "@/components/landing/Resources";
import About from "@/components/landing/About";
import { getEventsWithSpeakers, getResources, getSpeakers } from "@/lib/queries";
import { splitEvents } from "@/lib/derive";

// Daily time floor bounds the staleness of the time-derived upcoming/past
// split below (`now` is captured at prerender time, so without a ceiling a
// past event could linger in "Próximo evento" indefinitely between admin
// writes). The admin (Task 8) still refreshes the page on-demand via
// revalidatePath('/') after every mutation, which layers on top of this.
export const revalidate = 86400;

export default async function Home() {
  const [events, speakers, resources] = await Promise.all([
    getEventsWithSpeakers(),
    getSpeakers(),
    getResources(),
  ]);

  const now = new Date();
  const { upcoming, past } = splitEvents(events, now);
  const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_URL || "#";

  return (
    <main className="flex-1">
      <Hero whatsappUrl={whatsappUrl} />
      <NextEvent upcoming={upcoming} whatsappUrl={whatsappUrl} />
      <PastEvents past={past} />
      <Speakers speakers={speakers} events={events} now={now} />
      <Resources resources={resources} />
      <About whatsappUrl={whatsappUrl} />
    </main>
  );
}
