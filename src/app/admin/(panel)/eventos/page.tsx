import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { getEventsWithSpeakers } from "@/lib/queries";
import { EVENT_TYPE_LABEL, formatArchiveDate, formatEventTime } from "@/lib/format";
import DeleteButton from "@/components/admin/DeleteButton";
import { darkBtn, primaryBtn, secondaryBtn } from "@/components/admin/formStyles";
import type { EventWithSpeakers } from "@/lib/types";
import { deleteEvent } from "./actions";

/** "19 / 20 asientos" + a thin fill bar, or "6 reservas · Sin límite". */
function SeatBlock({ event, past }: { event: EventWithSpeakers; past: boolean }) {
  const { capacity, confirmed_count: confirmed, waitlist_count: waiting } = event;
  const pct = capacity === null ? 0 : Math.min(100, Math.round((confirmed / capacity) * 100));
  const full = capacity !== null && confirmed >= capacity;

  return (
    <div className={past ? "text-dd-black/70" : "text-dd-black"}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-bold">
          {capacity === null
            ? `${confirmed} ${confirmed === 1 ? "reserva" : "reservas"}`
            : `${confirmed} / ${capacity} asientos`}
        </span>
        {capacity === null ? (
          <span className="text-[12px] font-semibold text-dd-black/60">Sin límite</span>
        ) : waiting > 0 && !past ? (
          <span className="rounded-full bg-[#FCE3B6] px-2 py-px text-[12px] font-semibold text-[#5C2913]">
            {waiting} en espera
          </span>
        ) : full ? (
          <span className="text-[12px] font-semibold text-dd-black/60">Lleno</span>
        ) : null}
      </div>
      <div aria-hidden className="mt-2 h-2 overflow-hidden rounded-full bg-dd-black/[0.08]">
        {pct > 0 && (
          <div
            className={`h-full rounded-full ${past ? "bg-dd-black/40" : "bg-dd-red"}`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}

export default async function EventosListPage() {
  await requireAdmin();
  const events = await getEventsWithSpeakers();
  const now = new Date();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-dd-red">
            Eventos
          </h1>
          <p className="mt-1 text-[15px] text-dd-black/70">
            {events.length} en total. Se ordenan por fecha.
          </p>
        </div>
        <Link href="/admin/eventos/nuevo" className={primaryBtn}>
          Nuevo evento
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-dd-black/25 bg-white/60 px-6 py-12 text-center">
          <p className="font-display text-2xl font-bold uppercase text-dd-black/70">
            Todavía no hay eventos
          </p>
          <p className="mx-auto mt-2 max-w-sm text-[15px] text-dd-black/65">
            Crea la próxima cena o taller y aparecerá en la portada al instante.
          </p>
          <Link href="/admin/eventos/nuevo" className={`${primaryBtn} mt-6`}>
            Crear el primero
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-dd-black/10 overflow-hidden rounded-lg border border-dd-black/15 bg-white">
          {events.map((event) => {
            const past = new Date(event.event_date) < now;
            return (
              <li
                key={event.id}
                className={`grid gap-x-7 gap-y-4 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_14rem] md:items-center lg:grid-cols-[minmax(0,1fr)_15rem_auto] ${
                  past ? "bg-dd-black/[0.02]" : ""
                }`}
              >
                <div className="min-w-0">
                  <p
                    className={`text-[12px] font-bold uppercase tracking-wide ${
                      past ? "text-dd-black/60" : "text-dd-brown"
                    }`}
                  >
                    {formatArchiveDate(event.event_date)} · {formatEventTime(event.event_date)}
                    {" · "}
                    {EVENT_TYPE_LABEL[event.event_type]}
                    {past && " · Ya pasó"}
                  </p>
                  <h2
                    className={`font-display text-xl font-bold uppercase leading-tight ${
                      past ? "text-dd-black/70" : "text-dd-black"
                    }`}
                  >
                    {event.title}
                  </h2>
                  {event.speakers.length > 0 && (
                    <p className="mt-0.5 text-[13px] text-dd-black/65">
                      Con {event.speakers.map((s) => s.name).join(", ")}
                    </p>
                  )}
                </div>
                <SeatBlock event={event} past={past} />
                <div className="flex flex-wrap items-center gap-2 md:col-span-2 lg:col-span-1 lg:justify-end">
                  <Link
                    href={`/admin/eventos/${event.id}/reservas`}
                    className={past ? secondaryBtn : darkBtn}
                  >
                    Reservas
                  </Link>
                  <Link href={`/admin/eventos/${event.id}`} className={secondaryBtn}>
                    Editar
                  </Link>
                  <DeleteButton
                    action={deleteEvent.bind(null, event.id)}
                    confirmMessage={`¿Eliminar "${event.title}"? No se puede deshacer.`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
