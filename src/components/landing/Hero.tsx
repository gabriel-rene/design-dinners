/* eslint-disable @next/next/no-img-element -- local SVG brand assets need no optimization */

const MARQUEE_ITEMS = ["Cenas", "Speakers", "Talleres", "Recursos", "Comunidad"];

function MarqueeRun() {
  return (
    <>
      {MARQUEE_ITEMS.map((item) => (
        <span key={item} className="flex items-center gap-8">
          <span className="font-display text-2xl font-bold uppercase tracking-wide text-dd-cream md:text-3xl">
            {item}
          </span>
          <img src="/brand/icon-mayo-cream.svg" alt="" aria-hidden className="h-5 w-5" />
        </span>
      ))}
    </>
  );
}

export default function Hero({ whatsappUrl }: { whatsappUrl: string }) {
  return (
    <section id="hero" aria-label="Design Dinners" className="flex flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 pt-6 md:px-8">
        <img
          src="/brand/primary-black.svg"
          alt="Design Dinners"
          className="h-8 w-auto md:h-9"
        />
        <a
          href={whatsappUrl}
          className="text-sm font-bold uppercase tracking-wide underline decoration-dd-red decoration-2 underline-offset-4 transition-colors hover:text-dd-red"
        >
          WhatsApp
        </a>
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-5 pb-16 pt-10 text-center md:pb-24 md:pt-14">
        <img
          src="/brand/mascot-full-color.svg"
          alt="Mascota de Design Dinners: un cartón de papitas fritas caminando con un pincel en la mano — Delicious Collective, desde 2023"
          className="dd-rise w-48 md:w-60"
        />
        <h1
          className="dd-rise mt-8 font-display text-[clamp(3.25rem,11vw,6rem)] font-bold uppercase leading-[0.92] tracking-[-0.01em] text-dd-red [--dd-rise-delay:120ms]"
        >
          El diseño se sienta a cenar
        </h1>
        <p className="dd-rise mt-6 max-w-xl text-lg leading-relaxed [--dd-rise-delay:220ms]">
          Somos la comunidad de diseño de Puerto Rico que se junta alrededor de
          la mesa: cenas con speakers, talleres y recursos que se comparten
          como el pan.
        </p>
        <div className="dd-rise mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 [--dd-rise-delay:320ms]">
          <a
            href={whatsappUrl}
            className="rounded-full border-2 border-dd-black bg-dd-red px-8 py-3.5 font-display text-lg font-bold uppercase tracking-wide text-dd-cream transition-transform duration-200 ease-out hover:-translate-y-0.5"
          >
            Únete al WhatsApp
          </a>
          <a
            href="#proximo-evento"
            className="text-[15px] font-bold text-dd-brown underline decoration-2 underline-offset-4 transition-colors hover:text-dd-red"
          >
            Ver el próximo evento ↓
          </a>
        </div>
      </div>

      {/* Red ticker band — opens the Ketchup Red block that follows. */}
      <div
        aria-hidden
        className="flex overflow-hidden border-y-2 border-dd-black bg-dd-red py-3.5"
      >
        <div className="dd-marquee-track flex shrink-0 items-center gap-8 pr-8">
          <MarqueeRun />
        </div>
        <div className="dd-marquee-track flex shrink-0 items-center gap-8 pr-8">
          <MarqueeRun />
        </div>
      </div>
    </section>
  );
}
