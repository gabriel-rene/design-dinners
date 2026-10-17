import Link from "next/link";

import type { AgendaFilter, AgendaRow } from "@/lib/agenda";
import { EVENT_TYPE_LABEL, formatDateParts, formatEventTime } from "@/lib/format";
import type { PublicCommunityEvent } from "@/lib/otros-eventos/types";
import { PRICE_LABEL } from "@/lib/otros-eventos/validate";
import type { EventWithSpeakers } from "@/lib/types";
import { communityEventPath, eventPath } from "@/lib/slug";

function emptyText(filter: AgendaFilter): string {
  if (filter === "design-dinners") {
    return "Pronto anunciamos la próxima cena.";
  }
  if (filter === "comunidad") return "No hay eventos de la comunidad por ahora.";
  return "No hay más eventos en la agenda por ahora.";
}

/** Weekday / day / month stacked like the date sticker on the poster cards. */
function DateBlock({ iso, small = "" }: { iso: string; small?: string }) {
  const d = formatDateParts(iso);
  return (
    <span className="flex flex-col items-center text-center leading-none">
      <span className={`text-[11px] font-bold uppercase tracking-wide ${small}`}>{d.weekday}</span>
      <span className="mt-0.5 font-display text-[2rem] font-bold sm:text-[2.5rem]">{d.day}</span>
      <span className={`text-xs font-bold uppercase tracking-wide ${small}`}>{d.month}</span>
    </span>
  );
}

const ROW_GRID =
  "grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:gap-x-6";
const COMMUNITY_GRID =
  "grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-4 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-x-6";

/**
 * Design Dinners row: a Ketchup Red band. The title links to the event page and
 * stretches over the whole band, so the row is one big target; "Reservar" sits
 * above that layer and follows the featured card's rule (external
 * registration_url in a new tab, else the event page). On phones the button
 * drops under the text.
 */
function DinnerRow({ event }: { event: EventWithSpeakers }) {
  const href = eventPath(event);
  const meta = [EVENT_TYPE_LABEL[event.event_type], event.location, formatEventTime(event.event_date)]
    .filter(Boolean)
    .join(" · ");
  const button =
    "dd-btn relative z-10 col-start-2 justify-self-start rounded-full border-2 border-dd-black bg-dd-yellow px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-dd-black focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-dd-cream sm:col-start-3 sm:justify-self-end";

  return (
    <li
      className={`${ROW_GRID} relative my-2 rounded-xl border-2 border-dd-black bg-dd-red px-3 py-4 text-dd-cream sm:px-5`}
    >
      <DateBlock iso={event.event_date} small="text-white" />
      <div className="min-w-0">
        <h3 className="font-display text-xl font-bold uppercase leading-[1.05] break-words sm:text-2xl">
          <Link
            href={href}
            className="after:absolute after:inset-0 after:rounded-[10px] after:content-[''] hover:underline hover:decoration-2 hover:underline-offset-4 focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-offset-[-6px] focus-visible:after:outline-dd-cream"
          >
            {event.title}
          </Link>
        </h3>
        <p className="mt-1.5 text-[15px] leading-snug text-white">{meta}</p>
      </div>
      {event.registration_url ? (
        <a href={event.registration_url} target="_blank" rel="noopener noreferrer" className={button}>
          Reservar <span aria-hidden>↗</span>
          <span className="sr-only"> {event.title} (abre en otra pestaña)</span>
        </a>
      ) : (
        <Link href={href} className={button}>
          Reservar
          <span className="sr-only"> {event.title}</span>
        </Link>
      )}
    </li>
  );
}

/** Internal page when the event has a slug; otherwise the organizer's link in a new tab. */
function RowLink({ event, className, children }: { event: PublicCommunityEvent; className: string; children: React.ReactNode }) {
  if (event.slug === null) {
    return (
      <a href={event.link} target="_blank" rel="noopener noreferrer nofollow ugc" className={className}>
        {children}
        <span className="sr-only"> (abre en otra pestaña)</span>
      </a>
    );
  }
  return (
    <Link href={communityEventPath({ slug: event.slug })} className={className}>
      {children}
    </Link>
  );
}

/**
 * Community row: plain cream with a black rule on top and a "Comunidad" tag.
 * The whole row is one link to the event's page on this site. It never borrows
 * the red band or the "Reservar" button.
 */
function CommunityRow({ event, afterCommunity }: { event: PublicCommunityEvent; afterCommunity: boolean }) {
  const d = formatDateParts(event.startsAt);
  return (
    <li className={`border-b-2 border-dd-black ${afterCommunity ? "" : "border-t-2"}`}>
      <RowLink event={event} className={`${COMMUNITY_GRID} group px-3 py-4 transition-colors hover:bg-dd-yellow/25 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-dd-black sm:px-5`}
      >
        <span aria-hidden>
          <DateBlock iso={event.startsAt} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="sr-only">
            {d.weekday} {d.day} {d.month}:{" "}
          </span>
          <span className="font-display text-xl font-bold uppercase leading-[1.05] break-words decoration-dd-red decoration-2 underline-offset-4 group-hover:underline sm:text-2xl">
            {event.title}
          </span>
          <span className="mt-1.5 text-[15px] leading-snug">
            {event.venue} · {formatEventTime(event.startsAt)}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm leading-snug">
            <span className="rounded-full border-[1.5px] border-dd-black bg-dd-cream px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide">
              Comunidad
            </span>
            {event.organizer && (
              <span>
                Organiza <span className="font-bold">{event.organizer}</span>
              </span>
            )}
            {event.price && <span className="font-bold text-dd-brown">{PRICE_LABEL[event.price]}</span>}
          </span>
        </span>
      </RowLink>
    </li>
  );
}

export default function AgendaList({
  rows,
  filter,
}: {
  rows: AgendaRow[];
  filter: AgendaFilter;
}) {
  if (rows.length === 0) {
    return (
      <p className="border-y-2 border-dd-black px-3 py-8 text-lg leading-relaxed sm:px-5">
        {emptyText(filter)}
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {rows.map((row, i) =>
        row.kind === "dd" ? (
          <DinnerRow key={`dd-${row.event.id}`} event={row.event} />
        ) : (
          <CommunityRow key={`com-${row.event.id}`} event={row.event} afterCommunity={rows[i - 1]?.kind === "comunidad"} />
        ),
      )}
    </ul>
  );
}
