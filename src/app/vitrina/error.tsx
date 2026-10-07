"use client";

/* eslint-disable @next/next/no-img-element -- local SVG brand asset */

export default function VitrinaError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-dd-black px-6 text-center text-dd-cream">
      <div className="flex max-w-md flex-col items-center">
        <img src="/brand/icon-mayo-cream.svg" alt="" aria-hidden className="h-10 w-10" />
        <h1 className="mt-6 font-display text-[clamp(1.875rem,7vw,2.5rem)] font-bold uppercase leading-[0.98]">
          No pudimos cargar La Vitrina
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-dd-cream/85">Revisa tu conexión e intenta otra vez.</p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="mt-8 inline-flex h-12 items-center rounded-full bg-dd-cream px-7 font-bold text-dd-black transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dd-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
