/* eslint-disable @next/next/no-img-element -- local SVG brand assets need no optimization */

import BrandImage from "@/components/BrandImage";
import EventCard from "@/components/EventCard";
import type { EventWithSpeakers } from "@/lib/types";
import {
  EVENT_TYPE_LABEL,
  formatEventDate,
  formatEventTime,
} from "@/lib/format";
import { seatsLeft } from "@/lib/rsvp";

/** Five small plates that fill in proportion to the seats taken. */
function SeatsLine({ capacity, confirmed }: { capacity: number; confirmed: number }) {
  const left = seatsLeft(capacity, confirmed) ?? 0;
  const filled = left === 0 ? 5 : Math.min(4, Math.floor((confirmed / capacity) * 5));
  const label =
    left === 0
      ? "Mesa llena · únete a la lista de espera"
      : left === 1
        ? `Queda 1 de ${capacity} asientos`
        : `Quedan ${left} de ${capacity} asientos`;

  return (
    <div className="mt-1.5 flex items-center gap-2.5">
      <div aria-hidden className="flex gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className={`size-2.5 rounded-full border-[1.5px] ${
              i < filled ? "border-dd-black bg-dd-yellow" : "border-dd-cream"
            }`}
          />
        ))}
      </div>
      <p className="text-sm font-semibold text-white">{label}</p>
    </div>
  );
}

/**
 * Drenched Ketchup Red block. Always visible: featured soonest upcoming event,
 * or the "Estamos cocinando" empty state. Text rules (contrast-checked):
 * cream for display type, white for body, yellow only as button surface with
 * black text — never yellow text on red.
 */
export default function NextEvent({
  upcoming,
  whatsappUrl,
}: {
  upcoming: EventWithSpeakers[];
  whatsappUrl: string;
}) {
  const featured = upcoming[0];
  const rest = upcoming.slice(1);

  return (
    <section
      id="proximo-evento"
      aria-labelledby="proximo-evento-titulo"
      className="border-b-2 border-dd-black bg-dd-red py-16 md:py-24"
    >
      <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <h2
          id="proximo-evento-titulo"
          className="dd-reveal-title text-center font-display text-[clamp(2.5rem,7vw,4.5rem)] font-bold uppercase leading-none text-dd-cream"
        >
          Próximo evento
        </h2>

        {featured ? (
          <>
            <p className="mt-3 text-center text-lg italic text-white">
              Reserva antes de que se enfríe.
            </p>

            <div className="mt-10 grid items-center gap-8 md:mt-14 md:grid-cols-[5fr_6fr] md:gap-12">
              <BrandImage
                src={featured.cover_image_url}
                alt={`Cover del evento ${featured.title}`}
                tone="yellow"
                className="dd-reveal-plate aspect-[3/4] w-full rounded-2xl border-2 border-dd-black"
              />

              <div className="flex flex-col items-start gap-4">
                <p className="text-sm font-bold uppercase tracking-wide text-white">
                  <span className="rounded-full border-2 border-dd-black bg-dd-cream px-3 py-1 text-dd-black">
                    {EVENT_TYPE_LABEL[featured.event_type]}
                  </span>
                </p>
                <h3 className="font-display text-[clamp(2.25rem,6vw,3.75rem)] font-bold uppercase leading-[0.95] text-dd-cream">
                  {featured.title}
                </h3>
                <p className="text-lg font-bold text-white">
                  {formatEventDate(featured.event_date)} ·{" "}
                  {formatEventTime(featured.event_date)}
                </p>
                {featured.location && (
                  <p className="-mt-2 text-lg text-white">
                    {featured.location}
                  </p>
                )}
                {featured.description && (
                  <p className="max-w-lg leading-relaxed text-white">
                    {featured.description}
                  </p>
                )}
                {featured.speakers.length > 0 && (
                  <p className="text-[15px] text-white">
                    Con{" "}
                    <span className="font-bold">
                      {featured.speakers.map((s) => s.name).join(", ")}
                    </span>
                  </p>
                )}
                {featured.registration_url ? (
                  <a
                    href={featured.registration_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 rounded-full border-2 border-dd-black bg-dd-yellow px-8 py-3.5 font-display text-lg font-bold uppercase tracking-wide text-dd-black dd-btn"
                  >
                    Reservar mi puesto ↗
                  </a>
                ) : (
                  <a
                    href={`/eventos/${featured.id}`}
                    className="mt-2 inline-flex items-center gap-2.5 rounded-full border-2 border-dd-black bg-dd-yellow px-8 py-3.5 font-display text-lg font-bold uppercase tracking-wide text-dd-black dd-btn"
                  >
                    Reservar mi puesto
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M5 12h14" />
                      <path d="M13 6l6 6-6 6" />
                    </svg>
                  </a>
                )}
                {featured.capacity !== null && !featured.registration_url && (
                  <SeatsLine capacity={featured.capacity} confirmed={featured.confirmed_count} />
                )}
              </div>
            </div>

            {rest.length > 0 && (
              <div className="mt-16 md:mt-20">
                <h3 className="font-display text-2xl font-bold uppercase tracking-wide text-dd-cream">
                  También en el horno
                </h3>
                <div className="mt-6 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(270px,1fr))]">
                  {rest.map((event, i) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      variant="upcoming"
                      tone={i % 2 === 0 ? "brown" : "yellow"}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="mx-auto flex max-w-xl flex-col items-center py-10 text-center md:py-14">
            <img
              src="/brand/icon-mayo-cream.svg"
              alt=""
              aria-hidden
              className="dd-float h-14 w-14"
            />
            <h3 className="mt-6 font-display text-[clamp(2rem,6vw,3.25rem)] font-bold uppercase leading-[0.95] text-dd-cream">
              Estamos cocinando la próxima cena
            </h3>
            <p className="mt-4 text-lg leading-relaxed text-white">
              Únete al grupo y sé de los primeros en enterarte cuando salga del
              horno.
            </p>
            <a
              href={whatsappUrl}
              className="mt-8 rounded-full border-2 border-dd-black bg-dd-yellow px-8 py-3.5 font-display text-lg font-bold uppercase tracking-wide text-dd-black dd-btn"
            >
              Únete al WhatsApp
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
