import Link from "next/link";

/**
 * The main way into the share form: a dashed "leave your note here" box under
 * the Agenda, shown on every filter.
 */
export default function ShareEventBox() {
  return (
    <aside
      aria-labelledby="comparte-evento-titulo"
      className="flex flex-col items-start gap-5 rounded-2xl border-2 border-dashed border-dd-black p-6 md:flex-row md:items-center md:justify-between md:gap-8 md:p-8"
    >
      <div>
        <h2
          id="comparte-evento-titulo"
          className="font-display text-[clamp(1.5rem,4vw,2rem)] font-bold uppercase leading-[1.05]"
        >
          ¿Organizas un evento de diseño?
        </h2>
        <p className="mt-2 max-w-prose text-[17px] leading-relaxed text-dd-black/80">
          Compártelo con la comunidad. Lo revisamos y lo publicamos aquí.
        </p>
      </div>
      <Link
        href="/eventos/enviar"
        className="dd-btn shrink-0 rounded-full border-2 border-dd-black bg-dd-red px-7 py-3 font-display text-base font-bold uppercase tracking-wide text-dd-cream focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-dd-black"
      >
        Comparte un evento
      </Link>
    </aside>
  );
}
