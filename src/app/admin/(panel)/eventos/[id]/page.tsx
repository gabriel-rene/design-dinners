import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { getEventById, getSpeakers } from "@/lib/queries";
import EventForm from "@/components/admin/EventForm";
import DeleteButton from "@/components/admin/DeleteButton";
import { deleteEvent, updateEvent } from "../actions";

/** Stored UTC timestamp → the `YYYY-MM-DDTHH:mm` a datetime-local input wants,
 *  rendered in Puerto Rico time to mirror how the value was entered. */
function toDatetimeLocal(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Puerto_Rico",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export default async function EditarEventoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [event, speakers] = await Promise.all([getEventById(id), getSpeakers()]);
  if (!event) {
    notFound();
  }

  return (
    <div>
      <Link
        href="/admin/eventos"
        className="text-sm font-medium text-dd-black/60 transition-colors hover:text-dd-red"
      >
        ← Eventos
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-dd-red">
          Editar evento
        </h1>
        <DeleteButton
          action={deleteEvent.bind(null, event.id)}
          confirmMessage={`¿Eliminar "${event.title}"? No se puede deshacer.`}
        />
      </div>

      <div className="mt-8">
        <EventForm
          action={updateEvent.bind(null, event.id)}
          submitLabel="Guardar cambios"
          speakers={speakers}
          defaults={{
            title: event.title,
            description: event.description,
            event_date: toDatetimeLocal(event.event_date),
            location: event.location,
            event_type: event.event_type,
            registration_url: event.registration_url,
            cover_image_url: event.cover_image_url,
            speaker_ids: event.speaker_ids,
          }}
        />
      </div>
    </div>
  );
}
