import Link from "next/link";

import VitrinaReviewCard from "@/components/admin/VitrinaReviewCard";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient, hasServiceConfig } from "@/lib/supabase/service";
import { listWorksByStatus } from "@/lib/vitrina/db";
import type { WorkStatus } from "@/lib/vitrina/types";

const TABS: { key: string; status: WorkStatus; label: string; empty: string }[] = [
  { key: "pendientes", status: "pending", label: "Pendientes", empty: "No hay obras esperando revisión." },
  { key: "publicados", status: "published", label: "Publicados", empty: "Todavía no hay obras publicadas." },
  { key: "rechazados", status: "rejected", label: "Rechazados", empty: "No hay obras rechazadas." },
];

export default async function AdminVitrinaPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  await requireAdmin();
  const { estado } = await searchParams;
  const tab = TABS.find((t) => t.key === estado) ?? TABS[0];
  const works = hasServiceConfig ? await listWorksByStatus(getServiceClient(), tab.status) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase">La Vitrina</h1>
        <p className="mt-1 text-[15px] text-dd-black/70">Nada se publica sin tu aprobación.</p>
      </div>
      <nav aria-label="Estado" className="flex gap-1 border-b border-dd-black/15">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/vitrina?estado=${t.key}`}
            aria-current={t.key === tab.key ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-[15px] font-semibold ${
              t.key === tab.key ? "border-dd-red text-dd-red" : "border-transparent text-dd-black/70 hover:text-dd-black"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {!hasServiceConfig && (
        <p role="alert" className="text-dd-red">Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.</p>
      )}
      {works.length === 0 ? (
        <p className="py-10 text-center text-dd-black/60">{tab.empty}</p>
      ) : (
        <div className="space-y-4">
          {works.map((work) => (
            <VitrinaReviewCard key={work.id} work={work} />
          ))}
        </div>
      )}
    </div>
  );
}
