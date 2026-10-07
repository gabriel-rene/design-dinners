/* eslint-disable @next/next/no-img-element -- Supabase Storage images, same as the Vitrina feed */

import Link from "next/link";

import FriesIcon from "@/components/vitrina/FriesIcon";
import type { PublicWork } from "@/lib/vitrina/types";

/**
 * Pieces hanging in the window, back to front. Each slot: horizontal position
 * and width (% of the glass), resting tilt, and how far it fans out when the
 * window is hovered. One or two works use the outer slots' centered cousins.
 */
const SLOTS = {
  left: "left-[3%] top-[14%] w-[40%] [--rest:-8deg] [--fan-x:-7%] [--fan-r:-12deg]",
  right: "right-[3%] top-[10%] w-[40%] [--rest:7deg] [--fan-x:7%] [--fan-r:11deg]",
  center: "left-1/2 top-[6%] w-[45%] -translate-x-1/2 [--rest:-1.5deg] [--fan-x:0%] [--fan-r:0deg] z-10",
  soloLeft: "left-[12%] top-[10%] w-[44%] [--rest:-6deg] [--fan-x:-5%] [--fan-r:-9deg]",
  soloRight: "right-[12%] top-[8%] w-[44%] [--rest:5deg] [--fan-x:5%] [--fan-r:8deg] z-10",
} as const;

function slotsFor(count: number): (keyof typeof SLOTS)[] {
  if (count >= 3) return ["left", "right", "center"];
  if (count === 2) return ["soloLeft", "soloRight"];
  return ["center"];
}

function Piece({ work, slot, index }: { work: PublicWork; slot: keyof typeof SLOTS; index: number }) {
  // Only the front piece has room for its maker's name; the ones tucked behind
  // show their papitas on the outer edge, the part that stays visible.
  const front = slot === "center" || slot === "soloRight";
  const align = front ? "justify-between" : slot === "right" ? "justify-end" : "justify-start";
  return (
    <Link
      href={`/vitrina/${work.id}`}
      className={`dd-vitrina-piece absolute block rounded-md focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-dd-yellow ${SLOTS[slot]}`}
      style={{ "--dd-tilt": `${index % 2 ? 4 : -4}deg` } as React.CSSProperties}
    >
      <span className="dd-reveal-plate block">
        <span className="dd-vitrina-tilt block overflow-hidden rounded-md border-2 border-dd-black bg-dd-black">
          <img
            src={work.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="aspect-[4/5] w-full object-cover"
          />
          <span
            className={`flex items-center gap-2 border-t-2 ${align} border-dd-black bg-dd-cream px-2.5 py-1.5 text-dd-black`}
          >
            {front && <span className="min-w-0 truncate text-xs font-bold">{work.creatorName}</span>}
            <span className="flex shrink-0 items-center gap-0.5 text-xs font-bold tabular-nums">
              <FriesIcon filled className="h-4 w-4" />
              {work.friesCount}
            </span>
          </span>
        </span>
      </span>
      <span className="sr-only">
        Ver «{work.title}» de {work.creatorName}
      </span>
    </Link>
  );
}

/**
 * La Vitrina storefront: a red scalloped awning over a Patty Brown facade, and
 * a cream-framed shop window with the latest community work hanging in it.
 * With nothing published yet the mascot minds the empty window and the CTA
 * invites the first submission instead.
 */
export default function VitrinaTeaser({ works }: { works: PublicWork[] }) {
  const shown = works.slice(0, 3);
  const slots = slotsFor(shown.length);
  const empty = shown.length === 0;

  return (
    <section id="vitrina" aria-labelledby="vitrina-titulo" className="border-b-2 border-dd-black bg-dd-brown text-dd-cream">
      <div aria-hidden className="dd-awning" />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-16 pt-10 lg:grid-cols-[5fr_6fr] lg:gap-16 md:px-8 md:pb-24 md:pt-14">
        <div className="max-lg:order-2">
          <h2
            id="vitrina-titulo"
            className="dd-reveal-title font-display text-[clamp(3rem,9vw,5.5rem)] font-bold uppercase leading-[0.9] tracking-[-0.01em]"
          >
            La Vitrina
          </h2>
          <p className="mt-4 text-xl font-bold text-dd-yellow">
            {empty ? "Recién montada, ayúdanos a llenarla." : "Lo que la comunidad está cocinando."}
          </p>
          <p className="mt-5 max-w-[46ch] text-lg leading-relaxed">
            Proyectos de diseñadores de la comunidad. Desliza, dale papitas a lo que te
            guste y conecta con quien lo hizo.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href={empty ? "/vitrina/enviar" : "/vitrina"}
              className="rounded-full border-2 border-dd-black bg-dd-yellow px-8 py-3.5 font-display text-lg font-bold uppercase tracking-wide text-dd-black dd-btn"
            >
              {empty ? "Enseña tu trabajo" : "Entra a la Vitrina"}
            </Link>
            {!empty && (
              <Link
                href="/vitrina/enviar"
                className="text-[15px] font-bold text-dd-cream underline decoration-dd-yellow decoration-2 underline-offset-4 transition-colors hover:text-dd-yellow"
              >
                Enseña tu trabajo →
              </Link>
            )}
          </div>
        </div>

        <div className="mx-auto w-full max-w-2xl max-lg:order-1">
          <div className="dd-vitrina-window group relative rounded-xl border-2 border-dd-black bg-dd-cream p-2.5 md:p-3.5">
            <span
              aria-hidden
              className="absolute -top-3 right-6 z-30 rotate-3 rounded-md border-2 border-dd-black bg-dd-red px-3 py-1 font-display text-sm font-bold uppercase tracking-wide text-dd-cream md:right-10"
            >
              {empty ? "Próximamente" : "Abierto"}
            </span>

            <div className="dd-vitrina-glass relative aspect-[5/4] overflow-hidden rounded-md border-2 border-dd-black">
              {empty ? (
                <div className="flex h-full items-center justify-center p-4 sm:p-6">
                  <div className="dd-vitrina-tilt flex w-[68%] flex-col items-center rounded-md border-2 border-dd-black bg-dd-cream px-3 pb-3 pt-2.5 sm:w-[52%] sm:px-4 sm:pb-4 sm:pt-3 text-center text-dd-black [--rest:-2deg]">
                    <p className="font-display text-[clamp(1.25rem,4vw,2.25rem)] font-bold uppercase leading-none text-dd-red">
                      Se busca
                    </p>
                    <img
                      src="/brand/mascot-full-color.svg"
                      alt=""
                      aria-hidden
                      className="dd-mascot my-1.5 w-[44%] sm:my-2 sm:w-[62%]"
                    />
                    <p className="text-xs font-bold leading-snug sm:text-sm">Tu mejor trabajo. Recompensa: Papitas virtuales.</p>
                  </div>
                </div>
              ) : (
                shown.map((work, i) => <Piece key={work.id} work={work} slot={slots[i]} index={i} />)
              )}
              <span aria-hidden className="dd-vitrina-sheen" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
