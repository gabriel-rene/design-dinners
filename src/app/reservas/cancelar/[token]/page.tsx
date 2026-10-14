/* eslint-disable @next/next/no-img-element -- local SVG brand asset */

// "Liberar mi puesto": opened from the link in every RSVP email. Showing this
// page never changes anything (email scanners open links on their own); only
// the button's server action cancels.
import type { Metadata } from "next";
import Link from "next/link";

import { getDb, hasDatabaseConfig } from "@/lib/db";
import { formatEventDate, formatEventTime } from "@/lib/format";
import { isUuid } from "@/lib/rsvp";
import { getRsvpByCancelToken } from "@/lib/rsvp-db";

import CancelForm from "./CancelForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Liberar mi puesto — Design Dinners",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

function hasStarted(isoDate: string): boolean {
  return new Date(isoDate).getTime() < Date.now();
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center px-5 py-14 md:py-20">
      <img src="/brand/mascot-full-color.svg" alt="" aria-hidden className="w-28 rotate-[7deg] md:w-32" />
      <div className="mt-6 w-full max-w-md rounded-2xl border-2 border-dd-black bg-dd-cream p-6 shadow-[4px_6px_0_0_var(--dd-black)]">
        {children}
      </div>
    </main>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <Shell>
      <h1 className="font-display text-[clamp(1.75rem,7vw,2.25rem)] font-bold uppercase leading-[0.95] text-dd-red">
        {title}
      </h1>
      <p className="mt-3 leading-relaxed">{body}</p>
      <Link href="/" className="mt-5 inline-block font-bold text-dd-brown underline underline-offset-[3px]">
        Volver a la portada
      </Link>
    </Shell>
  );
}

export default async function CancelPage({ params }: Props) {
  const { token } = await params;
  const rsvp = hasDatabaseConfig && isUuid(token) ? await getRsvpByCancelToken(getDb(), token) : null;

  if (!rsvp) {
    return <Notice title="Este enlace no es válido" body="Revisa que copiaste el enlace completo del correo." />;
  }
  if (rsvp.status === "cancelled") {
    return <Notice title="Listo, liberaste tu puesto" body="Gracias por avisar. Tu reserva ya no está activa." />;
  }
  if (hasStarted(rsvp.eventDate)) {
    return <Notice title="Este evento ya pasó" body="Ya no hace falta liberar este puesto." />;
  }

  const waitlist = rsvp.status === "waitlist";
  const firstName = rsvp.name.split(" ")[0];

  return (
    <Shell>
      <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-dd-brown">
        {waitlist ? "Lista de espera" : "Tu reserva"}
      </p>
      <h1 className="mt-2 font-display text-[clamp(1.75rem,7vw,2.25rem)] font-bold uppercase leading-[0.95] [overflow-wrap:anywhere]">
        {waitlist ? `¿Quieres salir de la fila, ${firstName}?` : `¿No vas a poder llegar, ${firstName}?`}
      </h1>
      <dl className="mt-5 flex flex-col gap-3 text-[15px]">
        <div>
          <dt className="text-[12px] font-bold uppercase tracking-[0.06em] text-dd-brown">Evento</dt>
          <dd className="mt-0.5 font-semibold">{rsvp.eventTitle}</dd>
        </div>
        <div>
          <dt className="text-[12px] font-bold uppercase tracking-[0.06em] text-dd-brown">Cuándo</dt>
          <dd className="mt-0.5 font-semibold first-letter:uppercase">
            {formatEventDate(rsvp.eventDate)} · {formatEventTime(rsvp.eventDate)}
          </dd>
        </div>
        {rsvp.location && (
          <div>
            <dt className="text-[12px] font-bold uppercase tracking-[0.06em] text-dd-brown">Dónde</dt>
            <dd className="mt-0.5 font-semibold">{rsvp.location}</dd>
          </div>
        )}
      </dl>
      {!waitlist && (
        <p className="mt-5 leading-relaxed">
          Si liberas tu puesto, se lo damos a la próxima persona en la lista de espera.
        </p>
      )}
      <CancelForm token={token} eventId={rsvp.eventId} waitlist={waitlist} />
    </Shell>
  );
}
