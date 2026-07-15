import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { getEventsWithSpeakers, getResources, getSpeakers } from "@/lib/queries";
import { primaryBtn, secondaryBtn } from "@/components/admin/formStyles";

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [events, speakers, resources] = await Promise.all([
    getEventsWithSpeakers(),
    getSpeakers(),
    getResources(),
  ]);

  const sections = [
    {
      href: "/admin/eventos",
      label: "Eventos",
      count: events.length,
      noun: events.length === 1 ? "evento" : "eventos",
      blurb: "Cenas, talleres y encuentros. Se publican en la portada al instante.",
    },
    {
      href: "/admin/speakers",
      label: "Speakers",
      count: speakers.length,
      noun: speakers.length === 1 ? "speaker" : "speakers",
      blurb: "Las voces de la comunidad, con foto y enlaces.",
    },
    {
      href: "/admin/recursos",
      label: "Recursos",
      count: resources.length,
      noun: resources.length === 1 ? "recurso" : "recursos",
      blurb: "El menú de enlaces, agrupado por categoría.",
    },
  ];

  return (
    <div>
      <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-dd-red md:text-5xl">
        Panel
      </h1>
      <p className="mt-2 max-w-prose text-[15px] text-dd-black/75">
        Administra el contenido de la portada. Cada cambio se refleja en el sitio
        público de inmediato.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <section
            key={section.href}
            className="flex flex-col rounded-lg border border-dd-black/15 bg-white p-5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-dd-black">
                {section.label}
              </h2>
              <span className="text-sm font-semibold text-dd-black/60">
                {section.count} {section.noun}
              </span>
            </div>
            <p className="mt-2 flex-1 text-[14px] leading-snug text-dd-black/70">
              {section.blurb}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={section.href} className={secondaryBtn}>
                Ver todos
              </Link>
              <Link href={`${section.href}/nuevo`} className={primaryBtn}>
                Nuevo
              </Link>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
