import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { getSpeakers } from "@/lib/queries";
import EventForm from "@/components/admin/EventForm";
import { createEvent } from "../actions";

export default async function NuevoEventoPage() {
  await requireAdmin();
  const speakers = await getSpeakers();

  return (
    <div>
      <Link
        href="/admin/eventos"
        className="text-sm font-medium text-dd-black/60 transition-colors hover:text-dd-red"
      >
        ← Eventos
      </Link>
      <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-tight text-dd-red">
        Nuevo evento
      </h1>
      <div className="mt-8">
        <EventForm action={createEvent} submitLabel="Crear evento" speakers={speakers} />
      </div>
    </div>
  );
}
