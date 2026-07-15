import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { getResourceById, getResources } from "@/lib/queries";
import ResourceForm from "@/components/admin/ResourceForm";
import DeleteButton from "@/components/admin/DeleteButton";
import { deleteResource, updateResource } from "../actions";

export default async function EditarRecursoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [resource, resources] = await Promise.all([
    getResourceById(id),
    getResources(),
  ]);
  if (!resource) {
    notFound();
  }

  const categories = [...new Set(resources.map((r) => r.category))].sort((a, b) =>
    a.localeCompare(b),
  );

  return (
    <div>
      <Link
        href="/admin/recursos"
        className="text-sm font-medium text-dd-black/60 transition-colors hover:text-dd-red"
      >
        ← Recursos
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-dd-red">
          Editar recurso
        </h1>
        <DeleteButton
          action={deleteResource.bind(null, resource.id)}
          confirmMessage={`¿Eliminar "${resource.title}"? No se puede deshacer.`}
        />
      </div>

      <div className="mt-8">
        <ResourceForm
          action={updateResource.bind(null, resource.id)}
          submitLabel="Guardar cambios"
          categories={categories}
          defaults={{
            title: resource.title,
            description: resource.description,
            url: resource.url,
            category: resource.category,
          }}
        />
      </div>
    </div>
  );
}
