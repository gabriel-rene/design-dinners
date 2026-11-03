import Link from "next/link";

import MemberTagsEditor from "@/components/admin/MemberTagsEditor";
import { primaryBtn } from "@/components/admin/formStyles";
import { requireAdmin } from "@/lib/auth";
import { countByDiscipline } from "@/lib/community";
import { listMembers } from "@/lib/community-db";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { disciplineLabel } from "@/lib/disciplines";
import { countByTag, tagSlug } from "@/lib/member-tags";

export const dynamic = "force-dynamic";

const shortDate = new Intl.DateTimeFormat("es-PR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Puerto_Rico",
});

const COLS = "sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)_7rem]";

const chip = "rounded-full px-3 py-1 text-[13px] font-semibold";

export default async function AdminComunidadPage({
  searchParams,
}: {
  searchParams: Promise<{ etiqueta?: string | string[] }>;
}) {
  await requireAdmin();
  const { etiqueta } = await searchParams;
  const activeTag = typeof etiqueta === "string" ? tagSlug(etiqueta) : "";
  const allMembers = hasDatabaseConfig ? await listMembers(getDb()) : [];
  const byTag = countByTag(allMembers);
  const members = activeTag ? allMembers.filter((m) => m.tags.includes(activeTag)) : allMembers;
  const byDiscipline = countByDiscipline(members);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase">
            Comunidad <span className="text-dd-brown">{allMembers.length}</span>
          </h1>
          <p className="mt-1 text-[15px] text-dd-black/70">
            Quién llenó el formulario para entrar al WhatsApp. Las reservas tienen su propia lista en cada evento.
          </p>
        </div>
        {allMembers.length > 0 && (
          <a href="/admin/comunidad/csv" className={`${primaryBtn} gap-2`}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3v12" />
              <path d="M7 10l5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            Descargar lista (CSV)
          </a>
        )}
      </div>

      {!hasDatabaseConfig && (
        <p role="alert" className="text-dd-red">Falta DATABASE_URL en el servidor.</p>
      )}

      {byTag.length > 0 && (
        <section aria-labelledby="etiquetas-h">
          <h2 id="etiquetas-h" className="font-display text-lg font-bold uppercase text-dd-black">
            Por etiqueta
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            <li>
              <Link
                href="/admin/comunidad"
                aria-current={activeTag ? undefined : "page"}
                className={`${chip} ${activeTag ? "bg-dd-black/[0.06] text-dd-black/80 hover:bg-dd-black/10" : "bg-dd-black text-dd-cream"}`}
              >
                Todos <span className="tabular-nums opacity-70">{allMembers.length}</span>
              </Link>
            </li>
            {byTag.map(({ tag, count }) => (
              <li key={tag}>
                <Link
                  href={`/admin/comunidad?etiqueta=${encodeURIComponent(tag)}`}
                  aria-current={tag === activeTag ? "page" : undefined}
                  className={`${chip} ${tag === activeTag ? "bg-dd-red text-dd-cream" : "bg-dd-red/10 text-dd-red hover:bg-dd-red/20"}`}
                >
                  {tag} <span className="tabular-nums opacity-70">{count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {members.length === 0 ? (
        <p className="rounded-lg border border-dashed border-dd-black/25 px-5 py-5 text-[15px] text-dd-black/65">
          {activeTag ? `Nadie tiene la etiqueta “${activeTag}”.` : "Todavía nadie ha llenado el formulario."}
        </p>
      ) : (
        <>
          <section aria-labelledby="disciplinas-h">
            <h2 id="disciplinas-h" className="font-display text-lg font-bold uppercase text-dd-black">
              Por disciplina
            </h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {byDiscipline.map(({ discipline, count }) => (
                <li
                  key={discipline}
                  className="rounded-full bg-dd-black/[0.06] px-3 py-1 text-[13px] font-semibold text-dd-black/80"
                >
                  {disciplineLabel(discipline, null)} <span className="tabular-nums text-dd-brown">{count}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="overflow-hidden rounded-lg border border-dd-black/15 bg-white">
            <div
              aria-hidden
              className={`hidden gap-4 bg-dd-black/[0.035] px-5 py-2.5 text-[12px] font-bold uppercase tracking-wide text-dd-black/60 sm:grid ${COLS}`}
            >
              <span>Nombre</span>
              <span>Correo</span>
              <span>Disciplina</span>
              <span>Etiquetas</span>
              <span>Se unió</span>
            </div>
            <ul>
              {members.map((m) => {
                const discipline = disciplineLabel(m.discipline, m.discipline_other);
                return (
                  <li
                    key={m.id}
                    className={`grid gap-x-4 gap-y-0.5 border-t border-dd-black/[0.08] px-4 py-3 first:border-t-0 sm:items-center sm:px-5 sm:first:border-t ${COLS}`}
                  >
                    <span className="truncate text-[15px] font-semibold text-dd-black">{m.name}</span>
                    <span className="truncate text-sm text-dd-black/75" title={m.email}>
                      {m.email}
                    </span>
                    <span className="truncate text-sm text-dd-brown" title={discipline}>
                      {discipline}
                    </span>
                    <MemberTagsEditor id={m.id} name={m.name} tags={m.tags} />
                    <span className="whitespace-nowrap text-sm tabular-nums text-dd-black/65">
                      {shortDate.format(new Date(m.created_at))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
