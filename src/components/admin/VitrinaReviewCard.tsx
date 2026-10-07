/* eslint-disable @next/next/no-img-element -- Supabase Storage image, same as BrandImage */
import {
  approveWorkAction,
  deleteWorkAction,
  hideWorkAction,
  rejectWorkAction,
} from "@/app/admin/(panel)/vitrina/actions";
import type { AdminWork } from "@/lib/vitrina/types";
import { BADGE_LABEL, LINK_KEYS, LINK_LABEL } from "@/lib/vitrina/validate";

import ActionButton from "./ActionButton";
import DeleteButton from "./DeleteButton";
import { primaryBtnSm, secondaryBtnSm } from "./formStyles";

const dateFormat = new Intl.DateTimeFormat("es-PR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Puerto_Rico" });

export default function VitrinaReviewCard({ work }: { work: AdminWork }) {
  return (
    <article aria-label={work.title} className="grid gap-5 rounded-xl border border-dd-black/15 bg-white p-4 md:grid-cols-[220px_1fr] md:p-5">
      <div className="overflow-hidden rounded-lg bg-dd-black/5">
        {work.imageUrl ? (
          <img src={work.imageUrl} alt={work.title} className="h-64 w-full object-contain md:h-72" />
        ) : (
          <p className="p-6 text-sm text-dd-black/60">Imagen no disponible</p>
        )}
      </div>
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl font-bold">{work.title}</h2>
          {work.badge && (
            <span className="rounded-full bg-dd-yellow px-2.5 py-0.5 text-xs font-bold uppercase">{BADGE_LABEL[work.badge]}</span>
          )}
        </div>
        <p className="text-[15px]">
          {work.creatorName} · {work.creatorRole} ·{" "}
          <a href={`mailto:${work.creatorEmail}`} className="underline">{work.creatorEmail}</a>
        </p>
        {work.description && <p className="whitespace-pre-line text-[15px] text-dd-black/80">{work.description}</p>}
        <ul className="flex flex-wrap gap-2 text-sm">
          {LINK_KEYS.filter((key) => work.links[key]).map((key) => (
            <li key={key}>
              <a href={work.links[key]} target="_blank" rel="noopener noreferrer nofollow ugc" className="underline">
                {LINK_LABEL[key]}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-dd-black/60">
          Enviada {dateFormat.format(new Date(work.createdAt))}
          {work.publishedAt && work.status === "published" && <> · Publicada {dateFormat.format(new Date(work.publishedAt))}</>}
          {" "}· 🍟 {work.friesCount}
        </p>
        <div className="flex flex-wrap items-start gap-2 pt-1">
          {work.status === "pending" && (
            <>
              <ActionButton action={approveWorkAction.bind(null, work.id)} label="Aprobar" pendingLabel="Aprobando…" className={primaryBtnSm} />
              <ActionButton action={rejectWorkAction.bind(null, work.id)} label="Rechazar" pendingLabel="Rechazando…" className={secondaryBtnSm} />
            </>
          )}
          {work.status === "published" && (
            <ActionButton action={hideWorkAction.bind(null, work.id)} label="Ocultar" pendingLabel="Ocultando…" className={secondaryBtnSm} />
          )}
          {work.status === "rejected" && (
            <ActionButton action={approveWorkAction.bind(null, work.id)} label="Publicar" pendingLabel="Publicando…" className={primaryBtnSm} />
          )}
          <DeleteButton
            action={deleteWorkAction.bind(null, work.id)}
            confirmMessage="¿Eliminar esta obra y su imagen? No se puede deshacer."
          />
        </div>
      </div>
    </article>
  );
}
