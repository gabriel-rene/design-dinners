import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { getResources } from "@/lib/queries";
import ResourceForm from "@/components/admin/ResourceForm";
import { createResource } from "../actions";

export default async function NuevoRecursoPage() {
  await requireAdmin();
  const resources = await getResources();
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
      <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-tight text-dd-red">
        Nuevo recurso
      </h1>
      <div className="mt-8">
        <ResourceForm
          action={createResource}
          submitLabel="Crear recurso"
          categories={categories}
        />
      </div>
    </div>
  );
}
