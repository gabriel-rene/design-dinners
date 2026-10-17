/* eslint-disable @next/next/no-img-element -- Supabase Storage posters, same as the agenda cards */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import SiteHeader from "@/components/SiteHeader";
import ShareButton from "@/components/event/ShareButton";
import About from "@/components/landing/About";
import { formatDateParts, formatEventDate, formatEventTime } from "@/lib/format";
import { getPublishedCommunityEventBySlug } from "@/lib/otros-eventos/db";
import { PRICE_LABEL } from "@/lib/otros-eventos/validate";
import { mapsUrl } from "@/lib/rsvp-email";
import { communityEventPath } from "@/lib/slug";
import { getServiceClient, hasServiceConfig } from "@/lib/supabase/service";

export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type Props = { params: Promise<{ slug: string }> };

/** Published events only (pending / rejected / unknown → null). One lookup per request. */
const loadEvent = cache(async (slug: string) => {
  if (!hasServiceConfig) return null;
  return getPublishedCommunityEventBySlug(getServiceClient(), slug);
});

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await loadEvent(slug);
  if (!event) return { title: "Evento no encontrado — Design Dinners" };
  const canonicalUrl = `${SITE}${communityEventPath({ slug })}`;
  const description =
    event.description ?? `${cap(formatEventDate(event.startsAt))} · ${formatEventTime(event.startsAt)} · ${event.venue}`;
  return {
    title: `${event.title} — Eventos — Design Dinners`,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: event.title,
      description,
      url: canonicalUrl,
      images: [{ url: event.imageUrl, width: event.imageWidth, height: event.imageHeight }],
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
  className: "mt-0.5 shrink-0",
} as const;

function MetaItem({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      {icon}
      <span className="min-w-0">{children}</span>
    </li>
  );
}

const STICKER_TEXT = "text-xs font-bold uppercase tracking-[0.06em] md:text-[13px]";
const PILL = "inline-block rounded-full border-2 border-dd-black px-3 py-1 text-[13px] font-bold uppercase tracking-[0.04em]";

export default async function CommunityEventPage({ params }: Props) {
  const { slug } = await params;
  const event = await loadEvent(slug);
  if (!event) notFound();

  const { isPast } = event;
  const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_URL || "#";
  const parts = formatDateParts(event.startsAt);
  const dateLabel = cap(formatEventDate(event.startsAt));
  // "7:00 p. m." must never wrap between "p." and "m.".
  const timeLabel = formatEventTime(event.startsAt).replace(/\s/g, "\u00a0");
  // Posters close to 4:5 fill the frame; anything else is shown whole, never cropped.
  const ratio = event.imageWidth / event.imageHeight;
  const fit = ratio > 0.72 && ratio < 0.88 ? "object-cover" : "object-contain";

  return (
    <main className="flex-1">
      <SiteHeader whatsappUrl={whatsappUrl} current="eventos" />

      <div className="mx-auto w-full max-w-6xl px-5 pt-6 md:px-8 md:pt-8">
        <Link
          href="/eventos?tipo=comunidad"
          className="inline-flex min-h-11 items-center text-sm font-bold uppercase tracking-wide underline decoration-dd-red decoration-2 underline-offset-4 transition-colors hover:text-dd-red focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-dd-black"
        >
          ← Agenda
        </Link>
      </div>

      <article
        aria-labelledby="evento-titulo"
        className="mx-auto w-full max-w-6xl px-5 pb-16 pt-6 md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-start md:gap-x-10 md:px-8 md:pb-24 md:pt-8 lg:gap-x-16"
      >
        {/* Poster: the organizer's flyer in a 4:5 frame, kept in view on desktop. */}
        <div className="md:sticky md:top-8">
          <div className="relative sm:max-w-md md:max-w-none">
            <div className="overflow-hidden rounded-2xl border-2 border-dd-black bg-dd-black">
              <img
                src={event.imageUrl}
                alt={`Afiche del evento ${event.title}`}
                width={event.imageWidth}
                height={event.imageHeight}
                decoding="async"
                fetchPriority="high"
                className={`aspect-[4/5] w-full ${fit} ${isPast ? "grayscale-[0.85] contrast-[1.05]" : ""}`}
              />
            </div>
            <p
              aria-hidden
              className={`absolute -right-2 -top-4 flex w-[74px] -rotate-[4deg] flex-col items-center rounded-xl border-2 border-dd-black pb-2 pt-1.5 shadow-[2px_3px_0_0_#000] md:-right-5 md:-top-5 md:w-[88px] md:rounded-[14px] md:pb-2.5 md:pt-2 md:shadow-[3px_4px_0_0_#000] ${
                isPast ? "bg-[#FFF8EE]" : "bg-dd-yellow"
              }`}
            >
              <span className={STICKER_TEXT}>{parts.weekday}</span>
              <span className="font-display text-[34px] font-extrabold leading-none md:text-[42px]">{parts.day}</span>
              <span className={STICKER_TEXT}>{parts.month}</span>
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="min-w-0 pt-8 md:pt-0">
          {isPast && (
            <p className="mb-6 flex items-center gap-3 rounded-xl border-2 border-dd-black bg-dd-black px-4 py-3 text-[15px] font-bold text-dd-cream md:mb-7">
              <img src="/brand/icon-mayo-cream.svg" alt="" aria-hidden className="size-6 shrink-0" />
              Este evento ya pasó.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            <span className={`${PILL} bg-[#FFF8EE]`}>Comunidad</span>
            {event.price && (
              <span className={`${PILL} ${event.price === "free" ? "bg-dd-red text-white" : "bg-[#FFF8EE]"}`}>
                {PRICE_LABEL[event.price]}
              </span>
            )}
          </div>

          <h1
            id="evento-titulo"
            className="mt-4 text-balance break-words font-display text-[clamp(2.5rem,9vw,4.25rem)] font-bold uppercase leading-[0.95] tracking-[-0.01em] md:text-[clamp(2.5rem,5.2vw,4.25rem)] md:leading-[0.92]"
          >
            {event.title}
          </h1>

          <ul className="mt-6 flex flex-col gap-3 text-[16px] leading-snug md:text-[17px]">
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
            <MetaItem
              icon={
                <svg {...ICON}>
                  <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              }
            >
              <a
                href={mapsUrl(event.venue)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dd-red decoration-2 underline-offset-4 transition-colors hover:text-dd-red"
              >
                {event.venue}
                <span aria-hidden> ↗</span>
                <span className="sr-only"> (Google Maps, abre en otra pestaña)</span>
              </a>
            </MetaItem>
            {event.organizer && (
              <MetaItem
                icon={
                  <svg {...ICON}>
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21a8 8 0 0 1 16 0" />
                  </svg>
                }
              >
                Organiza <strong>{event.organizer}</strong>
              </MetaItem>
            )}
          </ul>

          {/* The handoff: the event lives on the organizer's site. */}
          <aside
            aria-label="Sitio del organizador"
            className="mt-8 rounded-2xl border-2 border-dd-black bg-[#FFF8EE] px-5 pb-5 pt-5 md:mt-9 md:px-6 md:pb-6"
          >
            <p className="text-[15px] leading-relaxed">
              Este evento lo organiza la comunidad, no Design Dinners.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              {!isPast && (
                <a
                  href={event.link}
                  target="_blank"
                  rel="noopener noreferrer nofollow ugc"
                  className="dd-btn flex min-h-14 items-center justify-center rounded-full border-2 border-dd-black bg-dd-yellow px-6 py-3 text-center font-display text-[17px] font-bold uppercase leading-tight tracking-[0.03em] text-dd-black focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-dd-black sm:flex-1 md:text-lg"
                >
                  Ver evento en el sitio del organizador&nbsp;<span aria-hidden>↗</span>
                  <span className="sr-only"> (abre en otra pestaña)</span>
                </a>
              )}
              <div className="flex justify-center sm:justify-start">
                <ShareButton url={communityEventPath({ slug })} title={`${event.title} — Eventos — Design Dinners`} />
              </div>
            </div>
          </aside>

          {event.description && (
            <section aria-labelledby="sobre-evento" className="mt-11 md:mt-12 md:border-t-2 md:border-dd-black md:pt-8">
              <h2 id="sobre-evento" className="font-display text-[26px] font-bold uppercase md:text-2xl">
                De qué se trata
              </h2>
              <p className="mt-3 max-w-[65ch] whitespace-pre-line text-pretty leading-[1.65] md:text-[17px]">
                {event.description}
              </p>
            </section>
          )}
        </div>
      </article>

      <About whatsappUrl={whatsappUrl} />
    </main>
  );
}
