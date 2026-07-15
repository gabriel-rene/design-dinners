import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { getEventsWithSpeakers } from "@/lib/queries";
import { EVENT_TYPE_LABEL, formatArchiveDate, formatEventTime } from "@/lib/format";
import DeleteButton from "@/components/admin/DeleteButton";
import { primaryBtn, secondaryBtn } from "@/components/admin/formStyles";
import { deleteEvent } from "./actions";

export default async function EventosListPage() {
  await requireAdmin();
  const events = await getEventsWithSpeakers();

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
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold uppercase tracking-wide text-dd-brown">
                  {formatArchiveDate(event.event_date)} · {formatEventTime(event.event_date)}
                  {" · "}
                  {EVENT_TYPE_LABEL[event.event_type]}
                </p>
                <h2 className="font-display text-xl font-bold uppercase leading-tight text-dd-black">
                  {event.title}
                </h2>
                {event.speakers.length > 0 && (
                  <p className="mt-0.5 text-[13px] text-dd-black/65">
                    Con {event.speakers.map((s) => s.name).join(", ")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/eventos/${event.id}`} className={secondaryBtn}>
                  Editar
                </Link>
                <DeleteButton
                  action={deleteEvent.bind(null, event.id)}
                  confirmMessage={`¿Eliminar "${event.title}"? No se puede deshacer.`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
