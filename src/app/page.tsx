import Hero from "@/components/landing/Hero";
import NextEvent from "@/components/landing/NextEvent";
import PastEvents from "@/components/landing/PastEvents";
import Speakers from "@/components/landing/Speakers";
import Resources from "@/components/landing/Resources";
import About from "@/components/landing/About";
import { getEventsWithSpeakers, getResources, getSpeakers } from "@/lib/queries";
import { splitEvents } from "@/lib/derive";

// Cache indefinitely; the admin (Task 8) refreshes the page on-demand via
// revalidatePath('/') after every mutation. Data fetches never opt into
// no-store.
export const revalidate = false;

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
