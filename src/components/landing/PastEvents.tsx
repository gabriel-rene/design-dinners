import EventCard from "@/components/EventCard";
import { toneAt } from "@/components/BrandImage";
import type { EventWithSpeakers } from "@/lib/types";

/**
 * Cream archive grid. Designed empty state (per spec §7 this section shows an
 * empty state instead of hiding — only Speakers and Recursos hide when empty).
 */
export default function PastEvents({ past }: { past: EventWithSpeakers[] }) {
  return (
    <section
      id="eventos-pasados"
      aria-labelledby="eventos-pasados-titulo"
      className="py-16 md:py-24"
    >
      <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <h2
          id="eventos-pasados-titulo"
          className="font-display text-[clamp(2.5rem,7vw,4.5rem)] font-bold uppercase leading-none text-dd-red"
        >
          Eventos pasados
        </h2>
        <p className="mt-3 text-lg italic text-dd-brown">Lo que ya se sirvió.</p>

        {past.length > 0 ? (
          <div className="mt-10 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(270px,1fr))] md:mt-12">
            {past.map((event, i) => (
              <EventCard key={event.id} event={event} variant="past" tone={toneAt(i)} />
            ))}
          </div>
        ) : (
          <p className="mt-8 max-w-lg text-lg leading-relaxed">
            Todavía no hay platos en el archivo — la primera cena de esta
            temporada está por servirse.
          </p>
        )}
      </div>
    </section>
  );
}
