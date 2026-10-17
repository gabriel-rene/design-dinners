import { isUpcoming } from "./derive";
import type { EventWithSpeakers } from "./types";
import type { PublicCommunityEvent } from "./otros-eventos/types";

export type AgendaFilter = "todos" | "design-dinners" | "comunidad";

export const AGENDA_FILTERS: { value: AgendaFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "design-dinners", label: "Design Dinners" },
  { value: "comunidad", label: "Comunidad" },
];

export function parseAgendaFilter(raw: string | string[] | undefined): AgendaFilter {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "design-dinners" || value === "comunidad" ? value : "todos";
}

export type AgendaRow =
  | { kind: "dd"; startsAt: string; event: EventWithSpeakers }
  | { kind: "comunidad"; startsAt: string; event: PublicCommunityEvent };

export function buildAgenda(input: {
  ddEvents: EventWithSpeakers[];
  communityEvents: PublicCommunityEvent[];
  featuredId: string | null;
  filter: AgendaFilter;
  now?: Date;
}): AgendaRow[] {
  const { ddEvents, communityEvents, featuredId, filter } = input;
  const now = input.now ?? new Date();
  const rows: AgendaRow[] = [];

  if (filter !== "comunidad") {
    for (const event of ddEvents) {
      if (event.id === featuredId || !isUpcoming(event, now)) continue;
      rows.push({ kind: "dd", startsAt: event.event_date, event });
    }
  }
  if (filter !== "design-dinners") {
    for (const event of communityEvents) {
      rows.push({ kind: "comunidad", startsAt: event.startsAt, event });
    }
  }

  return rows.sort((a, b) => {
    const diff = new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    if (diff !== 0) return diff;
    if (a.kind !== b.kind) return a.kind === "dd" ? -1 : 1;
    return String(a.event.id).localeCompare(String(b.event.id));
  });
}

export function agendaHref(filter: AgendaFilter): string {
  return filter === "todos" ? "/eventos" : `/eventos?tipo=${filter}`;
}
