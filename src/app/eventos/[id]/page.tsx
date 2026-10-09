/* eslint-disable @next/next/no-img-element -- local SVG brand assets and remote speaker photos need no optimization */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import BrandImage from "@/components/BrandImage";
import RsvpPanel from "@/components/event/RsvpPanel";
import ShareButton from "@/components/event/ShareButton";
import SpeakerSpotlight from "@/components/SpeakerSpotlight";
import { EVENT_TYPE_LABEL, formatDateParts, formatEventDate, formatEventTime } from "@/lib/format";
import { getPublicEvent } from "@/lib/queries";
import { rsvpMode } from "@/lib/rsvp";
import { INSTAGRAM_URL } from "@/lib/social";
import type { SpeakerRow } from "@/lib/types";

export const revalidate = 300;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type Props = { params: Promise<{ id: string }> };

// Neon queries are not fetch(), so Next does not memoize them: dedupe the
// metadata + page lookups for one request by hand.
const loadEvent = cache(getPublicEvent);

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await loadEvent(id);
  if (!event) return { title: "Evento no encontrado — Design Dinners" };
  const description = event.description ?? `${formatEventDate(event.event_date)} · ${formatEventTime(event.event_date)}`;
  return {
    title: `${event.title} — Design Dinners`,
    description,
    openGraph: {
      title: event.title,
      description,
      url: `${SITE}/eventos/${event.id}`,
      images: event.cover_image_url ? [event.cover_image_url] : undefined,
    },
  };
}

const ICON = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "var(--dd-brown)",
  strokeWidth: 2.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  className: "shrink-0",
} as const;

function MetaItem({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 md:gap-2.5">
      {icon}
      <span>{children}</span>
    </li>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function Speaker({ speaker }: { speaker: SpeakerRow }) {
  return (
    <li className="flex items-center gap-3.5">
      {speaker.photo_url ? (
        <img
          src={speaker.photo_url}
          alt=""
          loading="lazy"
          className="size-[60px] shrink-0 rounded-full border-2 border-dd-black object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="grid size-[60px] shrink-0 place-items-center rounded-full border-2 border-dd-black bg-dd-yellow font-display text-[22px] font-bold"
        >
          {initials(speaker.name)}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[17px] font-bold">{speaker.name}</p>
        {speaker.role_title && <p className="mt-0.5 text-sm text-dd-brown">{speaker.role_title}</p>}
      </div>
    </li>
  );
}

const STICKER_TEXT = "text-xs font-bold uppercase tracking-[0.06em] md:text-[13px]";
const SECTION_TITLE = "font-display text-[26px] font-bold uppercase md:text-2xl";
const PILL = "inline-block rounded-full border-2 border-dd-black px-3 py-1 text-[13px] font-bold uppercase tracking-[0.04em]";

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const event = await loadEvent(id);
  if (!event) notFound();

  const mode = rsvpMode(event);
  const isPast = mode === "closed";
  const url = `${SITE}/eventos/${event.id}`;
  const whatsappGroup = process.env.NEXT_PUBLIC_WHATSAPP_URL || "#";
  const parts = formatDateParts(event.event_date);
  const dateLabel = cap(formatEventDate(event.event_date));
  // "7:00 p. m." must never wrap between "p." and "m.".
  const timeLabel = formatEventTime(event.event_date).replace(/\s/g, "\u00a0");

  const spotlights = event.speakers.filter((speaker) => speaker.spotlight_label);
  const tableSpeakers = event.speakers.filter((speaker) => !speaker.spotlight_label);

  let tableLine: string | null = null;
  if (event.capacity !== null) tableLine = `Mesa para ${event.capacity}`;
  else if (mode === "open" || mode === "full") tableLine = "Cupo abierto";

  return (
    <>
      <header className="border-b-2 border-dd-black">
        <div className="mx-auto flex w-full max-w-[1224px] items-center justify-between gap-4 px-5 py-3.5 md:px-8 md:py-[22px]">
          <Link
            href="/"
            aria-label="Volver a la portada de Design Dinners"
            // 44px hit area; the negative margin keeps the bar's height.
            className="-my-[11px] flex min-h-11 items-center gap-2.5 md:-my-1.5 md:gap-3.5"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 12H5" />
              <path d="M11 6l-6 6 6 6" />
            </svg>
            <img src="/brand/primary-black.svg" alt="" className="h-[22px] w-auto md:h-8" />
          </Link>
          <nav aria-label="Redes" className="flex items-center gap-7">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden text-sm font-bold uppercase tracking-wide underline decoration-dd-red decoration-2 underline-offset-4 transition-colors hover:text-dd-red md:inline"
            >
              Instagram
            </a>
            <a
              href={whatsappGroup}
              className="hidden text-sm font-bold uppercase tracking-wide underline decoration-dd-red decoration-2 underline-offset-4 transition-colors hover:text-dd-red md:inline"
            >
              WhatsApp
            </a>
            <ShareButton url={url} title={`${event.title} — Design Dinners`} />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1224px] flex-1 pb-14 md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-start md:gap-x-10 md:px-8 md:pt-12 lg:gap-x-16">
        {/* Poster: the full 3:4 flyer, never cropped. Stays in view on desktop
            while the details column scrolls past it. */}
        <div className="px-5 pt-5 md:sticky md:top-8 md:px-0 md:pt-0">
          <div className="relative sm:max-w-md md:max-w-none">
            <BrandImage
              src={event.cover_image_url}
              alt={`Cover del evento ${event.title}`}
              tone="yellow"
              className={`aspect-[3/4] w-full rounded-2xl border-2 border-dd-black ${
                isPast ? "grayscale-[0.85] contrast-[1.05]" : ""
              }`}
            />
            <p
              aria-hidden
              className={`absolute -right-2 -top-4 flex w-[74px] rotate-[4deg] flex-col items-center rounded-xl border-2 border-dd-black pb-2 pt-1.5 shadow-[2px_3px_0_0_#000] md:-right-5 md:-top-5 md:w-[88px] md:rounded-[14px] md:pb-2.5 md:pt-2 md:shadow-[3px_4px_0_0_#000] ${
                isPast ? "bg-[#FFF8EE]" : "bg-dd-yellow"
              }`}
            >
              <span className={STICKER_TEXT}>{parts.weekday}</span>
              <span className="font-display text-[34px] font-extrabold leading-none md:text-[42px]">{parts.day}</span>
              <span className={STICKER_TEXT}>{parts.month}</span>
            </p>
          </div>
        </div>

        {/* Details: title, RSVP, about, speakers */}
        <div className="min-w-0">
          <div className="flex flex-col gap-3.5 px-5 pt-8 md:gap-0 md:px-0 md:pt-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`${PILL} bg-[#FFF8EE]`}>{EVENT_TYPE_LABEL[event.event_type]}</span>
              {isPast && <span className={`${PILL} bg-dd-black text-dd-cream`}>Ya pasó</span>}
            </div>
            <h1 className="break-words font-display text-[clamp(2.75rem,10vw,4.75rem)] font-bold uppercase leading-[0.95] tracking-[-0.01em] text-dd-red md:mt-4 md:text-[clamp(2.75rem,5.8vw,4.75rem)] md:leading-[0.92]">
              {event.title}
            </h1>
            <ul className="mt-1 flex flex-col gap-2.5 md:mt-[22px] md:flex-row md:flex-wrap md:gap-x-7 md:text-[17px]">
              <MetaItem
                icon={
                  <svg {...ICON}>
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M16 3v4M8 3v4M3 10h18" />
                  </svg>
                }
              >
                <strong>{dateLabel}</strong> · {timeLabel}
              </MetaItem>
              {event.location && (
                <MetaItem
                  icon={
                    <svg {...ICON}>
                      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                  }
                >
                  {event.location}
                </MetaItem>
              )}
              {tableLine && (
                <MetaItem
                  icon={
                    <svg {...ICON}>
                      <circle cx="9" cy="8" r="3.5" />
                      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
                      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
                    </svg>
                  }
                >
                  {tableLine}
                </MetaItem>
              )}
            </ul>
          </div>

          {/* RSVP area */}
            <aside aria-label="Reservas" className="mt-[30px] px-5 md:mt-9 md:px-0">
            {(mode === "open" || mode === "full") && (
              <RsvpPanel
                event={{
                  id: event.id,
                  title: event.title,
                  capacity: event.capacity,
                  confirmedCount: event.confirmed_count,
                  waitlistCount: event.waitlist_count,
                  mode,
                  whenLabel: `${cap(parts.weekday)} ${parts.day} ${parts.month} · ${timeLabel}`,
                  location: event.location,
                  calendarHref: `/eventos/${event.id}/calendario.ics`,
                  whatsappInviteHref: `https://wa.me/?text=${encodeURIComponent(
                    `Vente conmigo a ${event.title} de Design Dinners: ${url}`,
                  )}`,
                  whatsappGroupHref: whatsappGroup,
                }}
              />
            )}

            {mode === "external" && event.registration_url && (
              <section
                aria-labelledby="rsvp-external-title"
                className="rounded-2xl border-2 border-dd-black bg-dd-red px-5 pb-[22px] pt-6 shadow-[4px_6px_0_0_var(--dd-black)] md:px-[26px] md:pb-6 md:pt-7"
              >
                <h2 id="rsvp-external-title" className="font-display text-[32px] font-bold uppercase leading-none text-dd-cream md:text-4xl">
                  Aparta tu puesto
                </h2>
                <p className="mt-2.5 text-[15px] leading-normal text-white">
                  Las reservas de este evento se hacen en otra página. Te llevamos allá.
                </p>
                <a
                  href={event.registration_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-[22px] flex h-14 w-full items-center justify-center rounded-full border-2 border-dd-black bg-dd-yellow font-display text-[19px] font-bold uppercase tracking-[0.03em] text-dd-black dd-btn md:h-[58px] md:text-xl"
                >
                  Reservar mi puesto ↗
                </a>
              </section>
            )}

            {mode === "closed" && (
              <section
                aria-labelledby="past-title"
                className="rounded-2xl border-2 border-dd-black bg-dd-brown px-5 pb-[22px] pt-[26px] shadow-[4px_6px_0_0_var(--dd-black)] md:px-[26px]"
              >
                <img src="/brand/icon-mayo-cream.svg" alt="" aria-hidden className="size-10" />
                <h2 id="past-title" className="mt-4 font-display text-[32px] font-bold uppercase leading-none text-dd-cream md:text-4xl">
                  Este evento ya pasó
                </h2>
                <p className="mt-2.5 text-[15px] leading-relaxed text-white">
                  Gracias a todos los que se sentaron a la mesa. La próxima ya se está cocinando.
                </p>
                <div className="mt-5 flex flex-col gap-2.5">
                  <Link
                    href="/#proximo-evento"
                    className="flex h-[54px] items-center justify-center rounded-full border-2 border-dd-black bg-dd-yellow font-display text-lg font-bold uppercase tracking-[0.03em] text-dd-black dd-btn"
                  >
                    Ver el próximo evento
                  </Link>
                  <a
                    href={whatsappGroup}
                    className="flex h-12 items-center justify-center text-[15px] font-bold text-dd-cream underline underline-offset-4"
                  >
                    Únete al WhatsApp
                  </a>
                </div>
              </section>
            )}
          </aside>

          {/* Spotlight speakers: right under the RSVP, before the details. */}
          {spotlights.length > 0 && (
            <div className="mt-10 flex flex-col gap-8 px-5 md:mt-12 md:px-0">
              {spotlights.map((speaker) => (
                <SpeakerSpotlight key={speaker.id} variant="panel" speaker={speaker} />
              ))}
            </div>
          )}

          {/* About + speakers */}
          {(event.description || tableSpeakers.length > 0) && (
            <div className="mt-11 flex flex-col gap-9 px-5 md:mt-10 md:border-t-2 md:border-dd-black md:px-0 md:pt-8">
              {event.description && (
                <section aria-labelledby="about-title">
                  <h2 id="about-title" className={SECTION_TITLE}>
                    De qué se trata
                  </h2>
                  <p className="mt-3 max-w-[65ch] whitespace-pre-line leading-[1.65] md:text-[17px]">{event.description}</p>
                </section>
              )}
              {tableSpeakers.length > 0 && (
                <section aria-labelledby="speakers-title">
                  <h2 id="speakers-title" className={SECTION_TITLE}>
                    En la mesa
                  </h2>
                  <ul className="mt-4 flex flex-col gap-4">
                    {tableSpeakers.map((speaker) => (
                      <Speaker key={speaker.id} speaker={speaker} />
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t-2 border-dd-black bg-dd-red">
        <div className="mx-auto flex w-full max-w-[1224px] items-center justify-between gap-4 px-5 py-[22px] md:px-8 md:py-6">
          <p className="text-sm leading-snug text-white md:text-[15px]">
            ¿Dudas?{" "}
            <a href={whatsappGroup} className="font-bold underline underline-offset-[3px]">
              Escríbenos por WhatsApp
            </a>
          </p>
          <img src="/brand/icon-mayo-cream.svg" alt="" aria-hidden className="size-7 md:size-[30px]" />
        </div>
      </footer>
    </>
  );
}
