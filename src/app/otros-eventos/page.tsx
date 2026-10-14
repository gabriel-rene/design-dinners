/* eslint-disable @next/next/no-img-element -- local SVG brand assets need no optimization */

import type { Metadata } from "next";
import Link from "next/link";

import CommunityEventCard from "@/components/otros-eventos/CommunityEventCard";
import { listUpcomingEvents } from "@/lib/otros-eventos/db";
import type { PublicCommunityEvent } from "@/lib/otros-eventos/types";
import { getServiceClient, hasServiceConfig } from "@/lib/supabase/service";
import { logSafe } from "@/lib/vitrina/log";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Otros eventos — Design Dinners",
  description: "Eventos de diseño en Puerto Rico organizados por la comunidad.",
};

async function loadEvents(): Promise<PublicCommunityEvent[]> {
  if (!hasServiceConfig) return [];
  try {
    return await listUpcomingEvents(getServiceClient());
  } catch (error) {
    logSafe("otros-eventos page failed", error);
    return [];
  }
}

function SendButton() {
  return (
    <Link
      href="/otros-eventos/enviar"
      className="inline-block rounded-full border-2 border-dd-black bg-dd-red px-7 py-3 font-display text-lg font-bold uppercase tracking-wide text-dd-cream dd-btn focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-dd-black"
    >
      Enviar un evento
    </Link>
  );
}

export default async function OtrosEventosPage() {
  const events = await loadEvents();

  return (
    <main className="min-h-screen bg-dd-cream text-dd-black">
      <div className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-14">
        <Link
          href="/"
          className="text-sm font-bold uppercase tracking-wide underline decoration-dd-red decoration-2 underline-offset-4"
        >
          ← Design Dinners
        </Link>

        <header className="mt-6 flex flex-col gap-6 border-b-2 border-dd-black pb-8 md:flex-row md:items-end md:justify-between md:pb-10">
          <div>
            <h1 className="font-display text-[clamp(2.5rem,8vw,4.5rem)] font-bold uppercase leading-[0.95] text-balance text-dd-red">
              Otros eventos
            </h1>
            <p className="mt-4 max-w-[46ch] text-[17px] leading-relaxed text-dd-black/80">
              Eventos de diseño en Puerto Rico organizados por la comunidad.
            </p>
          </div>
          {events.length > 0 && (
            <div className="shrink-0">
              <SendButton />
            </div>
          )}
        </header>

        {events.length > 0 ? (
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 md:mt-12">
            {events.map((event) => (
              <li key={event.id}>
                <CommunityEventCard event={event} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mx-auto flex max-w-xl flex-col items-center py-14 text-center md:py-20">
            <img src="/brand/mascot-full-color.svg" alt="" aria-hidden className="dd-float w-28 md:w-32" />
            <p className="mt-6 font-display text-[clamp(1.75rem,5vw,2.5rem)] font-bold uppercase leading-[1] text-balance">
              No hay eventos de la comunidad por ahora. ¿Organizas uno?
            </p>
            <div className="mt-8">
              <SendButton />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
