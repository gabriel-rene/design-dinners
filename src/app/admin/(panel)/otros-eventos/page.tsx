import Link from "next/link";

import CommunityEventReviewCard from "@/components/admin/CommunityEventReviewCard";
import { requireAdmin } from "@/lib/auth";
import { listCommunityEventsByStatus } from "@/lib/otros-eventos/db";
import type { CommunityEventStatus } from "@/lib/otros-eventos/types";
import { getServiceClient, hasServiceConfig } from "@/lib/supabase/service";

const TABS: { key: string; status: CommunityEventStatus; label: string; empty: string }[] = [
  { key: "pendientes", status: "pending", label: "Pendientes", empty: "No hay eventos esperando revisión." },
  { key: "publicados", status: "published", label: "Publicados", empty: "No hay eventos publicados." },
  { key: "rechazados", status: "rejected", label: "Rechazados", empty: "No hay eventos rechazados." },
];

export default async function AdminOtrosEventosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  await requireAdmin();
  const { estado } = await searchParams;
  const tab = TABS.find((t) => t.key === estado) ?? TABS[0];
  const events = hasServiceConfig ? await listCommunityEventsByStatus(getServiceClient(), tab.status) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase">Otros eventos</h1>
        <p className="mt-1 text-[15px] text-dd-black/70">Nada se publica sin tu aprobación.</p>
      </div>
      <nav aria-label="Estado" className="flex gap-1 border-b border-dd-black/15">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/otros-eventos?estado=${t.key}`}
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
      {events.length === 0 ? (
        <p className="py-10 text-center text-dd-black/60">{tab.empty}</p>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <CommunityEventReviewCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
