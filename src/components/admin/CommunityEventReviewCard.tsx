/* eslint-disable @next/next/no-img-element -- Supabase Storage image, same as BrandImage */
import {
  approveEventAction,
  deleteEventAction,
  hideEventAction,
  rejectEventAction,
} from "@/app/admin/(panel)/otros-eventos/actions";
import { formatEventDate, formatEventTime } from "@/lib/format";
import type { AdminCommunityEvent } from "@/lib/otros-eventos/types";
import { PRICE_LABEL, prToday } from "@/lib/otros-eventos/validate";
import { communityEventPath } from "@/lib/slug";

import ActionButton from "./ActionButton";
import DeleteButton from "./DeleteButton";
import { primaryBtnSm, secondaryBtnSm } from "./formStyles";

const dateFormat = new Intl.DateTimeFormat("es-PR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Puerto_Rico" });

export default function CommunityEventReviewCard({ event }: { event: AdminCommunityEvent }) {
  const past = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Puerto_Rico" }).format(new Date(event.startsAt)) < prToday();
  return (
    <article aria-label={event.title} className="grid gap-5 rounded-xl border border-dd-black/15 bg-white p-4 md:grid-cols-[220px_1fr] md:p-5">
      <div className="overflow-hidden rounded-lg bg-dd-black/5">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.title} loading="lazy" className="h-64 w-full object-contain md:h-72" />
        ) : (
          <p className="p-6 text-sm text-dd-black/60">Imagen no disponible</p>
        )}
      </div>
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl font-bold">{event.title}</h2>
          {past && <span className="rounded-full bg-dd-black/10 px-2.5 py-0.5 text-xs font-bold uppercase">Pasó</span>}
        </div>
        <p className="text-[15px]">
          {formatEventDate(event.startsAt)} · {formatEventTime(event.startsAt)}
        </p>
        <p className="text-[15px]">
          {event.venue}
          {event.organizer && <> · {event.organizer}</>}
          {event.price && <> · {PRICE_LABEL[event.price]}</>}
        </p>
        <p className="break-all text-sm">
          <a href={event.link} target="_blank" rel="noopener noreferrer nofollow ugc" className="underline">
            {event.link}
          </a>
        </p>
        {event.description && <p className="whitespace-pre-line text-[15px] text-dd-black/80">{event.description}</p>}
        <p className="text-[15px]">
          <a href={`mailto:${encodeURIComponent(event.submitterEmail)}`} className="underline">{event.submitterEmail}</a>
        </p>
        <p className="text-[13px] text-dd-black/60">
          Enviado {dateFormat.format(new Date(event.createdAt))}
          {event.publishedAt && event.status === "published" && <> · Publicado {dateFormat.format(new Date(event.publishedAt))}</>}
        </p>
        <div className="flex flex-wrap items-start gap-2 pt-1">
          {event.status === "pending" && (
            <>
              <ActionButton action={approveEventAction.bind(null, event.id)} label="Aprobar" pendingLabel="Aprobando…" className={primaryBtnSm} />
              <ActionButton action={rejectEventAction.bind(null, event.id)} label="Rechazar" pendingLabel="Rechazando…" className={secondaryBtnSm} />
            </>
          )}
          {event.status === "published" && (
            <>
              {event.slug && (
                <a href={communityEventPath({ slug: event.slug })} target="_blank" rel="noopener noreferrer" className={secondaryBtnSm}>
                  Ver página
                </a>
              )}
              <ActionButton action={hideEventAction.bind(null, event.id)} label="Ocultar" pendingLabel="Ocultando…" className={secondaryBtnSm} />
            </>
          )}
          {event.status === "rejected" && (
            <ActionButton action={approveEventAction.bind(null, event.id)} label="Publicar" pendingLabel="Publicando…" className={primaryBtnSm} />
          )}
          <DeleteButton
            action={deleteEventAction.bind(null, event.id)}
            confirmMessage="¿Eliminar este evento y su afiche? No se puede deshacer."
          />
        </div>
      </div>
    </article>
  );
}
