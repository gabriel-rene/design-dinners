import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { getResources } from "@/lib/queries";
import DeleteButton from "@/components/admin/DeleteButton";
import { primaryBtn, secondaryBtn } from "@/components/admin/formStyles";
import { deleteResource } from "./actions";

export default async function RecursosListPage() {
  await requireAdmin();
  const resources = await getResources();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-dd-red">
            Recursos
          </h1>
          <p className="mt-1 text-[15px] text-dd-black/70">
            {resources.length} en total.
          </p>
        </div>
        <Link href="/admin/recursos/nuevo" className={primaryBtn}>
          Nuevo recurso
        </Link>
      </div>

      {resources.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-dd-black/25 bg-white/60 px-6 py-12 text-center">
          <p className="font-display text-2xl font-bold uppercase text-dd-black/70">
            Todavía no hay recursos
          </p>
          <p className="mx-auto mt-2 max-w-sm text-[15px] text-dd-black/65">
            Añade enlaces útiles y agrúpalos por categoría para la portada.
          </p>
          <Link href="/admin/recursos/nuevo" className={`${primaryBtn} mt-6`}>
            Crear el primero
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-dd-black/10 overflow-hidden rounded-lg border border-dd-black/15 bg-white">
          {resources.map((resource) => (
            <li
              key={resource.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-dd-black/15 bg-dd-cream px-2.5 py-0.5 text-[12px] font-bold uppercase tracking-wide text-dd-brown">
                    {resource.category}
                  </span>
                </div>
                <h2 className="mt-1.5 font-semibold leading-tight text-dd-black">
                  {resource.title}
                </h2>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-[13px] text-dd-black/65 underline decoration-dd-black/25 underline-offset-2 transition-colors hover:text-dd-red hover:decoration-dd-red/50"
                >
                  {resource.url}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/recursos/${resource.id}`} className={secondaryBtn}>
                  Editar
                </Link>
                <DeleteButton
                  action={deleteResource.bind(null, resource.id)}
                  confirmMessage={`¿Eliminar "${resource.title}"? No se puede deshacer.`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
