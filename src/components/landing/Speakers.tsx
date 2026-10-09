import BrandImage from "@/components/BrandImage";
import { speakerStatus } from "@/lib/derive";
import type { EventWithSpeakers, SpeakerRow } from "@/lib/types";

/**
 * Papita Yellow block, arch-shaped portraits (a menu-board niche for each
 * voice). Shows only speakers of upcoming events, in one row on desktop.
 * Spotlight speakers are left out: they get their own band (SpeakerSpotlight).
 * Hidden entirely when there are none. Black text only — yellow is a
 * full-strength surface, and lighter inks fail contrast on it.
 */
export default function Speakers({
  speakers,
  events,
  now,
}: {
  speakers: SpeakerRow[];
  events: EventWithSpeakers[];
  now: Date;
}) {
  const upcoming = speakers.filter(
    (speaker) =>
      !speaker.spotlight_label && speakerStatus(speaker.id, events, now) === "upcoming",
  );
  if (upcoming.length === 0) return null;

  return (
    <section
      id="speakers"
      aria-labelledby="speakers-titulo"
      className="border-y-2 border-dd-black bg-dd-yellow py-16 md:py-24"
    >
      <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <h2
          id="speakers-titulo"
          className="dd-reveal-title font-display text-[clamp(2.5rem,7vw,4.5rem)] font-bold uppercase leading-none"
        >
          Próximos Speakers
        </h2>

        <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 md:mt-14 lg:auto-cols-[minmax(0,200px)] lg:grid-flow-col lg:grid-cols-none">
          {upcoming.map((speaker, i) => (
            <li
              key={speaker.id}
              className="dd-reveal-plate min-w-0"
              style={
                {
                  "--dd-tilt": i % 2 === 0 ? "-2deg" : "2deg",
                } as React.CSSProperties
              }
            >
              <BrandImage
                src={speaker.photo_url}
                alt={`Foto de ${speaker.name}`}
                tone={i % 2 === 0 ? "red" : "brown"}
                className="aspect-[4/5] w-full rounded-b-2xl rounded-t-full border-2 border-dd-black"
              />
              <h3 className="mt-3 font-display text-lg font-bold uppercase leading-tight">
                {speaker.name}
              </h3>
              {speaker.role_title && (
                <p className="mt-1 text-sm font-medium leading-snug">
                  {speaker.role_title}
                </p>
              )}
              {speaker.social_links.length > 0 && (
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {speaker.social_links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold underline decoration-2 underline-offset-4 transition-colors hover:text-dd-brown"
                    >
                      {link.label} ↗
                    </a>
                  ))}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
