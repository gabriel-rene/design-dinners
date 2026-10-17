import Link from "next/link";

import { AGENDA_FILTERS, agendaHref, type AgendaFilter } from "@/lib/agenda";

const BASE =
  "inline-flex min-h-11 items-center rounded-full border-2 border-dd-black px-5 text-sm font-bold uppercase tracking-wide transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-dd-black";

/**
 * Three pill links that set `?tipo=` on the URL, so a filtered view can be
 * shared and works without JavaScript. With JavaScript the page re-renders in
 * place (`scroll={false}`) instead of jumping back above the featured dinner.
 */
export default function AgendaFilters({ active }: { active: AgendaFilter }) {
  return (
    <nav aria-label="Filtrar eventos">
      <ul className="flex flex-wrap gap-2">
        {AGENDA_FILTERS.map(({ value, label }) => {
          const on = value === active;
          return (
            <li key={value}>
              <Link
                href={agendaHref(value)}
                scroll={false}
                aria-current={on ? "true" : undefined}
                className={
                  on
                    ? `${BASE} bg-dd-black text-dd-cream`
                    : `${BASE} bg-dd-cream text-dd-black hover:bg-dd-yellow`
                }
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
