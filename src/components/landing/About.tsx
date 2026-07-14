/* eslint-disable @next/next/no-img-element -- local brand assets need no optimization */

/**
 * Sobre / footer: full-bleed community-table photo, then the black closing
 * block with the Papita Yellow primary logo, the WhatsApp CTA and the brand
 * credit. The blue double checkmark lives here — the single punctual blue
 * detail on the page, meaning exactly what it means in WhatsApp.
 */
export default function About({ whatsappUrl }: { whatsappUrl: string }) {
  return (
    <section id="sobre" aria-labelledby="sobre-titulo">
      <img
        src="/brand/mesa-comunidad.jpg"
        alt="Una mesa vista desde arriba: hamburguesas, papitas fritas y las manos de la comunidad compartiendo el plato"
        loading="lazy"
        className="h-56 w-full border-y-2 border-dd-black object-cover md:h-80"
      />

      <footer className="bg-dd-black py-16 text-white md:py-24">
        <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
          <div className="grid gap-12 md:grid-cols-[7fr_5fr] md:gap-16">
            <div>
              <img
                src="/brand/primary-papita-yellow.svg"
                alt="Design Dinners"
                className="h-16 w-auto md:h-20"
              />
              <p className="mt-8 max-w-[55ch] text-lg leading-relaxed">
                Design Dinners es una comunidad de diseño en Puerto Rico. Nos
                juntamos a cenar, escuchar speakers y compartir lo que
                aprendemos — sin agenda corporativa: una mesa larga y sillas
                para quien quiera sentarse.
              </p>
            </div>

            <div className="flex flex-col items-start gap-5 md:pt-2">
              <h2
                id="sobre-titulo"
                className="font-display text-[clamp(2rem,5vw,2.75rem)] font-bold uppercase leading-none text-dd-cream"
              >
                ¿Te guardamos una silla?
              </h2>
              <a
                href={whatsappUrl}
                className="rounded-full border-2 border-dd-cream bg-dd-yellow px-8 py-3.5 font-display text-lg font-bold uppercase tracking-wide text-dd-black transition-transform duration-200 ease-out hover:-translate-y-0.5"
              >
                Únete al WhatsApp
              </a>
              <p className="flex items-center gap-2 text-sm text-white/70">
                <img
                  src="/brand/icon-double-blue-checkmarks.svg"
                  alt=""
                  aria-hidden
                  className="h-4 w-4"
                />
                Doble check: aquí sí se lee el grupo.
              </p>
            </div>
          </div>

          <div className="mt-16 flex flex-col gap-2 border-t border-white/20 pt-6 text-sm text-white/70 md:flex-row md:items-center md:justify-between">
            <p>© 2026 Design Dinners · Delicious Collective · San Juan, PR</p>
            <p>Identidad y mascota: brand kit de la comunidad, marzo 2024</p>
          </div>
        </div>
      </footer>
    </section>
  );
}
