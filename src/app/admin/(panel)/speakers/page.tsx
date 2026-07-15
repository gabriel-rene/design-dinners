/* eslint-disable @next/next/no-img-element -- stored public URLs / brand placeholder */
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { getSpeakers } from "@/lib/queries";
import DeleteButton from "@/components/admin/DeleteButton";
import { primaryBtn, secondaryBtn } from "@/components/admin/formStyles";
import { deleteSpeaker } from "./actions";

export default async function SpeakersListPage() {
  await requireAdmin();
  const speakers = await getSpeakers();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-dd-red">
            Speakers
          </h1>
          <p className="mt-1 text-[15px] text-dd-black/70">
            {speakers.length} en total.
          </p>
        </div>
        <Link href="/admin/speakers/nuevo" className={primaryBtn}>
          Nuevo speaker
        </Link>
      </div>

      {speakers.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-dd-black/25 bg-white/60 px-6 py-12 text-center">
          <p className="font-display text-2xl font-bold uppercase text-dd-black/70">
            Todavía no hay speakers
          </p>
          <p className="mx-auto mt-2 max-w-sm text-[15px] text-dd-black/65">
            Añade las voces de la comunidad para mostrarlas en la portada.
          </p>
          <Link href="/admin/speakers/nuevo" className={`${primaryBtn} mt-6`}>
            Crear el primero
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-dd-black/10 overflow-hidden rounded-lg border border-dd-black/15 bg-white">
          {speakers.map((speaker) => (
            <li
              key={speaker.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-5"
            >
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-dd-black/20 bg-dd-cream">
                {speaker.photo_url ? (
                  <img
                    src={speaker.photo_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-full w-full items-center justify-center text-sm font-bold text-dd-black/40"
                  >
                    {speaker.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-xl font-bold uppercase leading-tight text-dd-black">
                  {speaker.name}
                </h2>
                {speaker.role_title && (
                  <p className="text-[13px] text-dd-black/65">{speaker.role_title}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/speakers/${speaker.id}`} className={secondaryBtn}>
                  Editar
                </Link>
                <DeleteButton
                  action={deleteSpeaker.bind(null, speaker.id)}
                  confirmMessage={`¿Eliminar a "${speaker.name}"? No se puede deshacer.`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
