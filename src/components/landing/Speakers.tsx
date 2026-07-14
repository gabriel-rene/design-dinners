import BrandImage from "@/components/BrandImage";
import { speakerStatus } from "@/lib/derive";
import type { EventWithSpeakers, SpeakerRow } from "@/lib/types";

/**
 * Papita Yellow block, arch-shaped portraits (a menu-board niche for each
 * voice). Hidden entirely when there are no speakers. Black text only —
 * yellow is a full-strength surface, and lighter inks fail contrast on it.
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
  if (speakers.length === 0) return null;

  return (
    <section
      id="speakers"
      aria-labelledby="speakers-titulo"
      className="border-y-2 border-dd-black bg-dd-yellow py-16 md:py-24"
    >
      <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <h2
          id="speakers-titulo"
          className="font-display text-[clamp(2.5rem,7vw,4.5rem)] font-bold uppercase leading-none"
        >
          Speakers
        </h2>
        <p className="mt-3 text-lg italic">Las voces que ya pusieron la mesa.</p>

        <ul className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-12 md:mt-14 md:justify-start">
          {speakers.map((speaker, i) => {
            const upcoming = speakerStatus(speaker.id, events, now) === "upcoming";
            return (
              <li key={speaker.id} className="w-[max(220px,calc(50%-1rem))] max-w-[250px]">
                <div className="relative">
                  <BrandImage
                    src={speaker.photo_url}
                    alt={`Foto de ${speaker.name}`}
                    tone={i % 2 === 0 ? "red" : "brown"}
                    className="aspect-[4/5] w-full rounded-b-2xl rounded-t-full border-2 border-dd-black"
                  />
                  {upcoming && (
                    <span className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border-2 border-dd-black bg-dd-cream px-3 py-1 text-[13px] font-bold uppercase tracking-wide">
                      Próximamente
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-display text-2xl font-bold uppercase leading-tight">
                  {speaker.name}
                </h3>
                {speaker.role_title && (
                  <p className="mt-1 text-[15px] font-medium leading-snug">
                    {speaker.role_title}
                  </p>
                )}
                {speaker.social_links.length > 0 && (
                  <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
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
            );
          })}
        </ul>
      </div>
    </section>
  );
}
