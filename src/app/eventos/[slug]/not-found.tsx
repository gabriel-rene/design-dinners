/* eslint-disable @next/next/no-img-element -- local SVG brand asset */

import Link from "next/link";

export default function EventNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-20 text-center">
      <img src="/brand/mascot-full-color.svg" alt="" aria-hidden className="dd-float w-36 md:w-44" />
      <h1 className="mt-8 max-w-xl font-display text-[clamp(2.25rem,8vw,3.75rem)] font-bold uppercase leading-[0.95] text-dd-red">
        No encontramos ese evento
      </h1>
      <p className="mt-4 max-w-md text-lg leading-relaxed">
        Puede que el enlace esté incompleto o que el evento ya no exista.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full border-2 border-dd-black bg-dd-yellow px-8 py-3.5 font-display text-lg font-bold uppercase tracking-wide text-dd-black dd-btn"
      >
        Volver a la portada
      </Link>
    </main>
  );
}
