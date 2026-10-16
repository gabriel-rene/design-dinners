/* eslint-disable @next/next/no-img-element -- Supabase Storage posters, same as the Vitrina feed */

import { formatDateParts, formatEventTime } from "@/lib/format";
import type { PublicCommunityEvent } from "@/lib/otros-eventos/types";
import { PRICE_LABEL } from "@/lib/otros-eventos/validate";

/** Small deterministic tilt per event so a grid of stickers never lines up dead straight. */
function tiltFor(id: string): string {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return ["-rotate-3", "rotate-2", "-rotate-2", "rotate-3"][sum % 4];
}

/**
 * A community event, told the way it was announced: the organizer's poster up
 * top with a Papita Yellow date sticker slapped on its corner, then the facts.
 * The whole card is one outbound link to the organizer's page. Flat, black-
 * outlined and lifting on hover like the rest of the site's cards. `compact`
 * (landing teaser) drops the description and tightens the type.
 */
export default function CommunityEventCard({
  event,
  compact = false,
}: {
  event: PublicCommunityEvent;
  compact?: boolean;
}) {
  const date = formatDateParts(event.startsAt);

  return (
    <a
      href={event.link}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      className="dd-btn group flex h-full flex-col overflow-hidden rounded-2xl border-2 border-dd-black bg-dd-cream text-dd-black focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-dd-black"
    >
      <div className="relative border-b-2 border-dd-black bg-dd-black">
        <img
          src={event.imageUrl}
          alt=""
          width={event.imageWidth}
          height={event.imageHeight}
          loading="lazy"
          decoding="async"
          className="aspect-[4/5] w-full object-cover"
        />

        <span
          aria-hidden
          className={`absolute left-3 top-3 flex min-w-[4.25rem] flex-col items-center rounded-lg border-2 border-dd-black bg-dd-yellow px-2.5 pb-1.5 pt-1 text-center leading-none ${tiltFor(event.id)}`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wide">{date.weekday}</span>
          <span className={`font-display font-bold ${compact ? "text-3xl" : "text-[2.5rem]"}`}>{date.day}</span>
          <span className="text-[11px] font-bold uppercase tracking-wide">{date.month}</span>
        </span>

        {event.price && (
          <span
            className={`absolute right-3 top-3 rounded-full border-2 border-dd-black px-3 py-0.5 text-xs font-bold uppercase tracking-wide ${
              event.price === "free" ? "bg-dd-red text-white" : "bg-dd-cream text-dd-black"
            }`}
          >
            {PRICE_LABEL[event.price]}
          </span>
        )}
      </div>

      <div className={`flex flex-1 flex-col ${compact ? "gap-1.5 p-4" : "gap-2 p-5"}`}>
        <span className="sr-only">
          {date.weekday} {date.day} {date.month},{" "}
        </span>
        <span className="text-[13px] font-bold uppercase tracking-wide text-dd-brown">
          {formatEventTime(event.startsAt)}
        </span>
        <h3
          className={`font-display font-bold uppercase leading-[1.05] text-balance break-words ${
            compact ? "text-xl" : "text-2xl"
          }`}
        >
          {event.title}
        </h3>
        <span className="text-[15px] leading-snug">{event.venue}</span>
        {!compact && event.description && (
          <span className="line-clamp-3 text-[15px] leading-relaxed text-dd-black/80">{event.description}</span>
        )}

        <span className="mt-auto flex items-end justify-between gap-3 pt-3">
          <span className="min-w-0 text-sm leading-snug">
            {event.organizer && (
              <>
                Organiza <span className="font-bold">{event.organizer}</span>
              </>
            )}
          </span>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-dd-black bg-dd-cream transition-colors group-hover:bg-dd-yellow">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M7 17 17 7" />
              <path d="M8 7h9v9" />
            </svg>
          </span>
        </span>
        <span className="sr-only"> (abre en otra pestaña)</span>
      </div>
    </a>
  );
}
