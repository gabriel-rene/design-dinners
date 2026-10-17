import Link from "next/link";

import CommunityEventCard from "@/components/otros-eventos/CommunityEventCard";
import type { PublicCommunityEvent } from "@/lib/otros-eventos/types";

/**
 * Cream band after La Vitrina: the next community events as compact poster
 * cards, with a link to the full list. Renders nothing when there are none.
 */
export default function OtrosEventosTeaser({ events }: { events: PublicCommunityEvent[] }) {
  if (events.length === 0) return null;

  return (
    <section id="otros-eventos" aria-labelledby="otros-eventos-titulo" className="border-b-2 border-dd-black py-16 md:py-24">
      <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h2
              id="otros-eventos-titulo"
              className="dd-reveal-title font-display text-[clamp(2.5rem,7vw,4.5rem)] font-bold uppercase leading-none text-dd-red"
            >
              En la comunidad
            </h2>
            <p className="mt-3 text-lg italic text-dd-brown">Eventos de diseño organizados por la comunidad.</p>
          </div>
          <Link
            href="/eventos?tipo=comunidad"
            className="shrink-0 text-[15px] font-bold underline decoration-dd-red decoration-2 underline-offset-4 transition-colors hover:text-dd-red focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-dd-black"
          >
            Ver la agenda <span aria-hidden="true">→</span>
          </Link>
        </div>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 md:mt-12">
          {events.slice(0, 3).map((event) => (
            <li key={event.id}>
              <CommunityEventCard event={event} compact />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
