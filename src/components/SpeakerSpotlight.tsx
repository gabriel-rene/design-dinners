/* eslint-disable @next/next/no-img-element -- speaker photos are local cut-outs or Supabase URLs; no optimization needed */

import Link from "next/link";

import type { SpeakerRow } from "@/lib/types";

/**
 * Headliner treatment for a speaker with a `spotlight_label`. Blue drench on
 * purpose: it echoes the campaign posters, so someone arriving from Instagram
 * recognizes the face. Contrast on Blue Double Checkmark: only black passes
 * for body text; white passes for the large display name (3.5:1). Cream does
 * not (2.8:1), so it is never used for type here.
 *
 * - "band": full-width landing section; the photo sits on the bottom border.
 * - "panel": a card inside the event page's details column.
 */
export default function SpeakerSpotlight({
  speaker,
  variant,
  event,
}: {
  speaker: SpeakerRow;
  variant: "band" | "panel";
  /** Band only: the event this speaker headlines, for the reserve CTA. */
  event?: { id: string; title: string; whenLabel: string };
}) {
  const band = variant === "band";
  const titleId = `spotlight-${speaker.id}`;
  const hasPhoto = Boolean(speaker.photo_url);

  const text = (
    <div className={band ? "min-w-0 pb-10 pt-16 md:py-24" : "min-w-0 px-5 pt-6 md:px-[26px] md:pt-7"}>
      {speaker.spotlight_label && (
        <p className="inline-block -rotate-3 rounded-full border-2 border-dd-black bg-dd-yellow px-4 py-1.5 font-display text-sm font-bold uppercase tracking-[0.04em] shadow-[2px_3px_0_0_var(--dd-black)] md:text-base">
          {speaker.spotlight_label}
        </p>
      )}

      <h2
        id={titleId}
        className={`text-balance break-words font-display font-bold uppercase leading-[0.9] tracking-[-0.01em] text-white ${
          band
            ? "dd-reveal-title mt-6 text-[clamp(3.25rem,11vw,6rem)]"
            : "mt-5 text-[clamp(2.5rem,9vw,3.5rem)]"
        }`}
      >
        {speaker.name}
      </h2>

      {speaker.role_title && (
        <p
          className={`font-display font-bold uppercase tracking-[0.02em] text-dd-black ${
            band ? "mt-4 text-xl md:text-2xl" : "mt-3 text-lg md:text-xl"
          }`}
        >
          {speaker.role_title}
        </p>
      )}

      {speaker.bio && (
        <p
          className={`max-w-[58ch] whitespace-pre-line text-pretty leading-[1.6] text-dd-black ${
            band ? "mt-6 text-[17px] md:text-lg" : "mt-4 text-[15px] md:text-base"
          }`}
        >
          {speaker.bio}
        </p>
      )}

      {(event || speaker.social_links.length > 0) && (
        <div className={`flex flex-wrap items-center gap-x-6 gap-y-4 ${band ? "mt-9" : "mt-5"}`}>
          {band && event && (
            <Link
              href={`/eventos/${event.id}`}
              className="dd-btn inline-flex h-14 items-center rounded-full border-2 border-dd-black bg-dd-yellow px-7 font-display text-lg font-bold uppercase tracking-[0.03em] text-dd-black"
            >
              Reserva tu silla
            </Link>
          )}
          {speaker.social_links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-[15px] font-bold text-dd-black underline decoration-2 underline-offset-4 transition-colors hover:text-white"
            >
              {link.label} ↗
            </a>
          ))}
        </div>
      )}

      {band && event && (
        <p className="mt-6 text-[15px] font-medium text-dd-black">
          {event.whenLabel} · {event.title}
        </p>
      )}
    </div>
  );

  const photo = hasPhoto && (
    <div
      className={
        band
          ? "flex justify-center self-end md:justify-end"
          : "mt-6 flex justify-center sm:mt-0 sm:self-end sm:pr-5"
      }
    >
      <img
        src={speaker.photo_url!}
        alt={`Foto de ${speaker.name}`}
        loading="lazy"
        className={
          band
            ? "dd-reveal-plate block w-[min(82vw,420px)] md:w-full md:max-w-[460px]"
            : "block w-[min(72vw,260px)] sm:w-[200px] md:w-[220px]"
        }
        style={{ "--dd-tilt": "3deg" } as React.CSSProperties}
      />
    </div>
  );

  if (band) {
    return (
      <section
        id="speaker-destacado"
        aria-labelledby={titleId}
        className="overflow-hidden border-y-2 border-dd-black bg-dd-blue"
      >
        <div
          className={`mx-auto grid w-full max-w-6xl px-5 md:px-8 ${
            hasPhoto ? "md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-x-10" : ""
          }`}
        >
          {text}
          {photo}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={titleId}
      className={`overflow-hidden rounded-2xl border-2 border-dd-black bg-dd-blue shadow-[4px_6px_0_0_var(--dd-black)] ${
        hasPhoto ? "sm:grid sm:grid-cols-[minmax(0,1fr)_auto]" : "pb-6"
      }`}
    >
      <div className={hasPhoto ? "sm:pb-6" : ""}>{text}</div>
      {photo}
    </section>
  );
}
