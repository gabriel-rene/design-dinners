import BrandImage, { type BrandTone } from "./BrandImage";
import type { EventWithSpeakers } from "@/lib/types";
import {
  EVENT_TYPE_LABEL,
  formatArchiveDate,
  formatEventDate,
  formatEventTime,
} from "@/lib/format";

/**
 * Card for the events grids. `variant="past"` (archive: compact date +
 * speakers) or `variant="upcoming"` (secondary upcoming events: full date,
 * location and registration link). Flat, black-outlined, sticker-like — the
 * same drawing language as the mascot.
 */
export default function EventCard({
  event,
  tone,
  variant,
}: {
  event: EventWithSpeakers;
  tone: BrandTone;
  variant: "past" | "upcoming";
}) {
  const speakerNames = event.speakers.map((s) => s.name).join(", ");

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border-2 border-dd-black bg-dd-cream transition-transform duration-300 ease-out hover:-translate-y-1">
      <BrandImage
        src={event.cover_image_url}
        alt={`Cover del evento ${event.title}`}
        tone={tone}
        className="aspect-[3/2] w-full border-b-2 border-dd-black"
      />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-[13px] font-bold uppercase tracking-wide text-dd-brown">
          {variant === "past"
            ? formatArchiveDate(event.event_date)
            : `${formatEventDate(event.event_date)} · ${formatEventTime(event.event_date)}`}
          <span aria-hidden> · </span>
          {EVENT_TYPE_LABEL[event.event_type]}
        </p>
        <h3 className="font-display text-2xl font-bold uppercase leading-[1.05]">
          {event.title}
        </h3>
        {variant === "past" && speakerNames && (
          <p className="text-[15px] leading-snug">
            Con <span className="font-semibold">{speakerNames}</span>
          </p>
        )}
        {variant === "upcoming" && event.location && (
          <p className="text-[15px] leading-snug">{event.location}</p>
        )}
        {variant === "upcoming" && event.registration_url && (
          <p className="mt-auto pt-2">
            <a
              href={event.registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[15px] font-bold text-dd-red underline decoration-2 underline-offset-4 hover:text-dd-brown"
            >
              Reservar puesto ↗
            </a>
          </p>
        )}
      </div>
    </article>
  );
}
